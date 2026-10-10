import { cp, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { executeTool, inferenceInfo, preflightNemotron, resetNemotronModelCache, runNemotronAgent } from "../nemotron";
import { createMockTokenFactory } from "../nemotron-mock";
import { TIER_FALLBACK } from "../nemotron-models";
import { runProcess } from "../process";
import { STRATEGIES } from "../types";

const FIXTURE = path.resolve(__dirname, "../../../../examples/demo-repo");
const TASK_FILE = path.join(FIXTURE, "TASK.md");

async function copyFixture(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "fork-mock-"));
  await cp(FIXTURE, dir, { recursive: true });
  return dir;
}

async function npm(cwd: string, script: string) {
  return runProcess("npm", ["run", "--silent", script], { cwd, timeoutMs: 30_000, maxCaptureChars: 8_000 });
}

beforeEach(() => {
  resetNemotronModelCache();
  process.env.FORK_NEMOTRON_MOCK = "1";
  process.env.FORK_NEMOTRON_MOCK_DELAY_MS = "0";
  delete process.env.NEBIUS_API_KEY;
});

afterEach(() => {
  delete process.env.FORK_NEMOTRON_MOCK;
  delete process.env.FORK_NEMOTRON_MOCK_DELAY_MS;
  delete process.env.TAVILY_API_KEY;
  resetNemotronModelCache();
});

describe("mock Token Factory", () => {
  it("passes preflight without a key and labels itself", async () => {
    const preflight = await preflightNemotron();
    expect(preflight.available).toBe(true);
    expect(preflight.version).toMatch(/mock/);
    const info = await inferenceInfo();
    expect(info).toEqual({ provider: "nebius-token-factory", mode: "mock", models: TIER_FALLBACK });
  });

  it("runs the real agent loop on the demo fixture: minimal stays narrow, the other two fix the bug", async () => {
    const task = await readFile(TASK_FILE, "utf8");
    const outcomes: Record<string, { visible: number | null; hidden: number | null; model?: string }> = {};
    for (const strategy of STRATEGIES) {
      const cwd = await copyFixture();
      const result = await runNemotronAgent({
        cwd,
        task,
        strategyId: strategy.id,
        strategyLabel: strategy.label,
        strategyInstruction: strategy.instruction,
        timeoutMs: 60_000,
        runDirectory: path.join(cwd, ".fork-run"),
      });
      expect(result.exitCode).toBe(0);
      expect(result.summary).toBeTruthy();
      const log = await readFile(path.join(cwd, ".fork-run", "agent.jsonl"), "utf8");
      expect(log).toContain('"mock":true');
      outcomes[strategy.id] = {
        visible: (await npm(cwd, "test")).exitCode,
        hidden: (await npm(cwd, "test:hidden")).exitCode,
        model: result.model,
      };
    }
    expect(outcomes.minimal.visible).not.toBe(0);
    expect(outcomes["root-cause"]).toMatchObject({ visible: 0, hidden: 0, model: TIER_FALLBACK.super });
    expect(outcomes.architecture).toMatchObject({ visible: 0, hidden: 0, model: TIER_FALLBACK.ultra });
    expect(outcomes.minimal.model).toBe(TIER_FALLBACK.nano);
  }, 60_000);

  it("refuses tasks it has no script for", async () => {
    const res = await createMockTokenFactory({ delayMs: 0 })("https://x/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Candidate strategy: Minimal patch (minimal).\nAdd a login page" }] }),
    });
    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/NEBIUS_API_KEY/);
  });
});

describe("web_search tool", () => {
  it("calls Tavily and enforces the per-run limit", async () => {
    process.env.TAVILY_API_KEY = "tvly-test";
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ results: [{ title: "Doc", url: "https://docs.example/a", content: "excerpt" }] }));
    }) as unknown as typeof fetch;
    const searches = { count: 0 };
    const out = await executeTool("/tmp", "web_search", { query: "node test runner" }, { searches, fetchImpl });
    expect(out).toContain("https://docs.example/a");
    await executeTool("/tmp", "web_search", { query: "b" }, { searches, fetchImpl });
    await executeTool("/tmp", "web_search", { query: "c" }, { searches, fetchImpl });
    expect(await executeTool("/tmp", "web_search", { query: "d" }, { searches, fetchImpl })).toMatch(/limit/);
    expect(calls).toBe(3);
  });

  it("is reported as unavailable without a key", async () => {
    expect(await executeTool("/tmp", "web_search", { query: "x" })).toMatch(/TAVILY_API_KEY/);
  });
});
