interface PointParams {
  x?: number;
  y?: number;
  a: number;
  b: number;
}

export class Point {
  x?: number;
  y?: number;
  a: number;
  b: number;
  constructor({ x, y, a, b }: PointParams) {
    this.a = a;
    this.b = b;
    this.x = x;
    this.y = y;
    // don't check if point is on curve if point at infinity
    if (x === undefined && y === undefined) {
      return;
    }
    // invalid points at infinity
    if (
      (x !== undefined && y === undefined) ||
      (x === undefined && y !== undefined)
    ) {
      throw Error("Invalid point");
    }
    // check point is on the curve with parameters a and b
    if (y! ** 2 !== x! ** 3 + a * x! + b) {
      throw Error(`(${x}, ${y}) is not on the curve`);
    }
  }

  equals = (other: Point): boolean => {
    return (
      this.x === other.x &&
      this.y === other.y &&
      this.a === other.a &&
      this.b === other.b
    );
  };

  add = (other: Point): Point => {
    if (this.a !== other.a || this.b !== other.b) {
      throw Error(`Points ${this}, ${other} are not on the same curve`);
    }
    // other + 0 = other
    if (this.x === undefined) return other;

    // 0 + this = this
    if (other.x === undefined) return this;

    // the points are vertically opposite
    if (this.x === other.x && this.y !== other.y) {
      return new Point({ a: this.a, b: this.b });
    }

    // x1 != x2
    if (this.x !== other.x) {
      // calculate gradient
      const s = (other.y! - this.y!) / (other.x - this.x);
      const x = s ** 2 - this.x - other.x;
      const y = s * (this.x - x) - this.y!;
      return new Point({
        x,
        y,
        a: this.a,
        b: this.b
      });
    }

    // point at infinity if two points are equal and y value is 0
    // otherwise gradient calculation would have 0 in the denominator
    if (this.equals(other) && this.y === 0) {
      return new Point({ a: this.a, b: this.b });
    }

    // P1 = P2
    if (this.equals(other)) {
      // calculate gradient (tangent to the curve)
      const s = (3 * this.x ** 2 + this.a) / (2 * this.y!);
      const x = s ** 2 - 2 * this.x;
      const y = s * (this.x - x) - this.y!;
      return new Point({ x, y, a: this.a, b: this.b });
    }
    throw Error("Invalid addition");
  };

  toString = () => {
    if (this.x === undefined) return "Point(infinity)";
    else return `Point(${this.x},${this.y})_${this.a}_${this.b}`;
  };
}
