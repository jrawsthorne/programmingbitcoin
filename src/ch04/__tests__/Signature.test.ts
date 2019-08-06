import { randBN } from "../../helper";
import { Signature } from "../../ch03/Signature";

test("der", async () => {
  const testcases = [
    [1n, 2n],
    [await randBN(0n, 2n ** 256n), await randBN(0n, 2n ** 255n)],
    [await randBN(0n, 2n ** 256n), await randBN(0n, 2n ** 255n)]
  ];

  for (const [r, s] of testcases) {
    const sig = new Signature(r, s);
    const der = sig.der();
    const sig2 = Signature.parse(der);
    expect(sig2.r).toEqual(r);
    expect(sig2.s).toEqual(s);
  }
});
