import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { DuplicateEmailError, findUserById } from "../store";
import { authenticateUser, registerUser } from "../users";

const roots: string[] = [];

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "fork-auth-test-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("local user store", () => {
  it("persists users and never writes the plaintext password", async () => {
    const root = await temporaryRoot();
    const user = await registerUser(
      { email: "  USER@Example.com ", password: "a sufficiently long password" },
      root,
    );
    const stored = await readFile(path.join(root, "users.json"), "utf8");

    expect(user.email).toBe("user@example.com");
    expect(stored).not.toContain("a sufficiently long password");
    await expect(
      authenticateUser("USER@example.com", "a sufficiently long password", root),
    ).resolves.toMatchObject({ id: user.id, email: "user@example.com" });
    await expect(authenticateUser("user@example.com", "wrong password", root)).resolves.toBeNull();
    await expect(findUserById(user.id, root)).resolves.toEqual(user);
  });

  it("serializes concurrent registration and enforces unique normalized emails", async () => {
    const root = await temporaryRoot();
    const attempts = await Promise.allSettled([
      registerUser({ email: "person@example.com", password: "long password one" }, root),
      registerUser({ email: "PERSON@example.com", password: "long password two" }, root),
    ]);

    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    const rejected = attempts.find((attempt) => attempt.status === "rejected");
    expect(rejected).toMatchObject({ reason: expect.any(DuplicateEmailError) });
  });
});

