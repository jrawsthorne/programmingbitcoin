import { PrivateKey } from "../../ch03/PrivateKey";

test("wif", () => {
  let pk = new PrivateKey(2n ** 256n - 2n ** 199n);
  let expected = "L5oLkpV3aqBJ4BgssVAsax1iRa77G5CVYnv9adQ6Z87te7TyUdSC";
  let wif = pk.wif(true, false);
  expect(wif).toBe(expected);
  expect(PrivateKey.fromWif(wif, true).point.equals(pk.point)).toBe(true);

  pk = new PrivateKey(2n ** 256n - 2n ** 201n);
  expected = "93XfLeifX7Jx7n7ELGMAf1SUR6f9kgQs8Xke8WStMwUtrDucMzn";
  wif = pk.wif(false, true);
  expect(wif).toBe(expected);
  expect(PrivateKey.fromWif(wif, false).point.equals(pk.point)).toBe(true);

  pk = new PrivateKey(
    0x0dba685b4511dbd3d368e5c4358a1277de9486447af7b3604a69b8d9d8b7889dn
  );
  expected = "5HvLFPDVgFZRK9cd4C5jcWki5Skz6fmKqi1GQJf5ZoMofid2Dty";
  wif = pk.wif(false, false);
  expect(wif).toBe(expected);
  expect(PrivateKey.fromWif(wif, false).point.equals(pk.point)).toBe(true);

  pk = new PrivateKey(
    0x1cca23de92fd1862fb5b76e5f4f50eb082165e5191e116c18ed1a6b24be6a53fn
  );
  expected = "cNYfWuhDpbNM1JWc3c6JTrtrFVxU4AGhUKgw5f93NP2QaBqmxKkg";
  wif = pk.wif(true, true);
  expect(wif).toBe(expected);
  expect(PrivateKey.fromWif(wif, true).point.equals(pk.point)).toBe(true);
});
