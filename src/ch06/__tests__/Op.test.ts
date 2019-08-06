import { opHash160 } from "../Op";

test("opHash160", () => {
  const stack = [Buffer.from("hello world")];
  expect(opHash160(stack)).toBe(true);
  expect(stack[0].toString("hex")).toBe(
    "d7d5ee7824ff93f94c3055af9382c86c68b5ca92"
  );
});
