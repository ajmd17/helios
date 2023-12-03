import { Entity } from "./Entity";
import { Scene } from "./Scene";

export abstract class Controller {
  private _parent: Entity = null;
  private _scene: Scene = null;

  public get parent() {
    return this._parent;
  }

  public set parent(parent: Entity) {
    this._parent = parent;
  }

  public get scene() {
    return this._scene;
  }

  public set scene(scene: Scene) {
    this._scene = scene;
  }

  public abstract onAdded(): void;
  public abstract onRemoved(): void;

  public abstract update(delta: number): void;
}