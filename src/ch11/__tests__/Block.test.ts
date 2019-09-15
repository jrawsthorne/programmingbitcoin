import { Block } from "../../ch09/Block";

test("validateMerkleRoot", () => {
  const hashesHex = [
    "f54cb69e5dc1bd38ee6901e4ec2007a5030e14bdd60afb4d2f3428c88eea17c1",
    "c57c2d678da0a7ee8cfa058f1cf49bfcb00ae21eda966640e312b464414731c1",
    "b027077c94668a84a5d0e72ac0020bae3838cb7f9ee3fa4e81d1eecf6eda91f3",
    "8131a1b8ec3a815b4800b43dff6c6963c75193c4190ec946b93245a9928a233d",
    "ae7d63ffcb3ae2bc0681eca0df10dda3ca36dedb9dbf49e33c5fbe33262f0910",
    "61a14b1bbdcdda8a22e61036839e8b110913832efd4b086948a6a64fd5b3377d",
    "fc7051c8b536ac87344c5497595d5d2ffdaba471c73fae15fe9228547ea71881",
    "77386a46e26f69b3cd435aa4faac932027f58d0b7252e62fb6c9c2489887f6df",
    "59cbc055ccd26a2c4c4df2770382c7fea135c56d9e75d3f758ac465f74c025b8",
    "7c2bf5687f19785a61be9f46e031ba041c7f93e2b7e9212799d84ba052395195",
    "08598eebd94c18b0d59ac921e9ba99e2b8ab7d9fccde7d44f2bd4d5e2e726d2e",
    "f0bb99ef46b029dd6f714e4b12a7d796258c48fee57324ebdc0bbc4700753ab1"
  ];
  const hashes = hashesHex.map(hex => Buffer.from(hex, "hex"));
  const block = Block.parse(
    Buffer.from(
      "00000020fcb19f7895db08cadc9573e7915e3919fb76d59868a51d995201000000000000acbcab8bcc1af95d8d563b77d24c3d19b18f1486383d75a5085c4e86c86beed691cfa85916ca061a00000000",
      "hex"
    )
  );
  block.txHashes = hashes;
  expect(block.validateMerkleRoot()).toBe(true);
});
