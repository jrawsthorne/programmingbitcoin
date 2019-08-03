import { ECCPoint } from "./ECCPoint";
import { S256Field } from "./S256Field";
import BN from "bn.js";
import { Signature } from "./Signature";

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

  static verify = (point: S256Point, z: BN, sig: Signature): boolean => {
    const red = BN.red(N);
    let sInv = sig.s.toRed(red).redPow(N.sub(new BN(2)));
    let u = z.mul(sInv).mod(N);
    let v = sig.r.mul(sInv).mod(N);
    const total = G.rmul(u).add(point.rmul(v));
    return total.x!.num.eq(sig.r);
  };

  rmul = (coefficient: number | BN): S256Point => {
    let coef = BN.isBN(coefficient) ? coefficient : new BN(coefficient);
    coef = coef.mod(N);
    return super.rmul(coef);
  };

  toString = (): string => {
    if (this.isPointAtInfinity()) return "S256Point(infinity)";
    else return `S256Point(${this.x!.num},${this.y!.num})`;
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
