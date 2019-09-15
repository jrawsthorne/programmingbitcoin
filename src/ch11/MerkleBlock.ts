export class MerkleTree {
  public maxDepth: number;
  public nodes: Array<(Buffer | undefined)[]> = [];
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
