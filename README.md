# Scene Engine

A simple, type-safe wrapper around Three.js for creating 3D scenes and games.

## Quick Start

```typescript
import { SceneEngine } from "@yourscope/scene-engine";

const engine = new SceneEngine();

// Create a red spinning cube
const cube = engine.createMesh()
  .setMaterial(new THREE.MeshStandardMaterial({ color: 0xff0000 }))
  .setPosition(0, 0, 0);

engine.onUpdate((eng) =&gt; {
  cube.setRotation(0, cube.getRotation().y + 90 * eng.getDeltaTime(), 0);
});