import { randBN } from "../../helper";
import BN from "bn.js";
import { Signature } from "../../ch03/Signature";

test("der", async () => {
  const testcases = [
    [new BN(1), new BN(2)],
    [
      await randBN(new BN(0), new BN(2).pow(new BN(256))),
      await randBN(new BN(0), new BN(2).pow(new BN(255)))
    ],
    [
      await randBN(new BN(0), new BN(2).pow(new BN(256))),
      await randBN(new BN(0), new BN(2).pow(new BN(255)))
    ]
  ];

  for (const [r, s] of testcases) {
    const sig = new Signature(r, s);
    const der = sig.der();
    const sig2 = Signature.parse(der);
    expect(sig2.r.eq(r)).toBe(true);
    expect(sig2.s.eq(s)).toBe(true);
  }
});
