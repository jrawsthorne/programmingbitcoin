import BigNumber from "bignumber.js";

export class FieldElement {
  constructor(public num: number, public prime: number) {
    BigNumber.config({
      MODULO_MODE: BigNumber.ROUND_FLOOR
    });
    if (num >= prime || num < 0) {
      throw new Error(`Num ${num} not in field range 0 to ${prime - 1}`);
    }
  }

  equals = (other: FieldElement): boolean => {
    return this.num === other.num && this.prime === other.prime;
  };

  add = (other: FieldElement): FieldElement => {
    if (this.prime !== other.prime) {
      throw new MismatchedFields(this.prime, other.prime, "add");
    }
    const num = new BigNumber(this.num)
      .plus(other.num)
      .mod(this.prime)
      .toNumber();
    return new FieldElement(num, this.prime);
  };

  sub = (other: FieldElement): FieldElement => {
    if (this.prime !== other.prime) {
      throw new MismatchedFields(this.prime, other.prime, "subtract");
    }
    const num = new BigNumber(this.num)
      .minus(other.num)
      .mod(this.prime)

      .toNumber();
    return new FieldElement(num, this.prime);
  };

  mul = (other: FieldElement): FieldElement => {
    if (this.prime !== other.prime) {
      throw new MismatchedFields(this.prime, other.prime, "multiply");
    }
    const num = new BigNumber(this.num)
      .times(other.num)
      .mod(this.prime)
      .toNumber();
    return new FieldElement(num, this.prime);
  };

  pow = (exponent: number): FieldElement => {
    const n = new BigNumber(exponent).mod(this.prime - 1);
    const num = new BigNumber(this.num)
      .pow(n)
      .mod(this.prime)
      .toNumber();
    return new FieldElement(num, this.prime);
  };

  div = (other: FieldElement): FieldElement => {
    if (this.prime !== other.prime) {
      throw new MismatchedFields(this.prime, other.prime, "divide");
    }
    const num = new BigNumber(this.num)
      .times(new BigNumber(other.num).pow(this.prime - 2).mod(this.prime))
      .mod(this.prime)
      .toNumber();
    return new FieldElement(num, this.prime);
  };
}

export class MismatchedFields extends Error {
  constructor(first: number, second: number, operation: string) {
    super(
      `Cannot ${operation} two numbers in different Fields ${first} vs ${second}`
    );
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
