import { hash256, readVarint, encodeVarint } from "../helper";
import { TxIn } from "./TxIn";
import { SmartBuffer } from "smart-buffer";
import { TxOut } from "./TxOut";

export class Tx {
  constructor(
    public version: number,
    public txIns: TxIn[],
    public txOuts: TxOut[],
    public locktime: number,
    public testnet: boolean = false
  ) {}

  static parse = (stream: Buffer, testnet: boolean = false) => {
    const s = SmartBuffer.fromBuffer(stream);
    const version = s.readUInt32LE();
    const numInputs = readVarint(s);
    let inputs: TxIn[] = [];
    for (let i = 0; i < numInputs; i++) {
      inputs.push(TxIn.parse(s));
    }
    const numOutputs = readVarint(s);
    let outputs: TxOut[] = [];
    for (let i = 0; i < numOutputs; i++) {
      outputs.push(TxOut.parse(s));
    }
    const locktime = s.readUInt32LE();
    return new Tx(version, inputs, outputs, locktime, testnet);
  };

  serialize = (): Buffer => {
    const s = new SmartBuffer();
    s.writeUInt32LE(this.version);
    s.writeBuffer(encodeVarint(this.txIns.length));
    for (const txIn of this.txIns) {
      s.writeBuffer(txIn.serialize());
    }
    s.writeBuffer(encodeVarint(this.txOuts.length));
    for (const txOut of this.txOuts) {
      s.writeBuffer(txOut.serialize());
    }
    s.writeUInt32LE(this.locktime);
    return s.toBuffer();
  };

  id = (): string => {
    return this.hash().toString("hex");
  };

  hash = () => {
    return hash256(this.serialize()).reverse();
  };

  fee = async (testnet: boolean = false): Promise<bigint> => {
    let inputSum = 0n;
    let outputSum = 0n;
    for (const txIn of this.txIns) {
      inputSum += await txIn.value(testnet);
    }
    for (const txOut of this.txOuts) {
      outputSum += await txOut.amount;
    }
    return inputSum - outputSum;
  };

  toString = (): string => {
    let txIns = "";
    for (const txIn of this.txIns) {
      txIns += `${txIn}\n`;
    }
    let txOuts = "";
    for (const txOut of this.txOuts) {
      txOuts += `${txOut}\n`;
    }
    return `tx: ${this.id()}\nversion: ${
      this.version
    }\ntx_ins:\n${txIns}tx_outs:\n${txOuts}locktime: ${this.locktime}`;
  };
}
