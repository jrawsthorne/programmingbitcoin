import BN from "bn.js";
import { S256Point, G, N } from "./S256Point";
import { Signature } from "./Signature";
import crypto from "crypto";

export class PrivateKey {
  public point: S256Point;

  constructor(public secret: BN) {
    this.point = G.rmul(secret);
  }

  sign = (z: BN): Signature => {
    const k = this.deterministicK(z);
    const r = G.rmul(k).x!.num;
    const kInv = k.toRed(BN.red(N)).redPow(N.sub(new BN(2)));
    let s = z
      .add(r.mul(this.secret))
      .mul(kInv)
      .mod(N);

    if (s.gt(N.div(new BN(2)))) {
      s = N.sub(s);
    }

    return new Signature(r, s);
  };

  deterministicK = (z: BN): BN => {
    let k = Buffer.alloc(32);
    let v = Buffer.alloc(32);

    if (z.gt(N)) {
      z = z.sub(N);
    }

    const zBytes = z.toBuffer("be", 32);
    const secretBytes = this.secret.toBuffer("be", 32);

    k = crypto
      .createHmac("sha256", k)
      .update(Buffer.concat([v, Buffer.from("0x00"), secretBytes, zBytes]))
      .digest();
    v = crypto
      .createHmac("sha256", k)
      .update(v)
      .digest();
    k = crypto
      .createHmac("sha256", k)
      .update(Buffer.concat([v, Buffer.from("0x01"), secretBytes, zBytes]))
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
      const candidate = new BN(v, undefined, "be");
      if (candidate.gte(new BN(1)) && candidate.lt(N)) {
        return candidate;
      }
      k = crypto
        .createHmac("sha256", k)
        .update(Buffer.concat([v, Buffer.from("0x00")]))
        .digest();
      v = crypto
        .createHmac("sha256", k)
        .update(v)
        .digest();
    }
  };

  hex = (): string => {
    return this.secret.toString("hex").padStart(64, "0");
  };
}
