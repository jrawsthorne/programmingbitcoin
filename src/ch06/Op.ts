import { hash256, hash160, sha1, reverseBuffer } from "../helper";
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
  } catch {
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
  const bigEndian = reverseBuffer(element);
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
  76: "OP_PUSHDATA1",
  77: "OP_PUSHDATA2",
  78: "OP_PUSHDATA4",
  79: "OP_1NEGATE",
  81: "OP_1",
  82: "OP_2",
  83: "OP_3",
  84: "OP_4",
  85: "OP_5",
  86: "OP_6",
  87: "OP_7",
  88: "OP_8",
  89: "OP_9",
  90: "OP_10",
  91: "OP_11",
  92: "OP_12",
  93: "OP_13",
  94: "OP_14",
  95: "OP_15",
  96: "OP_16",
  97: "OP_NOP",
  99: "OP_IF",
  100: "OP_NOTIF",
  103: "OP_ELSE",
  104: "OP_ENDIF",
  105: "OP_VERIFY",
  106: "OP_RETURN",
  107: "OP_TOALTSTACK",
  108: "OP_FROMALTSTACK",
  109: "OP_2DROP",
  110: "OP_2DUP",
  111: "OP_3DUP",
  112: "OP_2OVER",
  113: "OP_2ROT",
  114: "OP_2SWAP",
  115: "OP_IFDUP",
  116: "OP_DEPTH",
  117: "OP_DROP",
  118: "OP_DUP",
  119: "OP_NIP",
  120: "OP_OVER",
  121: "OP_PICK",
  122: "OP_ROLL",
  123: "OP_ROT",
  124: "OP_SWAP",
  125: "OP_TUCK",
  130: "OP_SIZE",
  135: "OP_EQUAL",
  136: "OP_EQUALVERIFY",
  139: "OP_1ADD",
  140: "OP_1SUB",
  143: "OP_NEGATE",
  144: "OP_ABS",
  145: "OP_NOT",
  146: "OP_0NOTEQUAL",
  147: "OP_ADD",
  148: "OP_SUB",
  149: "OP_MUL",
  154: "OP_BOOLAND",
  155: "OP_BOOLOR",
  156: "OP_NUMEQUAL",
  157: "OP_NUMEQUALVERIFY",
  158: "OP_NUMNOTEQUAL",
  159: "OP_LESSTHAN",
  160: "OP_GREATERTHAN",
  161: "OP_LESSTHANOREQUAL",
  162: "OP_GREATERTHANOREQUAL",
  163: "OP_MIN",
  164: "OP_MAX",
  165: "OP_WITHIN",
  166: "OP_RIPEMD160",
  167: "OP_SHA1",
  168: "OP_SHA256",
  169: "OP_HASH160",
  170: "OP_HASH256",
  171: "OP_CODESEPARATOR",
  172: "OP_CHECKSIG",
  173: "OP_CHECKSIGVERIFY",
  174: "OP_CHECKMULTISIG",
  175: "OP_CHECKMULTISIGVERIFY",
  176: "OP_NOP1",
  177: "OP_CHECKLOCKTIMEVERIFY",
  178: "OP_CHECKSEQUENCEVERIFY",
  179: "OP_NOP4",
  180: "OP_NOP5",
  181: "OP_NOP6",
  182: "OP_NOP7",
  183: "OP_NOP8",
  184: "OP_NOP9",
  185: "OP_NOP10"
};

export enum Opcodes {
  "OP_0" = 0,
  "OP_2" = 82,
  "OP_6" = 86,
  "OP_IF" = 99,
  "OP_NOTIF" = 100,
  "OP_VERIFY" = 105,
  "OP_TOALTSTACK" = 107,
  "OP_FROMALTSTACK" = 108,
  "OP_2DUP" = 110,
  "OP_SWAP" = 124,
  "OP_EQUAL" = 135,
  "OP_EQUALVERIFY" = 136,
  "OP_NOT" = 145,
  "OP_ADD" = 147,
  "OP_MUL" = 149,
  "OP_DUP" = 118,
  "OP_SHA1" = 167,
  "OP_HASH160" = 169,
  "OP_HASH256" = 170,
  "OP_CHECKSIG" = 172,
  "OP_CHECKSIGVERIFY" = 173,
  "OP_CHECKMULTISIG" = 174,
  "OP_CHECKMULTISIGVERIFY" = 175
}
