import { SmartBuffer } from "smart-buffer";
import { reverseBuffer, hash256, bitsToTarget, toBigIntLE } from "../helper";

export class Block {
  constructor(
    public version: number,
    public prevBlock: Buffer,
    public merkleRoot: Buffer,
    public timestamp: number,
    public bits: Buffer,
    public nonce: Buffer
  ) {}

  static parse = (block: Buffer | SmartBuffer): Block => {
    const s = Buffer.isBuffer(block) ? SmartBuffer.fromBuffer(block) : block;
    const version = s.readUInt32LE();
    const prevBlock = reverseBuffer(s.readBuffer(32));
    const merkleRoot = reverseBuffer(s.readBuffer(32));
    const timestamp = s.readUInt32LE();
    const bits = s.readBuffer(4);
    const nonce = s.readBuffer(4);
    return new Block(version, prevBlock, merkleRoot, timestamp, bits, nonce);
  };

  serialize = (): Buffer => {
    const s = SmartBuffer.fromSize(80);
    s.writeUInt32LE(this.version);
    s.writeBuffer(reverseBuffer(this.prevBlock));
    s.writeBuffer(reverseBuffer(this.merkleRoot));
    s.writeUInt32LE(this.timestamp);
    s.writeBuffer(this.bits);
    s.writeBuffer(this.nonce);
    return s.toBuffer();
  };

  hash = (): Buffer => {
    return reverseBuffer(hash256(this.serialize()));
  };

  bip9 = (): boolean => {
    return this.version >> 29 === 0x001;
  };

  bip91 = (): boolean => {
    return ((this.version >> 4) & 1) === 1;
  };

  bip141 = (): boolean => {
    return ((this.version >> 1) & 1) === 1;
  };

  target = (): bigint => {
    return bitsToTarget(this.bits);
  };

  difficulty = (): bigint => {
    const target = this.target();
    return (0xffffn * 256n ** (0x1dn - 3n)) / target;
  };

  checkPoW = (): boolean => {
    const proof = toBigIntLE(hash256(this.serialize()));
    return proof < this.target();
  };
}
