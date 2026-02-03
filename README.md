# @web-dev-engine/scene-engine

A lightweight 2D/3D scene engine built on Three.js with a fluent, chainable API.

## Install
```
npx jsr add @web-dev-engine/scene-engine
```

## Quick Start
```
import { SceneEngine } from "@web-dev-engine/scene-engine";

const engine = new SceneEngine("canvas-container")
  .setMode("2d")
  .setBackgroundColor(0x222222)
  .start();

const player = engine
  .createObject()
  .setType("sprite")
  .setPosition(0, 0)
  .setColor(0x00ff00)
  .addTag("player");
```

More detail coming..