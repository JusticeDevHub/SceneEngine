import { Vector3, Euler } from "./types.ts";
import * as THREE from "three";

export abstract class GameObject {
  private _id: string;
  private _tags: Set<string>;
  private _visible: boolean;
  private _variables: Map<string, any>;

  abstract readonly _threeObject: THREE.Object3D;

  constructor() {
    this._id = crypto.randomUUID();
    this._tags = new Set();
    this._visible = true;
    this._variables = new Map();
  }

  getId(): string {
    return this._id;
  }

  addTags(tags: string[]): this {
    tags.forEach((t) => this._tags.add(t));
    return this;
  }

  removeTags(tags: string[]): this {
    tags.forEach((t) => this._tags.delete(t));
    return this;
  }

  getTags(): string[] {
    return Array.from(this._tags);
  }

  hasTags(tags: string[], matchAll: boolean = true): boolean {
    if (matchAll) {
      return tags.every((t) => this._tags.has(t));
    }
    return tags.some((t) => this._tags.has(t));
  }

  setVariable(key: string, value: any): this {
    this._variables.set(key, value);
    return this;
  }

  getVariable(key: string): any {
    return this._variables.get(key);
  }

  getPosition(): Vector3 {
    const p = this._threeObject.position;
    return { x: p.x, y: p.y, z: p.z };
  }

  setPosition(x: number, y: number, z: number): this {
    this._threeObject.position.set(x, y, z);
    return this;
  }

  getRotation(): Euler {
    const r = this._threeObject.rotation;
    return {
      x: r.x * (180 / Math.PI),
      y: r.y * (180 / Math.PI),
      z: r.z * (180 / Math.PI),
    };
  }

  setRotation(x: number, y: number, z: number): this {
    this._threeObject.rotation.set(
      x * (Math.PI / 180),
      y * (Math.PI / 180),
      z * (Math.PI / 180),
    );
    return this;
  }

  getScale(): Vector3 {
    const s = this._threeObject.scale;
    return { x: s.x, y: s.y, z: s.z };
  }

  setScale(x: number, y: number, z: number): this;
  setScale(s: number): this;
  setScale(x: number, y?: number, z?: number): this {
    if (y === undefined && z === undefined) {
      this._threeObject.scale.set(x, x, x);
    } else {
      this._threeObject.scale.set(x, y!, z!);
    }
    return this;
  }

  getVisible(): boolean {
    return this._visible;
  }

  setVisible(visible: boolean): this {
    this._visible = visible;
    this._threeObject.visible = visible;
    return this;
  }
}
