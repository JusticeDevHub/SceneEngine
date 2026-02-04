import * as THREE from "three";
import { GameObject } from "./gameObject.ts";
import { Mesh } from "./mesh.ts";
import { Sprite } from "./sprite.ts";

export class SceneEngine {
  private _renderer: THREE.WebGLRenderer;
  private _scene: THREE.Scene;
  private _camera: THREE.PerspectiveCamera;
  private _objects: Map<string, GameObject>;
  private _updateCallbacks: Set<(engine: SceneEngine) => void>;
  private _lastTime: number;
  private _deltaTime: number;

  constructor(canvasContainer?: HTMLElement) {
    this._objects = new Map();
    this._updateCallbacks = new Set();
    this._deltaTime = 0;
    this._lastTime = performance.now();

    const canvas = document.createElement("canvas");
    if (canvasContainer) {
      canvasContainer.appendChild(canvas);
      const rect = canvasContainer.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    } else {
      document.body.appendChild(canvas);
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    this._renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x222222);

    this._camera = new THREE.PerspectiveCamera(
      75,
      canvas.width / canvas.height,
      0.1,
      1000,
    );
    this._camera.position.z = 5;

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this._scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 5, 5);
    this._scene.add(directional);

    window.addEventListener("resize", () => {
      if (!canvasContainer) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this._camera.aspect = canvas.width / canvas.height;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(canvas.width, canvas.height);
      }
    });

    this._loop();
  }

  setBackgroundColor(r: number, g: number, b: number, a: number = 1): this {
    this._scene.background = new THREE.Color(r, g, b);
    this._renderer.setClearAlpha(a);
    return this;
  }

  createMesh(): Mesh {
    const mesh = new Mesh();
    this._objects.set(mesh.getId(), mesh);
    this._scene.add(mesh._threeObject);
    return mesh;
  }

  createSprite(): Sprite {
    const sprite = new Sprite();
    this._objects.set(sprite.getId(), sprite);
    this._scene.add(sprite._threeObject);
    return sprite;
  }

  destroy(object: GameObject): void {
    this._scene.remove(object._threeObject);
    this._objects.delete(object.getId());
    if (object._threeObject instanceof THREE.Mesh) {
      object._threeObject.geometry?.dispose();
      const mat = object._threeObject.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
  }

  getObjectById(id: string): GameObject | undefined {
    return this._objects.get(id);
  }

  getObjectsByTags(tags: string[]): GameObject[] {
    const result: GameObject[] = [];
    for (const obj of this._objects.values()) {
      if (obj.hasTags(tags, true)) {
        result.push(obj);
      }
    }
    return result;
  }

  onUpdate(callback: (engine: SceneEngine) => void): SceneEngine {
    this._updateCallbacks.add(callback);
    return this;
  }

  getDeltaTime(): number {
    return this._deltaTime;
  }

  private _loop(): void {
    const now = performance.now();
    this._deltaTime = (now - this._lastTime) / 1000;
    this._lastTime = now;

    this._updateCallbacks.forEach((cb) => cb(this));

    this._renderer.render(this._scene, this._camera);
    requestAnimationFrame(() => this._loop());
  }
}
