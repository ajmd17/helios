import { MathUtil } from "./MathUtil";
import { Matrix4, Matrix4Values } from "./Matrix4";
import { Vector3 } from "./Vector3";

export class Quaternion {
  public x: number;
  public y: number;
  public z: number;
  public w: number;

  constructor();
  constructor(x: number, y: number, z: number, w: number);
  constructor(x?: number, y?: number, z?: number, w?: number) {
    if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number' && typeof w === 'number') {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
    } else {
      this.x = 0;
      this.y = 0;
      this.z = 0;
      this.w = 1;
    }
  }

  toString() {
    return `${this.x}, ${this.y}, ${this.z}, ${this.w}`;
  }

  toJSON() {
    return [this.x, this.y, this.z, this.w];
  }

  public static identity(): Quaternion {
    return new Quaternion(0, 0, 0, 1);
  }

  public static fromAxisAngles(axis: Vector3, angle: number): Quaternion {
    if (Vector3.magnitude(axis) != 1) {
      axis = Vector3.normalize(axis);
    }

    if (axis.x == 0 && axis.y == 0 && axis.z == 0) {
      return Quaternion.identity();
    }

    let halfAngle = angle / 2;
    let sinHalfAngle = Math.sin(halfAngle);
    let cosHalfAngle = Math.cos(halfAngle);
    return new Quaternion(axis.x * sinHalfAngle, axis.y * sinHalfAngle, axis.z * sinHalfAngle, cosHalfAngle);
  }

  public static fromEuler(euler: Vector3): Quaternion {
    let pitch = MathUtil.degToRad(euler.x);
    let yaw = MathUtil.degToRad(euler.y);
    let roll = MathUtil.degToRad(euler.z);

    let cy = Math.cos(yaw * 0.5);
    let sy = Math.sin(yaw * 0.5);
    let cr = Math.cos(roll * 0.5);
    let sr = Math.sin(roll * 0.5);
    let cp = Math.cos(pitch * 0.5);
    let sp = Math.sin(pitch * 0.5);

    return new Quaternion(
      cy * sr * cp - sy * cr * sp,
      cy * cr * sp + sy * sr * cp,
      sy * cr * cp - cy * sr * sp,
      cy * cr * cp + sy * sr * sp
    );
  }

  public static fromMatrix(m: Matrix4): Quaternion {
    let m0 = new Vector3(m.at(0, 0), m.at(0, 1), m.at(0, 2));
    let m1 = new Vector3(m.at(1, 0), m.at(1, 1), m.at(1, 2));
    let m2 = new Vector3(m.at(2, 0), m.at(2, 1), m.at(2, 2));

    let lengthSqr = m0.x * m0.x + m1.x * m1.x + m2.x * m2.x;

    if (lengthSqr != 1.0 && lengthSqr != 0.0) {
      lengthSqr = 1.0 / Math.sqrt(lengthSqr);

      m0.x *= lengthSqr;
      m1.x *= lengthSqr;
      m2.x *= lengthSqr;
    }

    lengthSqr = m0.y * m0.y + m1.y * m1.y + m2.y * m2.y;

    if (lengthSqr != 1.0 && lengthSqr != 0.0) {
      lengthSqr = 1.0 / Math.sqrt(lengthSqr);

      m0.y *= lengthSqr;
      m1.y *= lengthSqr;
      m2.y *= lengthSqr;
    }

    lengthSqr = m0.z * m0.z + m1.z * m1.z + m2.z * m2.z;

    if (lengthSqr != 1.0 && lengthSqr != 0.0) {
      lengthSqr = 1.0 / Math.sqrt(lengthSqr);

      m0.z *= lengthSqr;
      m1.z *= lengthSqr;
      m2.z *= lengthSqr;
    }

    let tr = m0.x + m1.y + m2.z;

    if (tr > 0.0) {
      let s = Math.sqrt(tr + 1.0) * 2.0;
      return new Quaternion(
        (m2.y - m1.z) / s,
        (m0.z - m2.x) / s,
        (m1.x - m0.y) / s,
        0.25 * s
      );
    }

    if (m0.x > m1.y && m0.x > m2.z) {
      let s = Math.sqrt(1.0 + m0.x - m1.y - m2.z) * 2.0;
      return new Quaternion(
        0.25 * s,
        (m0.y + m1.x) / s,
        (m2.x + m0.z) / s,
        (m2.y - m1.z) / s
      );
    }

    if (m1.y > m2.z) {
      let s = Math.sqrt(1.0 + m1.y - m0.x - m2.z) * 2.0;
      return new Quaternion(
        (m0.y + m1.x) / s,
        0.25 * s,
        (m1.z + m2.y) / s,
        (m0.z - m2.x) / s
      );
    }

    let s = Math.sqrt(1.0 + m2.z - m0.x - m1.y) * 2.0;

    return new Quaternion(
      (m2.x + m0.z) / s,
      (m1.z + m2.y) / s,
      0.25 * s,
      (m1.x - m0.y) / s
    );
  }

  // public static lookRotation(direction: Vector3): Quaternion {
  //   // let forward = Vector3.normalize(direction);
  //   // let right = Vector3.normalize(Vector3.cross(Vector3.up(), forward));
  //   // let up = Vector3.cross(forward, right);

  //   // let w = Math.sqrt(1.0 + right.x + up.y + forward.z) * 0.5;
  //   // let w4Recip = 1.0 / (4.0 * w);
  //   // return new Quaternion(
  //   //   (up.z - forward.y) * w4Recip,
  //   //   (forward.x - right.z) * w4Recip,
  //   //   (right.y - up.x) * w4Recip,
  //   //   w
  //   // );

  //   const axis = Vector3.cross(Vector3.up(), direction);
  //   const angle = Math.acos(Vector3.dot(Vector3.up(), direction));

  //   return Quaternion.fromAxisAngles(axis, angle);
  // }

  public static lookRotation(forward: Vector3): Quaternion {
    // const lookAtMatrix = Matrix4.lookAt(forward, Vector3.up());

    // return Quaternion.fromMatrix(lookAtMatrix);

    const up = Vector3.up();

    const z = Vector3.normalize(forward);
    const x = Vector3.normalize(Vector3.cross(up, forward));
    const y = Vector3.normalize(Vector3.cross(forward, x));

    const rows: Matrix4Values = [
      x.x, x.y, x.z, 0,
      y.x, y.y, y.z, 0,
      z.x, z.y, z.z, 0,
      0, 0, 0, 1
    ];

    return Quaternion.fromMatrix(new Matrix4(rows));
  }

  public static multiply(a: Quaternion, b: Quaternion): Quaternion {
    const x = a.x * b.w + a.y * b.z - a.z * b.y + a.w * b.x;
    const y = -a.x * b.z + a.y * b.w + a.z * b.x + a.w * b.y;
    const z = a.x * b.y - a.y * b.x + a.z * b.w + a.w * b.z;
    const w = -a.x * b.x - a.y * b.y - a.z * b.z + a.w * b.w;
    return new Quaternion(x, y, z, w);
  }

  public static magnitudeSquared(a: Quaternion): number {
    return a.x * a.x + a.y * a.y + a.z * a.z + a.w * a.w;
  }

  public static magnitude(a: Quaternion): number {
    return Math.sqrt(Quaternion.magnitudeSquared(a));
  }

  public static invert(a: Quaternion): Quaternion {
    const len2 = Quaternion.magnitudeSquared(a);

    if (len2 > 0.0) {
      const invLen2 = 1.0 / len2;
      const w = a.w * invLen2;
      const x = -a.x * invLen2;
      const y = -a.y * invLen2;
      const z = -a.z * invLen2;

      return new Quaternion(x, y, z, w);
    }

    return a;
  }

  public static normalize(a: Quaternion): Quaternion {
    let d = Quaternion.magnitudeSquared(a);

    if (d < MathUtil.EPSILON) {
      return Quaternion.identity();
    }

    d = 1.0 / Math.sqrt(d);

    return new Quaternion(a.x * d, a.y * d, a.z * d, a.w * d);
  }
}