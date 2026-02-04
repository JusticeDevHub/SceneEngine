/**
 * A 3D vector with x, y, z components.
 */
export interface Vector3 {
  /** X component */
  x: number;
  /** Y component */
  y: number;
  /** Z component */
  z: number;
}

/**
 * Euler rotation in degrees.
 */
export interface Euler {
  /** X rotation in degrees */
  x: number;
  /** Y rotation in degrees */
  y: number;
  /** Z rotation in degrees */
  z: number;
}

/** Type of game object */
export type GameObjectType = "mesh" | "sprite";
