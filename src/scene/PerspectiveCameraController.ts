import { Matrix4 } from '../math/Matrix4';
import { CameraController } from './CameraController';

export abstract class PerspectiveCameraController extends CameraController {
  public updateViewMatrix(): void {
    if (!this._camera) {
      return;
    }

    this._camera.viewMatrix = Matrix4.lookAt(this._camera.translation, this._camera.target, this._camera.up);
  }

  public updateProjectionMatrix(): void {
    if (!this._camera) {
      return;
    }

    this._camera.projectionMatrix = Matrix4.perspective(this._camera.fov, this._camera.width, this._camera.height, this._camera.nearClip, this._camera.farClip);
  }
}