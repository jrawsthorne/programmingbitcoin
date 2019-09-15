import {
  reverseBuffer,
  readVarint,
  merkleParent,
  bytesToBitField
} from "../helper";
import { SmartBuffer } from "smart-buffer";

// depth first traversal
export class MerkleTree {
  public maxDepth: number;
  public nodes: Array<(Buffer | null)[]> = [];
  public currentDepth: number = 0;
  public currentIndex: number = 0;

  constructor(public total: number) {
    this.maxDepth = Math.ceil(Math.log2(total));
    for (let depth = 0; depth < this.maxDepth + 1; depth++) {
      const numItems = Math.ceil(total / 2 ** (this.maxDepth - depth));
      const levelHashes = Array(numItems).fill(null);
      this.nodes.push(levelHashes);
    }
  }

  up = (): void => {
    this.currentDepth -= 1;
    this.currentIndex = Math.floor(this.currentIndex / 2);
  };

  left = (): void => {
    this.currentDepth += 1;
    this.currentIndex *= 2;
  };

  right = (): void => {
    this.currentDepth += 1;
    this.currentIndex = this.currentIndex * 2 + 1;
  };

  root = (): Buffer | null => {
    return this.nodes[0][0];
  };

  setCurrentNode = (value: Buffer): void => {
    this.nodes[this.currentDepth][this.currentIndex] = value;
  };

  getCurrentNode = (): Buffer | null => {
    return this.nodes[this.currentDepth][this.currentIndex];
  };

  getLeftNode = (): Buffer | null => {
    return this.nodes[this.currentDepth + 1][this.currentIndex * 2];
  };

  getRightNode = (): Buffer | null => {
    return this.nodes[this.currentDepth + 1][this.currentIndex * 2 + 1];
  };

  isLeaf = (): boolean => {
    return this.currentDepth === this.maxDepth;
  };

  // in certain situations we won't have a right child because
  // we may be at the furthest right node of the level whose
  // child level has an odd number of items
  rightExists = (): boolean => {
    if (this.isLeaf()) return false;
    return this.nodes[this.currentDepth + 1].length > this.currentIndex * 2 + 1;
  };

  populateTree = (flagBits: number[], hashes: Buffer[]): void => {
    // traverse up until we find the merkle root
    while (!this.root()) {
      // if at a leaf node we have the hash so just need to traverse up
      if (this.isLeaf()) {
        // always given hash for leaf node
        // or never traverse tree to it because a parent is given
        flagBits.shift();
        this.setCurrentNode(hashes.shift()!);
        this.up();
      } else {
        const leftHash = this.getLeftNode();
        // if don't have left hash we either need to
        // calculate it or it's given in the hashes field
        if (!leftHash) {
          // flag bit 0 means we are given it
          if (flagBits.shift() === 0) {
            this.setCurrentNode(hashes.shift()!);
            this.up();
          } else {
            this.left();
          }
        } else if (this.rightExists()) {
          const rightHash = this.getRightNode();
          // if don't have right hash we need to calculate it
          // before we can calculate the current hash so go right
          // Already have left because of depth first search
          if (!rightHash) {
            this.right();
          } else {
            // have both left and right hash so calculate merkle
            // parent value and set to current node
            // then we can go back up
            this.setCurrentNode(merkleParent(leftHash, rightHash));
            this.up();
          }
        } else {
          // No right child so calculate merkle parent using
          // duplicate of left hash
          this.setCurrentNode(merkleParent(leftHash, leftHash));
          this.up();
        }
      }
    }
    if (hashes.length !== 0) {
      throw Error(`hashes not all consumed ${hashes.length}`);
    }
    for (const flagBit of flagBits) {
      if (flagBit !== 0) {
        throw Error("flag bits not all consumed");
      }
    }
  };

  toString = (): string => {
    const result: string[] = [];
    for (const [depth, level] of this.nodes.entries()) {
      const items: string[] = [];
      for (const [index, h] of level.entries()) {
        let short: string;
        if (!h) {
          short = "None";
        } else {
          short = `${h.toString("hex").slice(0, 8)}...`;
        }
        if (depth === this.currentDepth && index === this.currentIndex) {
          items.push(`*${short.slice(0, short.length - 2)}*`);
        } else {
          items.push(short);
        }
      }
      result.push(items.join(", "));
    }
    return result.join("\n");
  };
}

export class MerkleBlock {
  constructor(
    public version: number,
    public prevBlock: Buffer,
    public merkleRoot: Buffer,
    public timestamp: number,
    public bits: Buffer,
    public nonce: Buffer,
    public total: number,
    public hashes: Buffer[],
    public flags: Buffer
  ) {}

  static parse = (block: Buffer | SmartBuffer): MerkleBlock => {
    const s = Buffer.isBuffer(block) ? SmartBuffer.fromBuffer(block) : block;
    const version = s.readUInt32LE();
    const prevBlock = reverseBuffer(s.readBuffer(32));
    const merkleRoot = reverseBuffer(s.readBuffer(32));
    const timestamp = s.readUInt32LE();
    const bits = s.readBuffer(4);
    const nonce = s.readBuffer(4);
    const total = s.readUInt32LE();
    const numHashes = readVarint(s);
    const hashes: Buffer[] = [];
    for (let i = 0; i < numHashes; i++) {
      hashes.push(reverseBuffer(s.readBuffer(32)));
    }
    const flagsLength = readVarint(s);
    const flags = s.readBuffer(Number(flagsLength));

    return new MerkleBlock(
      version,
      prevBlock,
      merkleRoot,
      timestamp,
      bits,
      nonce,
      total,
      hashes,
      flags
    );
  };

  isValid = (): boolean => {
    const flagBits = bytesToBitField(this.flags);
    const hashes = this.hashes.map(hash => reverseBuffer(hash));
    const merkleTree = new MerkleTree(this.total);
    merkleTree.populateTree(flagBits, hashes);
    const merkleRoot = reverseBuffer(merkleTree.root()!);
    return merkleRoot.equals(this.merkleRoot);
  };
}
