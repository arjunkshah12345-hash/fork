import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  AuthenticationRequiredError,
  getUser,
  requireUser,
} from "../dal";
import { AUTH_TEST_SECRET, createAuthTestCookie } from "../testing";
import { registerUser } from "../users";

let root: string;
let previousRoot: string | undefined;
let previousSecret: string | undefined;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "fork-auth-dal-test-"));
  previousRoot = process.env.FORK_AUTH_ROOT;
  previousSecret = process.env.AUTH_SECRET;
  process.env.FORK_AUTH_ROOT = root;
  process.env.AUTH_SECRET = AUTH_TEST_SECRET;
});

afterEach(async () => {
  if (previousRoot === undefined) delete process.env.FORK_AUTH_ROOT;
  else process.env.FORK_AUTH_ROOT = previousRoot;
  if (previousSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = previousSecret;
  await rm(root, { recursive: true, force: true });
});

describe("auth DAL", () => {
  it("resolves a signed cookie against the persisted user", async () => {
    const user = await registerUser({
      email: "person@example.com",
      password: "a sufficiently long password",
    });
    const request = new Request("http://localhost/api/runs", {
      headers: { cookie: createAuthTestCookie(user.id) },
    });

    await expect(getUser(request)).resolves.toEqual(user);
    await expect(requireUser(request)).resolves.toEqual(user);
  });

  it("fails closed for missing and forged cookies", async () => {
    const missing = new Request("http://localhost/api/runs");
    const forged = new Request("http://localhost/api/runs", {
      headers: { cookie: "fork_session=forged.payload" },
    });

    await expect(getUser(forged)).resolves.toBeNull();
    await expect(requireUser(missing)).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });
});
