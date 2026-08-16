import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import type { AuthUser, StoredAuthUser, UserSettings } from "./types";

const passwordSchema = z
  .object({
    algorithm: z.literal("scrypt"),
    salt: z.string().min(1),
    hash: z.string().min(1),
    keyLength: z.number().int().positive(),
  })
  .strict();

const supercompressSettingsSchema = z
  .object({
    apiKey: z.string().min(1),
    linkedAt: z.iso.datetime(),
  })
  .strict();

const storedUserSchema = z
  .object({
    id: z.string().min(1),
    email: z.email(),
    createdAt: z.iso.datetime(),
    password: passwordSchema,
    settings: z
      .object({
        supercompress: supercompressSettingsSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const usersFileSchema = z
  .object({
    version: z.literal(1),
    users: z.array(storedUserSchema),
  })
  .strict();

interface StoreState {
  mutationTail: Promise<void>;
}

const stateKey = Symbol.for("fork.auth-store");
const authGlobal = globalThis as typeof globalThis & { [stateKey]?: StoreState };
const state =
  authGlobal[stateKey] ?? (authGlobal[stateKey] = { mutationTail: Promise.resolve() });

export class AuthStorageError extends Error {
  constructor(message = "Local authentication storage is unavailable.") {
    super(message);
    this.name = "AuthStorageError";
  }
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "DuplicateEmailError";
  }
}

export function getAuthStorageRoot(): string {
  return process.env.FORK_AUTH_ROOT
    ? path.resolve(process.env.FORK_AUTH_ROOT)
    : path.join(process.cwd(), ".fork", "auth");
}

function usersPath(root: string): string {
  return path.join(root, "users.json");
}

function publicUser(user: StoredAuthUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    supercompressLinked: Boolean(user.settings?.supercompress?.apiKey),
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function readUsers(root: string): Promise<StoredAuthUser[]> {
  try {
    const parsed = usersFileSchema.safeParse(
      JSON.parse(await readFile(usersPath(root), "utf8")) as unknown,
    );
    if (!parsed.success) throw new AuthStorageError();
    return parsed.data.users;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    if (error instanceof AuthStorageError) throw error;
    throw new AuthStorageError();
  }
}

async function writeUsers(root: string, users: StoredAuthUser[]): Promise<void> {
  await mkdir(root, { recursive: true, mode: 0o700 });
  const target = usersPath(root);
  const temporary = path.join(root, `.users.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFile(
      temporary,
      `${JSON.stringify({ version: 1, users }, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    );
    await rename(temporary, target);
  } catch {
    await unlink(temporary).catch(() => undefined);
    throw new AuthStorageError();
  }
}

async function withMutationLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = state.mutationTail;
  let release = () => {};
  state.mutationTail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous.catch(() => undefined);
  try {
    return await operation();
  } finally {
    release();
  }
}

export async function insertUser(
  user: StoredAuthUser,
  root = getAuthStorageRoot(),
): Promise<AuthUser> {
  return withMutationLock(async () => {
    const users = await readUsers(root);
    const email = normalizeEmail(user.email);
    if (users.some((candidate) => normalizeEmail(candidate.email) === email)) {
      throw new DuplicateEmailError();
    }
    const stored = { ...user, email };
    await writeUsers(root, [...users, stored]);
    return publicUser(stored);
  });
}

export async function findStoredUserByEmail(
  email: string,
  root = getAuthStorageRoot(),
): Promise<StoredAuthUser | undefined> {
  const normalized = normalizeEmail(email);
  return (await readUsers(root)).find((user) => normalizeEmail(user.email) === normalized);
}

export async function findUserById(
  id: string,
  root = getAuthStorageRoot(),
): Promise<AuthUser | undefined> {
  const user = (await readUsers(root)).find((candidate) => candidate.id === id);
  return user ? publicUser(user) : undefined;
}

export async function findStoredUserSettings(
  id: string,
  root = getAuthStorageRoot(),
): Promise<UserSettings | undefined> {
  const user = (await readUsers(root)).find((candidate) => candidate.id === id);
  return user?.settings;
}

export async function updateUserSettings(
  id: string,
  settings: UserSettings,
  root = getAuthStorageRoot(),
): Promise<UserSettings> {
  return withMutationLock(async () => {
    const users = await readUsers(root);
    const index = users.findIndex((candidate) => candidate.id === id);
    if (index < 0) throw new Error("Unknown account.");
    users[index] = { ...users[index], settings };
    await writeUsers(root, users);
    return settings;
  });
}

