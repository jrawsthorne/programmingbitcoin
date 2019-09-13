import { opCheckMultisig, decodeNum } from "../../ch06/Op";

// test 2-of-2 multisig
test("opCheckMultisig", () => {
  const z = 0xe71bfa115715d6fd33796948126f40a8cdd39f187e4afb03896795189fe1423cn;
  const sig1 = Buffer.from(
    "3045022100dc92655fe37036f47756db8102e0d7d5e28b3beb83a8fef4f5dc0559bddfb94e02205a36d4e4e6c7fcd16658c50783e00c341609977aed3ad00937bf4ee942a8993701",
    "hex"
  );
  const sig2 = Buffer.from(
    "3045022100da6bee3c93766232079a01639d07fa869598749729ae323eab8eef53577d611b02207bef15429dcadce2121ea07f233115c6f09034c0be68db99980b9a6c5e75402201",
    "hex"
  );
  const sec1 = Buffer.from(
    "022626e955ea6ea6d98850c994f9107b036b1334f18ca8830bfff1295d21cfdb70",
    "hex"
  );
  const sec2 = Buffer.from(
    "03b287eaf122eea69030a0e9feed096bed8045c8b98bec453e1ffac7fbdbd4bb71",
    "hex"
  );
  const stack = [
    Buffer.alloc(0),
    sig1,
    sig2,
    Buffer.alloc(1, 2), // m = 2
    sec1,
    sec2,
    Buffer.alloc(1, 2) // n = 2
  ];
  expect(opCheckMultisig(stack, z)).toBe(true);
  expect(decodeNum(stack[0])).toBe(1);
});
