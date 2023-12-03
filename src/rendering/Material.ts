import { BasicObject } from "../core/BasicObject";
import { Vector3 } from "../math/Vector3";
import { Shader } from "./Shader";
import { Texture } from "./Texture";

export class Material extends BasicObject {
  private _textures: Map<string, Texture> = new Map<string, Texture>();

  private _depthWrite: boolean = true;
  private _depthTest: boolean = true;
  private _roughness: number = 0.5;
  private _metalness: number = 0.0;
  private _diffuseColor: Vector3 = Vector3.one();

  get depthWrite(): boolean {
    return this._depthWrite;
  }

  set depthWrite(value: boolean) {
    this._depthWrite = value;
  }

  get depthTest(): boolean {
    return this._depthTest;
  }

  set depthTest(value: boolean) {
    this._depthTest = value;
  }

  get roughness(): number {
    return this._roughness;
  }

  set roughness(value: number) {
    this._roughness = value;
  }

  get metalness(): number {
    return this._metalness;
  }

  set metalness(value: number) {
    this._metalness = value;
  }

  get diffuseColor(): Vector3 {
    return this._diffuseColor;
  }

  set diffuseColor(value: Vector3) {
    this._diffuseColor = value;
  }

  protected onInit() {
    console.trace('init material', this.name);

    for (let [name, texture] of this._textures) {
      texture.init(this.gl);
    }
  }

  protected onDestroy() {
    for (let [name, texture] of this._textures) {
      texture.destroy();
    }
  }

  public get textures(): Map<string, Texture> {
    return this._textures;
  }

  public setTexture(name: string, texture: Texture) {
    if (!texture) {
      return;
    }

    if (this._textures.has(name)) {
      const oldTexture = this._textures.get(name);

      if (oldTexture === texture) {
        return;
      }

      if (this.isInitialized) {
        oldTexture.destroy();
      }
    }

    if (this.isInitialized) {
      texture.init(this.gl);
    }

    this._textures.set(name, texture);
  }

  public getTexture(name: string): Texture {
    return this._textures.get(name);
  }

  public bind(shader: Shader) {
    shader.setUniform('u_material.roughness', this._roughness);
    shader.setUniform('u_material.metalness', this._metalness);
    shader.setUniform('u_material.diffuseColor', [this._diffuseColor.x, this._diffuseColor.y, this._diffuseColor.z, 1.0]);
  }
}
