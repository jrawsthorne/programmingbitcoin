import { ECCPoint } from "./ECCPoint";
import { S256Field, P } from "./S256Field";
import { Signature } from "./Signature";
import { SmartBuffer } from "smart-buffer";
import { hash160, encodeBase58Checksum, mod, pow } from "../helper";
import { toBufferBE, toBigIntBE } from "bigint-buffer";

const A = 0n;
const B = 7n;

export const N = BigInt(
  "0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"
);

interface S256PointParams {
  x?: bigint;
  y?: bigint;
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

  verify = (z: bigint, sig: Signature): boolean => {
    let sInv = pow(sig.s, N - 2n, N);
    let u = (z * sInv) % N;
    let v = (sig.r * sInv) % N;
    const total = G.rmul(u).add(this.rmul(v));
    return total.x!.num === sig.r;
  };

  sec = (compressed: boolean = true): Buffer => {
    const s = new SmartBuffer();
    if (compressed) {
      if (this.y!.num % 2n === 0n) {
        s.writeUInt8(2);
      } else {
        s.writeUInt8(3);
      }
      s.writeBuffer(toBufferBE(this.x!.num, 32));
    } else {
      s.writeUInt8(4);
      s.writeBuffer(toBufferBE(this.x!.num, 32));
      s.writeBuffer(toBufferBE(this.y!.num, 32));
    }
    return s.toBuffer();
  };

  static parse = (sec: Buffer): S256Point => {
    if (sec[0] === 4) {
      const x = toBigIntBE(sec.slice(1, 33));
      const y = toBigIntBE(sec.slice(33, 65));
      return new S256Point({ x, y });
    }
    const isEven = sec[0] === 2;
    const x = new S256Field(toBigIntBE(sec.slice(1)));
    // right side of the equation y^2 = x^3 + 7
    const alpha = new S256Field(x.pow(3n).add(new S256Field(B)).num);
    // solve for left side
    const beta = alpha.sqrt();
    let evenBeta: S256Field;
    let oddBeta: S256Field;
    if (beta.num % 2n === 0n) {
      evenBeta = beta;
      oddBeta = new S256Field(P - beta.num);
    } else {
      evenBeta = new S256Field(P - beta.num);
      oddBeta = beta;
    }
    return isEven
      ? new S256Point({ x: x.num, y: evenBeta.num })
      : new S256Point({ x: x.num, y: oddBeta.num });
  };

  hash160 = (compressed: boolean = true): Buffer => {
    return hash160(this.sec(compressed));
  };

  address = (compressed: boolean = true, testnet: boolean = false): string => {
    const h160 = this.hash160(compressed);
    let prefix: Buffer;
    if (testnet) {
      prefix = Buffer.alloc(1, "6f", "hex");
    } else {
      prefix = Buffer.alloc(1, 0);
    }
    return encodeBase58Checksum(Buffer.concat([prefix, h160]));
  };

  rmul = (coefficient: bigint): S256Point => {
    let coef = coefficient;
    coef = mod(coef, N);
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
  x: BigInt(
    "0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
  ),
  y: BigInt(
    "0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8"
  )
});
