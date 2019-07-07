import { NetworkEnvelope, VersionMessage } from "../network";

test("parses network envelope", () => {
  let msg = Buffer.from(
    "f9beb4d976657261636b000000000000000000005df6e0e2",
    "hex"
  );
  let envelope = NetworkEnvelope.parse(msg);
  expect(envelope.command).toEqual(Buffer.from("verack"));
  expect(envelope.payload).toEqual(Buffer.from([]));
  msg = Buffer.from(
    "f9beb4d976657273696f6e0000000000650000005f1a69d2721101000100000000000000bc8f5e5400000000010000000000000000000000000000000000ffffc61b6409208d010000000000000000000000000000000000ffffcb0071c0208d128035cbc97953f80f2f5361746f7368693a302e392e332fcf05050001",
    "hex"
  );
  envelope = NetworkEnvelope.parse(msg);
  expect(envelope.command).toEqual(Buffer.from("version"));
  expect(envelope.payload).toEqual(msg.slice(24));
});

test("serializes network envelope", () => {
  let msg = Buffer.from(
    "f9beb4d976657261636b000000000000000000005df6e0e2",
    "hex"
  );
  let envelope = NetworkEnvelope.parse(msg);
  expect(envelope.serialize()).toEqual(msg);
  msg = Buffer.from(
    "f9beb4d976657273696f6e0000000000650000005f1a69d2721101000100000000000000bc8f5e5400000000010000000000000000000000000000000000ffffc61b6409208d010000000000000000000000000000000000ffffcb0071c0208d128035cbc97953f80f2f5361746f7368693a302e392e332fcf05050001",
    "hex"
  );
  envelope = NetworkEnvelope.parse(msg);
  expect(envelope.serialize()).toEqual(msg);
});

test("serializes version message", () => {
  const v = new VersionMessage({ timestamp: 0, nonce: Buffer.alloc(8) });
  expect(v.serialize().toString("hex")).toEqual(
    "7f11010000000000000000000000000000000000000000000000000000000000000000000000ffff00000000208d000000000000000000000000000000000000ffff00000000208d0000000000000000182f70726f6772616d6d696e67626974636f696e3a302e312f0000000000"
  );
});
