import BN from "bn.js";
import { G } from "../ch03/S256Point";

test("address", () => {
  let secret = new BN(888).pow(new BN(3));
  let mainnetAddress = "148dY81A9BmdpMhvYEVznrM45kWN32vSCN";
  let testnetAddress = "mieaqB68xDCtbUBYFoUNcmZNwk74xcBfTP";
  let point = G.rmul(secret);
  expect(point.address(true, false)).toBe(mainnetAddress);
  expect(point.address(true, true)).toBe(testnetAddress);
  secret = new BN(321);
  mainnetAddress = "1S6g2xBJSED7Qr9CYZib5f4PYVhHZiVfj";
  testnetAddress = "mfx3y63A7TfTtXKkv7Y6QzsPFY6QCBCXiP";
  point = G.rmul(secret);
  expect(point.address(false, false)).toBe(mainnetAddress);
  expect(point.address(false, true)).toBe(testnetAddress);
  secret = new BN(4242424242);
  mainnetAddress = "1226JSptcStqn4Yq9aAmNXdwdc2ixuH9nb";
  testnetAddress = "mgY3bVusRUL6ZB2Ss999CSrGVbdRwVpM8s";
  point = G.rmul(secret);
  expect(point.address(false, false)).toBe(mainnetAddress);
  expect(point.address(false, true)).toBe(testnetAddress);
});
