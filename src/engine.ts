import * as THREE from "three";
import type {
  GameObjectConfig,
  UpdateData,
  ClickData,
  CollisionData,
} from "./types.ts";
import { GameObject } from "./gameObject.ts";
import { EngineUtils, InputManager } from "./utils.ts";

export interface EngineOptions {
  mode?: "2d" | "3d";
  container?: HTMLElement;
  backgroundColor?: number;
  antialias?: boolean;
  shadows?: boolean;
}

// System callback types
type UpdateCallback = (data: UpdateData) => void;
type CollisionCallback = (data: CollisionData) => void;
type ClickCallback = (data: ClickData) => void;

export class SceneEngine {
  readonly mode: "2d" | "3d";
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  readonly utils: EngineUtils;
  readonly input: InputManager;

  // Data Registry
  private objects = new Map<string, GameObject>();
  private tagIndex = new Map<string, Set<string>>();

  // System Registries
  private collidables = new Set<GameObject>();
  private updateCallbacks = new Set<UpdateCallback>();
  private collisionCallbacks = new Set<CollisionCallback>();
  private clickCallbacks = new Set<ClickCallback>();

  // Internal systems
  private clock = new THREE.Clock();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private frame = 0;
  private isRunning = true;
  private hasStarted = false;

  constructor(options: EngineOptions = {}) {
    const {
      mode = "3d",
      container = document.body,
      backgroundColor = 0x000000,
      antialias = true,
      shadows = false,
    } = options;

    this.mode = mode;
    this.utils = new EngineUtils(this);
    this.input = new InputManager(this);

    this.renderer = new THREE.WebGLRenderer({
      antialias,
      alpha: backgroundColor === undefined,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (shadows) this.renderer.shadowMap.enabled = true;

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    if (backgroundColor !== undefined)
      this.scene.background = new THREE.Color(backgroundColor);

    if (mode === "2d") {
      const aspect = window.innerWidth / window.innerHeight;
      const height = 10;
      const width = height * aspect;
      this.camera = new THREE.OrthographicCamera(
        -width / 2,
        width / 2,
        height / 2,
        -height / 2,
        0.1,
        1000,
      );
      this.camera.position.z = 10;
    } else {
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
      );
      this.camera.position.z = 5;
    }

    this.setupEvents();
    this.startLoop();
  }

  // ===== Object Factory =====
  createObject(config: GameObjectConfig): GameObject {
    const obj = new GameObject(config.name || "", this, config.type);

    if (config.position)
      obj.setPosition(
        config.position[0],
        config.position[1],
        config.position[2] || 0,
      );
    if (config.rotation)
      obj.setRotation(
        config.rotation[0],
        config.rotation[1],
        config.rotation[2] || 0,
      );
    if (config.scale)
      obj.setScale(config.scale[0], config.scale[1], config.scale[2] || 1);
    if (config.tags) config.tags.forEach((t) => obj.addTag(t));

    this.objects.set(obj.id, obj);
    return obj;
  }

  // ===== Query API (Data retrieval) =====
  getObjectById(id: string): GameObject | undefined {
    return this.objects.get(id);
  }

  getByTags(...tags: string[]): GameObject[] {
    if (tags.length === 0) return [];
    if (tags.length === 1) {
      const ids = this.tagIndex.get(tags[0]);
      if (!ids) return [];
      return Array.from(ids)
        .map((id) => this.objects.get(id))
        .filter((o): o is GameObject => !!o);
    }

    // Intersection of sets for AND logic
    const sets = tags.map((t) => this.tagIndex.get(t) || new Set<string>());
    const smallest = sets.reduce(
      (min, set) => (set.size < min.size ? set : min),
      sets[0],
    );

    const result: GameObject[] = [];
    for (const id of smallest) {
      if (sets.every((set) => set.has(id))) {
        const obj = this.objects.get(id);
        if (obj) result.push(obj);
      }
    }
    return result;
  }

  getByTag(...tags: string[]): GameObject | undefined {
    return this.getByTags(...tags)[0];
  }

  getAllObjects(): GameObject[] {
    return Array.from(this.objects.values());
  }

  // ===== Internal Registry =====
  _updateTagIndex(id: string, tag: string, action: "add" | "remove"): void {
    if (action === "add") {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag)!.add(id);
    } else {
      this.tagIndex.get(tag)?.delete(id);
    }
  }

  _removeObject(id: string): void {
    this.objects.delete(id);
  }

  _registerCollider(obj: GameObject): void {
    this.collidables.add(obj);
  }

  _unregisterCollider(obj: GameObject): void {
    this.collidables.delete(obj);
  }

