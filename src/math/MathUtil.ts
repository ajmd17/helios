export class MathUtil {
  public static readonly EPSILON: number = 0.000001;
  
  public static lerp(from: number, to: number, amt: number): number {
    return from + amt * (to - from);
  }

  public static degToRad(deg: number): number {
    return deg * Math.PI / 180;
  }

  public static radToDeg(rad: number): number {
    return rad * 180 / Math.PI;
  }

  public static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  public static isPowerOf2(value: number): boolean {
    return (value & (value - 1)) === 0;
  }
}