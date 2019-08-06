import { PrivateKey } from "../../ch03/PrivateKey";

test("wif", () => {
  let pk = new PrivateKey(2n ** 256n - 2n ** 199n);
  let expected = "L5oLkpV3aqBJ4BgssVAsax1iRa77G5CVYnv9adQ6Z87te7TyUdSC";
  expect(pk.wif(true, false)).toBe(expected);

  pk = new PrivateKey(2n ** 256n - 2n ** 201n);
  expected = "93XfLeifX7Jx7n7ELGMAf1SUR6f9kgQs8Xke8WStMwUtrDucMzn";
  expect(pk.wif(false, true)).toBe(expected);

  pk = new PrivateKey(
    BigInt("0x0dba685b4511dbd3d368e5c4358a1277de9486447af7b3604a69b8d9d8b7889d")
  );
  expected = "5HvLFPDVgFZRK9cd4C5jcWki5Skz6fmKqi1GQJf5ZoMofid2Dty";
  expect(pk.wif(false, false)).toBe(expected);

  pk = new PrivateKey(
    BigInt("0x1cca23de92fd1862fb5b76e5f4f50eb082165e5191e116c18ed1a6b24be6a53f")
  );
  expected = "cNYfWuhDpbNM1JWc3c6JTrtrFVxU4AGhUKgw5f93NP2QaBqmxKkg";
  expect(pk.wif(true, true)).toBe(expected);
});
