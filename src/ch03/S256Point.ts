import { ECCPoint } from "./ECCPoint";
import { S256Field, P } from "./S256Field";
import { Signature } from "./Signature";
import { SmartBuffer } from "smart-buffer";
import {
  hash160,
  encodeBase58Checksum,
  mod,
  pow,
  toBufferBE,
  toBigIntBE
} from "../helper";
import secp from "tiny-secp256k1";
import { taggedHash } from './PrivateKey';

const A = 0n;
const B = 7n;

export const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

interface S256PointParams {
  x?: bigint;
  y?: bigint;
}

export class S256Point extends ECCPoint {
  constructor({ x, y }: S256PointParams) {
    super(
      x === undefined ? x : new S256Field(x),
      y === undefined ? y : new S256Field(y),
      new S256Field(A),
      new S256Field(B)
    );
  }

  verify = (z: bigint, sig: Signature, fast: boolean = true): boolean => {
    if (fast) {
      const Q = this.sec();
      const h = toBufferBE(z, 32);
      const normalisedSignature = Buffer.concat([
        toBufferBE(sig.r, 32),
        toBufferBE(sig.s, 32)
      ]);
      return secp.verify(h, Q, normalisedSignature);
    } else {
      let sInv = pow(sig.s, N - 2n, N);
      let u = (z * sInv) % N;
      let v = (sig.r * sInv) % N;
      const total = G.scalarMul(u).add(this.scalarMul(v));
      return total.x!.num === sig.r;
    }
  };

  schnorrVerify = (z: bigint, sig: Buffer): boolean => {
    const r = toBigIntBE(sig.slice(0, 32));
    const s = toBigIntBE(sig.slice(32));
    if (r >= P || s >= N) {
      return false;
    }
    const msg = toBufferBE(z, 32);
    const pubkey = toBufferBE(this.x!.num, 32);
    const e = mod(
      toBigIntBE(
        taggedHash(
          "BIP0340/challenge",
          Buffer.concat([sig.slice(0, 32), pubkey, msg])
        )
      ),
      N
    );
    const R = G.scalarMul(s).add(this.scalarMul(N - e));
    if (R.isInfinity() || !R.hasEvenY() || R.x!.num !== r) {
      return false;
    }
    return true
  }

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

  // even y used as tie breaker
  static schnorrParse = (pubkey: Buffer): S256Point => {
    const x = toBigIntBE(pubkey);
    const squareY = mod(pow(x, 3n, P) + 7n, P);
    const y = pow(squareY, (P + 1n) / 4n, P);
    return new S256Point({ x, y: y % 2n === 0n ? y : P - y });
  };

  schnorrSerialize = (): Buffer => {
    return toBufferBE(this.x!.num, 32);
  }

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

  scalarMul = (coefficient: bigint): S256Point => {
    let coef = coefficient;
    coef = mod(coef, N);
    const point = super.scalarMul(coef);
    const x = point.x ? point.x.num : undefined;
    const y = point.y ? point.y.num : undefined;
    return new S256Point({ x, y });
  };

  toString = (): string => {
    if (this.isInfinity()) return "S256Point(infinity)";
    else return `S256Point(${this.x!.num},${this.y!.num})`;
  };
}

export const G = new S256Point({
  x: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  y: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
});
