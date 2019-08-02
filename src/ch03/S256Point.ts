import { ECCPoint } from "./ECCPoint";
import { S256Field } from "./S256Field";
import BN from "bn.js";

const A = 0;
const B = 7;

export const N = new BN(
  "fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141",
  "hex"
);

interface S256PointParams {
  x?: BN;
  y?: BN;
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

  rmul = (coefficient: number | BN): S256Point => {
    let coef = BN.isBN(coefficient) ? coefficient : new BN(coefficient);
    coef = coef.mod(N);
    return super.rmul(coef);
  };
}

export const G = new S256Point({
  x: new BN(
    "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    "hex"
  ),
  y: new BN(
    "483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8",
    "hex"
  )
});
