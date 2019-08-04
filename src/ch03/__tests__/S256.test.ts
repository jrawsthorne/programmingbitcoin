import { N, G, S256Point } from "../S256Point";
import BN from "bn.js";
import { PrivateKey } from "../PrivateKey";
import { Signature } from "../Signature";
import { randBN } from "../../helper";

test("order", () => {
  expect(G.rmul(N).isPointAtInfinity());
});

test("pubpoint", () => {
  const points: Array<[number | BN, BN, BN]> = [
    [
      7,
      new BN(
        "5cbdf0646e5db4eaa398f365f2ea7a0e3d419b7e0330e39ce92bddedcac4f9bc",
        "hex"
      ),
      new BN(
        "6aebca40ba255960a3178d6d861a54dba813d0b813fde7b5a5082628087264da",
        "hex"
      )
    ],
    [
      1485,
      new BN(
        "c982196a7466fbbbb0e27a940b6af926c1a74d5ad07128c82824a11b5398afda",
        "hex"
      ),
      new BN(
        "7a91f9eae64438afb9ce6448a1c133db2d8fb9254e4546b6f001637d50901f55",
        "hex"
      )
    ],
    [
      new BN(2).pow(new BN(128)),
      new BN(
        "8f68b9d2f63b5f339239c1ad981f162ee88c5678723ea3351b7b444c9ec4c0da",
        "hex"
      ),
      new BN(
        "662a9f2dba063986de1d90c2b6be215dbbea2cfe95510bfdf23cbf79501fff82",
        "hex"
      )
    ],
    [
      new BN(2).pow(new BN(240)).add(new BN(2).pow(new BN(31))),
      new BN(
        "9577ff57c8234558f293df502ca4f09cbc65a6572c842b39b366f21717945116",
        "hex"
      ),
      new BN(
        "10b49c67fa9365ad7b90dab070be339a1daf9052373ec30ffae4f72d5e66d053",
        "hex"
      )
    ]
  ];

  for (const [secret, x, y] of points) {
    const point = new S256Point({ x, y });
    expect(G.rmul(secret).equals(point)).toBe(true);
  }
});

test("verify", () => {
  const point = new S256Point({
    x: new BN(
      "887387e452b8eacc4acfde10d9aaf7f6d9a0f975aabb10d006e4da568744d06c",
      "hex"
    ),
    y: new BN(
      "61de6d95231cd89026e286df3b6ae4a894a3378e393e93a0f45b666329a0ae34",
      "hex"
    )
  });
  let z = new BN(
    "ec208baa0fc1c19f708a9ca96fdeff3ac3f230bb4a7ba4aede4942ad003c0f60",
    "hex"
  );
  let r = new BN(
    "ac8d1c87e51d0d441be8b3dd5b05c8795b48875dffe00b7ffcfac23010d3a395",
    "hex"
  );
  let s = new BN(
    "68342ceff8935ededd102dd876ffd6ba72d6a427a3edb13d26eb0781cb423c4",
    "hex"
  );
  expect(point.verify(z, new Signature(r, s))).toBe(true);
  z = new BN(
    "7c076ff316692a3d7eb3c3bb0f8b1488cf72e1afcd929e29307032997a838a3d",
    "hex"
  );
  r = new BN(
    "eff69ef2b1bd93a66ed5219add4fb51e11a840f404876325a1e8ffe0529a2c",
    "hex"
  );
  s = new BN(
    "c7207fee197d27c618aea621406f6bf5ef6fca38681d82b2f06fddbdce6feab6",
    "hex"
  );
  expect(point.verify(z, new Signature(r, s))).toBe(true);
});

test("sign", async () => {
  const pk = new PrivateKey(await randBN(new BN(0), N));
  const z = await randBN(new BN(0), new BN(2).pow(new BN(256)));
  const sig = pk.sign(z);

  expect(pk.point.verify(z, sig)).toBe(true);
});
