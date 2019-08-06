import { S256Point, G, N } from "./S256Point";
import { Signature } from "./Signature";
import crypto from "crypto";
import { encodeBase58Checksum, pow } from "../helper";
import { toBufferBE, toBigIntBE } from "bigint-buffer";

export class PrivateKey {
  public point: S256Point;

  constructor(public secret: bigint) {
    this.point = G.rmul(secret);
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

  sign = (z: bigint): Signature => {
    const k = this.deterministicK(z);
    const r = G.rmul(k).x!.num;
    const kInv = pow(k, N - 2n, N);
    let s = ((z + r * this.secret) * kInv) % N;

    if (s > N / 2n) {
      s = N - s;
    }

    return new Signature(r, s);
  };

  // https://tools.ietf.org/html/rfc6979#section-3.2
  deterministicK = (z: bigint): bigint => {
    let k = Buffer.alloc(32, 0);
    let v = Buffer.alloc(32, 1);

    if (z > N) {
      z = z - N;
    }

    const zBytes = toBufferBE(z, 32);
    const secretBytes = toBufferBE(this.secret, 32);

    k = crypto
      .createHmac("sha256", k)
      .update(Buffer.concat([v, Buffer.alloc(1, 0), secretBytes, zBytes]))
      .digest();
    v = crypto
      .createHmac("sha256", k)
      .update(v)
      .digest();
    k = crypto
      .createHmac("sha256", k)
      .update(Buffer.concat([v, Buffer.alloc(1, 1), secretBytes, zBytes]))
      .digest();
    v = crypto
      .createHmac("sha256", k)
      .update(v)
      .digest();

    while (true) {
      v = crypto
        .createHmac("sha256", k)
        .update(v)
        .digest();
      const candidate = toBigIntBE(v);
      if (candidate >= 1n && candidate < N) {
        return candidate;
      }
      k = crypto
        .createHmac("sha256", k)
        .update(Buffer.concat([v, Buffer.alloc(1, 0)]))
        .digest();
      v = crypto
        .createHmac("sha256", k)
        .update(v)
        .digest();
    }
  };

  hex = (): string => {
    return this.secret.toString(16).padStart(64, "0");
  };
}
