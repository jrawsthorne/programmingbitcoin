import { ECCPoint } from "./ECCPoint";
import { S256Field } from "./S256Field";
import BigNumber from "bignumber.js";
import BigNum from "bignum";

const A = 0;
const B = 7;
const N = new BigNum(
  "0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"
);

interface S256PointParams {
  x?: BigNumber;
  y?: BigNumber;
}

export class S256Point extends ECCPoint {
  constructor({ x, y }: S256PointParams) {
    super({
      x: x === undefined ? x : new S256Field(x),
      y: y === undefined ? y : new S256Field(y),
      a: new S256Field(A),
      b: new S256Field(B)
    });
  }

  toString = (): string => {
    if (this.isPointAtInfinity()) return "S256Point(infinity)";
    else return `S256Point(${this.x!.num},${this.y!.num})`;
  };

  rmul = (coefficient: number | BigNum): S256Point => {
    let coef = BigNum.isBigNum(coefficient)
      ? (coefficient as BigNum)
      : new BigNum(coefficient);
    coef = coef.mod(N);
    return super.rmul(coef);
  };
}
