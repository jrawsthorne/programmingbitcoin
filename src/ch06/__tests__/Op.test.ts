import {
  opHash160,
  encodeNum,
  decodeNum,
  Stack,
  opChecksig,
  opVerify,
  op2dup,
  opSwap,
  opNot,
  opSha1,
  op2Dup,
  op2Drop,
  op3Dup
} from "../Op";
import { Script } from "../Script";

test("opHash160", () => {
  const stack = [Buffer.from("hello world")];
  expect(opHash160(stack)).toBe(true);
  expect(stack[0].toString("hex")).toBe(
    "d7d5ee7824ff93f94c3055af9382c86c68b5ca92"
  );
});

test("encode num", () => {
  expect(encodeNum(0).equals(Buffer.alloc(0))).toBe(true);
  expect(encodeNum(1).equals(Buffer.alloc(1, 1))).toBe(true);
  expect(encodeNum(2).equals(Buffer.alloc(1, 2))).toBe(true);
  expect(encodeNum(999).equals(Buffer.from("e703", "hex"))).toBe(true);
});

test("decode num", () => {
  expect(decodeNum(Buffer.alloc(0))).toBe(0);
  expect(decodeNum(Buffer.alloc(1, 1))).toBe(1);
  expect(decodeNum(Buffer.alloc(1, 2))).toBe(2);
  expect(decodeNum(Buffer.from("e703", "hex"))).toBe(999);
});

test("opChecksig", () => {
  const z = BigInt(
    "0x7c076ff316692a3d7eb3c3bb0f8b1488cf72e1afcd929e29307032997a838a3d"
  );
  const sec = Buffer.from(
    "04887387e452b8eacc4acfde10d9aaf7f6d9a0f975aabb10d006e4da568744d06c61de6d95231cd89026e286df3b6ae4a894a3378e393e93a0f45b666329a0ae34",
    "hex"
  );
  const sig = Buffer.from(
    "3045022000eff69ef2b1bd93a66ed5219add4fb51e11a840f404876325a1e8ffe0529a2c022100c7207fee197d27c618aea621406f6bf5ef6fca38681d82b2f06fddbdce6feab601",
    "hex"
  );
  const stack: Stack = [sig, sec];
  expect(opChecksig(stack, z)).toBe(true);
  expect(decodeNum(stack[0])).toBe(1);
});

test("evaluate", () => {
  const scriptPubkey = new Script([0x76, 0x76, 0x95, 0x93, 0x56, 0x87]);
  const scriptSig = new Script([0x52]);
  const combinedScript = scriptSig.add(scriptPubkey);
  expect(combinedScript.evaluate(0n)).toBe(true);
});

test("opVerify", () => {
  expect(opVerify([Buffer.alloc(0)])).toBe(false);
  expect(opVerify([Buffer.alloc(1, 1)])).toBe(true);
});

test("op2dup", () => {
  const stack = [Buffer.from("52", "hex"), Buffer.from("56", "hex")];
  expect(op2dup(stack)).toBe(true);
  expect(stack[2].equals(Buffer.from("52", "hex"))).toBe(true);
  expect(stack[3].equals(Buffer.from("56", "hex"))).toBe(true);
});

test("opSwap", () => {
  const stack = [Buffer.from("52", "hex"), Buffer.from("56", "hex")];
  expect(opSwap(stack)).toBe(true);
  expect(stack[0].equals(Buffer.from("56", "hex"))).toBe(true);
  expect(stack[1].equals(Buffer.from("52", "hex"))).toBe(true);
});

test("opNot", () => {
  let stack = [Buffer.alloc(1, 0)];
  expect(opNot(stack)).toBe(true);
  expect(stack[0].equals(Buffer.alloc(1, 1)));
  stack = [Buffer.alloc(1, 12)];
  expect(opNot(stack)).toBe(true);
  expect(stack[0].equals(Buffer.alloc(1, 0)));
  stack = [Buffer.alloc(1, 1)];
  expect(opNot(stack)).toBe(true);
  expect(stack[0].equals(Buffer.alloc(1, 0)));
});

test("opSha1", () => {
  const stack = [Buffer.from("hello world")];
  expect(opSha1(stack)).toBe(true);
  expect(
    stack[0].equals(
      Buffer.from("2aae6c35c94fcfb415dbe95f408b9ce91ee846ed", "hex")
    )
  ).toBe(true);
});

test("op2Drop", () => {
  const stack = [Buffer.from("01", "hex"), Buffer.from("02", "hex")];
  expect(op2Drop(stack)).toBe(true);
  expect(stack.length).toBe(0);
});

test("op2Dup", () => {
  const stack = [Buffer.from("01", "hex"), Buffer.from("02", "hex")];
  expect(op2Dup(stack)).toBe(true);
  expect(stack[2]).toEqual(Buffer.from("01", "hex"));
  expect(stack[3]).toEqual(Buffer.from("02", "hex"));
});

test("op3Dup", () => {
  const stack = [
    Buffer.from("01", "hex"),
    Buffer.from("02", "hex"),
    Buffer.from("03", "hex")
  ];
  expect(op3Dup(stack)).toBe(true);
  expect(stack[3]).toEqual(Buffer.from("01", "hex"));
  expect(stack[4]).toEqual(Buffer.from("02", "hex"));
  expect(stack[5]).toEqual(Buffer.from("03", "hex"));
});
