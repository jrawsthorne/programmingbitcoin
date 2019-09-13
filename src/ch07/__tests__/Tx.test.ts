import { TxFetcher } from "../../ch05/TxFetcher";
import { PrivateKey } from "../../ch03/PrivateKey";
import { Tx } from "../../ch05/Tx";

beforeAll(() => {
  TxFetcher.loadCache("tx.cache");
});

test("sig hash", async () => {
  const tx = await TxFetcher.fetch(
    "452c629d67e41baec3ac6f04fe744b4b9617f8f859c63b3002f8684e7a4fee03"
  );
  const want = 0x27e0c5994dec7824e56dec6b2fcb342eb7cdb0d0957c2fce9882f715e85d81a6n;
  expect(await tx.sigHash(0)).toBe(want);
});

test("verify p2pkh", async () => {
  let tx = await TxFetcher.fetch(
    "452c629d67e41baec3ac6f04fe744b4b9617f8f859c63b3002f8684e7a4fee03"
  );
  expect(await tx.verify()).toBe(true);
  tx = await TxFetcher.fetch(
    "5418099cc755cb9dd3ebc6cf1a7888ad53a1a3beb5a025bce89eb1bf7f1650a2",
    true
  );
  expect(await tx.verify()).toBe(true);
});

// test p2sh verify using pre bip16 rules
// scriptsig: op_o sig1 sig2 redeemscript
// scriptpubkey: op_hash160 hash op_equal
// execution ends with stack:
// 1
// sig1
// sig2
// 0
// top element is 1 therefore valid. Doesn't validate redeem script
test("verify p2sh", async () => {
  const tx = await TxFetcher.fetch(
    "46df1a9484d0a81d03ce0ee543ab6e1a23ed06175c104a178268fad381216c2b"
  );
  expect(await tx.verify()).toBe(true);
});

test("sign input", async () => {
  const privateKey = new PrivateKey(8675309n);
  const rawTx = Buffer.from(
    "010000000199a24308080ab26e6fb65c4eccfadf76749bb5bfa8cb08f291320b3c21e56f0d0d00000000ffffffff02408af701000000001976a914d52ad7ca9b3d096a38e752c2018e6fbc40cdf26f88ac80969800000000001976a914507b27411ccf7f16f10297de6cef3f291623eddf88ac00000000",
    "hex"
  );
  const txObj = Tx.parse(rawTx, true);
  expect(await txObj.signInput(0, privateKey)).toBe(true);
  let want =
    "010000000199a24308080ab26e6fb65c4eccfadf76749bb5bfa8cb08f291320b3c21e56f0d0d0000006b4830450221008ed46aa2cf12d6d81065bfabe903670165b538f65ee9a3385e6327d80c66d3b502203124f804410527497329ec4715e18558082d489b218677bd029e7fa306a72236012103935581e52c354cd2f484fe8ed83af7a3097005b2f9c60bff71d35bd795f54b67ffffffff02408af701000000001976a914d52ad7ca9b3d096a38e752c2018e6fbc40cdf26f88ac80969800000000001976a914507b27411ccf7f16f10297de6cef3f291623eddf88ac00000000";
  expect(txObj.serialize().toString("hex")).toBe(want);
});
