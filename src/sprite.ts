import * as THREE from "three";
import { GameObject } from "./gameObject.ts";

/**
 * A 2D sprite that always faces the camera.
 */
export class Sprite extends GameObject {
  /** @internal */
  readonly _threeObject: THREE.Sprite;
  private _textureLoader: THREE.TextureLoader;

  constructor() {
    super();
    this._textureLoader = new THREE.TextureLoader();
    this._threeObject = new THREE.Sprite(
      new THREE.SpriteMaterial({ color: 0xffffff }),
    );
  }

  /**
   * Sets the color of this sprite.
   * @param r - Red (0-1)
   * @param g - Green (0-1)
   * @param b - Blue (0-1)
   * @param a - Alpha (0-1), defaults to 1
   * @returns This sprite for chaining
   */
  setColor(r: number, g: number, b: number, a: number = 1): this {
    const mat = this._threeObject.material as THREE.SpriteMaterial;
    mat.map = null;
    mat.color.setRGB(r, g, b);
    mat.opacity = a;
    mat.transparent = a < 1;
    mat.needsUpdate = true;
    return this;
  }

  /**
   * Sets the sprite texture from a URL.
   * @param url - Image URL to load
   * @returns This sprite for chaining
   */
  setSprite(url: string): this {
    const texture = this._textureLoader.load(url);
    const mat = this._threeObject.material as THREE.SpriteMaterial;
    mat.map = texture;
    mat.color.set(1, 1, 1);
    mat.opacity = 1;
    mat.transparent = true;
    mat.needsUpdate = true;
    return this;
  }
}
