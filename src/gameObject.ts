// gameObject.ts
import * as THREE from "three";
import type { CanvasEngine } from "./engine.ts";
import type { GameObjectType, UpdateData, ClickData } from "./types.ts";

type EventCallback<T> = (data: T) => void;

export class GameObject {
  readonly name: string;
  readonly type: GameObjectType;
  readonly engine: CanvasEngine;

  threeObject: THREE.Object3D | null = null;
  private variables = new Map<string, unknown>();
  private children = new Set<GameObject>();
  private parent: GameObject | null = null;

  // Event handlers
  private updateHandlers = new Set<EventCallback<UpdateData>>();
  private clickHandlers = new Set<EventCallback<ClickData>>();
  private globalClickHandlers = new Set<EventCallback<ClickData>>();
  private mouseEnterHandlers = new Set<EventCallback<ClickData>>();
  private mouseLeaveHandlers = new Set<EventCallback<ClickData>>();

  private _isHovered = false;
  private _enabled = true;
  private _isDestroyed = false;

  constructor(name: string, engine: CanvasEngine, type: GameObjectType) {
    this.name = name;
    this.engine = engine;
    this.type = type;

    this.createThreeObject(type);
  }

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
      case "cube": {
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        this.threeObject = new THREE.Mesh(geo, mat);
        break;
      }
      case "mesh": {
        // Generic mesh with default geometry - user can customize later
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
      case "audio": {
        // Audio uses Object3D as a positional container in Three.js
        // Actual Audio object would be attached to this
        this.threeObject = new THREE.Object3D();
        break;
      }
      case "empty":
      default: {
        this.threeObject = new THREE.Object3D();
      }
    }

    if (this.threeObject) {
      this.engine.scene.add(this.threeObject);
    }
  }

  // ===== Transform =====
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

  // ===== Variables =====
  setVariable<T>(key: string, value: T): this {
    this.variables.set(key, value);
    return this;
  }

  getVariable<T>(key: string): T | undefined {
    return this.variables.get(key) as T | undefined;
  }

  // ===== Visuals =====
  setImage(url: string): this {
    if (this.type !== "sprite") {
      console.warn("setImage only works on sprite type");
      return this;
    }

    const loader = new THREE.TextureLoader();
    loader.load(url, (texture: THREE.Texture) => {
      // Check if destroyed or no longer a sprite during load
      if (this._isDestroyed || !this.threeObject || this.type !== "sprite") {
        texture.dispose();
        return;
      }

      const mesh = this.threeObject as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;

      // Dispose old texture to prevent memory leak
      if (mat.map) {
        mat.map.dispose();
      }

      mat.map = texture;
      mat.transparent = true;
      mat.needsUpdate = true;
    });
    return this;
  }

  setColor(color: number | string): this {
    if (!this.threeObject) return this;

    // Only apply to objects with materials
    if (this.threeObject instanceof THREE.Mesh) {
      const mat = this.threeObject.material;
      if (
        mat instanceof THREE.MeshBasicMaterial ||
        mat instanceof THREE.MeshStandardMaterial ||
        mat instanceof THREE.MeshLambertMaterial ||
        mat instanceof THREE.MeshPhongMaterial
      ) {
        mat.color.set(color);
      }
    }

    return this;
  }

  // ===== Events =====
  onUpdate(callback: EventCallback<UpdateData>): this {
    this.updateHandlers.add(callback);
    return this;
  }

  onClick(callback: EventCallback<ClickData>): this {
    this.clickHandlers.add(callback);
    this.engine._registerInteractive(this);
    return this;
  }

  onClickGlobal(callback: EventCallback<ClickData>): this {
    this.globalClickHandlers.add(callback);
    return this;
  }

  onMouseEnter(callback: EventCallback<ClickData>): this {
    this.mouseEnterHandlers.add(callback);
    this.engine._registerInteractive(this);
    return this;
  }

  onMouseLeave(callback: EventCallback<ClickData>): this {
    this.mouseLeaveHandlers.add(callback);
    this.engine._registerInteractive(this);
    return this;
  }

  // ===== Internal Event Triggers =====
  update(data: UpdateData): void {
    if (!this._enabled) return;
    this.updateHandlers.forEach((cb) => cb(data));
    this.children.forEach((child) => child.update(data));
  }

  triggerClick(data: ClickData): void {
    this.clickHandlers.forEach((cb) => cb(data));
  }

  triggerGlobalClick(data: ClickData): void {
    this.globalClickHandlers.forEach((cb) => cb(data));
  }

  triggerMouseEnter(data: ClickData): void {
    this.mouseEnterHandlers.forEach((cb) => cb(data));
  }

  triggerMouseLeave(data: ClickData): void {
    this.mouseLeaveHandlers.forEach((cb) => cb(data));
  }

  // ===== Hierarchy =====
  addChild(child: GameObject): this {
    if (child.parent) {
      child.parent.removeChild(child);
    }
    this.children.add(child);
    child.parent = this;

    if (this.threeObject && child.threeObject) {
      this.threeObject.add(child.threeObject);
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

  // ===== State =====
  get isHovered(): boolean {
    return this._isHovered;
  }

  setHovered(value: boolean): void {
    this._isHovered = value;
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

  // ===== Destruction =====
  destroy(): void {
    if (this._isDestroyed) return;
    this._isDestroyed = true;

    this.engine._unregisterInteractive(this);

    // Destroy children
    Array.from(this.children).forEach((child) => child.destroy());

    // Remove from parent
    if (this.parent) {
      this.parent.removeChild(this);
    }

    // Remove from engine registry
    this.engine._removeFromEngine(this.name);

    // Cleanup Three.js
    if (this.threeObject) {
      // Safely dispose based on type
      if (this.threeObject instanceof THREE.Mesh) {
        if (this.threeObject.geometry) {
          this.threeObject.geometry.dispose();
        }

        if (this.threeObject.material) {
          const mat = this.threeObject.material;
          if (Array.isArray(mat)) {
            mat.forEach((m: THREE.Material) => m.dispose());
          } else {
            mat.dispose();
          }
        }
      }

      this.engine.scene.remove(this.threeObject);
      this.threeObject = null;
    }
  }
}
