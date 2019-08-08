import { hash256, hash160, sha1 } from "../helper";
import { Signature } from "../ch03/Signature";
import { S256Point } from "../ch03/S256Point";

export const op0 = (stack: Stack): boolean => {
  stack.push(encodeNum(0));
  return true;
};

export const op6 = (stack: Stack): boolean => {
  stack.push(encodeNum(6));
  return true;
};

export const op2 = (stack: Stack): boolean => {
  stack.push(encodeNum(2));
  return true;
};

export const opVerify = (stack: Stack): boolean => {
  if (stack.length < 1) return false;
  const element = stack.pop()!;
  return decodeNum(element) === 1;
};

export const opEqual = (stack: Stack): boolean => {
  if (stack.length < 2) return false;
  const element1 = stack.pop()!;
  const element2 = stack.pop()!;
  if (element1.equals(element2)) {
    stack.push(encodeNum(1));
  } else {
    stack.push(encodeNum(0));
  }
  return true;
};

export const opEqualVerify = (stack: Stack): boolean => {
  return opEqual(stack) && opVerify(stack);
};

export const opAdd = (stack: Stack): boolean => {
  if (stack.length < 2) return false;
  const element1 = decodeNum(stack.pop()!);
  const element2 = decodeNum(stack.pop()!);
  stack.push(encodeNum(element1 + element2));
  return true;
};

export const opMul = (stack: Stack): boolean => {
  if (stack.length < 2) return false;
  const element1 = decodeNum(stack.pop()!);
  const element2 = decodeNum(stack.pop()!);
  stack.push(encodeNum(element1 * element2));
  return true;
};

export const op2dup = (stack: Stack): boolean => {
  if (stack.length < 2) return false;
  stack.push(...stack.slice(stack.length - 2, stack.length));
  return true;
};

export const opSwap = (stack: Stack): boolean => {
  if (stack.length < 2) return false;
  stack.push(...stack.splice(stack.length - 2, 1));
  return true;
};

export const opNot = (stack: Stack): boolean => {
  if (stack.length < 1) return false;
  const element = stack.pop()!;
  if (decodeNum(element) === 0) {
    stack.push(encodeNum(1));
  } else {
    stack.push(encodeNum(0));
  }
  return true;
};

export const opSha1 = (stack: Stack): boolean => {
  if (stack.length < 1) return false;
  const element = stack.pop()!;
  stack.push(sha1(element));
  return true;
};

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
  0: op0,
  82: op2,
  86: op6,
  105: opVerify,
  110: op2dup,
  124: opSwap,
  135: opEqual,
  136: opEqualVerify,
  145: opNot,
  147: opAdd,
  149: opMul,
  118: opDup,
  167: opSha1,
  169: opHash160,
  170: opHash256,
  172: opChecksig
};

type NAMES = {
  [keyof: number]: string;
};

export const OP_CODE_NAMES: NAMES = {
  0: "OP_0",
  82: "OP_2",
  86: "OP_6",
  105: "OP_VERIFY",
  110: "OP_2DUP",
  124: "OP_SWAP",
  135: "OP_EQUAL",
  136: "OP_EQUALVERIFY",
  145: "OP_NOT",
  147: "OP_ADD",
  149: "OP_MUL",
  118: "OP_DUP",
  167: "OP_SHA1",
  169: "OP_HASH160",
  170: "OP_HASH256",
  172: "OP_CHECKSIG"
};
