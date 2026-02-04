export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Euler {
  x: number; // degrees
  y: number;
  z: number;
}

export type GameObjectType = "mesh" | "sprite";
