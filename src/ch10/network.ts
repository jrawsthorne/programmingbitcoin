const NETWORK_MAGIC = Buffer.from("f9beb4d9", "hex");
const TESTNET_NETWORK_MAGIC = Buffer.from("0b110907", "hex");

import { SmartBuffer } from "smart-buffer";
import {
  hash256,
  randInt,
  u64ToEndian,
  toIPFormat,
  encodeVarint
} from "../helper";

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
    return `${this.command.toString("ascii")}${" ".repeat(
      12 - this.command.length
    )} ${this.payload.toString("hex")}`;
  };
}

export interface VersionMessageParams {
  version?: number;
  services?: number;
  timestamp?: number;
  receiverServices?: number;
  receiverIp?: Buffer;
  receiverPort?: number;
  senderServices?: number;
  senderIp?: Buffer;
  senderPort?: number;
  nonce?: Buffer;
  userAgent?: Buffer;
  latestBlock?: number;
  relay?: boolean;
}

export class VersionMessage {
  public static readonly command = Buffer.from("version");
  version: number;
  services: number;
  timestamp: number;
  receiverServices: number;
  receiverIp: Buffer;
  receiverPort: number;
  senderServices: number;
  senderIp: Buffer;
  senderPort: number;
  nonce: Buffer;
  userAgent: Buffer;
  latestBlock: number;
  relay: boolean;
  constructor({
    version = 70015,
    services = 0,
    timestamp = Math.floor(Date.now() / 1000),
    receiverServices = 0,
    receiverIp = Buffer.alloc(4),
    receiverPort = 8333,
    senderServices = 0,
    senderIp = Buffer.alloc(4),
    senderPort = 8333,
    // randomly generated 8 byte nonce
    nonce = u64ToEndian(randInt(Math.pow(2, 64))),
    userAgent = Buffer.from("/programmingbitcoin:0.1/"),
    latestBlock = 0,
    relay = false
  }: VersionMessageParams = {}) {
    this.version = version;
    this.services = services;
    this.timestamp = timestamp;
    this.receiverServices = receiverServices;
    this.receiverIp = receiverIp;
    this.receiverPort = receiverPort;
    this.senderServices = senderServices;
    this.senderIp = senderIp;
    this.senderPort = senderPort;
    this.nonce = nonce;
    this.userAgent = userAgent;
    this.latestBlock = latestBlock;
    this.relay = relay;
  }

  serialize = (): Buffer => {
    const s = new SmartBuffer();

    s.writeUInt32LE(this.version);
    s.writeBuffer(u64ToEndian(this.services));
    s.writeBuffer(u64ToEndian(this.timestamp));
    s.writeBuffer(u64ToEndian(this.receiverServices));
    s.writeBuffer(toIPFormat(this.receiverIp));
    s.writeUInt16BE(this.receiverPort);
    s.writeBuffer(u64ToEndian(this.senderServices));
    s.writeBuffer(toIPFormat(this.senderIp));
    s.writeUInt16BE(this.senderPort);
    s.writeBuffer(this.nonce);
    s.writeBuffer(encodeVarint(this.userAgent.length));
    s.writeBuffer(this.userAgent);
    s.writeUInt32LE(this.latestBlock);
    s.writeUInt8(this.relay ? 1 : 0);

    return s.toBuffer();
  };

  getCommand = (): Buffer => VersionMessage.command;
}

export class VerAckMessage {
  public static readonly command = Buffer.from("verack");

  static parse = (): VerAckMessage => new VerAckMessage();

  // Empty message body
  serialize = (): Buffer => Buffer.alloc(0);

  getCommand = (): Buffer => VerAckMessage.command;
}

export class PongMessage {
  public static readonly command = Buffer.from("pong");

  constructor(public readonly nonce: Buffer) {}

  static parse = (message: Buffer): PongMessage => {
    if (message.length !== 8) {
      throw new Error("Incorrect nonce size");
    }
    return new PongMessage(message.slice(0, 8));
  };

  serialize = (): Buffer => this.nonce;

  getCommand = (): Buffer => PongMessage.command;
}

export class PingMessage {
  public static readonly command = Buffer.from("ping");

  constructor(
    public readonly nonce: Buffer = u64ToEndian(randInt(Math.pow(2, 64)))
  ) {}

  static parse = (message: Buffer): PingMessage => {
    if (message.length !== 8) {
      throw new Error("Incorrect nonce size");
    }
    return new PingMessage(message.slice(0, 8));
  };

  serialize = (): Buffer => this.nonce;

  getCommand = (): Buffer => PingMessage.command;
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
