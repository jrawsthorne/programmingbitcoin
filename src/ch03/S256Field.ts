import { FieldElement } from "../ch01/Field";
import BigNumber from "bignumber.js";

const p = new BigNumber(2)
  .pow(256)
  .minus(new BigNumber(2).pow(32))
  .minus(977);

export class S256Field extends FieldElement {
  constructor(num: BigNumber | number) {
    super(num, p);
  }

  toString = (): string => {
    return this.num.toString().padStart(64);
  };
}
