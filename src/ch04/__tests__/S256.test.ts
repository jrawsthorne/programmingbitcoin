import BN from "bn.js";
import { G, S256Point } from "../../ch03/S256Point";

test("sec", () => {
  let coefficient: BN | number = new BN(999).pow(new BN(3));
  let uncompressed = Buffer.from(
    "049d5ca49670cbe4c3bfa84c96a8c87df086c6ea6a24ba6b809c9de234496808d56fa15cc7f3d38cda98dee2419f415b7513dde1301f8643cd9245aea7f3f911f9",
    "hex"
  );

  let compressed = Buffer.from(
    "039d5ca49670cbe4c3bfa84c96a8c87df086c6ea6a24ba6b809c9de234496808d5",
    "hex"
  );
  let point = G.rmul(coefficient);
  expect(point.sec(false).equals(uncompressed)).toBe(true);
  expect(point.sec(true).equals(compressed)).toBe(true);
  coefficient = 123;
  uncompressed = Buffer.from(
    "04a598a8030da6d86c6bc7f2f5144ea549d28211ea58faa70ebf4c1e665c1fe9b5204b5d6f84822c307e4b4a7140737aec23fc63b65b35f86a10026dbd2d864e6b",
    "hex"
  );
  compressed = Buffer.from(
    "03a598a8030da6d86c6bc7f2f5144ea549d28211ea58faa70ebf4c1e665c1fe9b5",
    "hex"
  );
  point = G.rmul(coefficient);
  expect(point.sec(false).equals(uncompressed)).toBe(true);
  expect(point.sec(true).equals(compressed)).toBe(true);
  coefficient = 42424242;
  uncompressed = Buffer.from(
    "04aee2e7d843f7430097859e2bc603abcc3274ff8169c1a469fee0f20614066f8e21ec53f40efac47ac1c5211b2123527e0e9b57ede790c4da1e72c91fb7da54a3",
    "hex"
  );
  compressed = Buffer.from(
    "03aee2e7d843f7430097859e2bc603abcc3274ff8169c1a469fee0f20614066f8e",
    "hex"
  );
  point = G.rmul(coefficient);
  expect(point.sec(false).equals(uncompressed)).toBe(true);
  expect(point.sec(true).equals(compressed)).toBe(true);
});

test("parse", () => {
  let coefficient: BN | number = new BN(999).pow(new BN(3));
  let uncompressed = Buffer.from(
    "049d5ca49670cbe4c3bfa84c96a8c87df086c6ea6a24ba6b809c9de234496808d56fa15cc7f3d38cda98dee2419f415b7513dde1301f8643cd9245aea7f3f911f9",
    "hex"
  );
  let compressed = Buffer.from(
    "039d5ca49670cbe4c3bfa84c96a8c87df086c6ea6a24ba6b809c9de234496808d5",
    "hex"
  );
  let point = G.rmul(coefficient);
  expect(S256Point.parse(uncompressed).equals(point)).toBe(true);
  expect(S256Point.parse(compressed).equals(point)).toBe(true);
});
