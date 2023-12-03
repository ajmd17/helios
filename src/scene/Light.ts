import { isNumber, isString } from '../../shared';
import { BasicObject } from '../core/BasicObject';
import { Vector3 } from '../math/Vector3';
import { Shader } from '../rendering/Shader';

export enum LightType {
  DIRECTIONAL = 0,
  POINT = 1
}

export class Light extends BasicObject {
  private _color: Vector3 = Vector3.one();
  private _intensity: number = 1;
  private _position: Vector3 = Vector3.zero(); // or direction
  private _type: LightType = LightType.DIRECTIONAL;

  constructor(name: string, lightType?: LightType);
  constructor(lightType?: LightType);
  constructor(name?: string | LightType, lightType: LightType = LightType.DIRECTIONAL) {
    super(isString(name) ? name : undefined);

    if (isNumber(name)) {
      lightType = name;
    }

    this._type = lightType;
  }

  get color(): Vector3 {
    return this._color;
  }

  set color(color: Vector3) {
    this._color = color;
  }

  get intensity(): number {
    return this._intensity;
  }

  set intensity(intensity: number) {
    this._intensity = intensity;
  }

  get type(): LightType {
    return this._type;
  }

  set type(type: LightType) {
    this._type = type;
  }

  get position(): Vector3 {
    return this._position;
  }

  set position(position: Vector3) {
    this._position = position;
  }

  get direction(): Vector3 {
    return this._position;
  }

  set direction(direction: Vector3) {
    this._position = direction;
  }

  protected onInit() {
    // Do nothing
  }

  protected onDestroy() {
    // Do nothing
  }

  public bind(shader: Shader, index: number) {
    const lightName = `u_lights[${index}]`;

    shader.setUniform(`${lightName}.type`, new Int32Array([this._type]));
    shader.setUniform(`${lightName}.position`, [this._position.x, this._position.y, this._position.z, 1.0]);
    shader.setUniform(`${lightName}.color`, [this._color.x, this._color.y, this._color.z, 1.0]);
    shader.setUniform(`${lightName}.intensity`, this._intensity);
  }
}