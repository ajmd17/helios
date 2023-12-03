import { BasicObject } from "../core/BasicObject";
import { Matrix4 } from "../math/Matrix4";
import { Vector3 } from "../math/Vector3";
import { Framebuffer } from "../rendering/Framebuffer";
import { CameraController } from "./CameraController";

export class Camera extends BasicObject {
  private _cameraControllers: CameraController[] = [];
  private _translation: Vector3 = Vector3.zero();
  private _moveTarget: Vector3 = null;
  private _direction: Vector3 = new Vector3(0, 0, -1);
  private _up: Vector3 = new Vector3(0, 1, 0);
  private _fov: number = 70;

  private _nearClip: number = 0.05;
  private _farClip: number = 1000;

  private _projectionMatrix: Matrix4 = Matrix4.identity();
  private _viewMatrix: Matrix4 = Matrix4.identity();
  private _viewProjectionMatrix: Matrix4 = Matrix4.identity();

  private _upsampling: [number, number] = [2, 2];

  private _width: number = 1080;
  private _height: number = 1920;

  private _canvasWidth: number = 0;
  private _canvasHeight: number = 0;

  private _framebuffer: Framebuffer = null;

  constructor(canvasWidth?: number, canvasHeight?: number) {
    super();

    if (canvasWidth && canvasHeight) {
      this._width = Math.floor(canvasWidth * this._upsampling[0]);
      this._height = Math.floor(canvasHeight * this._upsampling[1]);

      this._canvasWidth = canvasWidth;
      this._canvasHeight = canvasHeight;
    }
  }

  protected onInit(): void {
    this._framebuffer = new Framebuffer(this._width, this._height);
    this._framebuffer.msaa = true;
    this._framebuffer.init(this.gl);
  }

  protected onDestroy() {
    this._framebuffer.destroy();
  }

  public onMouseEvent(event: MouseEvent) {
    if (!this.currentCameraController) {
      return;
    }

    this.currentCameraController.onMouseEvent(event);
  }

  public onKeyboardEvent(event: KeyboardEvent) {
    if (!this.currentCameraController) {
      return;
    }

    this.currentCameraController.onKeyboardEvent(event);
  }

  public onTouchEvent(event: TouchEvent) {
    if (!this.currentCameraController) {
      return;
    }

    this.currentCameraController.onTouchEvent(event);
  }

  get currentCameraController(): CameraController {
    return this._cameraControllers[0] ?? null;
  }

  public addCameraController(cameraController: CameraController) {
    if (!cameraController) {
      return;
    }

    cameraController.camera = this;

    this._cameraControllers.push(cameraController);
  }

  public removeCameraController(cameraController: CameraController) {
    let index = this._cameraControllers.indexOf(cameraController);

    if (index > -1) {
      const cameraController = this._cameraControllers[index];
      cameraController.camera = null;

      this._cameraControllers.splice(index, 1);
    }
  }

  public update(delta: number, camera: Camera, parentTransform?: Matrix4) {
    const currentCameraController = this.currentCameraController;

    if (currentCameraController) {
      currentCameraController.updateLogic(delta);
    }

    this.updateMatrices();
  }

  public updateMatrices() {
    const currentCameraController = this.currentCameraController;

    if (currentCameraController) {
      currentCameraController.updateViewMatrix();
      currentCameraController.updateProjectionMatrix();
    }

    this._updateViewProjectionMatrix();
  }

  public rotate(axis: Vector3, angle: number, updateMatrix = true) {
    this._direction = Vector3.normalize(Vector3.rotate(this._direction, axis, angle));

    if (updateMatrix) {
      this.updateMatrices();
    }
  }

  public setDimensions(canvasWidth: number, canvasHeight: number, updateMatrix = true) {
    if (canvasWidth === this._canvasWidth && canvasHeight === this._canvasHeight) {
      return;
    }

    this._width = Math.floor(canvasWidth * this._upsampling[0]);
    this._height = Math.floor(canvasHeight * this._upsampling[1]);

    this._canvasWidth = canvasWidth;
    this._canvasHeight = canvasHeight;

    if (updateMatrix) {
      this.updateMatrices();
    }

    if (this.isInitialized) {
      if (this._framebuffer) {
        this._framebuffer.destroy();
        this._framebuffer = null;
      }

      this._framebuffer = new Framebuffer(this._width, this._height);
      this._framebuffer.init(this.gl);
    }
  }

  private _updateViewProjectionMatrix() {
    this._viewProjectionMatrix = Matrix4.multiply(this._projectionMatrix, this._viewMatrix);
  }

  get translation(): Vector3 {
    return this._translation;
  }

  set translation(translation: Vector3) {
    this._translation = translation;
  }

  get moveTarget(): Vector3 {
    return this._moveTarget;
  }

  set moveTarget(moveTarget: Vector3) {
    this._moveTarget = moveTarget;
  }

  get direction(): Vector3 {
    return this._direction;
  }

  set direction(direction: Vector3) {
    this._direction = direction;

    this.updateMatrices();
  }

  get up(): Vector3 {
    return this._up;
  }

  set up(up: Vector3) {
    this._up = up;

    this.updateMatrices();
  }

  get right(): Vector3 {
    return Vector3.cross(this._direction, this._up);
  }

  get target() {
    return Vector3.add(this._translation, this._direction);
  }

  set target(target: Vector3) {
    this.direction = Vector3.subtract(target, this._translation);
  }

  get fov(): number {
    return this._fov;
  }

  set fov(fov: number) {
    this._fov = fov;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get canvasWidth(): number {
    return this._canvasWidth;
  }

  get canvasHeight(): number {
    return this._canvasHeight;
  }

  get nearClip(): number {
    return this._nearClip;
  }

  set nearClip(nearClip: number) {
    this._nearClip = nearClip;
  }

  get farClip(): number {
    return this._farClip;
  }

  set farClip(farClip: number) {
    this._farClip = farClip;
  }

  get projectionMatrix(): Matrix4 {
    return this._projectionMatrix;
  }

  set projectionMatrix(projectionMatrix: Matrix4) {
    this._projectionMatrix = projectionMatrix;

    this._updateViewProjectionMatrix();
  }

  get viewMatrix(): Matrix4 {
    return this._viewMatrix;
  }

  set viewMatrix(viewMatrix: Matrix4) {
    this._viewMatrix = viewMatrix;

    this._updateViewProjectionMatrix();
  }

  get viewProjectionMatrix(): Matrix4 {
    return this._viewProjectionMatrix;
  }

  get framebuffer(): Framebuffer {
    return this._framebuffer;
  }
}