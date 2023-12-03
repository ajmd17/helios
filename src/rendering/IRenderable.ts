import { BasicObject } from "../core/BasicObject";
import { Matrix4 } from "../math/Matrix4";
import { Camera } from "../scene/Camera";

export interface IRenderable extends BasicObject {
  render(camera: Camera, parentTransform?: Matrix4): void;

  update?:(delta: number, camera: Camera, parentTransform?: Matrix4) => void;
}