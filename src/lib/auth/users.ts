import { randomUUID } from "node:crypto";

import { hashPassword, verifyPassword } from "./password";
import { findStoredUserByEmail, insertUser } from "./store";
import type { AuthUser, PasswordDigest } from "./types";

const DUMMY_DIGEST: PasswordDigest = {
  algorithm: "scrypt",
  salt: Buffer.alloc(16).toString("base64url"),
  hash: Buffer.alloc(64).toString("base64url"),
  keyLength: 64,
};

export interface RegisterUserInput {
  email: string;
  password: string;
}

export async function registerUser(
  input: RegisterUserInput,
  root?: string,
): Promise<AuthUser> {
  const password = await hashPassword(input.password);
  return insertUser(
    {
      id: randomUUID(),
      email: input.email.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
      password,
    },
    root,
  );
}

export async function authenticateUser(
  email: string,
  password: string,
  root?: string,
): Promise<AuthUser | null> {
  const user = await findStoredUserByEmail(email, root);
  const valid = await verifyPassword(password, user?.password ?? DUMMY_DIGEST);
  if (!user || !valid) return null;
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}
