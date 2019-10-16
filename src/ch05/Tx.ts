import {
  hash256,
  readVarint,
  encodeVarint,
  SIGHASH_ALL,
  reverseBuffer,
  toBigIntBE,
  toIntLE,
  toBufferLE
} from "../helper";
import { TxIn } from "./TxIn";
import { SmartBuffer } from "smart-buffer";
import { TxOut } from "./TxOut";
import { PrivateKey } from "../ch03/PrivateKey";
import { Script } from "../ch06/Script";
import { PushDataOpcode } from "../ch06/Op";

export class Tx {
  constructor(
    public version: number,
    public txIns: TxIn[],
    public txOuts: TxOut[],
    public locktime: number,
    public testnet: boolean = false,
    public segwit: boolean = false
  ) {}

  static parseLegacy = (s: SmartBuffer, testnet: boolean = false): Tx => {
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
    return new Tx(version, inputs, outputs, locktime, testnet, false);
  };

  static parseSegwit = (s: SmartBuffer, testnet: boolean = false): Tx => {
    const version = s.readUInt32LE();
    const marker = s.readBuffer(2);
    // marker is 0x00 and flag is 0x01
    if (!marker.equals(Buffer.from("0001", "hex"))) {
      throw Error("not a segwit tx");
    }
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
    // read witness vector for each input
    for (const input of inputs) {
        const numItems = readVarint(s);
      const items: Buffer[] = [];
        for (let i = 0; i < numItems; i++) {
        const itemLength = Number(readVarint(s));
        if (itemLength === 0) {
          items.push(Buffer.alloc(0));
        } else {
          items.push(s.readBuffer(itemLength));
          }
        }
      input.witness = items;
      }
    const locktime = s.readUInt32LE();
    return new Tx(version, inputs, outputs, locktime, testnet, true);
  };

  static parse = (
    stream: Buffer | SmartBuffer,
    testnet: boolean = false
  ): Tx => {
    const s = Buffer.isBuffer(stream) ? SmartBuffer.fromBuffer(stream) : stream;
    s.readOffset += 4; // skip over version to read marker
    let parseMethod;
    // segwit marker is 0x00
    if (s.readBuffer(1).equals(Buffer.alloc(1, 0))) {
      parseMethod = Tx.parseSegwit;
    } else {
      parseMethod = Tx.parseLegacy;
    }
    s.readOffset -= 5;
    return parseMethod(s, testnet);
  };

  serialize = (): Buffer => {
    if (this.segwit) {
      return this.serializeSegwit();
    } else {
      return this.serializeLegacy();
    }
  };

