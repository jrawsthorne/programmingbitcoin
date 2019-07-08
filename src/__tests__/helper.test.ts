import { encodeVarint } from "../helper";

test("encode varint", () => {
  // 8 bit
  expect(encodeVarint(1)).toEqual(Buffer.from("01", "hex"));
  // 16 bit
  expect(encodeVarint(65535)).toEqual(Buffer.from("fdffff", "hex"));
  // 32 bit
  expect(encodeVarint(2147483647)).toEqual(Buffer.from("feffffff7f", "hex"));
  // 64 bit
  expect(encodeVarint(Number.MAX_SAFE_INTEGER)).toEqual(
    Buffer.from("ffffffffffffff1f00", "hex")
  );
});
