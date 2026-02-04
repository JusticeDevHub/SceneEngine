import { Vector3, Euler } from "./types.ts";
import * as THREE from "three";

/**
 * Abstract base class for all game objects.
 * Provides common functionality for transforms, tags, and custom variables.
 */
export abstract class GameObject {
  private _id: string;
  private _tags: Set<string>;
  private _visible: boolean;
  private _variables: Map<string, any>;

  /** @internal The underlying Three.js object */
  abstract readonly _threeObject: THREE.Object3D;

  constructor() {
    this._id = crypto.randomUUID();
    this._tags = new Set();
    this._visible = true;
    this._variables = new Map();
  }

  /**
   * Gets the unique identifier of this object.
   * @returns The UUID string
   */
  getId(): string {
    return this._id;
  }

  /**
   * Adds tags to this object.
   * @param tags - Array of tag strings to add
   * @returns This object for chaining
   */
  addTags(tags: string[]): this {
    tags.forEach((t) => this._tags.add(t));
    return this;
  }

  /**
   * Removes tags from this object.
   * @param tags - Array of tag strings to remove
   * @returns This object for chaining
   */
  removeTags(tags: string[]): this {
    tags.forEach((t) => this._tags.delete(t));
    return this;
  }

  /**
   * Gets all tags on this object.
   * @returns Array of tag strings
   */
  getTags(): string[] {
    return Array.from(this._tags);
  }

  /**
   * Checks if this object has the specified tags.
   * @param tags - Array of tags to check
   * @param matchAll - If true, object must have all tags. If false, any tag matches. Defaults to true.
   * @returns True if tags match
   */
  hasTags(tags: string[], matchAll: boolean = true): boolean {
    if (matchAll) {
      return tags.every((t) => this._tags.has(t));
    }
    return tags.some((t) => this._tags.has(t));
  }

  /**
   * Sets a custom variable on this object.
   * @param key - Variable name
   * @param value - Variable value
   * @returns This object for chaining
   */
  setVariable(key: string, value: any): this {
    this._variables.set(key, value);
    return this;
  }

  /**
   * Gets a custom variable from this object.
   * @param key - Variable name
   * @returns The variable value, or undefined if not set
   */
  getVariable(key: string): any {
    return this._variables.get(key);
  }

  /**
   * Gets the current position.
   * @returns Position as x, y, z
   */
  getPosition(): Vector3 {
    const p = this._threeObject.position;
    return { x: p.x, y: p.y, z: p.z };
  }

  /**
   * Sets the position.
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   * @returns This object for chaining
   */
  setPosition(x: number, y: number, z: number): this {
    this._threeObject.position.set(x, y, z);
    return this;
  }

  /**
   * Gets the current rotation in degrees.
   * @returns Rotation as x, y, z in degrees
   */
  getRotation(): Euler {
    const r = this._threeObject.rotation;
    return {
      x: r.x * (180 / Math.PI),
      y: r.y * (180 / Math.PI),
      z: r.z * (180 / Math.PI),
    };
  }

  /**
   * Sets the rotation in degrees.
   * @param x - X rotation in degrees
   * @param y - Y rotation in degrees
   * @param z - Z rotation in degrees
   * @returns This object for chaining
   */
  setRotation(x: number, y: number, z: number): this {
    this._threeObject.rotation.set(
      x * (Math.PI / 180),
      y * (Math.PI / 180),
      z * (Math.PI / 180),
    );
    return this;
  }

  /**
   * Gets the current scale.
   * @returns Scale as x, y, z
   */
  getScale(): Vector3 {
    const s = this._threeObject.scale;
    return { x: s.x, y: s.y, z: s.z };
  }

  /**
   * Sets the scale uniformly.
   * @param s - Scale factor for all axes
   * @returns This object for chaining
   */
  setScale(s: number): this;
  /**
   * Sets the scale per axis.
   * @param x - X scale
   * @param y - Y scale
   * @param z - Z scale
   * @returns This object for chaining
   */
  setScale(x: number, y: number, z: number): this;
  setScale(x: number, y?: number, z?: number): this {
    if (y === undefined && z === undefined) {
      this._threeObject.scale.set(x, x, x);
    } else {
      this._threeObject.scale.set(x, y!, z!);
    }
    return this;
  }

  /**
   * Gets whether this object is visible.
   * @returns True if visible
   */
  getVisible(): boolean {
    return this._visible;
  }

  /**
   * Sets whether this object is visible.
   * @param visible - True to show, false to hide
   * @returns This object for chaining
   */
  setVisible(visible: boolean): this {
    this._visible = visible;
    this._threeObject.visible = visible;
    return this;
  }
}
