import * as THREE from "three";
import type { SceneEngine } from "./engine.ts";
import type { GameObjectType, ColliderConfig } from "./types.ts";

function generateId(): string {
  // Fallback for older browsers
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export class GameObject {
  readonly id: string;
  name: string;
  readonly type: GameObjectType;
  readonly engine: SceneEngine;
  private _tags = new Set<string>();

  // Object3D reference (visual representation data)
  threeObject: THREE.Object3D | null = null;

  // User data storage (pure data)
  private variables = new Map<string, unknown>();

  // Hierarchy (transform only, no logic propagation needed)
  private children = new Set<GameObject>();
  private parent: GameObject | null = null;

  // Physics/Collision data
  collider: {
    type: "sphere" | "box" | "circle" | "rectangle";
    isTrigger: boolean;
    bounds: any;
    offset: THREE.Vector3;
  } | null = null;

  // State flags (data only)
  private _enabled = true;
  private _isDestroyed = false;
  isHovered = false; // Set by engine systems, readable by user systems

  constructor(name: string, engine: SceneEngine, type: GameObjectType) {
    this.id = generateId();
    this.name = name || `${type}_${this.id.substring(0, 4)}`;
    this.engine = engine;
    this.type = type;
    this.createThreeObject(type);
  }

  // ===== Tags (Data indexing) =====
  addTag(tag: string): this {
    if (!this._tags.has(tag)) {
      this._tags.add(tag);
      this.engine._updateTagIndex(this.id, tag, "add");
    }
    return this;
  }

  removeTag(tag: string): this {
    if (this._tags.has(tag)) {
      this._tags.delete(tag);
      this.engine._updateTagIndex(this.id, tag, "remove");
    }
    return this;
  }

  hasTag(tag: string): boolean {
    return this._tags.has(tag);
  }

  hasAllTags(tags: string[]): boolean {
    return tags.every((t) => this._tags.has(t));
  }

  getTags(): string[] {
    return Array.from(this._tags);
  }

  // ===== Collider (Data attachment) =====
  addCollider(config: ColliderConfig): this {
    const offset = new THREE.Vector3(...(config.offset || [0, 0, 0]));
    let bounds: any = {};

    if (this.engine.mode === "2d") {
      if (config.type === "circle" || config.type === "sphere") {
        bounds = {
          radius: typeof config.size === "number" ? config.size : 0.5,
        };
      } else {
        const size = Array.isArray(config.size) ? config.size : [1, 1];
        bounds = { width: size[0], height: size[1] };
      }
    } else {
      if (config.type === "sphere") {
        bounds = {
          radius: typeof config.size === "number" ? config.size : 0.5,
          center: new THREE.Vector3(0, 0, 0),
        };
      } else {
        const size = Array.isArray(config.size) ? config.size : [1, 1, 1];
        bounds = {
          size: new THREE.Vector3(size[0], size[1], size[2] || 1),
        };
      }
    }

    this.collider = {
      type: config.type,
      isTrigger: config.isTrigger ?? false,
      bounds,
      offset,
    };

    // Register for collision detection processing (data registration, not callback)
    this.engine._registerCollider(this);
    return this;
  }

  removeCollider(): this {
    if (this.collider) {
      this.engine._unregisterCollider(this);
      this.collider = null;
    }
    return this;
  }

  // ===== Transform (Data manipulation) =====
  setPosition(x: number, y: number, z: number = 0): this {
    this.threeObject?.position.set(x, y, z);
    return this;
  }

  setRotation(x: number, y: number = 0, z: number = 0): this {
    this.threeObject?.rotation.set(x, y, z);
    return this;
  }

  setScale(x: number, y: number, z: number = 1): this {
    this.threeObject?.scale.set(x, y, z);
    return this;
  }

  getPosition(): THREE.Vector3 | null {
    return this.threeObject?.position.clone() ?? null;
  }

  // ===== Variables (Data storage) =====
  setVariable<T>(key: string, value: T): this {
    this.variables.set(key, value);
    return this;
  }

  getVariable<T>(key: string): T | undefined {
    return this.variables.get(key) as T | undefined;
  }

  // ===== Visuals (Data state) =====
  setColor(color: number | string): this {
    if (this.threeObject instanceof THREE.Mesh) {
      const mat = this.threeObject.material;
      if (
        mat instanceof THREE.MeshBasicMaterial ||
        mat instanceof THREE.MeshStandardMaterial
      ) {
        mat.color.set(color);
      }
    }
    return this;
  }

  // ===== Sprite/2D Specific =====

  /**
   * Set image texture for sprite types.
   * Accepts URL string (auto-loads) or pre-loaded THREE.Texture
   */
  setImage(url: string | THREE.Texture): this {
    if (!this.threeObject || !(this.threeObject instanceof THREE.Mesh)) {
      console.warn(`Cannot set image on ${this.type} (must be mesh/sprite)`);
      return this;
    }

    const mat = this.threeObject.material;
    if (!(mat instanceof THREE.MeshBasicMaterial)) {
      return this;
    }

    // Clean up previous texture to prevent memory leaks
    if (mat.map) {
      mat.map.dispose();
      mat.map = null;
    }

    if (typeof url === "string") {
      // Async load - closure captures this to check if still valid
      new THREE.TextureLoader().load(
        url,
        (texture: THREE.Texture) => {
          // ColorSpace for proper rendering
          texture.colorSpace = THREE.SRGBColorSpace;

          // Only apply if object still exists (not destroyed while loading)
          if (
            this.threeObject &&
            !this._isDestroyed &&
            this.threeObject instanceof THREE.Mesh
          ) {
            const material = this.threeObject.material;
            if (material instanceof THREE.MeshBasicMaterial) {
              material.map = texture;
              material.needsUpdate = true;
              material.transparent = true; // Ensure alpha works
            }
          }
        },
        undefined,
        (err: Error) => console.error(`Failed to load texture: ${url}`, err),
      );
    } else {
      // Pre-loaded texture
      url.colorSpace = THREE.SRGBColorSpace;
      mat.map = url;
      mat.needsUpdate = true;
      mat.transparent = true;
    }

    return this;
  }

  /** Set opacity (0-1) for sprite transparency */
  setOpacity(value: number): this {
    if (!this.threeObject || !(this.threeObject instanceof THREE.Mesh)) {
      return this;
    }

    const mat = this.threeObject.material;
    if (mat instanceof THREE.MeshBasicMaterial) {
      mat.opacity = this.engine.utils.clamp(value, 0, 1);
      mat.transparent = true;
      mat.needsUpdate = true;
    }
    return this;
  }

  // ===== Hierarchy (Transform tree) =====
  addChild(child: GameObject): this {
    if (child.parent) child.parent.removeChild(child);
    this.children.add(child);
    child.parent = this;
    if (this.threeObject && child.threeObject) {
      this.threeObject.add(child.threeObject); // Three.js handles transform inheritance
    }
    return this;
  }

  removeChild(child: GameObject): this {
    if (this.children.has(child)) {
      this.children.delete(child);
      child.parent = null;
      if (this.threeObject && child.threeObject) {
        this.threeObject.remove(child.threeObject);
      }
    }
    return this;
  }

  getChildren(): GameObject[] {
    return Array.from(this.children);
  }

  // ===== Lifecycle (State changes) =====
  get enabled(): boolean {
    return this._enabled;
  }

  enable(): this {
    this._enabled = true;
    if (this.threeObject) this.threeObject.visible = true;
    return this;
  }

  disable(): this {
    this._enabled = false;
    if (this.threeObject) this.threeObject.visible = false;
    return this;
  }

  get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  destroy(): void {
    if (this._isDestroyed) return;
    this._isDestroyed = true;

    // Cleanup registrations
    this.engine._unregisterCollider(this);
    this._tags.forEach((tag) =>
      this.engine._updateTagIndex(this.id, tag, "remove"),
    );

    // Cascade destruction (children are dependent data)
    Array.from(this.children).forEach((c) => c.destroy());
    if (this.parent) this.parent.removeChild(this);

    this.engine._removeObject(this.id);

    // Three.js cleanup
    if (this.threeObject) {
      if (this.threeObject instanceof THREE.Mesh) {
        this.threeObject.geometry?.dispose();
        const mat = this.threeObject.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
      this.engine.scene.remove(this.threeObject);
      this.threeObject = null;
    }
  }

  // ===== Internal Factory =====
  private createThreeObject(type: GameObjectType): void {
    switch (type) {
      case "sprite": {
        const geo = new THREE.PlaneGeometry(1, 1);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          side: THREE.DoubleSide,
        });
        this.threeObject = new THREE.Mesh(geo, mat);
        break;
      }
      case "mesh": {
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        this.threeObject = new THREE.Mesh(geo, mat);
        break;
      }
      case "camera": {
        if (this.engine.mode === "2d") {
          const aspect = window.innerWidth / window.innerHeight;
          const height = 10;
          const width = height * aspect;
          this.threeObject = new THREE.OrthographicCamera(
            -width / 2,
            width / 2,
            height / 2,
            -height / 2,
            0.1,
            1000,
          );
        } else {
          this.threeObject = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000,
          );
        }
        break;
      }
      case "light": {
        this.threeObject = new THREE.DirectionalLight(0xffffff, 1);
        break;
      }
      default: {
        this.threeObject = new THREE.Object3D();
      }
    }
    if (this.threeObject) this.engine.scene.add(this.threeObject);
  }
}
