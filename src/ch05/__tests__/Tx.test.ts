import { Tx } from "../Tx";

test("parse version", () => {
  const rawTx = Buffer.from(
    "0100000001813f79011acb80925dfe69b3def355fe914bd1d96a3f5f71bf8303c6a989c7d1000000006b483045022100ed81ff192e75a3fd2304004dcadb746fa5e24c5031ccfcf21320b0277457c98f02207a986d955c6e0cb35d446a89d3f56100f4d7f67801c31967743a9c8e10615bed01210349fc4e631e3624a545de3f89f5d8684c7b8138bd94bdd531d2e213bf016b278afeffffff02a135ef01000000001976a914bc3b654dca7e56b04dca18f2566cdaf02e8d9ada88ac99c39800000000001976a9141c4bc762dd5423e332166702cb75f40df79fea1288ac19430600",
    "hex"
  );
  const tx = Tx.parse(rawTx);
  expect(tx.version).toBe(1);
});

test("parse inputs", () => {
  const rawTx = Buffer.from(
    "0100000001813f79011acb80925dfe69b3def355fe914bd1d96a3f5f71bf8303c6a989c7d1000000006b483045022100ed81ff192e75a3fd2304004dcadb746fa5e24c5031ccfcf21320b0277457c98f02207a986d955c6e0cb35d446a89d3f56100f4d7f67801c31967743a9c8e10615bed01210349fc4e631e3624a545de3f89f5d8684c7b8138bd94bdd531d2e213bf016b278afeffffff02a135ef01000000001976a914bc3b654dca7e56b04dca18f2566cdaf02e8d9ada88ac99c39800000000001976a9141c4bc762dd5423e332166702cb75f40df79fea1288ac19430600",
    "hex"
  );
  const tx = Tx.parse(rawTx);
  expect(tx.txIns.length).toBe(1);
  let want = Buffer.from(
    "d1c789a9c60383bf715f3f6ad9d14b91fe55f3deb369fe5d9280cb1a01793f81",
    "hex"
  );
  expect(tx.txIns[0].prevTx.equals(want)).toBe(true);
  expect(tx.txIns[0].prevIndex).toBe(0);
  want = Buffer.from(
    "6b483045022100ed81ff192e75a3fd2304004dcadb746fa5e24c5031ccfcf21320b0277457c98f02207a986d955c6e0cb35d446a89d3f56100f4d7f67801c31967743a9c8e10615bed01210349fc4e631e3624a545de3f89f5d8684c7b8138bd94bdd531d2e213bf016b278a",
    "hex"
  );
  //   expect(tx.txIns[0].scriptSig.serialize().equals(want)).toBe(true);
  expect(tx.txIns[0].sequence).toBe(0xfffffffe);
});

test("parse outputs", () => {
  const rawTx = Buffer.from(
    "0100000001813f79011acb80925dfe69b3def355fe914bd1d96a3f5f71bf8303c6a989c7d1000000006b483045022100ed81ff192e75a3fd2304004dcadb746fa5e24c5031ccfcf21320b0277457c98f02207a986d955c6e0cb35d446a89d3f56100f4d7f67801c31967743a9c8e10615bed01210349fc4e631e3624a545de3f89f5d8684c7b8138bd94bdd531d2e213bf016b278afeffffff02a135ef01000000001976a914bc3b654dca7e56b04dca18f2566cdaf02e8d9ada88ac99c39800000000001976a9141c4bc762dd5423e332166702cb75f40df79fea1288ac19430600",
    "hex"
  );
  const tx = Tx.parse(rawTx);
  expect(tx.txOuts.length).toBe(2);
  let want = 32454049n;
  expect(tx.txOuts[0].amount).toBe(want);
  // want = Buffer.from("1976a914bc3b654dca7e56b04dca18f2566cdaf02e8d9ada88ac","hex");
  // expect(tx.txOuts[0].scriptPubkey.serialize().equals(want)).toBe(true);
  want = 10011545n;
  expect(tx.txOuts[1].amount).toBe(want);
  // want = Buffer.from("1976a9141c4bc762dd5423e332166702cb75f40df79fea1288ac","hex");
  // expect(tx.txOuts[1].scriptPubkey.serialize().equals(want)).toBe(true);
});

test("parse locktime", () => {
  const rawTx = Buffer.from(
    "0100000001813f79011acb80925dfe69b3def355fe914bd1d96a3f5f71bf8303c6a989c7d1000000006b483045022100ed81ff192e75a3fd2304004dcadb746fa5e24c5031ccfcf21320b0277457c98f02207a986d955c6e0cb35d446a89d3f56100f4d7f67801c31967743a9c8e10615bed01210349fc4e631e3624a545de3f89f5d8684c7b8138bd94bdd531d2e213bf016b278afeffffff02a135ef01000000001976a914bc3b654dca7e56b04dca18f2566cdaf02e8d9ada88ac99c39800000000001976a9141c4bc762dd5423e332166702cb75f40df79fea1288ac19430600",
    "hex"
  );
  const tx = Tx.parse(rawTx);
  expect(tx.locktime).toBe(410393);
});
