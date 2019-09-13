import { G, S256Point } from "../../ch03/S256Point";

const coefficients = [999n ** 3n, 123n, 42424242n];
const points = [
  G.scalarMul(coefficients[0]),
  G.scalarMul(coefficients[1]),
  G.scalarMul(coefficients[2])
];

test("sec", () => {
  let uncompressed = Buffer.from(
    "049d5ca49670cbe4c3bfa84c96a8c87df086c6ea6a24ba6b809c9de234496808d56fa15cc7f3d38cda98dee2419f415b7513dde1301f8643cd9245aea7f3f911f9",
    "hex"
  );

  let compressed = Buffer.from(
    "039d5ca49670cbe4c3bfa84c96a8c87df086c6ea6a24ba6b809c9de234496808d5",
    "hex"
  );
  expect(points[0].sec(false).equals(uncompressed)).toBe(true);
  expect(points[0].sec(true).equals(compressed)).toBe(true);

  uncompressed = Buffer.from(
    "04a598a8030da6d86c6bc7f2f5144ea549d28211ea58faa70ebf4c1e665c1fe9b5204b5d6f84822c307e4b4a7140737aec23fc63b65b35f86a10026dbd2d864e6b",
    "hex"
  );
  compressed = Buffer.from(
    "03a598a8030da6d86c6bc7f2f5144ea549d28211ea58faa70ebf4c1e665c1fe9b5",
    "hex"
  );

  expect(points[1].sec(false).equals(uncompressed)).toBe(true);
  expect(points[1].sec(true).equals(compressed)).toBe(true);

  uncompressed = Buffer.from(
    "04aee2e7d843f7430097859e2bc603abcc3274ff8169c1a469fee0f20614066f8e21ec53f40efac47ac1c5211b2123527e0e9b57ede790c4da1e72c91fb7da54a3",
    "hex"
  );
  compressed = Buffer.from(
    "03aee2e7d843f7430097859e2bc603abcc3274ff8169c1a469fee0f20614066f8e",
    "hex"
  );

  expect(points[2].sec(false).equals(uncompressed)).toBe(true);
  expect(points[2].sec(true).equals(compressed)).toBe(true);
});

test("parse", () => {
  let uncompressed = Buffer.from(
    "049d5ca49670cbe4c3bfa84c96a8c87df086c6ea6a24ba6b809c9de234496808d56fa15cc7f3d38cda98dee2419f415b7513dde1301f8643cd9245aea7f3f911f9",
    "hex"
  );
  let compressed = Buffer.from(
    "039d5ca49670cbe4c3bfa84c96a8c87df086c6ea6a24ba6b809c9de234496808d5",
    "hex"
  );
  expect(S256Point.parse(uncompressed).equals(points[0])).toBe(true);
  expect(S256Point.parse(compressed).equals(points[0])).toBe(true);
  uncompressed = Buffer.from(
    "04a598a8030da6d86c6bc7f2f5144ea549d28211ea58faa70ebf4c1e665c1fe9b5204b5d6f84822c307e4b4a7140737aec23fc63b65b35f86a10026dbd2d864e6b",
    "hex"
  );
  compressed = Buffer.from(
    "03a598a8030da6d86c6bc7f2f5144ea549d28211ea58faa70ebf4c1e665c1fe9b5",
    "hex"
  );
  expect(S256Point.parse(uncompressed).equals(points[1])).toBe(true);
  expect(S256Point.parse(compressed).equals(points[1])).toBe(true);
  uncompressed = Buffer.from(
    "04aee2e7d843f7430097859e2bc603abcc3274ff8169c1a469fee0f20614066f8e21ec53f40efac47ac1c5211b2123527e0e9b57ede790c4da1e72c91fb7da54a3",
    "hex"
  );
  compressed = Buffer.from(
    "03aee2e7d843f7430097859e2bc603abcc3274ff8169c1a469fee0f20614066f8e",
    "hex"
  );
  expect(S256Point.parse(uncompressed).equals(points[2])).toBe(true);
  expect(S256Point.parse(compressed).equals(points[2])).toBe(true);
});
