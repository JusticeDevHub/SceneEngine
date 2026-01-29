// types.ts
import type { Intersection } from "three";

export type GameObjectType =
  | "sprite"
  | "cube"
  | "camera"
  | "light"
  | "audio"
  | "empty"
  | "mesh";

export interface UpdateData {
  delta: number; // Seconds since last frame
  time: number; // Total elapsed seconds
  frame: number; // Frame count
}

export interface ClickData {
  mouse: { x: number; y: number };
  intersection?: Intersection;
}

export interface GameObjectConfig {
  name: string;
  type: GameObjectType;
  position?: [number, number, number?];
  rotation?: [number, number, number?];
  scale?: [number, number, number?];
}
