import BN from "bn.js";

export class FieldElement {
  public num: BN;
  public prime: BN;

  constructor(num: BN | number, prime: BN | number) {
    this.num = BN.isBN(num) ? num : new BN(num);
    this.prime = BN.isBN(prime) ? prime : new BN(prime);

    if (this.num.gte(this.prime) || this.num.isNeg()) {
      throw new Error(
        `Num ${this.num.toString()} not in field range 0 to ${this.prime.sub(
          new BN(1)
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
    const num = this.num.add(other.num).mod(this.prime);
    return new FieldElement(num, this.prime);
  };

  sub = (other: FieldElement): FieldElement => {
    if (!this.prime.eq(other.prime)) {
      throw new MismatchedFields(this.prime, other.prime, "subtract");
    }
    // could be negative, use umod to make answer positive
    const num = this.num.sub(other.num).umod(this.prime);
    return new FieldElement(num, this.prime);
  };

  mul = (other: FieldElement): FieldElement => {
    if (!this.prime.eq(other.prime)) {
      throw new MismatchedFields(this.prime, other.prime, "multiply");
    }
    const num = this.num.mul(other.num).mod(this.prime);
    return new FieldElement(num, this.prime);
  };

  // exponent could be negative
  pow = (exponent: number): FieldElement => {
    const n = new BN(exponent).umod(this.prime.sub(new BN(1)));
    const red = BN.mont(this.prime);
    const num = this.num
      .toRed(red)
      .redPow(n)
      .fromRed();
    return new FieldElement(num, this.prime);
  };

  div = (other: FieldElement): FieldElement => {
    if (!this.prime.eq(other.prime)) {
      throw new MismatchedFields(this.prime, other.prime, "divide");
    }
    const red = BN.mont(this.prime);
    const power = other.num
      .toRed(red)
      .redPow(this.prime.sub(new BN(2)))
      .fromRed();
    const num = this.num.mul(power).mod(this.prime);
    return new FieldElement(num, this.prime);
  };

  rmul = (coefficient: BN | number): FieldElement => {
    const coef = BN.isBN(coefficient) ? coefficient : new BN(coefficient);
    const num = this.num.mul(coef).mod(this.prime);
    return new FieldElement(num, this.prime);
  };

  toString = (): String => {
    return `FieldElement { num: ${this.num}, prime: ${this.prime} }`;
  };
}

export class MismatchedFields extends Error {
  constructor(first: BN, second: BN, operation: string) {
    super(
      `Cannot ${operation} two numbers in different Fields ${first.toString()} vs ${second.toString()}`
    );
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
