import { SmartBuffer } from "smart-buffer";
import { toBufferBE, trimBuffer, toBigIntBE } from "../helper";

export class Signature {
  constructor(public r: bigint, public s: bigint) {}

  der = (): Buffer => {
    let rbin = toBufferBE(this.r, 32);

    // remove all null bytes at the beginning
    rbin = trimBuffer(rbin, "left");

    // if rbin has a high bit, add a 0x00
    if (rbin[0] & 0x80) {
      rbin = Buffer.concat([Buffer.alloc(1, 0), rbin]);
    }

    let result = Buffer.concat([
      Buffer.alloc(1, 2),
      Buffer.from([rbin.length]),
      rbin
    ]);
    let sbin = toBufferBE(this.s, 32);
    // remove all null bytes at the beginning
    sbin = trimBuffer(sbin, "left");
    // if rbin has a high bit, add a 0x00
    if (sbin[0] & 0x80) {
      sbin = Buffer.concat([Buffer.alloc(1, 0), sbin]);
    }
    result = Buffer.concat([
      result,
      Buffer.alloc(1, 2),
      Buffer.from([sbin.length]),
      sbin
    ]);
    return Buffer.concat([
      Buffer.alloc(1, "30", "hex"),
      Buffer.from([result.length]),
      result
    ]);
  };

  static parse = (signature: Buffer): Signature => {
    const sig = SmartBuffer.fromBuffer(signature);
    const compound = sig.readUInt8();
    if (compound !== 0x30) {
      throw Error("Bad Signature compound");
    }
    const length = sig.readUInt8();
    if (length + 2 !== signature.length) {
      throw Error("Bad Signature Length");
    }
    let marker = sig.readUInt8();
    if (marker !== 0x02) {
      throw Error("Bad Signature marker");
    }
    const rlength = sig.readUInt8();
    const r = toBigIntBE(sig.readBuffer(rlength));
    marker = sig.readUInt8();
    if (marker !== 0x02) {
      throw Error("Bad Signature marker");
    }
    const slength = sig.readUInt8();
    const s = toBigIntBE(sig.readBuffer(slength));
    if (signature.length !== 6 + rlength + slength) {
      throw Error("Signature too long");
    }
    return new Signature(r, s);
  };

  toString = (): string => {
    return `Signature(${this.r},${this.s})`;
  };
}
