import { MathUtil } from "../math/MathUtil";
import { Vector3 } from "../math/Vector3";
import { PerspectiveCameraController } from "./PerspectiveCameraController";

export class FirstPersonCameraController extends PerspectiveCameraController {
  public static readonly MOUSE_SENSITIVITY: number = 255.0;
  public static readonly MOUSE_BLENDING: number = 0.15;
  public static readonly MOVEMENT_SPEED: number = 2.5;

  private _moveDeltas: Vector3 = Vector3.zero();
  private _dirCrossUp: Vector3 = Vector3.zero();

  private _lastDragPosition: [number, number] = [0, 0];
  private _dragStartPosition: [number, number] = [0, 0];

  private _magX: number = 0;
  private _magY: number = 0;
  private _desiredMagX: number = 0;
  private _desiredMagY: number = 0;

  private _onClickEvent: () => void = null;

  public onMouseEvent(event: MouseEvent): void {
    super.onMouseEvent(event);

    if (event.type === 'mousedown' && event.button === 0) {
      this._dragStartPosition = [...this.mousePosition];
      this._lastDragPosition = [...this.mousePosition];
    }
  }

  set onClickEvent(callback: () => void) {
    this._onClickEvent = callback;
  }

  protected onClick(): void {
    if (this._onClickEvent) {
      this._onClickEvent();
    }
  }

  public updateLogic(delta: number): void {
    if (!this._camera) {
      return;
    }

    if (this._camera.moveTarget) {
      let moveSpeed = 0.65;

      // console.log('moving towards', this._camera.moveTarget);
      // console.log('current', this._camera.translation);

      const distance = Vector3.distance(this._camera.translation, this._camera.moveTarget);

      // Slow down as we get closer to the target, exponential falloff
      // if (distance < 1.0) {
      //   moveSpeed *= Math.pow(distance, 2.0);
      // }

      moveSpeed = MathUtil.clamp(moveSpeed, 0.0, 1.0);

      const direction = Vector3.subtract(this._camera.moveTarget, this._camera.translation);
      this._camera.translation = Vector3.add(this._camera.translation, Vector3.scale(direction, delta * moveSpeed));

      if (distance < 0.01) {
        this._camera.moveTarget = null;
      }
    }

    if (this.isKeyDown('w') || this.isKeyDown('uparrow')) {
      this._moveDeltas = Vector3.add(this._moveDeltas, Vector3.scale(this._camera.direction, -delta));
      this._camera.moveTarget = null;
    }

    if (this.isKeyDown('s') || this.isKeyDown('downarrow')) {
      this._moveDeltas = Vector3.add(this._moveDeltas, Vector3.scale(this._camera.direction, delta));
      this._camera.moveTarget = null;
    }

    if (this.isKeyDown('a') || this.isKeyDown('leftarrow')) {
      this._moveDeltas = Vector3.add(this._moveDeltas, Vector3.scale(this._camera.right, delta));
      this._camera.moveTarget = null;
    }

    if (this.isKeyDown('d') || this.isKeyDown('rightarrow')) {
      this._moveDeltas = Vector3.add(this._moveDeltas, Vector3.scale(this._camera.right, -delta));
      this._camera.moveTarget = null;
    }

    this._camera.translation = Vector3.add(this._camera.translation, Vector3.scale(this._moveDeltas, FirstPersonCameraController.MOVEMENT_SPEED));
    
    this._moveDeltas = Vector3.lerp(this._moveDeltas, Vector3.zero(), MathUtil.clamp(delta * 100.0, 0.0, 1.0));

    if (this.isMouseDragging) {
      this._camera.moveTarget = null;

      this._desiredMagX = this.mousePosition[0] - this._lastDragPosition[0];
      this._desiredMagY = this.mousePosition[1] - this._lastDragPosition[1];

      this._magX = MathUtil.lerp(this._magX, this._desiredMagX, Math.min(1.0, FirstPersonCameraController.MOUSE_BLENDING * 0.0166 / delta));
      this._magY = MathUtil.lerp(this._magY, this._desiredMagY, Math.min(1.0, FirstPersonCameraController.MOUSE_BLENDING * 0.0166 / delta));

      this._dirCrossUp = Vector3.cross(this._camera.direction, this._camera.up);

      this._camera.rotate(this._camera.up, MathUtil.degToRad(this._magX * FirstPersonCameraController.MOUSE_SENSITIVITY), false);
      this._camera.rotate(this._dirCrossUp, MathUtil.degToRad(this._magY * FirstPersonCameraController.MOUSE_SENSITIVITY), false);

      if (this._camera.direction.y > 0.98 || this._camera.direction.y < -0.98) {
        this._camera.rotate(this._dirCrossUp, MathUtil.degToRad(-this._magY * FirstPersonCameraController.MOUSE_SENSITIVITY), false);
      }

      this._camera.updateMatrices();
    }

    if (this.isMouseButtonDown('left')) {
      this._lastDragPosition = [...this.mousePosition];
    }
  }
}
