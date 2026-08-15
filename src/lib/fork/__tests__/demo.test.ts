import { rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

import { createDemoRequest, materializeDemoRepository } from "../demo";

const execFileAsync = promisify(execFile);
const allowedRoot = path.join(process.cwd(), ".fork", "demo");
let repository: string | undefined;

afterEach(async () => {
  if (repository?.startsWith(`${allowedRoot}${path.sep}run-`)) {
    await rm(repository, { recursive: true, force: true });
  }
  repository = undefined;
});

describe("demo repository", () => {
  it("materializes a fresh committed repository and builds its run request", async () => {
    repository = await materializeDemoRepository();
    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], {
      cwd: repository,
    });
    const request = await createDemoRequest(repository);

    expect(stdout).toBe("");
    expect(request.repository).toBe(repository);
    expect(request.baseBranch).toBe("main");
    expect(request.task).toContain("Repair `mergeWindows`");
    expect(request.commands?.map((command) => command.name)).toEqual([
      "visible tests",
      "hidden tests",
    ]);
  });
});