  // ===== System Registration (Logic goes here) =====

  /** Register a system to run every frame. Use this for all game logic. */
  onUpdate(callback: UpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  /** Register callback for collision events (enter) */
  onCollisionEnter(callback: CollisionCallback): () => void {
    this.collisionCallbacks.add(callback);
    return () => this.collisionCallbacks.delete(callback);
  }

  /** Register callback for click events */
  onClick(callback: ClickCallback): () => void {
    this.clickCallbacks.add(callback);
    return () => this.clickCallbacks.delete(callback);
  }

  // ===== Systems Implementation =====

  private updateCollisions(): void {
    const objects = Array.from(this.collidables).filter(
      (o) => o.collider && o.enabled && !o.isDestroyed,
    );
    const checked = new Set<string>();

    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const a = objects[i],
          b = objects[j];
        const pairId = a.id < b.id ? `${a.id}_${b.id}` : `${b.id}_${a.id}`;

        if (!checked.has(pairId)) {
          checked.add(pairId);
          if (this.checkCollision(a, b)) {
            // Notify global systems, not the objects themselves
            this.collisionCallbacks.forEach((cb) =>
              cb({ a, b, type: "enter" }),
            );
          }
        }
      }
    }
  }

  private checkCollision(a: GameObject, b: GameObject): boolean {
    if (!a.collider || !b.collider) return false;

    const posA = a.getPosition()!.clone().add(a.collider.offset);
    const posB = b.getPosition()!.clone().add(b.collider.offset);

    // Simple collision matrix - expand as needed
    if (this.mode === "2d") {
      if (a.collider.type === "circle" && b.collider.type === "circle") {
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const distSq = dx * dx + dy * dy;
        const r = a.collider.bounds.radius + b.collider.bounds.radius;
        return distSq < r * r;
      }
      // TODO: Add rectangle, circle-rectangle checks
    } else {
      if (a.collider.type === "sphere" && b.collider.type === "sphere") {
        const dist = posA.distanceTo(posB);
        return dist < a.collider.bounds.radius + b.collider.bounds.radius;
      }
      // TODO: Add box-box, sphere-box checks
    }
    return false;
  }

  // ===== Event Handling =====
  private setupEvents(): void {
    // Mouse tracking for raycaster
    window.addEventListener("mousemove", (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Global click system
    window.addEventListener("click", () => {
      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Raycast against all scene objects (could be optimized with layers)
      const hits = this.raycaster.intersectObjects(this.scene.children, true);

      if (hits.length > 0) {
        // Find the GameObject wrapper for this Three.js object
        const hit = hits[0];
        let obj: GameObject | undefined;

        // Traverse up to find game object mapping (simplified)
        // In production you might use a Map<THREE.Object3D, GameObject>
        for (const [id, gameObj] of this.objects) {
          if (
            gameObj.threeObject === hit.object ||
            (gameObj.threeObject &&
              gameObj.threeObject.children.includes(hit.object as any))
          ) {
            obj = gameObj;
            break;
          }
        }

        if (obj) {
          this.clickCallbacks.forEach((cb) =>
            cb({
              object: obj!,
              mouse: { x: this.mouse.x, y: this.mouse.y },
              intersection: hit,
            }),
          );
        }
      }
    });

    window.addEventListener("resize", () => {
      if (this.mode === "3d") {
        const cam = this.camera as THREE.PerspectiveCamera;
        cam.aspect = window.innerWidth / window.innerHeight;
        cam.updateProjectionMatrix();
      } else {
        const aspect = window.innerWidth / window.innerHeight;
        const cam = this.camera as THREE.OrthographicCamera;
        const height = 10,
          width = height * aspect;
        cam.left = -width / 2;
        cam.right = width / 2;
        cam.top = height / 2;
        cam.bottom = -height / 2;
        cam.updateProjectionMatrix();
      }
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // ===== Main Loop =====
  private startLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      if (!this.isRunning) return;

      const delta = this.clock.getDelta();
      const time = this.clock.getElapsedTime();
      this.frame++;

      const data: UpdateData = { delta, time, frame: this.frame };

      // Call Start once before any updates (optional lifecycle hook)
      if (!this.hasStarted) {
        this.hasStarted = true;
        // If you add onStart callbacks, call them here
      }

      // Run all systems
      this.updateCallbacks.forEach((cb) => cb(data));
      this.updateCollisions();
      this.input.resetFrame();

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  destroy(): void {
    Array.from(this.objects.values()).forEach((o) => o.destroy());
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(
        this.renderer.domElement,
      );
    }
  }
}
