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
import { PrivateKey, taggedHash } from "../ch03/PrivateKey";
import { Script, p2pkhScript } from "../ch06/Script";
import { PushDataOpcode } from "../ch06/Op";
import crypto from "crypto";

export class Tx {
  private _hashPrevouts?: Buffer;
  private _hashSequence?: Buffer;
  private _hashOutputs?: Buffer;
  private _hashAmounts?: Buffer;
  constructor(
    public version: number,
    public txIns: TxIn[],
    public txOuts: TxOut[],
    public locktime: number,
    public testnet: boolean = false,
    public segwit: boolean = false
  ) { }

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

  sigHashBIP143 = async (
    inputIndex: number,
    redeemScript?: Script,
    witnessScript?: Script
  ): Promise<bigint> => {
    const txIn = this.txIns[inputIndex];
    const s = new SmartBuffer();
    s.writeUInt32LE(this.version);
    s.writeBuffer(this.hashPrevouts());
    s.writeBuffer(this.hashSequence());
    s.writeBuffer(reverseBuffer(txIn.prevTx));
    s.writeUInt32LE(txIn.prevIndex);
    let scriptCode: Buffer;
    if (witnessScript) {
      scriptCode = witnessScript.serialize();
    } else if (redeemScript) {
      scriptCode = p2pkhScript(
        (redeemScript.cmds[1] as PushDataOpcode).data
      ).serialize();
    } else {
      const scriptPubkey = await txIn.scriptPubkey(this.testnet);
      scriptCode = p2pkhScript(
        (scriptPubkey.cmds[1] as PushDataOpcode).data
      ).serialize();
    }
    s.writeBuffer(scriptCode);
    s.writeBuffer(toBufferLE(await txIn.value(), 8));
    s.writeUInt32LE(txIn.sequence);
    s.writeBuffer(this.hashOutputs());
    s.writeUInt32LE(this.locktime);
    s.writeUInt32LE(SIGHASH_ALL);
    return toBigIntBE(hash256(s.toBuffer()));
  };

  // sighash for taproot (no tapscript)
  // assumes SIGHASH_ALL
  // gets previous outputs from blockstream.info
  sigHashSchnorr = async (inputIndex: number): Promise<bigint> => {
    const txIn = this.txIns[inputIndex];
    const s = new SmartBuffer();

    s.writeUInt8(0) // EPOCH always 0
    s.writeUInt8(SIGHASH_ALL); // sighash type
    s.writeUInt32LE(this.version);
    s.writeUInt32LE(this.locktime);
    s.writeBuffer(this.hashPrevouts());
    s.writeBuffer(await this.hashAmounts());
    s.writeBuffer(this.hashSequence());
    s.writeBuffer(this.hashOutputs()); // Assume SIGHASH_ALL
    s.writeUInt8(0); // spend type = taproot(0) + no annex(0) = 0
    s.writeBuffer((await txIn.scriptPubkey(this.testnet)).serialize());
    s.writeUInt32LE(inputIndex);

    return toBigIntBE(taggedHash("TapSighash", s.toBuffer()));
  }

  hashPrevouts = (): Buffer => {
    if (!this._hashPrevouts) {
      const allPrevouts = new SmartBuffer();
      const allSequence = new SmartBuffer();
      for (const txIn of this.txIns) {
        allPrevouts.writeBuffer(reverseBuffer(txIn.prevTx));
        allPrevouts.writeUInt32LE(txIn.prevIndex);
        allSequence.writeUInt32LE(txIn.sequence);
      }
      this._hashPrevouts = hash256(allPrevouts.toBuffer());
      this._hashSequence = hash256(allSequence.toBuffer());
    }
    return this._hashPrevouts;
  };

  hashSequence = (): Buffer => {
    if (!this._hashSequence) {
      this.hashPrevouts(); // will also calculate hashSequence
    }
    return this._hashSequence!;
  };

  hashOutputs = (): Buffer => {
    if (!this._hashOutputs) {
      const allOutputs = new SmartBuffer();
      for (const txOut of this.txOuts) {
        allOutputs.writeBuffer(txOut.serialize());
      }
      this._hashOutputs = hash256(allOutputs.toBuffer());
    }
    return this._hashOutputs;
  };

  hashAmounts = async (): Promise<Buffer> => {
    if (!this._hashAmounts) {
      const allAmounts = new SmartBuffer();
      for (const txIn of this.txIns) {
        let amount = await txIn.value(this.testnet);
        allAmounts.writeBuffer(toBufferLE(amount, 8));
      }
      this._hashAmounts = hash256(allAmounts.toBuffer());
    }
    return this._hashAmounts!;
  }

  verifyInput = async (inputIndex: number): Promise<boolean> => {
    const txIn = this.txIns[inputIndex];
    const scriptPubkey = await txIn.scriptPubkey(this.testnet);
    let redeemScript: Script | undefined;
    let z: bigint;
    let witness: Buffer[] | undefined;
    if (scriptPubkey.isP2SH()) {
      // last cmd of p2sh will be the redeem script
      const cmd = (txIn.scriptSig.cmds[
        txIn.scriptSig.cmds.length - 1
      ] as PushDataOpcode).data;
      // turn redeem script into valid script by appending varint of its length
      const rawRedeem = Buffer.concat([encodeVarint(cmd.byteLength), cmd]);
      redeemScript = Script.parse(SmartBuffer.fromBuffer(rawRedeem));
      if (redeemScript.isP2WPKH()) {
        z = await this.sigHashBIP143(inputIndex, redeemScript);
        witness = txIn.witness;
      } else if (redeemScript.isP2WSH()) {
        // last item of witness field contains witnessScript
        const cmd = txIn.witness[txIn.witness.length - 1];
        const rawWitness = Buffer.concat([encodeVarint(cmd.byteLength), cmd]);
        const witnessScript = Script.parse(SmartBuffer.fromBuffer(rawWitness));
        z = await this.sigHashBIP143(inputIndex, undefined, witnessScript);
        witness = txIn.witness;
      } else {
        z = await this.sigHash(inputIndex, redeemScript);
      }
    } else {
      if (scriptPubkey.isP2WPKH()) {
        z = await this.sigHashBIP143(inputIndex);
        witness = txIn.witness;
      } else if (scriptPubkey.isP2WSH()) {
        // last item of witness field contains witnessScript
        const cmd = txIn.witness[txIn.witness.length - 1];
        const rawWitness = Buffer.concat([encodeVarint(cmd.byteLength), cmd]);
        const witnessScript = Script.parse(SmartBuffer.fromBuffer(rawWitness));
        z = await this.sigHashBIP143(inputIndex, undefined, witnessScript);
        witness = txIn.witness;
      } else if (scriptPubkey.isP2Taproot()) {
        z = await this.sigHashSchnorr(inputIndex);
        witness = txIn.witness;
      } else {
        z = await this.sigHash(inputIndex);
      }
    }
    const combinedScript = txIn.scriptSig.add(scriptPubkey);
    return combinedScript.evaluate(z, witness || []);
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

  schnorrSignInput = async (
    inputIndex: number,
    privateKey: PrivateKey
  ): Promise<boolean> => {
    const z = await this.sigHashSchnorr(inputIndex);
    const auxRand = crypto.randomBytes(32);
    const sig = privateKey.schnorrSign(z, auxRand);
    this.txIns[inputIndex].witness = [sig];
    return this.verifyInput(inputIndex);
  }

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
