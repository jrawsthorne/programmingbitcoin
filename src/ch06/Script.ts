import { readVarint, encodeVarint } from "../helper";
import { SmartBuffer } from "smart-buffer";
import {
  OP_CODE_NAMES,
  OP_CODE_FUNCTIONS,
  Stack,
  Cmds,
  Opcodes,
  opHash160,
  opEqual,
  opVerify
} from "./Op";

export const p2pkhScript = (h160: Buffer): Script => {
  return new Script([
    Opcodes.OP_DUP,
    Opcodes.OP_HASH160,
    h160,
    Opcodes.OP_EQUALVERIFY,
    Opcodes.OP_CHECKSIG
  ]);
};

export const p2shScript = (h160: Buffer): Script => {
  return new Script([Opcodes.OP_HASH160, h160, Opcodes.OP_EQUAL]);
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
          case Opcodes.OP_IF:
          case Opcodes.OP_NOTIF:
            if (!operation(stack, cmds)) {
              console.info(`bad op: ${OP_CODE_NAMES[cmd]}`);
              return false;
            }
            break;
          case Opcodes.OP_TOALTSTACK:
          case Opcodes.OP_FROMALTSTACK:
            if (!operation(stack, altStack)) {
              console.info(`bad op: ${OP_CODE_NAMES[cmd]}`);
              return false;
            }
            break;

          case Opcodes.OP_CHECKSIG:
          case Opcodes.OP_CHECKSIGVERIFY:
          case Opcodes.OP_CHECKMULTISIG:
          case Opcodes.OP_CHECKMULTISIGVERIFY:
            if (!operation(stack, z)) {
              console.info(`bad op: ${OP_CODE_NAMES[cmd]}`);
              return false;
            }
            break;
          default:
            if (!operation(stack)) {
              console.info(`bad op: ${OP_CODE_NAMES[cmd]}`);
              return false;
            }
            break;
        }
      } else {
        stack.push(cmd);
        // p2sh check bip16
        // structure is:
        // OP_HASH160 <hash> OP_EQUAL
        if (
          cmd.length === 3 &&
          cmds[0] == Opcodes.OP_HASH160 &&
          Buffer.isBuffer(cmds[1]) &&
          (cmds[1] as Buffer).byteLength === 20 &&
          cmds[2] === Opcodes.OP_EQUAL
        ) {
          cmds.pop(); // know this is OP_HASH160
          const h160 = cmds.pop()! as Buffer; // <hash>
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
          const redeemScript = Buffer.concat([encodeVarint(cmd.length), cmd]);
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
    const cmds: (Buffer | number)[] = [];
    let count = 0;
    while (count < length) {
      let current = s.readBuffer(1);
      count += 1;
      let currentByte = current[0];
      if (currentByte >= 1 && currentByte <= 75) {
        let n = currentByte;
        cmds.push(s.readBuffer(n));
        count += n;
      } else if (currentByte === 76) {
        const dataLength = s.readUInt8();
        cmds.push(s.readBuffer(dataLength));
        count += dataLength + 1;
      } else if (currentByte === 77) {
        const dataLength = s.readUInt16LE();
        cmds.push(s.readBuffer(dataLength));
        count += dataLength + 2;
      } else {
        const opCode = currentByte;
        cmds.push(opCode);
      }
    }
    if (BigInt(count) !== length) {
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
        const length = cmd.length;
        if (length < 75) {
          s.writeUInt8(length);
        } else if (length > 75 && length < 0x100) {
          s.writeUInt8(76);
          s.writeUInt8(length);
        } else if (length >= 0x100 && length <= 520) {
          s.writeUInt8(77);
          s.writeUInt16LE(length);
        } else {
          throw Error("too long an cmd");
        }
        s.writeBuffer(cmd);
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
      this.cmds[0] === Opcodes.OP_DUP &&
      this.cmds[1] === Opcodes.OP_HASH160 &&
      Buffer.isBuffer(this.cmds[2]) &&
      (this.cmds[2] as Buffer).byteLength === 20 &&
      this.cmds[3] === Opcodes.OP_EQUALVERIFY &&
      this.cmds[4] === Opcodes.OP_CHECKSIG
    );
  };

  isP2SH = (): boolean => {
    return (
      this.cmds.length === 3 &&
      this.cmds[0] === Opcodes.OP_HASH160 &&
      Buffer.isBuffer(this.cmds[1]) &&
      (this.cmds[1] as Buffer).byteLength === 20 &&
      this.cmds[2] === Opcodes.OP_EQUAL
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
        result.push(cmd.toString("hex"));
      }
    }
    return result.join(" ");
  };
}
