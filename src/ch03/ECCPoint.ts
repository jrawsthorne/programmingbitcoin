import { FieldElement } from "../ch01/Field";

interface ECCPointParams {
  x?: FieldElement;
  y?: FieldElement;
  a: FieldElement;
  b: FieldElement;
}

export class ECCPoint {
  x?: FieldElement;
  y?: FieldElement;
  a: FieldElement;
  b: FieldElement;
  constructor({ x, y, a, b }: ECCPointParams) {
    this.a = a;
    this.b = b;
    this.x = x;
    this.y = y;

    // invalid points at infinity
    if (
      (x !== undefined && y === undefined) ||
      (x === undefined && y !== undefined)
    ) {
      throw Error("Invalid point");
    }

    // don't check if point is on curve if point at infinity
    if (x === undefined && y === undefined) {
      return;
    }

    // check point is on the curve with parameters a and b
    if (
      !y!.pow(2n).equals(
        x!
          .pow(3n)
          .add(a.mul(x!))
          .add(b)
      )
    ) {
      throw Error(`(${x}, ${y}) is not on the curve`);
    }
  }

  isPointAtInfinity = (): boolean => {
    return this.x === undefined && this.y === undefined;
  };

  equals = (other: ECCPoint): boolean => {
    if (this.isPointAtInfinity()) return other.isPointAtInfinity();
    if (other.isPointAtInfinity()) return false;
    return (
      this.x!.equals(other.x!) &&
      this.y!.equals(other.y!) &&
      this.a!.equals(other.a!) &&
      this.b!.equals(other.b!)
    );
  };

  add = (other: ECCPoint): ECCPoint => {
    if (!this.a.equals(other.a) || !this.b.equals(other.b)) {
      throw Error(
        `Points ${this.toString()}, ${other.toString()} are not on the same curve`
      );
    }

    // other + 0 = other
    if (this.x === undefined) return other;

    // 0 + this = this
    if (other.x === undefined) return this;

    // the points are vertically opposite
    if (
      this.x.equals(other.x) &&
      this.y !== undefined &&
      other.y !== undefined &&
      !this.y!.equals(other.y!)
    ) {
      return new ECCPoint({ a: this.a, b: this.b });
    }

    // x1 != x2
    if (!this.x.equals(other.x)) {
      // calculate gradient

      const s = other.y!.sub(this.y!).div(other.x.sub(this.x));
      const x = s
        .pow(2n)
        .sub(this.x)
        .sub(other.x);
      const y = s.mul(this.x.sub(x)).sub(this.y!);
      return new ECCPoint({
        x,
        y,
        a: this.a,
        b: this.b
      });
    }

    // point at infinity if two points are equal and y value is 0
    // otherwise gradient calculation would have 0 in the denominator
    if (this.equals(other) && this.y!.equals(this.x.rmul(0n))) {
      return new ECCPoint({ a: this.a, b: this.b });
    }

    // P1 = P2
    if (this.equals(other)) {
      // calculate gradient (tangent to the curve)
      const s = this.x
        .pow(2n)
        .rmul(3n)
        .add(this.a)
        .div(this.y!.rmul(2n));
      const x = s.pow(2n).sub(this.x.rmul(2n));
      const y = s.mul(this.x.sub(x)).sub(this.y!);
      return new ECCPoint({ x, y, a: this.a, b: this.b });
    }
    throw Error("Invalid addition");
  };

  rmul(coefficient: bigint): ECCPoint {
    let coef = coefficient;
    let current = this as ECCPoint;
    let result = new ECCPoint({ a: this.a, b: this.b });

    while (coef > 0) {
      if (coef & 1n) {
        result = result.add(current);
      }
      current = current.add(current);
      coef = coef >> 1n;
    }
    return result;
  }

  toString = (): string => {
    if (this.isPointAtInfinity()) return "Point(infinity)";
    else
      return `Point(${this.x!.num},${this.y!.num})_${this.a.num}_${
        this.b.num
      } FieldElement(${this.x!.prime})`;
  };
}
