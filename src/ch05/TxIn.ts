import { Script } from "../ch06/Script";
import { SmartBuffer } from "smart-buffer";
import { Tx } from "./Tx";
import { TxFetcher } from "./TxFetcher";
import { reverseBuffer } from "../helper";

export class TxIn {
  constructor(
    public prevTx: Buffer,
    public prevIndex: number,
    public scriptSig: Script = new Script(),
    public sequence: number = 0xffffffff
  ) {}

  static parse = (s: SmartBuffer) => {
    // encode big endian
    const prevTx = reverseBuffer(s.readBuffer(32));
    const prevIndex = s.readUInt32LE();
    const scriptSig = Script.parse(s);
    const sequence = s.readUInt32LE();
    return new TxIn(prevTx, prevIndex, scriptSig, sequence);
  };

  serialize = (): Buffer => {
    const s = new SmartBuffer();
    s.writeBuffer(reverseBuffer(this.prevTx));
    s.writeUInt32LE(this.prevIndex);
    s.writeBuffer(this.scriptSig.serialize());
    s.writeUInt32LE(this.sequence);
    return s.toBuffer();
  };

  fetchTx = async (testnet: boolean = false): Promise<Tx> => {
    try {
      return await TxFetcher.fetch(this.prevTx.toString("hex"), testnet);
    } catch {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.fetchTx(testnet);
    }
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
