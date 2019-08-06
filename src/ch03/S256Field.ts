import { FieldElement } from "../ch01/Field";

export const P = 2n ** 256n - 2n ** 32n - 977n;

export class S256Field extends FieldElement {
  constructor(num: bigint) {
    super(num, P);
  }

  sqrt = (): S256Field => {
    const field = this.pow((P + 1n) / 4n);
    return new S256Field(field.num);
  };

  toString = (): string => {
    return this.num.toString(16).padStart(64);
  };
}
