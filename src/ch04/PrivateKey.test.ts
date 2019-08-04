import { PrivateKey } from "../ch03/PrivateKey";
import BN from "bn.js";

test("wif", () => {
  let pk = new PrivateKey(
    new BN(2).pow(new BN(256)).sub(new BN(2).pow(new BN(199)))
  );
  let expected = "L5oLkpV3aqBJ4BgssVAsax1iRa77G5CVYnv9adQ6Z87te7TyUdSC";
  expect(pk.wif(true, false)).toBe(expected);

  pk = new PrivateKey(
    new BN(2).pow(new BN(256)).sub(new BN(2).pow(new BN(201)))
  );
  expected = "93XfLeifX7Jx7n7ELGMAf1SUR6f9kgQs8Xke8WStMwUtrDucMzn";
  expect(pk.wif(false, true)).toBe(expected);

  pk = new PrivateKey(
    new BN(
      "0dba685b4511dbd3d368e5c4358a1277de9486447af7b3604a69b8d9d8b7889d",
      "hex"
    )
  );
  expected = "5HvLFPDVgFZRK9cd4C5jcWki5Skz6fmKqi1GQJf5ZoMofid2Dty";
  expect(pk.wif(false, false)).toBe(expected);

  pk = new PrivateKey(
    new BN(
      "1cca23de92fd1862fb5b76e5f4f50eb082165e5191e116c18ed1a6b24be6a53f",
      "hex"
    )
  );
  expected = "cNYfWuhDpbNM1JWc3c6JTrtrFVxU4AGhUKgw5f93NP2QaBqmxKkg";
  expect(pk.wif(true, true)).toBe(expected);
});
