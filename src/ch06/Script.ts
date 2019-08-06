import { readVarint, encodeVarint } from "../helper";
import { SmartBuffer } from "smart-buffer";
import { OP_CODE_NAMES } from "./Op";

export class Script {
  public cmds: (Buffer | number)[];

  constructor(cmds?: (Buffer | number)[]) {
    this.cmds = cmds ? cmds : [];
  }

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
