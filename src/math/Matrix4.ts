import { MathUtil } from "./MathUtil";
import { Quaternion } from "./Quaternion";
import { Vector3 } from "./Vector3";

export type Matrix4Values = [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  
export class Matrix4 {
  public values: Matrix4Values = new Array(16) as Matrix4Values;

  constructor();
  constructor(v: Matrix4Values);
  constructor(v?: Matrix4Values) {
    if (v) {
      if (v.length !== 16) {
        throw new Error('Matrix4 must be initialized with 16 values');
      }

      this.values = v;
    } else {
      // Identity
      this.values.fill(0);
      this.values[0] = 1;
      this.values[5] = 1;
      this.values[10] = 1;
      this.values[15] = 1;
    }
  }

  at(row: number, col: number, value: number): void;
  at(row: number, col: number): number;
  at(row: number, col: number, value?: number) {
    if (value) {
      this.values[row * 4 + col] = value;

      return;
    } else {
      return this.values[row * 4 + col];
    }
  }

  public equals(other: Matrix4): boolean {
    for (let i = 0; i < 16; i++) {
      if (this.values[i] !== other.values[i]) {
        return false;
      }
    }

    return true;
  }

  public toString() {
    return this.values.join(', ');
  }

  public toJSON(): Matrix4Values {
    return this.values;
  }

  public static identity(): Matrix4 {
    return new Matrix4();
  }

  public static zeros(): Matrix4 {
    let mat = new Matrix4();
    mat.values.fill(0);
    return mat;
  }

  public static ones(): Matrix4 {
    let mat = new Matrix4();
    mat.values.fill(1);
    return mat;
  }

  public static translation(translation: Vector3): Matrix4 {
    let mat = Matrix4.identity();
    mat.values[3] = translation.x;
    mat.values[7] = translation.y;
    mat.values[11] = translation.z;
    return mat;
  }

  public static rotation(r: Quaternion): Matrix4 {
    const mat = Matrix4.identity();

    const xx = r.x * r.x,
      xy = r.x * r.y,
      xz = r.x * r.z,
      xw = r.x * r.w,
      yy = r.y * r.y,
      yz = r.y * r.z,
      yw = r.y * r.w,
      zz = r.z * r.z,
      zw = r.z * r.w;

    mat.values[0] = 1.0 - 2.0 * (yy + zz);
    mat.values[1] = 2.0 * (xy + zw);
    mat.values[2] = 2.0 * (xz - yw);
    mat.values[3] = 0.0;
    mat.values[4] = 2.0 * (xy - zw);
    mat.values[5] = 1.0 - 2.0 * (xx + zz);
    mat.values[6] = 2.0 * (yz + xw);
    mat.values[7] = 0.0;
    mat.values[8] = 2.0 * (xz + yw);
    mat.values[9] = 2.0 * (yz - xw);
    mat.values[10] = 1.0 - 2.0 * (xx + yy);
    mat.values[11] = 0.0;

    return mat;
  }

  public static scaling(scale: Vector3): Matrix4 {
    let mat = Matrix4.identity();
    mat.values[0]  = scale.x;
    mat.values[5]  = scale.y;
    mat.values[10] = scale.z;
    return mat;
  }

  public static perspective(fov: number, width: number, height: number, near: number, far: number): Matrix4 {
    let mat = Matrix4.zeros();
    let ar = width / height;
    let tanHalfFov = Math.tan(MathUtil.degToRad(fov / 2.0));
    let range = near - far;

    mat.values[0] = 1.0 / (tanHalfFov * ar);
    mat.values[5] = 1.0 / tanHalfFov;
    mat.values[10] = (-near - far) / range;
    mat.values[11] = (2.0 * far * near) / range;
    mat.values[14] = 1.0;

    return mat;
  }

  public static orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
    let mat = Matrix4.zeros();
    let lr = 1 / (left - right);
    let bt = 1 / (bottom - top);
    let nf = 1 / (near - far);

    mat.values[0] = -2 * lr;
    mat.values[5] = -2 * bt;
    mat.values[10] = 2 * nf;
    mat.values[12] = (left + right) * lr;
    mat.values[13] = (top + bottom) * bt;
    mat.values[14] = (far + near) * nf;

    return mat;
  }

  public static lookAt(direction: Vector3, up: Vector3): Matrix4;
  public static lookAt(position: Vector3, target: Vector3, up: Vector3): Matrix4;
  public static lookAt(position: Vector3, target: Vector3, up?: Vector3): Matrix4 {
    const hasPosition = typeof up !== 'undefined';

    let direction: Vector3;

    if (hasPosition) {
      direction = Vector3.subtract(position, target);
    } else {
      direction = position;
      up = target;
    }


    let z = Vector3.normalize(direction);
    let x = Vector3.normalize(Vector3.cross(direction, up));
    let y = Vector3.normalize(Vector3.cross(x, z));

    let mat = new Matrix4([
      x.x, x.y, x.z, 0,
      y.x, y.y, y.z, 0,
      z.x, z.y, z.z, 0,
      0, 0, 0, 1
    ]);

    if (!hasPosition) {
      return mat;
    }

    return Matrix4.multiply(mat, Matrix4.translation(Vector3.scale(position, -1)));
  }

  public static multiply(a: Matrix4, b: Matrix4): Matrix4 {
    // const result = Matrix4.zeros();

    // for (let row = 0; row < 4; row++) {
    //   for (let col = 0; col < 4; col++) {
    //     for (let i = 0; i < 4; i++) {
    //       result.values[row * 4 + col] += a.values[row * 4 + i] * b.values[i * 4 + col];
    //     }
    //   }
    // }

    // return result;

    return new Matrix4([
      a.values[0] * b.values[0] + a.values[1] * b.values[4] + a.values[2] * b.values[8] + a.values[3] * b.values[12],
      a.values[0] * b.values[1] + a.values[1] * b.values[5] + a.values[2] * b.values[9] + a.values[3] * b.values[13],
      a.values[0] * b.values[2] + a.values[1] * b.values[6] + a.values[2] * b.values[10] + a.values[3] * b.values[14],
      a.values[0] * b.values[3] + a.values[1] * b.values[7] + a.values[2] * b.values[11] + a.values[3] * b.values[15],

      a.values[4] * b.values[0] + a.values[5] * b.values[4] + a.values[6] * b.values[8] + a.values[7] * b.values[12],
      a.values[4] * b.values[1] + a.values[5] * b.values[5] + a.values[6] * b.values[9] + a.values[7] * b.values[13],
      a.values[4] * b.values[2] + a.values[5] * b.values[6] + a.values[6] * b.values[10] + a.values[7] * b.values[14],
      a.values[4] * b.values[3] + a.values[5] * b.values[7] + a.values[6] * b.values[11] + a.values[7] * b.values[15],

      a.values[8] * b.values[0] + a.values[9] * b.values[4] + a.values[10] * b.values[8] + a.values[11] * b.values[12],
      a.values[8] * b.values[1] + a.values[9] * b.values[5] + a.values[10] * b.values[9] + a.values[11] * b.values[13],
      a.values[8] * b.values[2] + a.values[9] * b.values[6] + a.values[10] * b.values[10] + a.values[11] * b.values[14],
      a.values[8] * b.values[3] + a.values[9] * b.values[7] + a.values[10] * b.values[11] + a.values[11] * b.values[15],

      a.values[12] * b.values[0] + a.values[13] * b.values[4] + a.values[14] * b.values[8] + a.values[15] * b.values[12],
      a.values[12] * b.values[1] + a.values[13] * b.values[5] + a.values[14] * b.values[9] + a.values[15] * b.values[13],
      a.values[12] * b.values[2] + a.values[13] * b.values[6] + a.values[14] * b.values[10] + a.values[15] * b.values[14],
      a.values[12] * b.values[3] + a.values[13] * b.values[7] + a.values[14] * b.values[11] + a.values[15] * b.values[15]
    ]);
  }

  public static invert(m: Matrix4): Matrix4 {
    const det = Matrix4.determinant(m);
    const invDet = 1.0 / det;

    const res = Matrix4.zeros();

    res.at(0, 0, (m.at(1, 2) * m.at(2, 3) * m.at(3, 1) - m.at(1, 3) * m.at(2, 2) * m.at(3, 1) + m.at(1, 3) * m.at(2, 1) * m.at(3, 2) - m.at(1, 1)
        * m.at(2, 3) * m.at(3, 2) - m.at(1, 2) * m.at(2, 1) * m.at(3, 3) + m.at(1, 1) * m.at(2, 2) * m.at(3, 3))
        * invDet);

    res.at(0, 1, (m.at(0, 3) * m.at(2, 2) * m.at(3, 1) - m.at(0, 2) * m.at(2, 3) * m.at(3, 1) - m.at(0, 3) * m.at(2, 1) * m.at(3, 2) + m.at(0, 1)
          * m.at(2, 3) * m.at(3, 2) + m.at(0, 2) * m.at(2, 1) * m.at(3, 3) - m.at(0, 1) * m.at(2, 2) * m.at(3, 3))
          * invDet);

    res.at(0, 2, (m.at(0, 2) * m.at(1, 3) * m.at(3, 1) - m.at(0, 3) * m.at(1, 2) * m.at(3, 1) + m.at(0, 3) * m.at(1, 1) * m.at(3, 2) - m.at(0, 1)
          * m.at(1, 3) * m.at(3, 2) - m.at(0, 2) * m.at(1, 1) * m.at(3, 3) + m.at(0, 1) * m.at(1, 2) * m.at(3, 3))
          * invDet);

    res.at(0, 3, (m.at(0, 3) * m.at(1, 2) * m.at(2, 1) - m.at(0, 2) * m.at(1, 3) * m.at(2, 1) - m.at(0, 3) * m.at(1, 1) * m.at(2, 2) + m.at(0, 1)
          * m.at(1, 3) * m.at(2, 2) + m.at(0, 2) * m.at(1, 1) * m.at(2, 3) - m.at(0, 1) * m.at(1, 2) * m.at(2, 3))
          * invDet);

    res.at(1, 0, (m.at(1, 3) * m.at(2, 2) * m.at(3, 0) - m.at(1, 2) * m.at(2, 3) * m.at(3, 0) - m.at(1, 3) * m.at(2, 0) * m.at(3, 2) + m.at(1, 0)
          * m.at(2, 3) * m.at(3, 2) + m.at(1, 2) * m.at(2, 0) * m.at(3, 3) - m.at(1, 0) * m.at(2, 2) * m.at(3, 3))
          * invDet);

    res.at(1, 1, (m.at(0, 2) * m.at(2, 3) * m.at(3, 0) - m.at(0, 3) * m.at(2, 2) * m.at(3, 0) + m.at(0, 3) * m.at(2, 0) * m.at(3, 2) - m.at(0, 0)
          * m.at(2, 3) * m.at(3, 2) - m.at(0, 2) * m.at(2, 0) * m.at(3, 3) + m.at(0, 0) * m.at(2, 2) * m.at(3, 3))
          * invDet);

    res.at(1, 2, (m.at(0, 3) * m.at(1, 2) * m.at(3, 0) - m.at(0, 2) * m.at(1, 3) * m.at(3, 0) - m.at(0, 3) * m.at(1, 0) * m.at(3, 2) + m.at(0, 0)
          * m.at(1, 3) * m.at(3, 2) + m.at(0, 2) * m.at(1, 0) * m.at(3, 3) - m.at(0, 0) * m.at(1, 2) * m.at(3, 3))
          * invDet);

    res.at(1, 3, (m.at(0, 2) * m.at(1, 3) * m.at(2, 0) - m.at(0, 3) * m.at(1, 2) * m.at(2, 0) + m.at(0, 3) * m.at(1, 0) * m.at(2, 2) - m.at(0, 0)
          * m.at(1, 3) * m.at(2, 2) - m.at(0, 2) * m.at(1, 0) * m.at(2, 3) + m.at(0, 0) * m.at(1, 2) * m.at(2, 3))
          * invDet);

    res.at(2, 0, (m.at(1, 1) * m.at(2, 3) * m.at(3, 0) - m.at(1, 3) * m.at(2, 1) * m.at(3, 0) + m.at(1, 3) * m.at(2, 0) * m.at(3, 1) - m.at(1, 0)
          * m.at(2, 3) * m.at(3, 1) - m.at(1, 1) * m.at(2, 0) * m.at(3, 3) + m.at(1, 0) * m.at(2, 1) * m.at(3, 3))
          * invDet);

    res.at(2, 1, (m.at(0, 3) * m.at(2, 1) * m.at(3, 0) - m.at(0, 1) * m.at(2, 3) * m.at(3, 0) - m.at(0, 3) * m.at(2, 0) * m.at(3, 1) + m.at(0, 0)
          * m.at(2, 3) * m.at(3, 1) + m.at(0, 1) * m.at(2, 0) * m.at(3, 3) - m.at(0, 0) * m.at(2, 1) * m.at(3, 3))
          * invDet);

    res.at(2, 2, (m.at(0, 1) * m.at(1, 3) * m.at(3, 0) - m.at(0, 3) * m.at(1, 1) * m.at(3, 0) + m.at(0, 3) * m.at(1, 0) * m.at(3, 1) - m.at(0, 0)
          * m.at(1, 3) * m.at(3, 1) - m.at(0, 1) * m.at(1, 0) * m.at(3, 3) + m.at(0, 0) * m.at(1, 1) * m.at(3, 3))
          * invDet);

    res.at(2, 3, (m.at(0, 3) * m.at(1, 1) * m.at(2, 0) - m.at(0, 1) * m.at(1, 3) * m.at(2, 0) - m.at(0, 3) * m.at(1, 0) * m.at(2, 1) + m.at(0, 0)
          * m.at(1, 3) * m.at(2, 1) + m.at(0, 1) * m.at(1, 0) * m.at(2, 3) - m.at(0, 0) * m.at(1, 1) * m.at(2, 3))
          * invDet);

    res.at(3, 0, (m.at(1, 2) * m.at(2, 1) * m.at(3, 0) - m.at(1, 1) * m.at(2, 2) * m.at(3, 0) - m.at(1, 2) * m.at(2, 0) * m.at(3, 1) + m.at(1, 0)
          * m.at(2, 2) * m.at(3, 1) + m.at(1, 1) * m.at(2, 0) * m.at(3, 2) - m.at(1, 0) * m.at(2, 1) * m.at(3, 2))
          * invDet);

    res.at(3, 1, (m.at(0, 1) * m.at(2, 2) * m.at(3, 0) - m.at(0, 2) * m.at(2, 1) * m.at(3, 0) + m.at(0, 2) * m.at(2, 0) * m.at(3, 1) - m.at(0, 0)
          * m.at(2, 2) * m.at(3, 1) - m.at(0, 1) * m.at(2, 0) * m.at(3, 2) + m.at(0, 0) * m.at(2, 1) * m.at(3, 2))
          * invDet);

    res.at(3, 2, (m.at(0, 2) * m.at(1, 1) * m.at(3, 0) - m.at(0, 1) * m.at(1, 2) * m.at(3, 0) - m.at(0, 2) * m.at(1, 0) * m.at(3, 1) + m.at(0, 0)
          * m.at(1, 2) * m.at(3, 1) + m.at(0, 1) * m.at(1, 0) * m.at(3, 2) - m.at(0, 0) * m.at(1, 1) * m.at(3, 2))
          * invDet);

    res.at(3, 3, (m.at(0, 1) * m.at(1, 2) * m.at(2, 0) - m.at(0, 2) * m.at(1, 1) * m.at(2, 0) + m.at(0, 2) * m.at(1, 0) * m.at(2, 1) - m.at(0, 0)
          * m.at(1, 2) * m.at(2, 1) - m.at(0, 1) * m.at(1, 0) * m.at(2, 2) + m.at(0, 0) * m.at(1, 1) * m.at(2, 2))
          * invDet);

    return res;
  }

  public static transpose(m: Matrix4): Matrix4 {
    let mat = Matrix4.zeros();

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        mat.values[row * 4 + col] = m.values[col * 4 + row];
      }
    }

    return mat;
  }

  public static determinant(m: Matrix4): number {
    return m.at(3, 0) * m.at(2, 1) * m.at(1, 2) * m.at(0, 3) - m.at(2, 0) * m.at(3, 1) * m.at(1, 2) * m.at(0, 3) - m.at(3, 0) * m.at(1, 1)
      * m.at(2, 2) * m.at(0, 3) + m.at(1, 0) * m.at(3, 1) * m.at(2, 2) * m.at(0, 3) + m.at(2, 0) * m.at(1, 1) * m.at(3, 2) * m.at(0, 3) - m.at(1, 0)
      * m.at(2, 1) * m.at(3, 2) * m.at(0, 3) - m.at(3, 0) * m.at(2, 1) * m.at(0, 2) * m.at(1, 3) + m.at(2, 0) * m.at(3, 1) * m.at(0, 2) * m.at(1, 3)
      + m.at(3, 0) * m.at(0, 1) * m.at(2, 2) * m.at(1, 3) - m.at(0, 0) * m.at(3, 1) * m.at(2, 2) * m.at(1, 3) - m.at(2, 0) * m.at(0, 1) * m.at(3, 2)
      * m.at(1, 3) + m.at(0, 0) * m.at(2, 1) * m.at(3, 2) * m.at(1, 3) + m.at(3, 0) * m.at(1, 1) * m.at(0, 2) * m.at(2, 3) - m.at(1, 0) * m.at(3, 1)
      * m.at(0, 2) * m.at(2, 3) - m.at(3, 0) * m.at(0, 1) * m.at(1, 2) * m.at(2, 3) + m.at(0, 0) * m.at(3, 1) * m.at(1, 2) * m.at(2, 3) + m.at(1, 0)
      * m.at(0, 1) * m.at(3, 2) * m.at(2, 3) - m.at(0, 0) * m.at(1, 1) * m.at(3, 2) * m.at(2, 3) - m.at(2, 0) * m.at(1, 1) * m.at(0, 2) * m.at(3, 3)
      + m.at(1, 0) * m.at(2, 1) * m.at(0, 2) * m.at(3, 3) + m.at(2, 0) * m.at(0, 1) * m.at(1, 2) * m.at(3, 3) - m.at(0, 0) * m.at(2, 1) * m.at(1, 2)
      * m.at(3, 3) - m.at(1, 0) * m.at(0, 1) * m.at(2, 2) * m.at(3, 3) + m.at(0, 0) * m.at(1, 1) * m.at(2, 2) * m.at(3, 3);
  }
}