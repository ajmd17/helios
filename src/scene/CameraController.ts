import { Camera } from "./Camera";

export abstract class CameraController {
  protected _camera: Camera = null;

  private _onClickTimeout: number = null;
  private _isMouseDragging: boolean = false;

  private _mouseButtonState = {
    left: false,
    right: false,
    middle: false
  };

  protected _mousePosition: [number, number] = [0, 0];
  protected _lastMousePosition: [number, number] = [0, 0];

  private _keyStates = new Map<string, boolean>();

  set camera(camera: Camera) {
    this._camera = camera;
  }

  public isMouseButtonDown(key: keyof typeof this._mouseButtonState): boolean {
    return this._mouseButtonState[key];
  }
  
  public get mousePosition() {
    return this._mousePosition;
  }

  public get lastMousePosition() {
    return this._lastMousePosition;
  }

  public get isMouseDragging() {
    return this._isMouseDragging;
  }

  public isKeyDown(key: string): boolean {
    return this._keyStates.get(key.toLowerCase()) ?? false;
  }

  protected abstract onClick(): void;

  public onMouseEvent(event: MouseEvent) {
    switch (event.type) {
    case 'mousedown': {
      switch (event.button) {
        case 0: {
          this._mouseButtonState.left = true;

          this._isMouseDragging = false;

          if (this._onClickTimeout) {
            clearTimeout(this._onClickTimeout);
            this._onClickTimeout = null;
          }

          this._onClickTimeout = window.setTimeout(() => {
            this._isMouseDragging = true;

            this._onClickTimeout = null;
          }, 250);

          break;
        }
        case 1: {
          this._mouseButtonState.middle = true;
          break;
        }
        case 2: {
          this._mouseButtonState.right = true;
          break;
        }
      }
      break;
    }
    case 'mouseup': {
      switch (event.button) {
        case 0: {
          this._mouseButtonState.left = false;

          if (!this._isMouseDragging) {
            this.onClick();
          }

          this._isMouseDragging = false;

          if (this._onClickTimeout) {
            clearTimeout(this._onClickTimeout);
            this._onClickTimeout = null;
          }

          break;
        }
        case 1: {
          this._mouseButtonState.middle = false;
          break;
        }
        case 2: {
          this._mouseButtonState.right = false;
          break;
        }
      }
      break;
    }
    case 'mousemove': {
      this._lastMousePosition = this._mousePosition;
      this._mousePosition = [event.offsetX / this._camera.canvasWidth, 1.0 - (event.offsetY / this._camera.canvasHeight)];
      break;
    }
    case 'mouseenter': // fallthrough
    case 'mouseleave': {
      this._mouseButtonState.left = false;
      this._mouseButtonState.middle = false;
      this._mouseButtonState.right = false;

      this._isMouseDragging = false;

      break;
    }
    }
  }

  public onKeyboardEvent(event: KeyboardEvent) {
    switch (event.type) {
    case 'keydown': {
      this._keyStates.set(event.key.toLowerCase(), true);
      break;
    }
    case 'keyup': {
      this._keyStates.set(event.key.toLowerCase(), false);
      break;
    }
    }
  }
  
  public onTouchEvent(event: TouchEvent) {
    switch (event.type) {
    case 'touchstart': {
      this._mouseButtonState.left = true;
      this._lastMousePosition = this._mousePosition;
      this._mousePosition = [event.touches[0].clientX, event.touches[0].clientY];
      break;
    }
    case 'touchend': {
      this._mouseButtonState.left = false;
      this._lastMousePosition = this._mousePosition;
      this._mousePosition = [event.touches[0].clientX, event.touches[0].clientY];
      break;
    }
    case 'touchmove': {
      this._lastMousePosition = this._mousePosition;
      this._mousePosition = [event.touches[0].clientX, event.touches[0].clientY];
      break;
    }
    }
  }

  public abstract updateLogic(delta: number): void;

  public abstract updateViewMatrix(): void;
  public abstract updateProjectionMatrix(): void;
}