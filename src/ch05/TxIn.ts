import { Script } from "../ch06/Script";
import { SmartBuffer } from "smart-buffer";
import { Tx } from "./Tx";
import { TxFetcher } from "./TxFetcher";

export class TxIn {
  constructor(
    public prevTx: Buffer,
    public prevIndex: number,
    public scriptSig: Script,
    public sequence: number = 0xffffffff
  ) {}

  static parse = (s: SmartBuffer) => {
    const prevTx = s.readBuffer(32).reverse();
    const prevIndex = s.readUInt32LE();
    const scriptSig = new Script();
    const sequence = s.readUInt32LE();
    return new TxIn(prevTx, prevIndex, scriptSig, sequence);
  };

  serialize = (): Buffer => {
    const s = new SmartBuffer();
    s.writeBuffer(this.prevTx.reverse());
    s.writeUInt32LE(this.prevIndex);
    s.writeBuffer(this.scriptSig.serialize());
    s.writeUInt32LE(this.sequence);
    return s.toBuffer();
  };

  fetchTx = (testnet: boolean = false): Promise<Tx> => {
    return TxFetcher.fetch(this.prevTx.toString("hex"), testnet);
  };

  value = async (testnet: boolean = false): Promise<bigint> => {
    const tx = await this.fetchTx(testnet);
    return tx.txOuts[this.prevIndex].amount;
  };

  scriptPubkey = async (testnet: boolean = false): Promise<Script> => {
    const tx = await this.fetchTx(testnet);
    return tx.txOuts[this.prevIndex].scriptPubkey;
  };

  toString = (): string => {
    return `${this.prevTx.toString("hex")}:${this.prevIndex}`;
  };
}
