import { FieldElement } from "../ch01/Field";
import BN from "bn.js";

const p = new BN(2)
  .pow(new BN(256))
  .sub(new BN(2).pow(new BN(32)))
  .sub(new BN(977));

export class S256Field extends FieldElement {
  constructor(num: BN | number) {
    super(num, p);
  }

  toString = (): string => {
    return this.num.toString().padStart(64);
  };
}
