/**
 * @module
 * A unified game engine wrapper over Three.js where everything is a GameObject.
 *
 * @example
 * ```typescript
 * import { CanvasEngine } from "@yourusername/three-game-engine";
 *
 * const engine = new CanvasEngine("2d");
 * const player = engine.createObject({ name: "player", type: "sprite" });
 * ```
 */

export { CanvasEngine } from "./src/engine.ts";
export { GameObject } from "./src/gameObject.ts";
export type {
  GameObjectType,
  UpdateData,
  ClickData,
  GameObjectConfig,
} from "./src/types.ts";
