import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { buildAgentInvocation, FREEBUFF_AUTOMATION_REASON, runAgent } from "../agent";
import { buildAgentPrompt, type CodexAgentOptions } from "../codex";

const baseOptions: CodexAgentOptions = {
  cwd: "/tmp/fork-candidate",
  task: "Repair the merge window behavior",
  strategyId: "root-cause",
  strategyLabel: "Root-cause fix",
  strategyInstruction: "Trace the failure to its source.",
  timeoutMs: 30_000,
  runDirectory: "/tmp/fork-run",
  useSupercompress: true,
  supercompressMcpReady: true,
  compressedContext: "## package.json\n{\"scripts\":{\"test\":\"vitest\"}}",
};

describe("agent provider adapters", () => {
  it("adds shared and in-agent SuperCompress guidance to every provider prompt", () => {
    const prompt = buildAgentPrompt(baseOptions);
    expect(prompt).toContain("SuperCompress is enabled");
    expect(prompt).toContain("compress_context");
    expect(prompt).toContain("Repository orientation prepared by SuperCompress");
    expect(prompt).toContain("Repair the merge window behavior");
  });

  it("builds an unattended OpenCode invocation with plugins enabled", () => {
    const invocation = buildAgentInvocation({ ...baseOptions, provider: "opencode" });
    expect(invocation.executable).toBe("opencode");
    expect(invocation.args.slice(0, 4)).toEqual(["run", "--format", "json", "--auto"]);
    expect(invocation.args).not.toContain("--pure");
    expect(invocation.args.at(-1)).toContain("Repair the merge window behavior");
  });

  it("builds a writable Cursor invocation that approves configured MCP servers", () => {
    const invocation = buildAgentInvocation({ ...baseOptions, provider: "cursor" });
    expect(invocation.executable).toBe("cursor-agent");
    expect(invocation.args).toEqual(
      expect.arrayContaining(["-p", "--force", "--approve-mcps", "stream-json"]),
    );
    expect(invocation.args).toContain("/tmp/fork-candidate");
  });

  it("does not pretend Freebuff has a supported headless mode", () => {
    expect(() => buildAgentInvocation({ ...baseOptions, provider: "freebuff" })).toThrow(
      FREEBUFF_AUTOMATION_REASON,
    );
  });

  it("streams and persists output from a provider adapter", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "fork-provider-test-"));
    const binary = path.join(root, "fake-opencode");
    await writeFile(
      binary,
      "#!/bin/sh\nprintf '%s\\n' '{\"type\":\"step_start\",\"message\":\"editing\"}'\nprintf '%s\\n' '{\"type\":\"result\",\"message\":\"done\"}'\n",
      "utf8",
    );
    await chmod(binary, 0o755);
    vi.stubEnv("FORK_OPENCODE_BIN", binary);
    const lines: string[] = [];
    try {
      const result = await runAgent({
        ...baseOptions,
        cwd: root,
        runDirectory: path.join(root, "run"),
        provider: "opencode",
        onJsonLine: (line) => lines.push(line),
      });
      expect(result.exitCode).toBe(0);
      expect(result.summary).toContain('"message":"done"');
      expect(lines).toHaveLength(2);
      expect(await readFile(path.join(root, "run", "agent.jsonl"), "utf8")).toContain(
        '"message":"editing"',
      );
    } finally {
      vi.unstubAllEnvs();
      await rm(root, { recursive: true, force: true });
    }
  });
});
