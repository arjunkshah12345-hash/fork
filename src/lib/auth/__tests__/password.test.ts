import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../password";

describe("password hashing", () => {
  it("uses scrypt with a fresh salt and verifies without storing plaintext", async () => {
    const first = await hashPassword("correct horse battery staple");
    const second = await hashPassword("correct horse battery staple");

    expect(first.algorithm).toBe("scrypt");
    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
    await expect(verifyPassword("correct horse battery staple", first)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", first)).resolves.toBe(false);
  });

  it("rejects malformed digests without throwing", async () => {
    await expect(
      verifyPassword("password", {
        algorithm: "scrypt",
        salt: "not-a-real-salt",
        hash: "not-a-real-hash",
        keyLength: 64,
      }),
    ).resolves.toBe(false);
  });
});

