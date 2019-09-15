const NETWORK_MAGIC = Buffer.from("f9beb4d9", "hex");
const TESTNET_NETWORK_MAGIC = Buffer.from("0b110907", "hex");

import { SmartBuffer } from "smart-buffer";
import {
  hash256,
  randInt,
  u64ToEndian,
  toIPFormat,
  encodeVarint,
  readVarint,
  reverseBuffer,
  trimBuffer
} from "../helper";
import { Socket } from "net";
import { EventEmitter } from "events";
import { Tx } from "../ch05/Tx";
import { Block } from "../ch09/Block";

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
    const command = trimBuffer(s.readBuffer(12), "right");
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
    nonce = u64ToEndian(randInt(Number.MAX_SAFE_INTEGER)),
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
    public readonly nonce: Buffer = u64ToEndian(
      randInt(Number.MAX_SAFE_INTEGER)
    )
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
  | GetHeadersMessage
  | TxMessage
  | GetDataMessage
  | InvMessage;

export class SimpleNode extends EventEmitter {
  socket: Socket;
  private data = Buffer.alloc(1024 * 1024 * 10);
  private inboundCursor = 0;

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
  private listen = () => {
    const MAGIC = this.testnet ? TESTNET_NETWORK_MAGIC : NETWORK_MAGIC;

    this.socket.on("data", (data: Buffer) => {
      data.copy(this.data, this.inboundCursor);
      this.inboundCursor += data.length;

      if (this.inboundCursor < 20) return; // need payload size at bytes 16-20 in order to proceed

      let i = 0;
      let end = 0;

      while (i < this.inboundCursor) {
        const magic = this.data.slice(i, i + 4);
        if (magic.equals(MAGIC)) {
          let start = i;
          if (this.inboundCursor > start + 16) {
            // do we have message header in buffer
            const size = this.data.readUInt32LE(start + 16);
            if (this.inboundCursor >= start + size + 24) {
              // Complete message; try and parse it
              try {
                // allocate new memory for received message
                const message = Buffer.alloc(24 + size);
                // copy from data buffer to new allocated memory
                this.data.copy(message, 0, start, start + 24 + size);
                const envelope = NetworkEnvelope.parse(message);
                if (this.logging) {
                  console.log(`Receive: ${envelope.toString()}`);
                }
                this.handleMessage(envelope);
                this.emit(
                  `${envelope.command.toString("ascii")}Message`,
                  envelope
                );
                end = start + 24 + size;
              } catch {
                if (this.logging) console.log("Error with msg");
              }
            }
            i += size + 24;
          } else {
            i = this.inboundCursor; // Skip to end
          }
        } else {
          i++;
        }
      }

      if (end > 0) {
        this.data.copy(this.data, 0, end, this.inboundCursor); // Copy from later in the buffer to earlier in the buffer
        this.inboundCursor -= end;
      }
    });
  };

  private handleMessage = (message: NetworkEnvelope): void => {
    if (message.command.equals(VersionMessage.command)) {
      // send back verack if we receive version
      this.send(new VerAckMessage());
    } else if (message.command.equals(PingMessage.command)) {
      // send back pong with same nonce if we receive ping
      const nonce = PingMessage.parse(message.payload).nonce;
      this.send(new PongMessage(nonce));
    } else if (message.command.equals(InvMessage.command)) {
      // only connected to one node so always ask for data
      // when inv received
      const invMessage = InvMessage.parse(message.payload);
      for (const inv of invMessage.invs) {
        switch (inv.type) {
          case InvType.MSG_BLOCK:
          case InvType.MSG_TX: {
            this.send(new GetDataMessage([inv]));
            break;
          }
        }
      }
    }
  };

  // handshake sends version and expects verack
  handshake = async (relay: boolean = false): Promise<void> => {
    return new Promise(resolve => {
      const version = new VersionMessage({ relay });
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

export class GetDataMessage {
  public static readonly command = Buffer.from("getdata");
  constructor(public invs: Inv[]) {}

  serialize = (): Buffer => {
    const s = new SmartBuffer();
    s.writeBuffer(encodeVarint(this.invs.length));
    for (const inv of this.invs) {
      s.writeBuffer(inv.serialize());
    }
    return s.toBuffer();
  };

  getCommand = () => GetDataMessage.command;
}

export enum InvType {
  ERROR = 0,
  MSG_TX = 1,
  MSG_BLOCK = 2,
  MSG_FILTERED_BLOCK = 3,
  MSG_CMPCT_BLOCK = 4
}

class Inv {
  constructor(public type: InvType, public hash: Buffer) {}

  static parse = (s: SmartBuffer): Inv => {
    const type: InvType = s.readUInt32LE();
    const hash = s.readBuffer(32);
    return new Inv(type, hash);
  };

  serialize = (): Buffer => {
    const s = new SmartBuffer();
    s.writeUInt32LE(this.type);
    s.writeBuffer(this.hash);
    return s.toBuffer();
  };
}

export class InvMessage {
  public static readonly command = Buffer.from("inv");

  constructor(public invs: Inv[]) {}

  static parse = (message: Buffer): InvMessage => {
    const s = SmartBuffer.fromBuffer(message);
    const count = readVarint(s);
    let invs: Inv[] = [];
    for (let i = 0; i < count; i++) {
      invs.push(Inv.parse(s));
    }
    return new InvMessage(invs);
  };

  serialize = (): Buffer => {
    const s = new SmartBuffer();
    s.writeBuffer(encodeVarint(this.invs.length));
    for (const inv of this.invs) {
      s.writeBuffer(inv.serialize());
    }
    return s.toBuffer();
  };

  getCommand = () => InvMessage.command;
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
    s.writeUInt8(this.numHashes);
    s.writeBuffer(reverseBuffer(this.startBlock));
    s.writeBuffer(reverseBuffer(this.endBlock));

    return s.toBuffer();
  };

  getCommand = (): Buffer => GetHeadersMessage.command;
}

export class TxMessage {
  public static command = Buffer.from("tx");

  constructor(public tx: Tx) {}

  serialize = (): Buffer => this.tx.serialize();

  static parse = (message: Buffer): TxMessage => {
    return new TxMessage(Tx.parse(message));
  };

  getCommand = (): Buffer => TxMessage.command;
}

export class HeadersMessage {
  public static command = Buffer.from("headers");

  constructor(public blocks: Block[]) {}

  static parse = (message: Buffer): HeadersMessage => {
    const s = SmartBuffer.fromBuffer(message);
    const numHeaders = readVarint(s);
    let blocks: Block[] = [];
    for (let i = 0; i < numHeaders; i++) {
      blocks.push(Block.parse(s));
      const numTxs = readVarint(s);
      if (numTxs !== 0n) {
        throw Error("Number of txs not 0");
      }
    }
    return new HeadersMessage(blocks);
  };

  getCommand = (): Buffer => HeadersMessage.command;
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
