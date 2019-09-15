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
