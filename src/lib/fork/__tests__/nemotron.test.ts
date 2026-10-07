import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  executeTool,
  insideWorktree,
  nemotronJudgeRunner,
  resetNemotronModelCache,
  resolveNemotronModels,
  runNemotronAgent,
} from "../nemotron";

const MODELS = {
  data: [
    { id: "nvidia/nemotron-3-nano-omni" },
    { id: "nvidia/nemotron-3-nano-30b-a3b" },
    { id: "nvidia/nemotron-3-super-120b-a12b" },
    { id: "nvidia/nemotron-3-ultra-550b-a55b" },
    { id: "meta-llama/Llama-3.3-70B-Instruct" },
  ],
};

/** A fake Token Factory: serves /models and replays scripted chat completions. */
function fakeNebius(script: Array<Record<string, unknown>>) {
  const requests: Array<Record<string, unknown>> = [];
  const impl = (async (url: string, init?: RequestInit) => {
    if (url.endsWith("/models")) return new Response(JSON.stringify(MODELS));
    requests.push(JSON.parse(String(init?.body)));
    const message = script.shift();
    if (!message) return new Response("script exhausted", { status: 500 });
    return new Response(
      JSON.stringify({ choices: [{ message, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 5 } }),
    );
  }) as typeof fetch;
  return { impl, requests };
}

const call = (id: string, name: string, args: Record<string, string>) => ({
  id,
  type: "function",
  function: { name, arguments: JSON.stringify(args) },
});

let repo: string;

beforeEach(async () => {
  resetNemotronModelCache();
  process.env.NEBIUS_API_KEY = "test";
  repo = await mkdtemp(path.join(tmpdir(), "fork-nemotron-"));
  await writeFile(path.join(repo, "math.js"), "export const add = (a, b) => a - b;\n");
});

afterEach(() => {
  delete process.env.FORK_NEMOTRON_ULTRA_MODEL;
});

describe("model resolution", () => {
  it("maps each tier to the account's Nemotron model and skips non-matching variants", async () => {
    const { impl } = fakeNebius([]);
    expect(await resolveNemotronModels(impl)).toEqual({
      nano: "nvidia/nemotron-3-nano-30b-a3b",
      super: "nvidia/nemotron-3-super-120b-a12b",
      ultra: "nvidia/nemotron-3-ultra-550b-a55b",
    });
  });

  it("honours explicit overrides", async () => {
    process.env.FORK_NEMOTRON_ULTRA_MODEL = "nvidia/custom-ultra";
    const { impl } = fakeNebius([]);
    expect((await resolveNemotronModels(impl)).ultra).toBe("nvidia/custom-ultra");
  });
});

describe("worktree sandbox", () => {
  it("refuses paths outside the worktree and inside .git", () => {
    expect(() => insideWorktree(repo, "../etc/passwd")).toThrow(/escapes/);
    expect(() => insideWorktree(repo, "/etc/passwd")).toThrow(/escapes/);
    expect(() => insideWorktree(repo, ".git/config")).toThrow(/off limits/);
    expect(insideWorktree(repo, "src/a.js")).toBe(path.join(repo, "src/a.js"));
  });

  it("replace_in_file needs exactly one match", async () => {
    await writeFile(path.join(repo, "dup.txt"), "x x");
    expect(await executeTool(repo, "replace_in_file", { path: "dup.txt", old: "x", new: "y" })).toMatch(/found 2/);
  });
});

describe("agent loop", () => {
  it("reads, edits, verifies and finishes on the strategy's model", async () => {
    const { impl, requests } = fakeNebius([
      { content: null, tool_calls: [call("1", "read_file", { path: "math.js" })] },
      { content: null, tool_calls: [call("2", "replace_in_file", { path: "math.js", old: "a - b", new: "a + b" })] },
      { content: null, tool_calls: [call("3", "run_command", { command: "grep -c 'a + b' math.js" })] },
      { content: null, tool_calls: [call("4", "finish", { summary: "Fixed add() to add." })] },
    ]);
    const events: string[] = [];
    const result = await runNemotronAgent({
      cwd: repo,
      task: "add() subtracts; make it add.",
      strategyId: "root-cause",
      strategyLabel: "Root-cause fix",
      strategyInstruction: "Fix the source.",
      timeoutMs: 60_000,
      runDirectory: path.join(repo, ".fork-run"),
      fetchImpl: impl,
      onJsonLine: (_line, event) => events.push(String(event?.type)),
    });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toBe("Fixed add() to add.");
    expect(await readFile(path.join(repo, "math.js"), "utf8")).toContain("a + b");
    expect(requests.every((r) => r.model === "nvidia/nemotron-3-super-120b-a12b")).toBe(true);
    // The command's output went back to the model.
    const lastTool = (requests[3].messages as Array<{ role: string; content: string }>).at(-1)!;
    expect(lastTool.content).toMatch(/^exit 0\n1/);
    expect(events).toContain("nemotron.done");
  });

  it("reports a Token Factory error instead of hanging", async () => {
    const { impl } = fakeNebius([]);
    const result = await runNemotronAgent({
      cwd: repo,
      task: "anything",
      strategyId: "minimal",
      strategyLabel: "Minimal patch",
      strategyInstruction: "Small.",
      timeoutMs: 60_000,
      runDirectory: path.join(repo, ".fork-run"),
      fetchImpl: impl,
    });
    expect(result.exitCode).toBe(1);
    expect(result.error).toMatch(/Nebius Token Factory 500/);
  }, 20_000);
});

describe("judge", () => {
  it("asks Ultra and parses the JSON decision", async () => {
    const { impl, requests } = fakeNebius([
      { content: 'Decision:\n{"winnerId":"architecture","rationale":"Cleanest and fully tested."}' },
    ]);
    const decision = await nemotronJudgeRunner({ prompt: "pick one", schema: {} }, impl);
    expect(decision).toEqual({ winnerId: "architecture", rationale: "Cleanest and fully tested." });
    expect(requests[0].model).toBe("nvidia/nemotron-3-ultra-550b-a55b");
  });
});
