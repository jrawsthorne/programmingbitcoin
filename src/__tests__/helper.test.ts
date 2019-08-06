import { encodeVarint, encodeBase58, readVarint } from "../helper";
import { SmartBuffer } from "smart-buffer";

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
  // Too large
  expect(() => encodeVarint(18446744073709551615)).toThrowError(
    "Integer too large"
  );
});

test("read varint", () => {
  // 8 bit
  expect(readVarint(SmartBuffer.fromBuffer(Buffer.alloc(1, 1)))).toEqual(1n);
  // 16 bit
  expect(
    readVarint(SmartBuffer.fromBuffer(Buffer.from("fdffff", "hex")))
  ).toEqual(65535n);
  // // 32 bit
  expect(
    readVarint(SmartBuffer.fromBuffer(Buffer.from("feffffff7f", "hex")))
  ).toEqual(2147483647n);
  // // 64 bit
  expect(
    readVarint(SmartBuffer.fromBuffer(Buffer.from("ffffffffffffffffff", "hex")))
  ).toEqual(18446744073709551615n);
});

test("encode base58", () => {
  expect(
    encodeBase58(
      Buffer.from(
        "7c076ff316692a3d7eb3c3bb0f8b1488cf72e1afcd929e29307032997a838a3d",
        "hex"
      )
    )
  ).toEqual("9MA8fRQrT4u8Zj8ZRd6MAiiyaxb2Y1CMpvVkHQu5hVM6");
  expect(
    encodeBase58(
      Buffer.from(
        "eff69ef2b1bd93a66ed5219add4fb51e11a840f404876325a1e8ffe0529a2c",
        "hex"
      )
    )
  ).toEqual("4fE3H2E6XMp4SsxtwinF7w9a34ooUrwWe4WsW1458Pd");
  expect(
    encodeBase58(
      Buffer.from(
        "c7207fee197d27c618aea621406f6bf5ef6fca38681d82b2f06fddbdce6feab6",
        "hex"
      )
    )
  ).toEqual("EQJsjkd6JaGwxrjEhfeqPenqHwrBmPQZjJGNSCHBkcF7");
});
