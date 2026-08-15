import { describe, expect, it, vi } from "vitest";

import {
  calculateCandidateScore,
  calculateReviewScore,
  calculateSimplicityScore,
  calculateSpeedScore,
  calculateTestScore,
  evaluateCandidates,
  scoreCandidates,
} from "../evaluator";
import { deterministicJudge, judgeCandidates } from "../judge";
import type { CandidateResult, CommandResult, StrategyId } from "../types";

function command(
  status: CommandResult["status"] = "passed",
  required = true,
): CommandResult {
  return {
    name: "test",
    command: "npm test",
    required,
    status,
    exitCode: status === "passed" ? 0 : 1,
    runtimeMs: 100,
    stdout: "",
    stderr: "",
  };
}

function candidate(
  id: StrategyId,
  overrides: Partial<CandidateResult> = {},
): CandidateResult {
  return {
    id,
    label: id,
    description: id,
    branch: `fork/${id}`,
    worktreePath: `/tmp/${id}`,
    status: "complete",
    runtimeMs: 1_000,
    agentExitCode: 0,
    logs: [],
    commands: [command()],
    diff: "+ok",
    diffStats: { filesChanged: 1, additions: 5, deletions: 0, files: ["a.ts"] },
    findings: [],
    ...overrides,
  };
}

describe("candidate scoring", () => {
  it("uses the exact 50/30/10/10 weighted total", () => {
    const input = candidate("minimal", {
      runtimeMs: 2_000,
      findings: [
        {
          severity: "warning",
          title: "Concern",
          body: "Concern",
          source: "local",
        },
      ],
      diffStats: { filesChanged: 2, additions: 20, deletions: 10, files: [] },
    });

    const score = calculateCandidateScore(input, [1_000, 2_000]);

    expect(score).toEqual({
      tests: 100,
      review: 82,
      simplicity: 84,
      speed: 50,
      total: 88,
      disqualified: false,
    });
  });

  it.each(["failed", "timed_out", "skipped"] as const)(
    "zeros verification and disqualifies a required command that is %s",
    (status) => {
      expect(calculateTestScore([command(status, true), command("passed", true)])).toEqual({
        score: 0,
        disqualified: true,
      });
    },
  );

  it("ignores optional command failures for the required-command gate", () => {
    expect(calculateTestScore([command("passed", true), command("failed", false)])).toEqual({
      score: 100,
      disqualified: false,
    });
  });

  it("calculates deterministic component scores", () => {
    expect(calculateReviewScore([
      { severity: "error", title: "A", body: "A", source: "local" },
      { severity: "info", title: "B", body: "B", source: "codex" },
    ])).toBe(51);
    expect(calculateSimplicityScore({
      filesChanged: 2,
      additions: 20,
      deletions: 10,
      files: [],
    })).toBe(84);
    expect(calculateSpeedScore(4_000, [2_000, 4_000, 8_000])).toBe(50);
  });

  it("scores copies and preserves input candidates", () => {
    const inputs = [
      candidate("minimal", { runtimeMs: 500 }),
      candidate("root-cause", { runtimeMs: 1_000 }),
    ];
    const scored = scoreCandidates(inputs);

    expect(inputs[0].score).toBeUndefined();
    expect(scored[0].score?.speed).toBe(100);
    expect(scored[1].score?.speed).toBe(50);
  });
});

describe("optional Greptile review", () => {
  it("adds JSON findings when the local CLI is enabled", async () => {
    const runner = vi.fn(async ({ args }: { args: string[] }) => {
      if (args[0] === "--version") return { stdout: "1.0.0", stderr: "" };
      return {
        stdout: JSON.stringify({
          findings: [{
            severity: "high",
            title: "Null access",
            body: "Guard this value",
            file: "a.ts",
            line: 4,
          }],
        }),
        stderr: "",
      };
    });

    const [result] = await evaluateCandidates([candidate("minimal")], {
      useGreptile: true,
      greptileRunner: runner,
    });

    expect(result.findings).toEqual([
      expect.objectContaining({
        severity: "error",
        title: "Null access",
        source: "greptile",
      }),
    ]);
    expect(result.score?.review).toBe(55);
  });

  it("falls back cleanly when Greptile is unavailable", async () => {
    const runner = vi.fn(async () => {
      throw new Error("ENOENT");
    });

    const [result] = await evaluateCandidates([candidate("minimal")], {
      useGreptile: true,
      greptileRunner: runner,
    });

    expect(result.findings).toEqual([]);
    expect(result.score?.review).toBe(100);
  });
});

describe("final judge", () => {
  it("prefers qualified candidates even when a failed candidate has a high subtotal", () => {
    const qualified = scoreCandidates([
      candidate("minimal", {
        runtimeMs: 100_000,
        findings: [
          { severity: "error", title: "A", body: "A", source: "local" },
          { severity: "error", title: "B", body: "B", source: "local" },
        ],
        diffStats: { filesChanged: 100, additions: 1_000, deletions: 0, files: [] },
      }),
      candidate("root-cause", {
        runtimeMs: 1,
        commands: [command("failed")],
      }),
    ]);

    expect(deterministicJudge(qualified).winnerId).toBe("minimal");
  });

  it("accepts a valid structured Codex decision", async () => {
    const decision = await judgeCandidates([
      candidate("minimal"),
      candidate("architecture"),
    ], {
      task: "Fix the bug",
      runner: async () => ({
        winnerId: "architecture",
        rationale: "It handles the edge case with the same passing checks.",
      }),
    });

    expect(decision).toEqual({
      winnerId: "architecture",
      rationale: "It handles the edge case with the same passing checks.",
      source: "codex",
    });
  });

  it("uses the deterministic fallback for invalid or disqualified selections", async () => {
    const inputs = [
      candidate("minimal"),
      candidate("root-cause", { commands: [command("failed")] }),
    ];
    const invalid = await judgeCandidates(inputs, {
      runner: async () => ({ winnerId: "not-a-strategy", rationale: "no" }),
    });
    const disqualified = await judgeCandidates(inputs, {
      runner: async () => ({ winnerId: "root-cause", rationale: "no" }),
    });

    expect(invalid.source).toBe("deterministic");
    expect(invalid.winnerId).toBe("minimal");
    expect(disqualified.source).toBe("deterministic");
    expect(disqualified.winnerId).toBe("minimal");
  });
});
