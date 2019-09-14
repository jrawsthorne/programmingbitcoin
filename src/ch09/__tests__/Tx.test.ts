import { Tx } from "../../ch05/Tx";

test("isCoinbase", () => {
  const rawTx = Buffer.from(
    "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff5e03d71b07254d696e656420627920416e74506f6f6c20626a31312f4542312f4144362f43205914293101fabe6d6d678e2c8c34afc36896e7d9402824ed38e856676ee94bfdb0c6c4bcd8b2e5666a0400000000000000c7270000a5e00e00ffffffff01faf20b58000000001976a914338c84849423992471bffb1a54a8d9b1d69dc28a88ac00000000",
    "hex"
  );
  const tx = Tx.parse(rawTx);
  expect(tx.isCoinbase()).toBe(true);
});
