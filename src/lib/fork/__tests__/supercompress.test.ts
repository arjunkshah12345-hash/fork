import { execSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  parseCompressionPayload,
  prepareSupercompressContext,
  verifySupercompressApiKey,
} from "../supercompress";

function mockCompressResponse(
  status: number,
  payload: unknown = {
    compressed_text: "kept context",
    original_tokens: 1_000,
    kept_tokens: 360,
    tokens_saved_pct: 64,
  },
): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      status === 200
        ? new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } })
        : new Response(JSON.stringify({ error: "nope" }), { status }),
    ),
  );
}

const tempRoots: string[] = [];

async function temporaryGitRepository(): Promise<string> {
  const repository = await mkdtemp(path.join(os.tmpdir(), "fork-sc-repo-"));
  tempRoots.push(repository);
  await writeFile(path.join(repository, "README.md"), "# Test repository\nOrientation content.\n");
  execSync("git init -q", { cwd: repository });
  execSync("git config user.email fork-test@example.com", { cwd: repository });
  execSync("git config user.name Fork Test", { cwd: repository });
  execSync("git add -A", { cwd: repository });
  execSync("git commit -qm init", { cwd: repository });
  return repository;
}

// Force the local CLI path to fail deterministically so tests exercise the
// hosted fallback regardless of whether `supercompress` is pip-installed.
beforeEach(() => {
  process.env.FORK_PYTHON_BIN = "/nonexistent/python";
  process.env.FORK_SUPERCOMPRESS_BIN = "/nonexistent/supercompress";
});

afterEach(async () => {
  vi.unstubAllGlobals();
  delete process.env.SUPERCOMPRESS_API_KEY;
  delete process.env.FORK_PYTHON_BIN;
  delete process.env.FORK_SUPERCOMPRESS_BIN;
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("SuperCompress result parsing", () => {
  it("normalizes hosted and local response metrics", () => {
    expect(
      parseCompressionPayload({
        compressed_text: "kept context",
        original_tokens: 1_000,
        kept_tokens: 360,
        tokens_saved_pct: 64,
      }),
    ).toEqual({
      compressed_text: "kept context",
      original_tokens: 1_000,
      kept_tokens: 360,
      tokens_saved: 640,
      tokens_saved_pct: 64,
    });
  });

  it("rejects malformed responses instead of sending empty context to agents", () => {
    expect(() => parseCompressionPayload({ compressed_text: "missing metrics" })).toThrow(
      "invalid result",
    );
  });

  it("verifies a valid hosted API key", async () => {
    mockCompressResponse(200);
    await expect(verifySupercompressApiKey("sk-valid")).resolves.toMatchObject({
      original_tokens: 1_000,
      tokens_saved_pct: 64,
    });
  });

  it("rejects an invalid hosted API key with a clear message", async () => {
    mockCompressResponse(401);
    await expect(verifySupercompressApiKey("sk-bad")).rejects.toThrow(
      "SuperCompress API key was rejected",
    );
  });

  it("reports when the hosted service cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));
    await expect(verifySupercompressApiKey("sk-any")).rejects.toThrow(
      "SuperCompress could not be reached",
    );
  });

  it("uses the linked account key for hosted compression when local is unavailable", async () => {
    mockCompressResponse(200, {
      compressed_text: "hosted result",
      original_tokens: 2_000,
      kept_tokens: 700,
      tokens_saved_pct: 65,
    });
    const repository = await temporaryGitRepository();
    const prepared = await prepareSupercompressContext(
      repository,
      "fix the bug",
      true,
      "sk-account-key",
    );
    expect(prepared.state).toMatchObject({ status: "compressed", mode: "hosted" });
    expect(prepared.context).toBe("hosted result");
    const fetchMock = vi.mocked(fetch);
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("sk-account-key");
  });

  it("reports unavailable without a key instead of failing the run", async () => {
    const repository = await temporaryGitRepository();
    const prepared = await prepareSupercompressContext(repository, "fix the bug", true);
    expect(prepared.state.status).toBe("unavailable");
    expect(prepared.context).toBeUndefined();
  });
});
