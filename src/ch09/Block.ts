import { SmartBuffer } from "smart-buffer";
import {
  reverseBuffer,
  hash256,
  bitsToTarget,
  toBigIntLE,
  calculateMerkleRoot,
  readVarint,
  encodeVarint
} from "../helper";
import { Tx } from "../ch05/Tx";

export const GENESIS_BLOCK = Buffer.from(
  "0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a29ab5f49ffff001d1dac2b7c",
  "hex"
);
export const TESTNET_GENESIS_BLOCK = Buffer.from(
  "0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4adae5494dffff001d1aa4ae18",
  "hex"
);
export const LOWEST_BITS = Buffer.from("ffff001d", "hex");

export class Block {
  constructor(
    public version: number,
    public prevBlock: Buffer,
    public merkleRoot: Buffer,
    public timestamp: number,
    public bits: Buffer,
    public nonce: Buffer,
    public transactions: Tx[],
    public txHashes?: Buffer[] // transactions must be ordered
  ) {}

  static parse = (block: Buffer | SmartBuffer): Block => {
    const s = Buffer.isBuffer(block) ? SmartBuffer.fromBuffer(block) : block;
    const version = s.readUInt32LE();
    const prevBlock = reverseBuffer(s.readBuffer(32));
    const merkleRoot = reverseBuffer(s.readBuffer(32));
    const timestamp = s.readUInt32LE();
    const bits = s.readBuffer(4);
    const nonce = s.readBuffer(4);
    const transactions = [];
    if (s.remaining()) {
      const txCount = readVarint(s);
      for (let i = 0; i < txCount; i++) {
        transactions.push(Tx.parse(s));
      }
    }

    return new Block(
      version,
      prevBlock,
      merkleRoot,
      timestamp,
      bits,
      nonce,
      transactions
    );
  };

  serialize = (headerOnly: boolean): Buffer => {
    const s = headerOnly ? SmartBuffer.fromSize(80) : new SmartBuffer();
    s.writeUInt32LE(this.version);
    s.writeBuffer(reverseBuffer(this.prevBlock));
    s.writeBuffer(reverseBuffer(this.merkleRoot));
    s.writeUInt32LE(this.timestamp);
    s.writeBuffer(this.bits);
    s.writeBuffer(this.nonce);
    if (!headerOnly) {
      s.writeBuffer(encodeVarint(this.transactions.length));
      for (const transaction of this.transactions) {
        s.writeBuffer(transaction.serialize());
      }
    }
    return s.toBuffer();
  };

  hash = (): Buffer => {
    // hash uses serialized block header
    return reverseBuffer(hash256(this.serialize(true)));
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
    // checkPow only uses serialized block header
    const proof = toBigIntLE(hash256(this.serialize(true)));
    return proof < this.target();
  };

  /**
   * Gets the merkle root of the txHashes and checks that it's
   * the same as the merkle root of this block.
   */
  validateMerkleRoot = (): boolean => {
    let reversedTxHashes: Buffer[] = [];

    if (this.transactions.length < 1) {
      if (!this.txHashes || this.txHashes.length < 1) {
        throw Error("No transactions");
      } else {
    // reverse each item in this.txHashes
        reversedTxHashes = this.txHashes.map(txHash => reverseBuffer(txHash));
      }
    } else {
      // reverse each item in this.transactions
      reversedTxHashes = this.transactions.map(tx => reverseBuffer(tx.hash()));
    }

    // compute the Merkle Root and reverse
    const calculatedMerkleRoot = reverseBuffer(
      calculateMerkleRoot(reversedTxHashes)
    );
    return calculatedMerkleRoot.equals(this.merkleRoot);
  };
}
