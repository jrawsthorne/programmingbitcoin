import { SmartBuffer } from "smart-buffer";
import { toBigIntLE, toBufferLE } from "bigint-buffer";
import { Script } from "../ch06/Script";

export class TxOut {
  constructor(public amount: bigint, public scriptPubkey: Script) {}

  static parse = (s: SmartBuffer): TxOut => {
    const amount = toBigIntLE(s.readBuffer(8));
    const scriptPubkey = new Script();
    return new TxOut(amount, scriptPubkey);
  };

  serialize = (): Buffer => {
    const amount = toBufferLE(this.amount, 8);
    const scriptPubkey = this.scriptPubkey.serialize();
    return Buffer.concat([amount, scriptPubkey]);
  };

  toString = (): string => {
    return `${this.amount}:${this.scriptPubkey}`;
  };
}
