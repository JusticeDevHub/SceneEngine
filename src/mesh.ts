import * as THREE from "three";
import { GameObject } from "./gameObject.ts";

/**
 * A 3D mesh object. Defaults to a white cube.
 */
export class Mesh extends GameObject {
  /** @internal */
  readonly _threeObject: THREE.Mesh;

  constructor() {
    super();
    this._threeObject = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    );
  }

  /**
   * Sets the geometry of this mesh.
   * @param geometry - The buffer geometry to use
   * @returns This mesh for chaining
   */
  setGeometry(geometry: THREE.BufferGeometry): this {
    this._threeObject.geometry.dispose();
    this._threeObject.geometry = geometry;
    return this;
  }

  /**
   * Gets the current geometry.
   * @returns The buffer geometry
   */
  getGeometry(): THREE.BufferGeometry {
    return this._threeObject.geometry;
  }

  /**
   * Sets the material of this mesh.
   * @param material - The material to use
   * @returns This mesh for chaining
   */
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

  /**
   * Gets the current material.
   * @returns The material
   */
  getMaterial(): THREE.Material {
    if (Array.isArray(this._threeObject.material)) {
      return this._threeObject.material[0];
    }
    return this._threeObject.material;
  }
}
