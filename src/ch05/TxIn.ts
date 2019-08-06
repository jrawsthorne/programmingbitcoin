import { Script } from "../ch06/Script";
import { SmartBuffer } from "smart-buffer";

export class TxIn {
  public scriptSig: any;

  constructor(
    public prevTx: Buffer,
    public prevIndex: number,
    scriptSig?: Script,
    public sequence = 0xffffffff
  ) {
    this.scriptSig = scriptSig ? scriptSig : new Script();
  }

  static parse = (s: SmartBuffer) => {
    const prevTx = s.readBuffer(32).reverse();
    const prevIndex = s.readUInt32LE();
    // Skip over script for now
    const scriptSig = new Script();
    s.readOffset += 108;
    // Skip over script for now
    const sequence = s.readUInt32LE();
    return new TxIn(prevTx, prevIndex, scriptSig, sequence);
  };

  toString = (): string => {
    return `${this.prevTx.toString("hex")}:${this.prevIndex}`;
  };
}
