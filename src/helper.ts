import crypto from "crypto";
import { SmartBuffer } from "smart-buffer";

const ripemd160 = () => crypto.createHash("ripemd160");
const sha256 = () => crypto.createHash("sha256");
const sha1Hash = () => crypto.createHash("sha1");

export const SIGHASH_ALL = 1;
export const SIGHASH_NONE = 2;
export const SIGHASH_SINGLE = 3;
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export const TWO_WEEKS = 60 * 60 * 24 * 14;
export const MAX_TARGET = 0xffff * 256 ** (0x1d - 3);

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

export const bigintBytes = (num: bigint | number): number => {
  if (typeof num === "number" && num > 2 ** 32 - 1) num = BigInt(num);
  let bytesNeeded = 0;
  let bitsNeeded = 0;

  while (num > 0) {
    if (bitsNeeded % 8 === 0) {
      bytesNeeded += 1;
    }
    bitsNeeded += 1;
    num = typeof num === "bigint" ? num >> 1n : num >> 1;
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
  // last byte is exponent
  const exponent = bits[bits.byteLength - 1];
  // first 3 bytes are the coefficient
  const coefficient = toIntLE(bits.slice(0, bits.byteLength - 1));
  return BigInt(coefficient) * 256n ** BigInt(exponent - 3);
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

/**
 * Turns a target integer back into bits, which is 4 bytes
 * @param target
 */
export const targetToBits = (target: bigint): Buffer => {
  // get rid of leading 0's
  const rawBytes = trimBuffer(toBufferBE(target, 32), "left");
  let exponent: number, coefficient: Buffer;
  if (rawBytes[0] > 0x7f) {
    // if the first bit is 1, we have to start with 00
    exponent = rawBytes.length + 1;
    coefficient = Buffer.concat([Buffer.alloc(1, 0), rawBytes.slice(0, 2)]);
  } else {
    // otherwise, we can show the first 3 bytes
    // exponent is the number of digits in base-256
    exponent = rawBytes.length;
    // coefficient is the first 3 digits of the base-256 number
    coefficient = rawBytes.slice(0, 3);
  }
  const newBits = Buffer.concat([
    reverseBuffer(coefficient),
    Buffer.alloc(1, exponent)
  ]);
  return newBits;
};

/**
 * Calculates the new bits given a 2016-block time differential and the previous bits
 * @param prevBits
 * @param timeDifferential
 */
export const calculateNewBits = (
  prevBits: Buffer,
  timeDifferential: number
): Buffer => {
  if (timeDifferential > TWO_WEEKS * 4) timeDifferential = TWO_WEEKS * 4;
  if (timeDifferential < TWO_WEEKS / 4) timeDifferential = TWO_WEEKS / 4;
  let newTarget =
    (bitsToTarget(prevBits) * BigInt(timeDifferential)) / BigInt(TWO_WEEKS);
  if (newTarget > MAX_TARGET) newTarget = BigInt(MAX_TARGET);
  return targetToBits(newTarget);
};

export const toBuffer = (
  num: number | bigint,
  endian: "big" | "little" = "little",
  byteLength?: number
): Buffer => {
  let length = byteLength || bigintBytes(num);
  const bits = [];

  while (num > 0) {
    const remainder = typeof num === "bigint" ? num % 2n : num % 2;
    bits.push(remainder);
    num = typeof num === "bigint" ? num / 2n : Math.floor(num / 2);
  }

  let counter = 0;
  let total = 0;
  const buffer = Buffer.alloc(length);

  const writeByte = (byte: number) => {
    if (endian === "little") {
      buffer[buffer.byteLength - length] = byte;
    } else {
      buffer[length - 1] = byte;
    }
  };

  for (const bit of bits) {
    if (counter % 8 == 0 && counter > 0) {
      writeByte(total);
      total = 0;
      counter = 0;
      length--;
    }

    if (bit) {
      // bit is set
      total += Math.pow(2, counter);
    }
    counter++;
  }
  writeByte(total);
  return buffer;
};

export const toInt = (
  buffer: Buffer,
  endian: "big" | "little" = "little"
): number | bigint => {
  let total = buffer.byteLength > 4 ? 0n : 0;
  for (
    let i = endian === "little" ? buffer.byteLength - 1 : 0;
    endian === "little" ? i >= 0 : i < buffer.byteLength;
    endian === "little" ? i-- : i++
  ) {
    if (typeof total === "bigint") {
      total = total * 2n ** 8n + BigInt(buffer[i]);
    } else {
      total = total * 2 ** 8 + buffer[i];
    }
  }
  return total;
};

export const toBufferBE = (num: number | bigint, byteLength?: number): Buffer =>
  toBuffer(num, "big", byteLength);

export const toBufferLE = (num: number | bigint, byteLength?: number): Buffer =>
  toBuffer(num, "little", byteLength);

export const toBigIntLE = (buffer: Buffer): bigint => {
  const num = toInt(buffer, "little");
  return typeof num === "bigint" ? num : BigInt(num);
};

export const toBigIntBE = (buffer: Buffer): bigint => {
  const num = toInt(buffer, "big");
  return typeof num === "bigint" ? num : BigInt(num);
};

export const toIntLE = (buffer: Buffer): number => {
  const num = toInt(buffer, "little");
  if (typeof num === "bigint")
    throw Error("Integer too large for number. Use toBigIntLE");
  return num;
};

export const toIntBE = (buffer: Buffer): number => {
  const num = toInt(buffer, "big");
  if (typeof num === "bigint")
    throw Error("Integer too large for number. Use toBigIntBE");
  return num;
};
