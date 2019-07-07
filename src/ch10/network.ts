const NETWORK_MAGIC = Buffer.from("f9beb4d9", "hex");
const TESTNET_NETWORK_MAGIC = Buffer.from("0b110907", "hex");

import { SmartBuffer } from "smart-buffer";
import { hash256 } from "../helper";

export class NetworkEnvelope {
  public magic: Buffer;

  constructor(
    // 0-byte padded ASCII encoded 12 byte string
    public command: Buffer,
    public payload: Buffer,
    testnet: boolean = false
  ) {
    this.magic = testnet ? TESTNET_NETWORK_MAGIC : NETWORK_MAGIC;
  }

  static parse = (b: Buffer, testnet = false): NetworkEnvelope => {
    const s = SmartBuffer.fromBuffer(b);
    const magic = s.readBuffer(4);
    if (magic === Buffer.from([])) {
      throw Error("Connection reset!");
    }
    const expectedMagic = testnet ? TESTNET_NETWORK_MAGIC : NETWORK_MAGIC;
    if (!magic.equals(expectedMagic)) {
      throw new UnexpectedNetworkMagic(expectedMagic, magic);
    }
    // Remove padded 0s from command
    const command = Buffer.from(s.readBuffer(12).filter(byte => byte > 0x00));
    const payloadLength = s.readUInt32LE();
    const checksum = s.readBuffer(4);
    const payload = s.readBuffer(payloadLength);
    const caclculatedChecksum = hash256(payload).slice(0, 4);
    if (!caclculatedChecksum.equals(checksum)) {
      throw new InvalidChecksum(checksum, caclculatedChecksum);
    }
    return new NetworkEnvelope(command, payload, testnet);
  };

  serialize = (): Buffer => {
    const s = new SmartBuffer();

    s.writeBuffer(this.magic);
    s.writeBuffer(this.command);
    // Pad to 12 bytes with 0s
    s.writeBuffer(Buffer.alloc(12 - this.command.length));
    s.writeUInt32LE(this.payload.length);
    s.writeBuffer(hash256(this.payload).slice(0, 4));
    s.writeBuffer(this.payload);

    return s.toBuffer();
  };

  toString = (): string => {
    return `${this.command.toString("ascii")} ${this.payload.toString("hex")}`;
  };
}

export class UnexpectedNetworkMagic extends Error {
  constructor(expected: Buffer, actual: Buffer) {
    super(
      `Magic is not right ${expected.toString("hex")} vs ${actual.toString(
        "hex"
      )}`
    );
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidChecksum extends Error {
  constructor(expected: Buffer, actual: Buffer) {
    super(
      `Checksum does not match ${expected.toString("hex")} vs ${actual.toString(
        "hex"
      )}`
    );
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
