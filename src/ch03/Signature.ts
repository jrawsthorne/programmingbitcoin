import BN from "bn.js";
export class Signature {
  constructor(public r: BN, public s: BN) {}

  toString = (): string => {
    return `Signature(${this.r.toString()},${this.s.toString()})`;
  };
}
