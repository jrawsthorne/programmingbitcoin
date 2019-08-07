import { hash256, hash160 } from "../helper";
import { Signature } from "../ch03/Signature";
import { S256Point } from "../ch03/S256Point";

export const opDup = (stack: Stack): boolean => {
  if (stack.length < 1) return false;
  stack.push(stack[stack.length - 1]);
  return true;
};

export const opHash256 = (stack: Stack): boolean => {
  if (stack.length < 1) return false;
  const element = stack.pop();
  stack.push(hash256(element!));
  return true;
};

export const opHash160 = (stack: Stack): boolean => {
  if (stack.length < 1) return false;
  const element = stack.pop();
  stack.push(hash160(element!));
  return true;
};

export const opChecksig = (stack: Stack, z: bigint): boolean => {
  if (stack.length < 2) return false;
  const secPubkey = stack.pop()!;
  let derSignature = stack.pop()!;
  derSignature = derSignature.slice(0, derSignature.length - 1);
  let point: S256Point;
  let sig: Signature;
  try {
    point = S256Point.parse(secPubkey);
    sig = Signature.parse(derSignature);
  } catch (e) {
    return false;
  }
  if (point.verify(z, sig)) {
    stack.push(encodeNum(1));
  } else {
    stack.push(encodeNum(0));
  }
  return true;
};

export type Stack = Buffer[];
export type Cmds = (Buffer | number)[];

export const encodeNum = (num: number): Buffer => {
  if (num === 0) return Buffer.alloc(0);
  let absNum = Math.abs(num);
  const negative = num < 0;
  const result = [];
  while (absNum) {
    result.push(absNum & 0xff);
    absNum >>= 8;
  }
  if (result[result.length - 1] & 0x80) {
    if (negative) {
      result.push(0x80);
    } else {
      result.push(0);
    }
  } else if (negative) {
    result[result.length - 1] |= 0x80;
  }
  return Buffer.from(result);
};

export const decodeNum = (element: Buffer): number => {
  if (element.equals(Buffer.alloc(0))) return 0;
  const bigEndian = element.reverse();
  let negative: boolean;
  let result: number;
  if (bigEndian[0] & 0x80) {
    negative = true;
    result = bigEndian[0] & 0x7f;
  } else {
    negative = false;
    result = bigEndian[0];
  }
  for (const c of bigEndian.slice(1)) {
    result <<= 8;
    result += c;
  }
  if (negative) {
    return -result;
  } else {
    return result;
  }
};

type FUNCTIONS = {
  [keyof: number]: Function;
};

export const OP_CODE_FUNCTIONS: FUNCTIONS = {
  118: opDup,
  169: opHash160,
  170: opHash256
};

type NAMES = {
  [keyof: number]: string;
};

export const OP_CODE_NAMES: NAMES = {
  118: "OP_DUP",
  169: "OP_HASH160",
  170: "OP_HASH256"
};
