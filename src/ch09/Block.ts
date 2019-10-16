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
import { Opcode, PushDataOpcode } from "../ch06/Op";

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

  validateWitnessMerkleRoot = (): boolean => {
    if (this.transactions.length < 1) throw Error("No transactions");
    if (!this.transactions[0].segwit)
      throw Error("Coinbase isn't segwit so no witness merkle root");
    const calculatedWitnessMerkleRoot = this.witnessMerkleRoot();

    // witness commitment is stored in an output of coinbase tx
    // find which output it is with getWitnessCommitmentIndex.
    // Actual commitment is from bytes 4 to 36
    const witnessMerkleRoot = (this.transactions[0].txOuts[
      getWitnessCommitmentIndex(this)
    ].scriptPubkey.cmds[1] as PushDataOpcode).data.slice(4);
    return calculatedWitnessMerkleRoot.equals(witnessMerkleRoot);
  };

  witnessMerkleRoot = (): Buffer => {
    if (this.transactions.length < 1) throw Error("No transactions");
    const leaves = [];
    leaves.push(Buffer.alloc(32, 0)); // coinbase wtxid assumed to be 0
    // push witness hash for every transaction after coinbase
    for (const tx of this.transactions.slice(1)) {
      leaves.push(tx.witnessHash());
    }
    const root = calculateMerkleRoot(leaves);
    // Double-SHA256(witness root hash|witness reserved value)
    // Coinbase witness must be single 32-byte array for the witness reserved value
    return hash256(Buffer.concat([root, Buffer.alloc(32, 0)]));
  };
}

// find which output contains witness commitment in coinbase tx from block
export const getWitnessCommitmentIndex = (block: Block): number => {
  if (block.transactions.length < 1) throw Error("No coinbase tx to check");
  // if multiple matches, use one with highest output index so go in
  // reverse order and return early
  for (const [i, txOut] of block.transactions[0].txOuts.reverse().entries()) {
    const scriptPubkey = txOut.scriptPubkey;
    if (
      scriptPubkey.rawSerialize().byteLength >= 38 && // TODO: store raw bytes to prevent having to reserialize in many cases
      scriptPubkey.cmds[0] === Opcode.OP_RETURN &&
      typeof scriptPubkey.cmds[1] !== "number"
    ) {
      const data = (scriptPubkey.cmds[1] as PushDataOpcode).data;
      // commitment is OP_RETURN <4 byte commitment header = 0xaa21a9ed> <32 byte commitment>
      if (data.slice(0, 4).equals(Buffer.from("aa21a9ed", "hex"))) {
        return i;
      }
    }
  }
  throw Error("No commitment found");
};
