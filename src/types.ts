import type { Intersection } from "three";
import type { GameObject } from "./gameObject.ts";

export type GameObjectType =
  | "sprite"
  | "mesh"
  | "camera"
  | "light"
  | "audio"
  | "empty";

export interface UpdateData {
  delta: number;
  time: number;
  frame: number;
}

export interface ClickData {
  object: GameObject; // The clicked object (pure data)
  mouse: { x: number; y: number };
  intersection: Intersection;
}

export interface CollisionData {
  a: GameObject; // First collider
  b: GameObject; // Second collider
  type: "enter"; // Future-proof for stay/exit
}

export interface GameObjectConfig {
  name?: string;
  type: GameObjectType;
  position?: [number, number, number?];
  rotation?: [number, number, number?];
  scale?: [number, number, number?];
  tags?: string[];
}

export type ColliderType = "sphere" | "box" | "circle" | "rectangle";

export interface ColliderConfig {
  type: ColliderType;
  isTrigger?: boolean;
  size?: number | [number, number] | [number, number, number];
  offset?: [number, number, number];
}

// Simplified input state - just data
export interface InputState {
  keys: Map<string, boolean>;
  mouse: {
    x: number;
    y: number;
    worldX: number;
    worldY: number;
    isDown: boolean;
    justPressed: boolean;
    justReleased: boolean;
  };
}
