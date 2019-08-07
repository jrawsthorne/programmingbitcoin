import { FieldElement } from "../ch01/Field";

export class ECCPoint {
  constructor(
    public x: FieldElement | undefined,
    public y: FieldElement | undefined,
    public a: FieldElement,
    public b: FieldElement
  ) {
    if (x && y) {
      // if y^2 != x^3 + ax + b, point not on curve
      if (
        !y.pow(2n).equals(
          x
            .pow(3n)
            .add(a.mul(x))
            .add(b)
        )
      ) {
        throw Error(`(${x}, ${y}) is not on the curve`);
      }
    } else if (x === undefined && y === undefined) {
      return;
    } else {
      throw Error("Invalid point");
    }
  }

  isInfinity = (): boolean => {
    return this.x === undefined && this.y === undefined;
  };

  infinity = (): ECCPoint => {
    return new ECCPoint(undefined, undefined, this.a, this.b);
  };

  equals = (other: ECCPoint): boolean => {
    if (this.isInfinity()) return other.isInfinity();
    if (other.isInfinity()) return false;
    return (
      this.x!.equals(other.x!) &&
      this.y!.equals(other.y!) &&
      this.a.equals(other.a) &&
      this.b.equals(other.b)
    );
  };

  add = (other: ECCPoint): ECCPoint => {
    if (!this.a.equals(other.a) || !this.b.equals(other.b)) {
      throw Error(`Points ${this}, ${other} are not on the same curve`);
    }

    // other + 0 = other
    if (this.x === undefined) return other;

    // 0 + this = this
    if (other.x === undefined) return this;

    // the points are vertically opposite
    if (this.x.equals(other.x) && !this.y!.equals(other.y!)) {
      return this.infinity();
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
      return new ECCPoint(x, y, this.a, this.b);
    }

    // point at infinity if two points are equal and y value is 0
    // otherwise gradient calculation would have 0 in the denominator
    if (this.equals(other) && this.y!.equals(this.x.rmul(0n))) {
      return this.infinity();
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
      return new ECCPoint(x, y, this.a, this.b);
    }
    throw Error("Invalid addition");
  };

  rmul(coefficient: bigint): ECCPoint {
    let coef = coefficient;
    let current: ECCPoint = this;
    let result = this.infinity();

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
    if (this.isInfinity()) return "Point(infinity)";
    else
      return `Point(${this.x!.num},${this.y!.num})_${this.a.num}_${
        this.b.num
      } FieldElement(${this.x!.prime})`;
  };
}
