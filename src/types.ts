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
  delta: number;
  time: number;
  frame: number;
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

// Input state interfaces
export interface InputState {
  keys: Map<string, boolean>;
  mouse: {
    x: number;
    y: number;
    worldX: number;
    worldY: number;
    isDown: boolean;
    justPressed: boolean; // Reset after frame
    justReleased: boolean; // Reset after frame
  };
}

export type KeyCode =
  | "KeyA"
  | "KeyB"
  | "KeyC"
  | "KeyD"
  | "KeyE"
  | "KeyF"
  | "KeyG"
  | "KeyH"
  | "KeyI"
  | "KeyJ"
  | "KeyK"
  | "KeyL"
  | "KeyM"
  | "KeyN"
  | "KeyO"
  | "KeyP"
  | "KeyQ"
  | "KeyR"
  | "KeyS"
  | "KeyT"
  | "KeyU"
  | "KeyV"
  | "KeyW"
  | "KeyX"
  | "KeyY"
  | "KeyZ"
  | "Space"
  | "Enter"
  | "ShiftLeft"
  | "ShiftRight"
  | "ControlLeft"
  | "ControlRight"
  | "AltLeft"
  | "AltRight"
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight"
  | "Digit0"
  | "Digit1"
  | "Digit2"
  | "Digit3"
  | "Digit4"
  | "Digit5"
  | "Digit6"
  | "Digit7"
  | "Digit8"
  | "Digit9";
