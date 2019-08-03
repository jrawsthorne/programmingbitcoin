import { FieldElement } from "../ch01/Field";
import BN from "bn.js";

export const P = new BN(2)
  .pow(new BN(256))
  .sub(new BN(2).pow(new BN(32)))
  .sub(new BN(977));

export class S256Field extends FieldElement {
  constructor(num: BN | number) {
    super(num, P);
  }

  sqrt = (): S256Field => {
    const field = this.pow(P.add(new BN(1)).divn(4));
    return new S256Field(field.num);
  };

  toString = (): string => {
    return this.num.toString("hex").padStart(64);
  };
}
