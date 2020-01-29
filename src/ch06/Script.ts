import {
  readVarint,
  encodeVarint,
  toBufferLE,
  encodeBase58Checksum,
  sha256
} from "../helper";
import { SmartBuffer } from "smart-buffer";
import {
  OP_CODE_NAMES,
  OP_CODE_FUNCTIONS,
  Stack,
  Cmds,
  Opcode,
  opHash160,
  opEqual,
  opVerify,
  PushDataOpcode
} from "./Op";
import bech32 from "bech32";
import { S256Point } from '../ch03/S256Point';

export const p2pkhScript = (h160: Buffer): Script => {
  return new Script([
    Opcode.OP_DUP,
    Opcode.OP_HASH160,
    { data: h160, opcode: Opcode.OP_PUSHBYTES_20, originalLength: 20 },
    Opcode.OP_EQUALVERIFY,
    Opcode.OP_CHECKSIG
  ]);
};

export const p2shScript = (h160: Buffer): Script => {
  return new Script([
    Opcode.OP_HASH160,
    { data: h160, opcode: Opcode.OP_PUSHBYTES_20, originalLength: 20 },
    Opcode.OP_EQUAL
  ]);
};

// OP_0 <20-byte-hash>
export const p2wpkhScript = (h160: Buffer): Script => {
  return new Script([
    Opcode.OP_0,
    {
      data: h160,
      opcode: Opcode.OP_PUSHBYTES_20,
      originalLength: 20
    }
  ]);
};

// OP_0 <32-byte-hash>
export const p2wshScript = (s256: Buffer): Script => {
  return new Script([
    Opcode.OP_0,
    {
      data: s256,
      opcode: Opcode.OP_PUSHBYTES_32,
      originalLength: 32
    }
  ]);
};

// OP_1 <32-byte x co-ordinate pubkey>
export const taprootScript = (pubkey: Buffer) => {
  if (pubkey.byteLength !== 32) {
    throw Error("invalid pubkey length");
  }
  return new Script([
    Opcode.OP_1,
    {
      data: pubkey,
      opcode: Opcode.OP_PUSHBYTES_32,
      originalLength: 32
    }
  ])
}

export class Script {
  public cmds: Cmds;

  constructor(cmds?: Cmds) {
    this.cmds = cmds ? cmds : [];
  }

  add = (other: Script): Script => {
    return new Script([...this.cmds, ...other.cmds]);
  };