  serializeLegacy = (): Buffer => {
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

  serializeSegwit = (): Buffer => {
    const s = new SmartBuffer();
    s.writeUInt32LE(this.version);
    s.writeBuffer(Buffer.from("0001", "hex"));
    s.writeBuffer(encodeVarint(this.txIns.length));
    for (const txIn of this.txIns) {
      s.writeBuffer(txIn.serialize());
    }
    s.writeBuffer(encodeVarint(this.txOuts.length));
    for (const txOut of this.txOuts) {
      s.writeBuffer(txOut.serialize());
    }
    for (const txIn of this.txIns) {
      s.writeBuffer(encodeVarint(txIn.witness.length));
      for (const item of txIn.witness) {
        s.writeBuffer(encodeVarint(item.byteLength));
        s.writeBuffer(item);
      }
    }
    s.writeUInt32LE(this.locktime);
    return s.toBuffer();
  };

  id = (): string => {
    return this.hash().toString("hex");
  };

  wtxid = (): string => {
    if (!this.segwit) return this.id();
    return this.witnessHash().toString("hex");
  };

  hash = (): Buffer => {
    // use legacy serialization for txid - fixes malleability
    return reverseBuffer(hash256(this.serializeLegacy()));
  };

  witnessHash = (): Buffer => {
    // use segwit serialization for wtxid
    if (!this.segwit) return hash256(this.serializeLegacy());
    return hash256(this.serializeSegwit());
  };

  fee = async (testnet: boolean = false): Promise<bigint> => {
    let inputSum = 0n;
    let outputSum = 0n;
    for (const txIn of this.txIns) {
      inputSum += await txIn.value(testnet);
    }
    for (const txOut of this.txOuts) {
      outputSum += txOut.amount;
    }
    return inputSum - outputSum;
  };

  sigHash = async (
    inputIndex: number,
    redeemScript?: Script
  ): Promise<bigint> => {
    const s = new SmartBuffer();
    s.writeUInt32LE(this.version);
    s.writeBuffer(encodeVarint(this.txIns.length));
    for (const [i, txIn] of this.txIns.entries()) {
      // standard tx just empty the scriptsig
      let scriptSig = undefined;
      if (i === inputIndex) {
        // in p2pkh replace scriptsig with scriptpubkey when creating sighash
        // in p2sh replace scriptsig with redeemscript
        scriptSig = redeemScript || (await txIn.scriptPubkey(this.testnet));
      }
      s.writeBuffer(
        new TxIn(
          txIn.prevTx,
          txIn.prevIndex,
          scriptSig,
          txIn.sequence
        ).serialize()
      );
    }
    s.writeBuffer(encodeVarint(this.txOuts.length));
    for (const txOut of this.txOuts) {
      s.writeBuffer(txOut.serialize());
    }
    s.writeUInt32LE(this.locktime);
    s.writeUInt32LE(SIGHASH_ALL);
    const h256 = hash256(s.toBuffer());
    return toBigIntBE(h256);
  };

  verifyInput = async (inputIndex: number): Promise<boolean> => {
    const txIn = this.txIns[inputIndex];
    const scriptPubkey = await txIn.scriptPubkey(this.testnet);
    let redeemScript;
    if (scriptPubkey.isP2SH()) {
      // last cmd of p2sh will be the redeem script
      const cmd = (txIn.scriptSig.cmds[
        txIn.scriptSig.cmds.length - 1
      ] as PushDataOpcode).data;
      // turn redeem script into valid script by appending varint of its length
      const rawRedeem = Buffer.concat([encodeVarint(cmd.byteLength), cmd]);
      redeemScript = Script.parse(SmartBuffer.fromBuffer(rawRedeem));
    }
    const z = await this.sigHash(inputIndex, redeemScript);
    const combinedScript = txIn.scriptSig.add(scriptPubkey);
    return combinedScript.evaluate(z);
  };

  verify = async (): Promise<boolean> => {
    if ((await this.fee()) < 0) {
      return false;
    }
    for (let i = 0; i < this.txIns.length; i++) {
      if (!(await this.verifyInput(i))) {
        return false;
      }
    }
    return true;
  };

  // sign for p2pkh
  signInput = async (
    inputIndex: number,
    privateKey: PrivateKey,
    compressed: boolean = true
  ): Promise<boolean> => {
    const z = await this.sigHash(inputIndex);
    const der = privateKey.sign(z).der();
    const sig = Buffer.concat([der, Buffer.alloc(1, SIGHASH_ALL)]);
    const sec = privateKey.point.sec(compressed);
    this.txIns[inputIndex].scriptSig = new Script([
      { opcode: sig.length, data: sig, originalLength: sig.length },
      { opcode: sec.length, data: sec, originalLength: sec.length }
    ]);
    return this.verifyInput(inputIndex);
  };

  // coinbase must have a single input with
  // prevIndex of ffffffff and prevTx of 32 0 bytes
  isCoinbase = (): boolean => {
    return (
      this.txIns.length === 1 &&
      this.txIns[0].prevIndex === 0xffffffff &&
      this.txIns[0].prevTx.equals(Buffer.alloc(32, 0))
    );
  };

  coinbaseHeight = (): number => {
    if (!this.isCoinbase()) throw Error("Not a coinbase transaction");
    if (typeof this.txIns[0].scriptSig.cmds[0] === "number") {
      throw new Error("Invalid scriptsig");
    }
    return toIntLE((this.txIns[0].scriptSig.cmds[0] as PushDataOpcode).data);
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
