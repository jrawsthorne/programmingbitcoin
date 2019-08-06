import { SmartBuffer } from "smart-buffer";
import { toBigIntLE } from "bigint-buffer";
import { Script } from "../ch06/Script";

export class TxOut {
  constructor(public amount: bigint, public scriptPubkey: Script) {}

  static parse = (s: SmartBuffer): TxOut => {
    const amount = toBigIntLE(s.readBuffer(8));
    // Skip over script for now
    const scriptPubkey = new Script();
    s.readOffset += 26;
    // Skip over script for now
    return new TxOut(amount, scriptPubkey);
  };

  toString = (): string => {
    return `${this.amount}:${this.scriptPubkey}`;
  };
}
