import { S256Point, G, N } from "./S256Point";
import { Signature } from "./Signature";
import crypto from "crypto";
import {
  encodeBase58Checksum,
  pow,
  decodeBase58Wif,
  toBufferBE,
  toBigIntBE,
  sha256,
  mod
} from "../helper";
import secp from "tiny-secp256k1";

const sha256HMAC = (key: Buffer, data: Buffer): Buffer => {
  return crypto
    .createHmac("sha256", key)
    .update(data)
    .digest();
};

export class PrivateKey {
  public point: S256Point;

  constructor(public secret: bigint) {
    this.point = G.scalarMul(secret);
  }

  wif = (compressed: boolean = true, testnet: boolean = false): string => {
    const secretBytes = toBufferBE(this.secret, 32);
    let prefix: Buffer;
    if (testnet) {
      prefix = Buffer.alloc(1, "ef", "hex");
    } else {
      prefix = Buffer.alloc(1, "80", "hex");
    }
    let suffix: Buffer;
    if (compressed) {
      suffix = Buffer.alloc(1, 1);
    } else {
      suffix = Buffer.alloc(0);
    }
    return encodeBase58Checksum(Buffer.concat([prefix, secretBytes, suffix]));
  };

  static fromWif = (wif: string, compressed: boolean = true): PrivateKey => {
    const decoded = decodeBase58Wif(wif, compressed);
    const pkBuf = toBigIntBE(decoded);
    return new PrivateKey(pkBuf);
  };

  sign = (z: bigint, fast: boolean = true): Signature => {
    let r: bigint, s: bigint;
    if (fast) {
      const h = toBufferBE(z, 32);
      const d = toBufferBE(this.secret, 32);
      const sig = secp.sign(h, d);
      r = toBigIntBE(sig.slice(0, 32));
      s = toBigIntBE(sig.slice(32));
    } else {
      const k = this.deterministicK(z);
      r = G.scalarMul(k).x!.num;
      const kInv = pow(k, N - 2n, N);
      s = ((z + r * this.secret) * kInv) % N;

      if (s > N / 2n) {
        s = N - s;
      }
    }

    return new Signature(r, s);
  };

  schnorrSign = (z: bigint): Buffer => {
    const secret = this.point.hasSquareY() ? this.secret : N - this.secret;
    let nonce = this.schnorrNonce(z);
    const R = G.scalarMul(nonce);
    nonce = R.hasSquareY() ? nonce : N - nonce;
    const e = mod(toBigIntBE(taggedHash("BIPSchnorr", Buffer.concat([R.schnorrSerialize(), this.point.schnorrSerialize(), toBufferBE(z, 32)]))), N);
    const sig = Buffer.concat([toBufferBE(R.x!.num, 32), toBufferBE(mod((nonce + e * secret), N), 32)]);
    return sig;
  }

  // https://tools.ietf.org/html/rfc6979#section-3.2
  deterministicK = (z: bigint): bigint => {
    let k = Buffer.alloc(32, 0);
    let v = Buffer.alloc(32, 1);

    if (z > N) {
      z = z - N;
    }

    const zBytes = toBufferBE(z, 32);
    const secretBytes = toBufferBE(this.secret, 32);

    k = sha256HMAC(
      k,
      Buffer.concat([v, Buffer.alloc(1, 0), secretBytes, zBytes])
    );
    v = sha256HMAC(k, v);
    k = sha256HMAC(
      k,
      Buffer.concat([v, Buffer.alloc(1, 1), secretBytes, zBytes])
    );
    v = sha256HMAC(k, v);

    while (true) {
      v = sha256HMAC(k, v);
      const candidate = toBigIntBE(v);
      if (candidate >= 1n && candidate < N) {
        return candidate;
      }
      k = sha256HMAC(k, Buffer.concat([v, Buffer.alloc(1, 0)]));
      v = sha256HMAC(k, v);
    }
  };

  // deterministic schnorr nonce
  schnorrNonce = (z: bigint): bigint => {
    const secret = this.point.hasSquareY() ? this.secret : N - this.secret;
    const m = Buffer.concat([toBufferBE(secret, 32), toBufferBE(z, 32)]);
    const nonceBuffer = taggedHash("BIPSchnorrDerive", m);
    const nonce = mod(toBigIntBE(nonceBuffer), N);
    if (nonce === 0n) {
      throw Error("Couldn't genereate nonce");
    }
    return nonce;
  }

  hex = (): string => {
    return this.secret.toString(16).padStart(64, "0");
  };
}

export function taggedHash(tag: string, msg: Buffer): Buffer {
  const tagHash = sha256(Buffer.from(tag, "utf8"));
  return sha256(Buffer.concat([tagHash, tagHash, msg]));
}