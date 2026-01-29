// utils.ts
import * as THREE from "three";
import type { CanvasEngine } from "./engine.ts";
import { GameObject } from "./gameObject.ts";

export type PointInput =
  | { x: number; y: number; z?: number }
  | [number, number, number?]
  | THREE.Vector3
  | GameObject;

export class EngineUtils {
  private engine: CanvasEngine;

  constructor(engine: CanvasEngine) {
    this.engine = engine;
  }

  // ===== Distance & Angles =====

  getDistance(a: PointInput, b: PointInput): number {
    const vecA = this.toVector3(a);
    const vecB = this.toVector3(b);
    return vecA.distanceTo(vecB);
  }

  getDistanceSquared(a: PointInput, b: PointInput): number {
    const vecA = this.toVector3(a);
    const vecB = this.toVector3(b);
    return vecA.distanceToSquared(vecB);
  }

  getAngleBetween(a: PointInput, b: PointInput): number {
    const vecA = this.toVector3(a);
    const vecB = this.toVector3(b);
    return vecA.angleTo(vecB);
  }

  getDirection(
    from: PointInput,
    to: PointInput,
  ): { x: number; y: number; z: number } {
    const start = this.toVector3(from);
    const end = this.toVector3(to);
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    return { x: direction.x, y: direction.y, z: direction.z };
  }

  // ===== Coordinate Conversion =====

  screenToWorld(
    screenX: number,
    screenY: number,
    zDepth: number = 0,
  ): { x: number; y: number; z: number } {
    const mouse = new THREE.Vector2(
      (screenX / window.innerWidth) * 2 - 1,
      -(screenY / window.innerHeight) * 2 + 1,
    );

    if (this.engine.mode === "2d") {
      const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
      vector.unproject(this.engine.camera);
      const dir = vector.sub(this.engine.camera.position).normalize();
      const distance = (zDepth - this.engine.camera.position.z) / dir.z;
      const pos = this.engine.camera.position
        .clone()
        .add(dir.multiplyScalar(distance));
      return { x: pos.x, y: pos.y, z: pos.z };
    } else {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.engine.camera);

      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -zDepth);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);

      return { x: target.x, y: target.y, z: target.z };
    }
  }

  worldToScreen(position: PointInput): { x: number; y: number } {
    const vec = this.toVector3(position).clone();
    vec.project(this.engine.camera);

    return {
      x: (vec.x * 0.5 + 0.5) * window.innerWidth,
      y: (vec.y * -0.5 + 0.5) * window.innerHeight,
    };
  }

  // ===== Math Helpers =====

  lerp(start: number, end: number, t: number): number {
    return start + (end - start) * this.clamp(t, 0, 1);
  }

  lerpVector(
    a: PointInput,
    b: PointInput,
    t: number,
  ): { x: number; y: number; z: number } {
    const vecA = this.toVector3(a);
    const vecB = this.toVector3(b);
    const result = new THREE.Vector3().lerpVectors(
      vecA,
      vecB,
      this.clamp(t, 0, 1),
    );
    return { x: result.x, y: result.y, z: result.z };
  }

  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  radToDeg(radians: number): number {
    return radians * (180 / Math.PI);
  }

  // ===== Geometry Checks =====

  isInsideRadius(
    center: PointInput,
    point: PointInput,
    radius: number,
  ): boolean {
    return this.getDistanceSquared(center, point) <= radius * radius;
  }

  moveTowards(
    current: PointInput,
    target: PointInput,
    maxDistance: number,
  ): { x: number; y: number; z: number } {
    const currentVec = this.toVector3(current);
    const targetVec = this.toVector3(target);
    const direction = new THREE.Vector3().subVectors(targetVec, currentVec);
    const distance = direction.length();

    if (distance <= maxDistance || distance === 0) {
      return { x: targetVec.x, y: targetVec.y, z: targetVec.z };
    }

    direction.normalize().multiplyScalar(maxDistance);
    const result = currentVec.clone().add(direction);
    return { x: result.x, y: result.y, z: result.z };
  }

  // ===== Private Helpers =====

  private isGameObject(input: PointInput): input is GameObject {
    return input instanceof GameObject;
  }

  private toVector3(input: PointInput): THREE.Vector3 {
    if (input instanceof THREE.Vector3) {
      return input.clone();
    }

    if (this.isGameObject(input)) {
      const pos = input.getPosition();
      if (pos) return pos;
      return new THREE.Vector3();
    }

    if (Array.isArray(input)) {
      return new THREE.Vector3(input[0], input[1], input[2] ?? 0);
    }

    if (input && typeof input === "object" && "x" in input && "y" in input) {
      return new THREE.Vector3(input.x, input.y, input.z ?? 0);
    }

    throw new Error(
      "Invalid point format. Expected {x,y,z}, [x,y,z], Vector3, or GameObject",
    );
  }
}

export class InputManager {
  private keys = new Map<string, boolean>();
  private mouse = { x: 0, y: 0, isDown: false };
  private justPressed = false;
  private justReleased = false;
  private engine: CanvasEngine;

  constructor(engine: CanvasEngine) {
    this.engine = engine;
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener("keydown", (e) => {
      this.keys.set(e.code, true);
    });

    window.addEventListener("keyup", (e) => {
      this.keys.set(e.code, false);
    });

    window.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    window.addEventListener("mousedown", () => {
      this.mouse.isDown = true;
      this.justPressed = true;
    });

    window.addEventListener("mouseup", () => {
      this.mouse.isDown = false;
      this.justReleased = true;
    });
  }

  /** Check if key is currently held down */
  isKeyDown(code: string): boolean {
    return this.keys.get(code) ?? false;
  }

  /** Check if key was pressed this frame (single trigger) */
  isKeyPressed(code: string): boolean {
    // This would require frame-based reset logic called by engine
    // Simplified version - for single triggers use onClick pattern or track manually
    return this.keys.get(code) === true;
  }

  /** Get mouse position in screen coordinates */
  getMouseScreen(): { x: number; y: number } {
    return { x: this.mouse.x, y: this.mouse.y };
  }

  /** Get mouse position in world coordinates (2D plane) */
  getMouseWorld(zDepth: number = 0): { x: number; y: number; z: number } {
    return this.engine.utils.screenToWorld(this.mouse.x, this.mouse.y, zDepth);
  }

  /** Is mouse button held down */
  isMouseDown(): boolean {
    return this.mouse.isDown;
  }

  /** Was mouse just clicked this frame */
  isMouseJustPressed(): boolean {
    return this.justPressed;
  }

  /** Internal: Call at end of frame to reset one-shot states */
  resetFrame(): void {
    this.justPressed = false;
    this.justReleased = false;
  }
}
