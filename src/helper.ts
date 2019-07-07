import { sha256 } from "hash.js";
import { toBuffer } from "bignum";

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
  return toBuffer(number, {
    endian,
    size: 8
  });
};

export const randInt = (max: number) => {
  return Math.floor(Math.random() * Math.floor(max));
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
  const s: Buffer = Buffer.alloc(0);
  if (integer < 0xfd) {
    // i < 253, encode as single byte
    return Buffer.from([integer]);
  } else if (integer < 0x10000) {
    // 253 < i < 2^16 - 1, start with 253 byte (fd), encode as 2 bytes (le)
    s.writeUInt16LE(integer, 0);
    return Buffer.concat([Buffer.from("fd", "hex"), s]);
  } else if (integer < 0x100000000) {
    // 2^16 < i < 2^32 - 1, start with 254 byte (fe), encode as 4 bytes (le)
    s.writeUInt32LE(integer, 0);
    return Buffer.concat([Buffer.from("fe", "hex"), s]);
  } else if (integer < 0x10000000000000000) {
    // 2^32 < i < 2^64 - 1, start with 255 byte (ff), encode as 8 bytes (le)
    return Buffer.concat([Buffer.from("ff", "hex"), u64ToEndian(integer)]);
  } else {
    throw new Error("Integer too large");
  }
};
