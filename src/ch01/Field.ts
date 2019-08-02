import BigNumber from "bignumber.js";

export class FieldElement {
  public num: BigNumber;
  public prime: BigNumber;

  constructor(num: BigNumber | number, prime: BigNumber | number) {
    BigNumber.config({
      MODULO_MODE: BigNumber.ROUND_FLOOR
    });

    this.num = BigNumber.isBigNumber(num) ? num : new BigNumber(num);
    this.prime = BigNumber.isBigNumber(prime) ? prime : new BigNumber(prime);

    if (this.num.gte(this.prime) || this.num.lt(0)) {
      throw new Error(
        `Num ${this.num.toString()} not in field range 0 to ${this.prime.minus(
          1
        )}`
      );
    }
  }

  equals = (other: FieldElement): boolean => {
    return this.num.eq(other.num) && this.prime.eq(other.prime);
  };

  add = (other: FieldElement): FieldElement => {
    if (!this.prime.eq(other.prime)) {
      throw new MismatchedFields(this.prime, other.prime, "add");
    }
    const num = this.num.plus(other.num).mod(this.prime);
    return new FieldElement(num, this.prime);
  };

  sub = (other: FieldElement): FieldElement => {
    if (!this.prime.eq(other.prime)) {
      throw new MismatchedFields(this.prime, other.prime, "subtract");
    }
    const num = this.num.minus(other.num).mod(this.prime);
    return new FieldElement(num, this.prime);
  };

  mul = (other: FieldElement): FieldElement => {
    if (!this.prime.eq(other.prime)) {
      throw new MismatchedFields(this.prime, other.prime, "multiply");
    }
    const num = this.num.times(other.num).mod(this.prime);
    return new FieldElement(num, this.prime);
  };

  pow = (exponent: number): FieldElement => {
    const n = new BigNumber(exponent).mod(this.prime.minus(1));
    const num = this.num.pow(n, this.prime);
    return new FieldElement(num, this.prime);
  };

  div = (other: FieldElement): FieldElement => {
    if (!this.prime.eq(other.prime)) {
      throw new MismatchedFields(this.prime, other.prime, "divide");
    }

    const num = this.num
      .times(other.num.pow(this.prime.minus(2), this.prime))
      .mod(this.prime);
    return new FieldElement(num, this.prime);
  };

  rmul = (coefficient: BigNumber | number): FieldElement => {
    const coef = BigNumber.isBigNumber(coefficient)
      ? coefficient
      : new BigNumber(coefficient);

    const num = this.num.times(coef).mod(this.prime);
    return new FieldElement(num, this.prime);
  };

  toString = (): String => {
    return `FieldElement { num: ${this.num}, prime: ${this.prime} }`;
  };
}

export class MismatchedFields extends Error {
  constructor(first: BigNumber, second: BigNumber, operation: string) {
    super(
      `Cannot ${operation} two numbers in different Fields ${first.toString()} vs ${second.toString()}`
    );
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
