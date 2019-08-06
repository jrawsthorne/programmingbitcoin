import { pow, mod } from "../helper";

export class FieldElement {
  constructor(public num: bigint, public prime: bigint) {
    if (num >= prime || num < 0) {
      throw new Error(`Num ${num} not in field range 0 to ${prime - 1n}`);
    }
  }

  equals = (other: FieldElement): boolean => {
    return this.num === other.num && this.prime === other.prime;
  };

  add = (other: FieldElement): FieldElement => {
    if (this.prime !== other.prime) {
      throw new MismatchedFields(this.prime, other.prime, "add");
    }
    const num = (this.num + other.num) % this.prime;
    return new FieldElement(num, this.prime);
  };

  sub = (other: FieldElement): FieldElement => {
    if (this.prime !== other.prime) {
      throw new MismatchedFields(this.prime, other.prime, "subtract");
    }
    // could be negative so use actual mod not rem
    const num = mod(this.num - other.num, this.prime);
    return new FieldElement(num, this.prime);
  };

  mul = (other: FieldElement): FieldElement => {
    if (this.prime !== other.prime) {
      throw new MismatchedFields(this.prime, other.prime, "multiply");
    }
    const num = (this.num * other.num) % this.prime;
    return new FieldElement(num, this.prime);
  };

  // exponent could be negative
  pow = (exponent: bigint): FieldElement => {
    const n = mod(exponent, this.prime - 1n);
    const num = pow(this.num, n, this.prime);
    return new FieldElement(num, this.prime);
  };

  div = (other: FieldElement): FieldElement => {
    if (this.prime !== other.prime) {
      throw new MismatchedFields(this.prime, other.prime, "divide");
    }
    const num =
      (this.num * pow(other.num, this.prime - 2n, this.prime)) % this.prime;
    return new FieldElement(num, this.prime);
  };

  rmul = (coefficient: bigint): FieldElement => {
    if (coefficient < 0) throw Error("rmul coefficient must be > 0");
    const num = (this.num * coefficient) % this.prime;
    return new FieldElement(num, this.prime);
  };

  toString = (): String => {
    return `FieldElement { num: ${this.num.toString(
      10
    )}, prime: ${this.prime.toString(10)} }`;
  };
}

export class MismatchedFields extends Error {
  constructor(first: bigint, second: bigint, operation: string) {
    super(
      `Cannot ${operation} two numbers in different Fields ${first} vs ${second}`
    );
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
