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
import { Socket } from "net";
import { EventEmitter } from "events";

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
    if (magic.equals(Buffer.from([]))) {
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

export type NetworkMessage =
  | VersionMessage
  | VerAckMessage
  | PingMessage
  | PongMessage
  | GetHeadersMessage;

export class SimpleNode extends EventEmitter {
  socket: Socket;
  private data = SmartBuffer.fromSize(1024 * 1024 * 10);

  constructor(
    host: string,
    port?: number,
    public testnet: boolean = false,
    public logging: boolean = false
  ) {
    super();
    if (port === undefined) {
      port = testnet ? 18333 : 8333;
    }
    this.socket = new Socket();
    if (this.logging) console.log(`Connecting to ${host}:${port}`);
    this.socket.connect({
      host,
      port
    });
    if (this.logging) {
      this.socket.on("connect", () => {
        console.log(`Connected to ${host}:${port}`);
      });
    }

    this.listen();
  }

  // listens for new network messages from a tcp socket
  listen = () => {
    const MAGIC = this.testnet ? TESTNET_NETWORK_MAGIC : NETWORK_MAGIC;

    this.socket.on("data", (data: Buffer) => {
      this.data.writeBuffer(data);

      // keep reading the buffer until we reach the end
      while (this.data.writeOffset > this.data.readOffset) {
        // first 4 bytes are expected to be the network magic
        const magic = this.data.readBuffer(4);

        if (magic.equals(MAGIC)) {
          // skip over the command
          this.data.readOffset += 12;

          // next 4 bytes are expected to be the payload length
          const payloadLength = this.data.readUInt32LE();

          // skip over the checksum
          this.data.readOffset += 4;

          // if the buffer contains enough data to read the payload
          if (this.data.writeOffset - this.data.readOffset >= payloadLength) {
            // move back to beginning of message
            this.data.readOffset -= 24;

            // read full message (magic, command, payload length, checksum and payload)
            const message = this.data.readBuffer(payloadLength + 24);

            try {
              const envelope = NetworkEnvelope.parse(message);
              if (this.logging) {
                console.log(`Receive: ${envelope.toString()}`);
              }
              this.handleMessage(envelope);
              this.emit(
                `${envelope.command.toString("ascii")}Message`,
                envelope
              );
            } catch {}
          } else {
            // not received full message so skip to beginning
            // of message and wait for more data
            this.data.readOffset -= 24;
            break;
          }
        } else {
          // skip to next byte if network magic wasn't found
          this.data.readOffset -= magic.length - 1;
        }
      }
    });
  };

  handleMessage = (message: NetworkEnvelope): void => {
    switch (message.command.toString("ascii")) {
      // send back verack if we receive version
      case VersionMessage.command.toString("ascii"):
        this.send(new VerAckMessage());
        break;
      // send back pong with same nonce if we receive ping
      case PingMessage.command.toString("ascii"):
        const nonce = PingMessage.parse(message.payload).nonce;
        this.send(new PongMessage(nonce));
        break;
      default:
    }
  };

  // handshake sends version and expects verack
  handshake = async (): Promise<void> => {
    return new Promise(resolve => {
      const version = new VersionMessage();
      this.send(version);
      this.once("verackMessage", resolve);
    });
  };

  send = (message: NetworkMessage): void => {
    const envelope = new NetworkEnvelope(
      message.getCommand(),
      message.serialize(),
      this.testnet
    );

    if (this.logging) {
      console.log(`Sending: ${envelope.toString()}`);
    }
    this.socket.write(envelope.serialize());
  };
}

interface GetHeadersMessageParams {
  version?: number;
  numHashes?: number;
  startBlock: Buffer;
  endBlock?: Buffer;
}

export class GetHeadersMessage {
  public static readonly command = Buffer.from("getheaders");
  version: number;
  numHashes: number;
  startBlock: Buffer;
  endBlock: Buffer;

  constructor({
    version = 70015,
    numHashes = 1,
    endBlock,
    startBlock
  }: GetHeadersMessageParams) {
    this.version = version;
    this.numHashes = numHashes;
    this.endBlock = endBlock || Buffer.alloc(32, 0x00);
    this.startBlock = startBlock;
  }

  public serialize = (): Buffer => {
    const s = new SmartBuffer();

    s.writeUInt32LE(this.version);
    s.writeUInt8(1);
    s.writeBuffer(this.startBlock.reverse());
    s.writeBuffer(this.endBlock.reverse());

    return s.toBuffer();
  };

  getCommand = (): Buffer => GetHeadersMessage.command;
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
