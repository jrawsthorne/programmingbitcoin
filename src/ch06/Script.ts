import { readVarint, encodeVarint, toBufferLE } from "../helper";
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

export class Script {
  public cmds: Cmds;

  constructor(cmds?: Cmds) {
    this.cmds = cmds ? cmds : [];
  }

  add = (other: Script): Script => {
    return new Script([...this.cmds, ...other.cmds]);
  };

  evaluate = (z: bigint): boolean => {
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
          const { data: h160 } = cmds.pop()! as PushDataOpcode; // know this is <hash>
          cmds.pop(); // know this is OP_EQUAL
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
