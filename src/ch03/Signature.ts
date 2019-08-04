import BN from "bn.js";
import { SmartBuffer } from "smart-buffer";
export class Signature {
  constructor(public r: BN, public s: BN) {}

  der = (): Buffer => {
    let rbin = this.r.toBuffer("be", 32);

    // remove all null bytes at the beginning
    rbin = rbin.slice(rbin.findIndex(byte => byte !== 0));

    // if rbin has a high bit, add a 0x00
    if (rbin[0] & 0x80) {
      rbin = Buffer.concat([Buffer.alloc(1, 0), rbin]);
    }

    let result = Buffer.concat([
      Buffer.alloc(1, 2),
      Buffer.from([rbin.length]),
      rbin
    ]);
    let sbin = this.s.toBuffer("be", 32);
    // remove all null bytes at the beginning
    sbin = sbin.slice(sbin.findIndex(byte => byte !== 0));
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
    const r = new BN(sig.readBuffer(rlength), undefined, "be");
    marker = sig.readUInt8();
    if (marker !== 0x02) {
      throw Error("Bad Signature marker");
    }
    const slength = sig.readUInt8();
    const s = new BN(sig.readBuffer(slength), undefined, "be");
    if (signature.length !== 6 + rlength + slength) {
      throw Error("Signature too long");
    }
    return new Signature(r, s);
  };

  toString = (): string => {
    return `Signature(${this.r.toString()},${this.s.toString()})`;
  };
}
