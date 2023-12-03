import { MathUtil } from "./MathUtil";
import { Matrix4 } from "./Matrix4";
import { Quaternion } from "./Quaternion";

export class Vector3 {
  constructor(public x: number, public y: number, public z: number) {
  }

  public toString(): string {
    return `${this.x}, ${this.y}, ${this.z}`;
  }

  public toJSON(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  public get values(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  public static zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  public static one(): Vector3 {
    return new Vector3(1, 1, 1);
  }

  public static up(): Vector3 {
    return new Vector3(0, 1, 0);
  }

  public static down(): Vector3 {
    return new Vector3(0, -1, 0);
  }

  public static left(): Vector3 {
    return new Vector3(-1, 0, 0);
  }

  public static right(): Vector3 {
    return new Vector3(1, 0, 0);
  }

  public static forward(): Vector3 {
    return new Vector3(0, 0, 1);
  }

  public static back(): Vector3 {
    return new Vector3(0, 0, -1);
  }

  public static min(a: Vector3, b: Vector3): Vector3 {
    return new Vector3(
      Math.min(a.x, b.x),
      Math.min(a.y, b.y),
      Math.min(a.z, b.z)
    );
  }

  public static max(a: Vector3, b: Vector3): Vector3 {
    return new Vector3(
      Math.max(a.x, b.x),
      Math.max(a.y, b.y),
      Math.max(a.z, b.z)
    );
  }

  public static add(a: Vector3, b: Vector3): Vector3 {
    return new Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
  }

  public static subtract(a: Vector3, b: Vector3): Vector3 {
    return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  public static multiply(a: Vector3, b: Vector3): Vector3 {
    return new Vector3(a.x * b.x, a.y * b.y, a.z * b.z);
  }

  public static divide(a: Vector3, b: Vector3): Vector3 {
    return new Vector3(a.x / b.x, a.y / b.y, a.z / b.z);
  }

  public static scale(a: Vector3, s: number): Vector3 {
    return new Vector3(a.x * s, a.y * s, a.z * s);
  }

  public static dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  public static cross(a: Vector3, b: Vector3): Vector3 {
    return new Vector3(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x
    );
  }

  public static rotate(a: Vector3, axis: Vector3, angle: number): Vector3 {
    const quaternion = Quaternion.fromAxisAngles(axis, angle);
    const rotationMatrix = Matrix4.rotation(quaternion);
    return Vector3.transform(a, rotationMatrix);
  }

  public static normalize(a: Vector3): Vector3 {
    const mag = Math.max(Vector3.magnitude(a), MathUtil.EPSILON);

    return new Vector3(a.x / mag, a.y / mag, a.z / mag);
  }

  public static magnitude(a: Vector3): number {
    return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  }

  public static distance(a: Vector3, b: Vector3): number {
    return Vector3.magnitude(Vector3.subtract(a, b));
  }

  public static angle(a: Vector3, b: Vector3): number {
    return Math.acos(Vector3.dot(a, b) / (Vector3.magnitude(a) * Vector3.magnitude(b)));
  }

  public static lerp(a: Vector3, b: Vector3, t: number): Vector3 {
    return new Vector3(
      MathUtil.lerp(a.x, b.x, t),
      MathUtil.lerp(a.y, b.y, t),
      MathUtil.lerp(a.z, b.z, t)
    );
  }

  public static project(a: Vector3, b: Vector3): Vector3 {
    return Vector3.scale(b, Vector3.dot(a, b) / Vector3.dot(b, b));
  }

  public static reflect(a: Vector3, b: Vector3): Vector3 {
    return Vector3.subtract(a, Vector3.scale(b, 2 * Vector3.dot(a, b)));
  }

  public static transform(a: Vector3, m: Matrix4, divideW: boolean = true): Vector3 {
    const product: [number, number, number, number] = [
      a.x * m.values[0]  + a.y * m.values[1]  + a.z * m.values[2]  + m.values[3],
      a.x * m.values[4]  + a.y * m.values[5]  + a.z * m.values[6]  + m.values[7],
      a.x * m.values[8]  + a.y * m.values[9]  + a.z * m.values[10] + m.values[11],
      a.x * m.values[12] + a.y * m.values[13] + a.z * m.values[14] + m.values[15]
    ];

    if (divideW) {
      product[0] /= product[3];
      product[1] /= product[3];
      product[2] /= product[3];
    }

    return new Vector3(product[0], product[1], product[2]);
  }
}