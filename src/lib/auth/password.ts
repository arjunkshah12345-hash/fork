import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import type { PasswordDigest } from "./types";

const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

function deriveKey(password: string, salt: Buffer, keyLength = KEY_LENGTH): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<PasswordDigest> {
  const salt = randomBytes(16);
  const hash = await deriveKey(password, salt);
  return {
    algorithm: "scrypt",
    salt: salt.toString("base64url"),
    hash: hash.toString("base64url"),
    keyLength: KEY_LENGTH,
  };
}

export async function verifyPassword(
  password: string,
  digest: PasswordDigest,
): Promise<boolean> {
  try {
    if (digest.algorithm !== "scrypt" || digest.keyLength !== KEY_LENGTH) return false;
    const salt = Buffer.from(digest.salt, "base64url");
    const expected = Buffer.from(digest.hash, "base64url");
    if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;
    const actual = await deriveKey(password, salt, digest.keyLength);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

