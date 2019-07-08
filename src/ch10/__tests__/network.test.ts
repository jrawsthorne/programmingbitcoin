import {
  NetworkEnvelope,
  VersionMessage,
  SimpleNode,
  GetHeadersMessage
} from "../network";

import dotenv from "dotenv";

beforeAll(() => {
  dotenv.config();
});

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

// TODO: Mock
test("handshake", async done => {
  const node = new SimpleNode(
    process.env.BITCOIND_HOST || "localhost",
    process.env.BITCOIND_PORT ? parseInt(process.env.BITCOIND_PORT) : undefined
  );
  await node.handshake();
  node.socket.end(done); // close socket before test ends
});

test("serializes getheaders message", () => {
  const block = Buffer.from(
    "0000000000000000001237f46acddf58578a37e213d2a6edc4884a2fcad05ba3",
    "hex"
  );
  const getHeaders = new GetHeadersMessage({
    startBlock: block
  });
  expect(getHeaders.serialize().toString("hex")).toBe(
    "7f11010001a35bd0ca2f4a88c4eda6d213e2378a5758dfcd6af437120000000000000000000000000000000000000000000000000000000000000000000000000000000000"
  );
});
