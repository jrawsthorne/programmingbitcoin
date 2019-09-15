import crypto from "crypto";
import { SmartBuffer } from "smart-buffer";
import { toBigIntLE, toBigIntBE, toBufferBE, toBufferLE } from "bigint-buffer";

const ripemd160 = () => crypto.createHash("ripemd160");
const sha256 = () => crypto.createHash("sha256");
const sha1Hash = () => crypto.createHash("sha1");

export const SIGHASH_ALL = 1;
export const SIGHASH_NONE = 2;
export const SIGHASH_SINGLE = 3;

// Double sha256 hash
export const hash256 = (s: Buffer): Buffer => {
  return sha256()
    .update(
      sha256()
        .update(s)
        .digest()
    )
    .digest();
};

// sha256 followed by ripemd160
export const hash160 = (s: Buffer): Buffer => {
  return ripemd160()
    .update(
      sha256()
        .update(s)
        .digest()
    )
    .digest();
};

export const sha1 = (s: Buffer): Buffer => {
  return sha1Hash()
    .update(s)
    .digest();
};

// reverse buffer byte order
export const reverseBuffer = (buffer: Buffer): Buffer => {
  const reversed = Buffer.alloc(buffer.byteLength);
  for (const [i, byte] of buffer.entries()) {
    reversed[buffer.byteLength - i - 1] = byte;
  }
  return reversed;
};

// bigint mod that produces a positive value
export const mod = function(n: bigint, m: bigint): bigint {
  return ((n % m) + m) % m;
};

// modular exponentiation
export const pow = function(
  base: bigint,
  exponent: bigint,
  modulus: bigint
): bigint {
  if (modulus === 1n) return 0n;
  let result = 1n;
  base = mod(base, modulus);
  while (exponent > 0) {
    if (exponent & 1n) {
      result = mod(result * base, modulus);
    }
    exponent = exponent >> 1n;
    base = mod(base * base, modulus);
  }
  return result;
};

export const u64ToEndian = (
  number: number,
  endian: "little" | "big" = "little"
): Buffer => {
  return endian === "big"
    ? toBufferBE(BigInt(number), 8)
    : toBufferLE(BigInt(number), 8);
};

export const randInt = (max: number) => {
  return Math.floor(Math.random() * Math.floor(max));
};

export const bigintBytes = (num: bigint): number => {
  let bytesNeeded = 0;
  let bitsNeeded = 0;
  while (num > 0) {
    if (bitsNeeded % 8 === 0) {
      bytesNeeded += 1;
    }
    bitsNeeded += 1;
    num = num >> 1n;
  }
  return bytesNeeded;
};

export const randBN = async (min: bigint, max: bigint): Promise<bigint> => {
  if (min > max) {
    throw Error("Max must be greater than min");
  }
  const range = max - min;
  const randomBytes = await crypto.randomBytes(bigintBytes(range));
  const randomValue = toBigIntLE(randomBytes);
  if (randomValue < range) {
    return min + randomValue;
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

export const readVarint = (s: SmartBuffer): bigint => {
  const i = s.readUInt8();
  if (i === 0xfd) {
    return toBigIntLE(s.readBuffer(2));
  } else if (i === 0xfe) {
    return toBigIntLE(s.readBuffer(4));
  } else if (i === 0xff) {
    return toBigIntLE(s.readBuffer(8));
  } else {
    return BigInt(i);
  }
};

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export const encodeBase58 = (s: Buffer): string => {
  let count = 0;
  for (const c of s) {
    if (c == 0) {
      count += 1;
    } else {
      break;
    }
  }
  let num = toBigIntBE(s);
  const prefix = "1".repeat(count);
  let result = "";
  while (num > 0) {
    const mod = num % 58n;
    num = num / 58n;
    result = BASE58_ALPHABET[Number(mod)] + result;
  }

  return prefix + result;
};

// Decode bas58 encoded string of format [n-4 bytes][4 byte hash256 checksum]
export const decodeBase58 = (s: string, byteLength: number) => {
  let num = 0n;
  for (const c of s) {
    num *= 58n;
    num += BigInt(BASE58_ALPHABET.indexOf(c));
  }
  let combined = toBufferBE(num, byteLength);
  // weird bug https://github.com/no2chem/bigint-buffer/issues/12
  while (num > 0 && combined[byteLength - 1] === 0) {
    combined = toBufferBE(num, byteLength);
  }
  const expectedChecksum = combined.slice(combined.length - 4);
  const calculatedChecksum = hash256(
    combined.slice(0, combined.length - 4)
  ).slice(0, 4);
  if (!expectedChecksum.equals(calculatedChecksum)) {
    throw Error(
      `Checksum mismatch: ${expectedChecksum.toString(
        "hex"
      )} vs ${calculatedChecksum.toString("hex")}`
    );
  }
  return combined.slice(1, combined.length - 4);
};

export const decodeBase58Wif = (
  wif: string,
  compressed: boolean = true
): Buffer => {
  const byteLength = compressed ? 38 : 37;
  const decoded = decodeBase58(wif, byteLength);
  return compressed ? decoded.slice(0, decoded.length - 1) : decoded;
};

export const decodeBase58Address = (address: string): Buffer => {
  return decodeBase58(address, 25);
};

export const encodeBase58Checksum = (b: Buffer): string => {
  return encodeBase58(Buffer.concat([b, hash256(b).slice(0, 4)]));
};

export const h160ToP2PKHAddress = (
  h160: Buffer,
  testnet: boolean = false
): string => {
  const prefix = testnet ? Buffer.alloc(1, 0x6f) : Buffer.alloc(1, 0);
  return encodeBase58Checksum(Buffer.concat([prefix, h160]));
};

export const h160ToP2SHAddress = (
  h160: Buffer,
  testnet: boolean = false
): string => {
  const prefix = testnet ? Buffer.alloc(1, 0xc4) : Buffer.alloc(1, 0x05);
  return encodeBase58Checksum(Buffer.concat([prefix, h160]));
};

export const bitsToTarget = (bits: Buffer): bigint => {
  const exponent = bits[bits.byteLength - 1];
  const coefficient = toBigIntLE(bits.slice(0, bits.byteLength - 1));
  return coefficient * 256n ** (BigInt(exponent) - 3n);
};

export const trimBuffer = (buffer: Buffer, side: "left" | "right"): Buffer => {
  let slicePoint = side === "left" ? 0 : buffer.byteLength - 1;
  while (true) {
    if (buffer[slicePoint] !== 0) break;
    side === "left" ? slicePoint++ : slicePoint--;
  }
  return side === "left"
    ? buffer.slice(slicePoint)
    : buffer.slice(0, slicePoint + 1);
};
