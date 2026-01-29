// engine.ts (unchanged from your version - already correct)
import * as THREE from "three";
import type { GameObjectConfig, UpdateData } from "./types.ts";
import { GameObject } from "./gameObject.ts";
import { EngineUtils } from "./utils.ts";

export interface EngineOptions {
  mode?: "2d" | "3d";
  container?: HTMLElement;
  backgroundColor?: number;
  antialias?: boolean;
  shadows?: boolean;
}

export class CanvasEngine {
  readonly mode: "2d" | "3d";
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  readonly utils: EngineUtils;

  private objects = new Map<string, GameObject>();
  private interactiveObjects = new Set<GameObject>();
  private clock = new THREE.Clock();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private frame = 0;
  private isRunning = true;
  private boundHandlers: Array<[string, EventListener]> = [];

  private onUpdateCallbacks = new Set<(data: UpdateData) => void>();

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

    // Setup renderer - identical for 2D and 3D
    this.renderer = new THREE.WebGLRenderer({
      antialias,
      alpha: backgroundColor === undefined,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (shadows) this.renderer.shadowMap.enabled = true;

    container.appendChild(this.renderer.domElement);

    // Setup scene - identical for 2D and 3D
    this.scene = new THREE.Scene();
    if (backgroundColor !== undefined) {
      this.scene.background = new THREE.Color(backgroundColor);
    }

    // Camera is the ONLY difference between 2D and 3D modes
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

  createObject(config: GameObjectConfig): GameObject {
    if (this.objects.has(config.name)) {
      throw new Error(`GameObject "${config.name}" already exists`);
    }

    const obj = new GameObject(config.name, this, config.type);

    // Apply initial transforms with safe tuple destructuring
    if (config.position) {
      const [x, y, z = 0] = config.position;
      obj.setPosition(x, y, z);
    }

    if (config.rotation) {
      const [x, y, z = 0] = config.rotation;
      obj.setRotation(x, y, z);
    }

    if (config.scale) {
      const [x, y, z = 1] = config.scale;
      obj.setScale(x, y, z);
    }

    this.objects.set(config.name, obj);
    return obj;
  }

  getObject(name: string): GameObject | undefined {
    return this.objects.get(name);
  }

  removeObject(name: string): void {
    const obj = this.objects.get(name);
    if (obj) {
      obj.destroy();
    }
  }

  onUpdate(callback: (data: UpdateData) => void): () => void {
    this.onUpdateCallbacks.add(callback);
    return () => this.onUpdateCallbacks.delete(callback);
  }

  pause(): void {
    this.isRunning = false;
  }

  play(): void {
    this.isRunning = true;
  }

  // Internal methods called by GameObject
  _registerInteractive(obj: GameObject): void {
    this.interactiveObjects.add(obj);
  }

  _unregisterInteractive(obj: GameObject): void {
    this.interactiveObjects.delete(obj);
  }

  _removeFromEngine(name: string): void {
    this.objects.delete(name);
  }

  private setupEvents(): void {
    const onMouseMove = (e: MouseEvent) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.checkHover();
    };

    const onClick = () => {
      const clickData = { mouse: { x: this.mouse.x, y: this.mouse.y } };
      this.objects.forEach((obj) => obj.triggerGlobalClick(clickData));

      const intersections = this.getIntersections();
      if (intersections.length > 0) {
        const hit = Array.from(this.interactiveObjects).find(
          (obj) => obj.threeObject === intersections[0].object,
        );
        if (hit) {
          hit.triggerClick({ ...clickData, intersection: intersections[0] });
        }
      }
    };

    const onResize = () => {
      if (this.mode === "3d") {
        const cam = this.camera as THREE.PerspectiveCamera;
        cam.aspect = window.innerWidth / window.innerHeight;
        cam.updateProjectionMatrix();
      } else {
        const aspect = window.innerWidth / window.innerHeight;
        const cam = this.camera as THREE.OrthographicCamera;
        const height = 10;
        const width = height * aspect;
        cam.left = -width / 2;
        cam.right = width / 2;
        cam.top = height / 2;
        cam.bottom = -height / 2;
        cam.updateProjectionMatrix();
      }
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);
    window.addEventListener("resize", onResize);

    this.boundHandlers.push(
      ["mousemove", onMouseMove as EventListener],
      ["click", onClick as EventListener],
      ["resize", onResize as EventListener],
    );
  }

  private getIntersections(): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const objects = Array.from(this.interactiveObjects)
      .map((obj) => obj.threeObject)
      .filter((obj): obj is THREE.Object3D => obj !== null);
    return this.raycaster.intersectObjects(objects);
  }

  private checkHover(): void {
    const intersections = this.getIntersections();
    const hitSet = new Set(
      intersections
        .map((i) =>
          Array.from(this.interactiveObjects).find(
            (obj) => obj.threeObject === i.object,
          ),
        )
        .filter((obj): obj is GameObject => obj !== undefined),
    );

    this.interactiveObjects.forEach((obj) => {
      if (hitSet.has(obj) && !obj.isHovered) {
        obj.setHovered(true);
        obj.triggerMouseEnter({ mouse: { x: this.mouse.x, y: this.mouse.y } });
      } else if (!hitSet.has(obj) && obj.isHovered) {
        obj.setHovered(false);
        obj.triggerMouseLeave({ mouse: { x: this.mouse.x, y: this.mouse.y } });
      }
    });
  }

  private startLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);

      if (!this.isRunning) return;

      const delta = this.clock.getDelta();
      const time = this.clock.getElapsedTime();
      this.frame++;

      const updateData: UpdateData = { delta, time, frame: this.frame };

      this.onUpdateCallbacks.forEach((cb) => cb(updateData));
      this.objects.forEach((obj) => obj.update(updateData));

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  destroy(): void {
    this.boundHandlers.forEach(([event, handler]) => {
      window.removeEventListener(event, handler);
    });

    Array.from(this.objects.values()).forEach((obj) => obj.destroy());

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(
        this.renderer.domElement,
      );
    }
  }
}
