/**
 * @module
 * A unified game engine wrapper over Three.js where everything is a GameObject.
 *
 * @example
 * ```typescript
 * import { SceneEngine } from "@yourusername/three-game-engine";
 *
 * const engine = new SceneEngine("2d");
 * const player = engine.createObject({ name: "player", type: "sprite" });
 * ```
 */

export { SceneEngine } from "./src/engine.ts";
