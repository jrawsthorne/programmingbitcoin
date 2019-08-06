import { hash256, hash160 } from "../helper";

export const opDup = (stack: Buffer[]): boolean => {
  if (stack.length < 1) return false;
  stack.push(stack[stack.length - 1]);
  return true;
};

export const opHash256 = (stack: Buffer[]): boolean => {
  if (stack.length < 1) return false;
  const element = stack.pop();
  stack.push(hash256(element!));
  return true;
};

export const opHash160 = (stack: Buffer[]): boolean => {
  if (stack.length < 1) return false;
  const element = stack.pop();
  stack.push(hash160(element!));
  return true;
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
