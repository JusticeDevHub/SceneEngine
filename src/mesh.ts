import * as THREE from "three";
import { GameObject } from "./gameObject.ts";

export class Mesh extends GameObject {
  readonly _threeObject: THREE.Mesh;

  constructor() {
    super();
    this._threeObject = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    );
  }

  setGeometry(geometry: THREE.BufferGeometry): this {
    this._threeObject.geometry.dispose();
    this._threeObject.geometry = geometry;
    return this;
  }

  getGeometry(): THREE.BufferGeometry {
    return this._threeObject.geometry;
  }

  setMaterial(material: THREE.Material): this {
    const oldMat = this._threeObject.material;
    this._threeObject.material = material;
    if (Array.isArray(oldMat)) {
      oldMat.forEach((m) => m.dispose());
    } else {
      oldMat?.dispose();
    }
    return this;
  }

  getMaterial(): THREE.Material {
    if (Array.isArray(this._threeObject.material)) {
      return this._threeObject.material[0];
    }

    return this._threeObject.material;
  }
}