  evaluate = (z: bigint, witness: Buffer[] = []): boolean => {
    const cmds: Cmds = [...this.cmds];
    const stack: Stack = [];
    const altStack: Stack = [];
    while (cmds.length > 0) {
      const cmd = cmds.shift()!;
      if (typeof cmd === "number") {
        const operation = OP_CODE_FUNCTIONS[cmd];
        switch (cmd) {
          case Opcode.OP_IF:
          case Opcode.OP_NOTIF:
            if (!operation(stack, cmds)) {
              console.info(`bad op: ${OP_CODE_NAMES[cmd]}`);
              return false;
            }
            break;
          case Opcode.OP_TOALTSTACK:
          case Opcode.OP_FROMALTSTACK:
            if (!operation(stack, altStack)) {
              console.info(`bad op: ${OP_CODE_NAMES[cmd]}`);
              return false;
            }
            break;

          case Opcode.OP_CHECKSIG:
          case Opcode.OP_CHECKSIGVERIFY:
          case Opcode.OP_CHECKMULTISIG:
          case Opcode.OP_CHECKMULTISIGVERIFY:
            if (!operation(stack, z)) {
              console.info(`bad op: ${OP_CODE_NAMES[cmd]}`);
              return false;
            }
            break;
          default:
            if (!operation || !operation(stack)) {
              console.info(`bad op: ${OP_CODE_NAMES[cmd]}`);
              return false;
            }
            break;
        }
      } else {
        stack.push(cmd.data);

        // p2sh check bip16
        // structure is:
        // OP_HASH160 <hash> OP_EQUAL
        if (
          cmds.length === 3 &&
          cmds[0] == Opcode.OP_HASH160 &&
          typeof cmds[1] !== "number" &&
          (cmds[1] as PushDataOpcode).data.byteLength === 20 &&
          cmds[2] === Opcode.OP_EQUAL
        ) {
          cmds.pop(); // know this is OP_EQUAL
          const { data: h160 } = cmds.pop()! as PushDataOpcode; // know this is <hash>
          cmds.pop(); // know this is OP_HASH160
          // run typical OP_HASH160, push 20 byte hash and OP_EQUAL
          // redeem script is currently on top of stack
          if (!opHash160(stack)) return false;
          stack.push(h160);
          if (!opEqual(stack)) return false;
          if (!opVerify(stack)) {
            console.log("Bad p2sh h160");
            return false;
          }
          // now validated redeem script hashes to h160

          // format redeem script ready to be parsed
          const redeemScript = Buffer.concat([
            encodeVarint(cmd.originalLength),
            cmd.data
          ]);
          // extend command set with parsed commands from redeeem script
          cmds.push(...Script.parse(SmartBuffer.fromBuffer(redeemScript)).cmds);
        }

        // p2wpkh check bip141
        // strcture is:
        // OP_O <20-byte hash>
        if (
          stack.length === 2 &&
          stack[0].equals(Buffer.alloc(0)) &&
          stack[1].length === 20
        ) {
          const h160 = stack.pop()!; // know this is 20 byte hash
          stack.pop(); // know this is witness version, 0
          cmds.push(
            ...witness.map(item => ({
              opcode: item.byteLength,
              data: item,
              originalLength: item.byteLength
            }))
          );
          cmds.push(...p2pkhScript(h160).cmds);
        }

        // taproot check bip340
        // structure is:
        // OP_1 <32-byte-pubkey>
        if (stack.length === 2 && stack[0].equals(Buffer.from([1])) && stack[1].length === 32) {
          const pubkeyx = stack.pop()!; // know this is pubkey
          stack.pop(); // know this is witness version, 1
          if (witness.length === 0) {
            return false;
          }
          // key path spending
          if (witness.length === 1) {
            const sig = witness[0];
            const pubkey = S256Point.schnorrParse(pubkeyx);
            const valid = pubkey.schnorrVerify(z, sig);
            return valid;
          }
        }

        // p2wsh check bip141
        // strcture is:
        // OP_O <32-byte hash>
        if (
          stack.length === 2 &&
          stack[0].equals(Buffer.alloc(0)) &&
          stack[1].length === 32
        ) {
          const s256 = stack.pop()!; // know this is 32 byte hash
          stack.pop(); // know this is witness version, 0
          // witness script is last item of witness
          const witnessScript = witness[witness.length - 1];
          // push everything but witness script from witness to the command set
          cmds.push(
            ...witness.slice(0, witness.length - 1).map(item => ({
              opcode: item.length,
              data: item,
              originalLength: item.length
            }))
          );
          if (!s256.equals(sha256(witnessScript))) {
            console.log("bad witness script sha256");
            return false;
          }
          const witnessRaw = Buffer.concat([
            encodeVarint(witnessScript.byteLength),
            witnessScript
          ]);
          const witnessScriptCmds = Script.parse(
            SmartBuffer.fromBuffer(witnessRaw)
          ).cmds;
          cmds.push(...witnessScriptCmds);
        }
      }
    }
    if (stack.length === 0) return false;
    if (stack.pop()!.equals(Buffer.alloc(0))) return false;
    return true;
  };

  static parse = (s: SmartBuffer): Script => {
    const length = readVarint(s);
    const cmds: Cmds = [];
    let count = 0;
    while (count < length) {
      let current = s.readBuffer(1);
      count += 1;
      let currentByte = current[0];
      if (currentByte >= 1 && currentByte <= 75) {
        let n = currentByte;
        if (n + count > length) {
          n = Number(length) - count;
        }
        const data = s.readBuffer(n);
        cmds.push({ opcode: currentByte, data, originalLength: currentByte });
        count += n;
      } else if (currentByte === 76) {
        if (count + 1 > length) {
          cmds.push(currentByte);
          break;
        }
        const parsedDataLength = s.readUInt8();
        let dataLength = parsedDataLength;
        if (dataLength + count + 1 > length) {
          dataLength = Number(length) - count - 1;
        }
        const data = s.readBuffer(dataLength);
        cmds.push({
          opcode: currentByte,
          data,
          originalLength: parsedDataLength
        });
        count += dataLength + 1;
      } else if (currentByte === 77) {
        if (count + 2 > length) {
          if (count + 1 > length) {
            cmds.push(currentByte);
          } else {
            const nextByte = s.readUInt8();
            cmds.push(currentByte);
            cmds.push(nextByte);
            count += 1;
          }
          break;
        }
        const parsedDataLength = s.readUInt16LE();
        let dataLength = parsedDataLength;
        if (dataLength + count + 2 > length) {
          dataLength = Number(length) - count - 2;
        }
        const data = s.readBuffer(dataLength);
        cmds.push({
          opcode: currentByte,
          data,
          originalLength: parsedDataLength
        });
        count += dataLength + 2;
      } else {
        const opCode = currentByte;
        cmds.push(opCode);
      }
    }
    if (count !== Number(length)) {
      throw Error("parsing script failed");
    }
    return new Script(cmds);
  };

