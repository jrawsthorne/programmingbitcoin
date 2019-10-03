import {
  encodeVarint,
  encodeBase58,
  readVarint,
  h160ToP2PKHAddress,
  h160ToP2SHAddress,
  calculateNewBits,
  merkleParent,
  merkleParentLevel,
  calculateMerkleRoot
} from "../helper";
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

test("p2pkh address", () => {
  const h160 = Buffer.from("74d691da1574e6b3c192ecfb52cc8984ee7b6c56", "hex");
  let want = "1BenRpVUFK65JFWcQSuHnJKzc4M8ZP8Eqa";
  expect(h160ToP2PKHAddress(h160, false)).toBe(want);
  want = "mrAjisaT4LXL5MzE81sfcDYKU3wqWSvf9q";
  expect(h160ToP2PKHAddress(h160, true)).toBe(want);
});

test("p2sh address", () => {
  const h160 = Buffer.from("74d691da1574e6b3c192ecfb52cc8984ee7b6c56", "hex");
  let want = "3CLoMMyuoDQTPRD3XYZtCvgvkadrAdvdXh";
  expect(h160ToP2SHAddress(h160, false)).toBe(want);
  want = "2N3u1R6uwQfuobCqbCgBkpsgBxvr1tZpe7B";
  expect(h160ToP2SHAddress(h160, true)).toBe(want);
});

test("calculateNewBits", () => {
  const prevBits = Buffer.from("54d80118", "hex");
  const timeDifferential = 302400;
  const want = Buffer.from("00157617", "hex");
  expect(calculateNewBits(prevBits, timeDifferential).equals(want)).toBe(true);
});

test("merkleParent", () => {
  const txHash0 = Buffer.from(
    "c117ea8ec828342f4dfb0ad6bd140e03a50720ece40169ee38bdc15d9eb64cf5",
    "hex"
  );
  const txHash1 = Buffer.from(
    "c131474164b412e3406696da1ee20ab0fc9bf41c8f05fa8ceea7a08d672d7cc5",
    "hex"
  );
  const want = Buffer.from(
    "8b30c5ba100f6f2e5ad1e2a742e5020491240f8eb514fe97c713c31718ad7ecd",
    "hex"
  );
  expect(merkleParent(txHash0, txHash1).equals(want)).toBe(true);
});

test("merkleParentLevel", () => {
  const hexHashes = [
    "c117ea8ec828342f4dfb0ad6bd140e03a50720ece40169ee38bdc15d9eb64cf5",
    "c131474164b412e3406696da1ee20ab0fc9bf41c8f05fa8ceea7a08d672d7cc5",
    "f391da6ecfeed1814efae39e7fcb3838ae0b02c02ae7d0a5848a66947c0727b0",
    "3d238a92a94532b946c90e19c49351c763696cff3db400485b813aecb8a13181",
    "10092f2633be5f3ce349bf9ddbde36caa3dd10dfa0ec8106bce23acbff637dae",
    "7d37b3d54fa6a64869084bfd2e831309118b9e833610e6228adacdbd1b4ba161",
    "8118a77e542892fe15ae3fc771a4abfd2f5d5d5997544c3487ac36b5c85170fc",
    "dff6879848c2c9b62fe652720b8df5272093acfaa45a43cdb3696fe2466a3877",
    "b825c0745f46ac58f7d3759e6dc535a1fec7820377f24d4c2c6ad2cc55c0cb59",
    "95513952a04bd8992721e9b7e2937f1c04ba31e0469fbe615a78197f68f52b7c",
    "2e6d722e5e4dbdf2447ddecc9f7dabb8e299bae921c99ad5b0184cd9eb8e5908"
  ];
  const txHashes = hexHashes.map(hex => Buffer.from(hex, "hex"));
  const wantHexHashes = [
    "8b30c5ba100f6f2e5ad1e2a742e5020491240f8eb514fe97c713c31718ad7ecd",
    "7f4e6f9e224e20fda0ae4c44114237f97cd35aca38d83081c9bfd41feb907800",
    "ade48f2bbb57318cc79f3a8678febaa827599c509dce5940602e54c7733332e7",
    "68b3e2ab8182dfd646f13fdf01c335cf32476482d963f5cd94e934e6b3401069",
    "43e7274e77fbe8e5a42a8fb58f7decdb04d521f319f332d88e6b06f8e6c09e27",
    "1796cd3ca4fef00236e07b723d3ed88e1ac433acaaa21da64c4b33c946cf3d10"
  ];
  const wantTxHashes = wantHexHashes.map(hex => Buffer.from(hex, "hex"));
  expect(merkleParentLevel(txHashes)).toEqual(wantTxHashes);
});

test("merkleRoot", () => {
  const hexHashes = [
    "c117ea8ec828342f4dfb0ad6bd140e03a50720ece40169ee38bdc15d9eb64cf5",
    "c131474164b412e3406696da1ee20ab0fc9bf41c8f05fa8ceea7a08d672d7cc5",
    "f391da6ecfeed1814efae39e7fcb3838ae0b02c02ae7d0a5848a66947c0727b0",
    "3d238a92a94532b946c90e19c49351c763696cff3db400485b813aecb8a13181",
    "10092f2633be5f3ce349bf9ddbde36caa3dd10dfa0ec8106bce23acbff637dae",
    "7d37b3d54fa6a64869084bfd2e831309118b9e833610e6228adacdbd1b4ba161",
    "8118a77e542892fe15ae3fc771a4abfd2f5d5d5997544c3487ac36b5c85170fc",
    "dff6879848c2c9b62fe652720b8df5272093acfaa45a43cdb3696fe2466a3877",
    "b825c0745f46ac58f7d3759e6dc535a1fec7820377f24d4c2c6ad2cc55c0cb59",
    "95513952a04bd8992721e9b7e2937f1c04ba31e0469fbe615a78197f68f52b7c",
    "2e6d722e5e4dbdf2447ddecc9f7dabb8e299bae921c99ad5b0184cd9eb8e5908",
    "b13a750047bc0bdceb2473e5fe488c2596d7a7124b4e716fdd29b046ef99bbf0"
  ];
  const txHashes = hexHashes.map(hex => Buffer.from(hex, "hex"));
  const wantHexHash =
    "acbcab8bcc1af95d8d563b77d24c3d19b18f1486383d75a5085c4e86c86beed6";
  const wantHash = Buffer.from(wantHexHash, "hex");
  expect(calculateMerkleRoot(txHashes)).toEqual(wantHash);
});
