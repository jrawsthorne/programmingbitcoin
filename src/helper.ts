import { sha256 } from "hash.js";
import BN from "bn.js";
import crypto from "crypto";

// Double sha256 hash
export const hash256 = (s: Buffer): Buffer => {
  return Buffer.from(
    sha256()
      .update(
        sha256()
          .update(s)
          .digest()
      )
      .digest()
  );
};

export const u64ToEndian = (
  number: number,
  endian: "little" | "big" = "little"
): Buffer => {
  return new BN(number).toBuffer(endian === "little" ? "le" : "be", 8);
};

export const randInt = (max: number) => {
  return Math.floor(Math.random() * Math.floor(max));
};

export const randBN = async (min: BN, max: BN): Promise<BN> => {
  if (min.gt(max)) {
    throw Error("Max must be greater than min");
  }
  const range = max.sub(min);
  const randomBytes = await crypto.randomBytes(range.byteLength());
  const randomValue = new BN(randomBytes);
  if (randomValue.lte(range)) {
    return min.add(randomValue);
  } else {
    return randBN(min, max);
  }
};

export const toIPFormat = (ip: Buffer): Buffer => {
  // convert to mapped IPv4
  if (ip.length === 4) {
    return Buffer.concat([Buffer.alloc(10), Buffer.from("ffff", "hex"), ip]);
  } else {
    return ip;
  }
};

export const encodeVarint = (integer: number): Buffer => {
  if (integer < 0xfd) {
    // i < 253, encode as single byte
    return Buffer.from([integer]);
  } else if (integer < 0x10000) {
    // 253 < i < 2^16 - 1, start with 253 byte (fd), encode as 2 bytes (le)
    const s = Buffer.alloc(3, 0xfd);
    s.writeUInt16LE(integer, 1);
    return s;
  } else if (integer < 0x100000000) {
    // 2^16 < i < 2^32 - 1, start with 254 byte (fe), encode as 4 bytes (le)
    const s = Buffer.alloc(5, 0xfe);
    s.writeUInt32LE(integer, 1);
    return s;
  } else if (integer < 0x10000000000000000) {
    // 2^32 < i < 2^64 - 1, start with 255 byte (ff), encode as 8 bytes (le)
    return Buffer.concat([Buffer.from("ff", "hex"), u64ToEndian(integer)]);
  } else {
    throw new Error("Integer too large");
  }
};
