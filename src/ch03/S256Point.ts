import { ECCPoint } from "./ECCPoint";
import { S256Field } from "./S256Field";
import BN from "bn.js";
import { Signature } from "./Signature";
import { SmartBuffer } from "smart-buffer";

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

  verify = (z: BN, sig: Signature): boolean => {
    const red = BN.red(N);
    let sInv = sig.s.toRed(red).redPow(N.sub(new BN(2)));
    let u = z.mul(sInv).mod(N);
    let v = sig.r.mul(sInv).mod(N);
    const total = G.rmul(u).add(this.rmul(v));
    return total.x!.num.eq(sig.r);
  };

  sec = (): Buffer => {
    const s = new SmartBuffer();
    s.writeBuffer(Buffer.from("04", "hex"));
    s.writeBuffer(this.x!.num.toBuffer("be", 32));
    s.writeBuffer(this.y!.num.toBuffer("be", 32));
    return s.toBuffer();
  };

  rmul = (coefficient: number | BN): S256Point => {
    let coef = BN.isBN(coefficient) ? coefficient : new BN(coefficient);
    coef = coef.mod(N);
    const point = super.rmul(coef);
    const x = point.x ? point.x.num : undefined;
    const y = point.y ? point.y.num : undefined;
    return new S256Point({ x, y });
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