  rawSerialize = (): Buffer => {
    const s = new SmartBuffer();
    for (const cmd of this.cmds) {
      if (typeof cmd === "number") {
        s.writeUInt8(cmd);
      } else {
        const pushOpcode = cmd.opcode;
        if (pushOpcode <= Opcode.OP_PUSHBYTES_75) {
          s.writeBuffer(Buffer.concat([Buffer.alloc(1, pushOpcode), cmd.data]));
        } else if (pushOpcode === Opcode.OP_PUSHDATA1) {
          s.writeBuffer(
            Buffer.concat([
              Buffer.alloc(1, pushOpcode),
              Buffer.alloc(1, cmd.originalLength),
              cmd.data
            ])
          );
        } else if (pushOpcode === Opcode.OP_PUSHDATA2) {
          s.writeBuffer(
            Buffer.concat([
              Buffer.alloc(1, pushOpcode),
              toBufferLE(cmd.originalLength, 2),
              cmd.data
            ])
          );
        }
      }
    }
    return s.toBuffer();
  };

  serialize = (): Buffer => {
    const result = this.rawSerialize();
    const total = result.length;
    return Buffer.concat([encodeVarint(total), result]);
  };

  isP2PKH = (): boolean => {
    return (
      this.cmds.length === 5 &&
      this.cmds[0] === Opcode.OP_DUP &&
      this.cmds[1] === Opcode.OP_HASH160 &&
      typeof this.cmds[2] !== "number" &&
      (this.cmds[2] as PushDataOpcode).data.byteLength === 20 &&
      this.cmds[3] === Opcode.OP_EQUALVERIFY &&
      this.cmds[4] === Opcode.OP_CHECKSIG
    );
  };

  isP2SH = (): boolean => {
    return (
      this.cmds.length === 3 &&
      this.cmds[0] === Opcode.OP_HASH160 &&
      typeof this.cmds[1] !== "number" &&
      (this.cmds[1] as PushDataOpcode).data.byteLength === 20 &&
      this.cmds[2] === Opcode.OP_EQUAL
    );
  };

  isP2WPKH = (): boolean => {
    return (
      this.cmds.length === 2 &&
      this.cmds[0] === Opcode.OP_0 &&
      typeof this.cmds[1] !== "number" &&
      (this.cmds[1] as PushDataOpcode).data.byteLength === 20
    );
  };

  isP2WSH = (): boolean => {
    return (
      this.cmds.length === 2 &&
      this.cmds[0] === Opcode.OP_0 &&
      typeof this.cmds[1] !== "number" &&
      (this.cmds[1] as PushDataOpcode).data.byteLength === 32
    );
  };

  isP2Taproot = (): boolean => {
    return (
      this.cmds.length === 2 &&
      this.cmds[0] === Opcode.OP_1 &&
      typeof this.cmds[1] !== "number" &&
      (this.cmds[1] as PushDataOpcode).data.byteLength === 32
    );
  }

  address = (testnet: boolean = false): string => {
    if (this.isP2PKH()) {
      const prefix = testnet ? Buffer.alloc(1, 0x6f) : Buffer.alloc(1, 0x00);
      return encodeBase58Checksum(
        Buffer.concat([prefix, (this.cmds[2] as PushDataOpcode).data])
      );
    } else if (this.isP2SH()) {
      const prefix = testnet ? Buffer.alloc(1, 0xc4) : Buffer.alloc(1, 0x05);
      return encodeBase58Checksum(
        Buffer.concat([prefix, (this.cmds[1] as PushDataOpcode).data])
      );
    } else if (this.isP2WPKH() || this.isP2WSH()) {
      const prefix = testnet ? "tb" : "bc";
      const words = Buffer.from(
        bech32.toWords((this.cmds[1] as PushDataOpcode).data)
      );
      // bech32 address consists of prefix, wwitness version (0)
      // and conversion of witness program to base32
      return bech32.encode(prefix, Buffer.concat([Buffer.alloc(1, 0), words]));
    }
    throw Error("Unknown ScriptPubkey");
  };

  toString = (): string => {
    const result = [];
    for (const cmd of this.cmds) {
      if (typeof cmd === "number") {
        let name: string;
        if (OP_CODE_NAMES[cmd]) {
          name = OP_CODE_NAMES[cmd];
        } else {
          name = `OP_[${cmd}]`;
        }
        result.push(name);
      } else {
        result.push(cmd.data.toString("hex"));
      }
    }
    return result.join(" ");
  };
}
