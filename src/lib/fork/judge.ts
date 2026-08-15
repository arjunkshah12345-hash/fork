import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { z } from "zod";

import { MAX_CAPTURE_CHARS } from "./constants";
import { scoreCandidates } from "./evaluator";
import { STRATEGIES, type CandidateResult, type JudgeDecision, type StrategyId } from "./types";

const DEFAULT_JUDGE_TIMEOUT_MS = 60 * 1000;
const MAX_JUDGE_OUTPUT_BYTES = 1024 * 1024;
const MAX_DIFF_CHARS_PER_CANDIDATE = Math.floor(MAX_CAPTURE_CHARS / STRATEGIES.length);

export const JudgeOutputSchema = z
  .object({
    winnerId: z.enum(["minimal", "root-cause", "architecture"]),
    rationale: z.string().min(1).max(2_000),
  })
  .strict();

export type JudgeOutput = z.infer<typeof JudgeOutputSchema>;

export const CODEX_JUDGE_JSON_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    winnerId: {
      type: "string",
      enum: STRATEGIES.map((strategy) => strategy.id),
    },
    rationale: { type: "string", minLength: 1, maxLength: 2_000 },
  },
  required: ["winnerId", "rationale"],
  additionalProperties: false,
} as const);

export interface CodexJudgeInvocation {
  prompt: string;
  cwd: string;
  timeoutMs: number;
  schema: typeof CODEX_JUDGE_JSON_SCHEMA;
}

export type CodexJudgeRunner = (
  invocation: CodexJudgeInvocation,
) => Promise<unknown>;

export interface JudgeCandidatesOptions {
  task?: string;
  cwd?: string;
  timeoutMs?: number;
  codexBinary?: string;
  runner?: CodexJudgeRunner;
}

function strategyRank(id: StrategyId): number {
  const rank = STRATEGIES.findIndex((strategy) => strategy.id === id);
  return rank < 0 ? Number.MAX_SAFE_INTEGER : rank;
}

function compareCandidates(left: CandidateResult, right: CandidateResult): number {
  const leftScore = left.score!;
  const rightScore = right.score!;

  if (leftScore.disqualified !== rightScore.disqualified) {
    return leftScore.disqualified ? 1 : -1;
  }

  for (const key of ["total", "tests", "review", "simplicity", "speed"] as const) {
    const difference = rightScore[key] - leftScore[key];
    if (difference !== 0) return difference;
  }

  return strategyRank(left.id) - strategyRank(right.id);
}

function ensureScores(candidates: readonly CandidateResult[]): CandidateResult[] {
  if (candidates.every((candidate) => candidate.score !== undefined)) {
    return [...candidates] as CandidateResult[];
  }
  return scoreCandidates(candidates);
}

/** Stable fallback: qualification, total, component scores, then strategy order. */
export function deterministicJudge(
  candidates: readonly CandidateResult[],
): JudgeDecision {
  if (candidates.length === 0) {
    throw new Error("Cannot judge an empty candidate set");
  }

  const ranked = ensureScores(candidates).sort(compareCandidates);
  const winner = ranked[0];
  return {
    winnerId: winner.id,
    rationale: winner.score!.disqualified
      ? `All candidates failed at least one required command; ${winner.label} had the highest deterministic score (${winner.score!.total}).`
      : `${winner.label} had the highest deterministic weighted score (${winner.score!.total}).`,
    source: "deterministic",
  };
}

function candidateForPrompt(candidate: CandidateResult): object {
  return {
    id: candidate.id,
    strategy: candidate.label,
    status: candidate.status,
    runtimeMs: candidate.runtimeMs,
    score: candidate.score,
    commands: candidate.commands.map((command) => ({
      name: command.name,
      required: command.required,
      status: command.status,
      exitCode: command.exitCode,
      runtimeMs: command.runtimeMs,
      stderr: command.stderr.slice(-2_000),
    })),
    diffStats: candidate.diffStats,
    findings: candidate.findings,
    diff: candidate.diff.slice(0, MAX_DIFF_CHARS_PER_CANDIDATE),
  };
}

export function buildJudgePrompt(
  candidates: readonly CandidateResult[],
  task?: string,
): string {
  return [
    "Select the best implementation candidate for the task below.",
    "The deterministic score weights are required tests/build/lint 50%, correctness review 30%, diff simplicity 10%, and relative execution speed 10%.",
    "Treat any candidate with disqualified=true as ineligible when at least one qualified candidate exists.",
    "Use the supplied evidence to check correctness and break close calls. Return only the required JSON object.",
    task ? `Task:\n${task}` : "Task: not supplied; judge the implementation evidence.",
    `Candidates:\n${JSON.stringify(candidates.map(candidateForPrompt), null, 2)}`,
  ].join("\n\n");
}

function execCodex(
  binary: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      binary,
      args,
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: MAX_JUDGE_OUTPUT_BYTES,
        windowsHide: true,
      },
      (error) => {
        if (error) reject(error);
        else resolve();
      },
    );
  });
}

async function defaultCodexJudgeRunner(
  invocation: CodexJudgeInvocation,
  binary = "codex",
): Promise<unknown> {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "fork-judge-"));
  const schemaPath = path.join(temporaryDirectory, "schema.json");
  const outputPath = path.join(temporaryDirectory, "result.json");

  try {
    await writeFile(schemaPath, JSON.stringify(invocation.schema), "utf8");
    await execCodex(
      binary,
      [
        "exec",
        "--ignore-user-config",
        "--ephemeral",
        "--sandbox",
        "read-only",
        "--skip-git-repo-check",
        "--output-schema",
        schemaPath,
        "--output-last-message",
        outputPath,
        invocation.prompt,
      ],
      invocation.cwd,
      invocation.timeoutMs,
    );
    return await readFile(outputPath, "utf8");
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

function parseJudgeOutput(value: unknown): JudgeOutput | undefined {
  if (typeof value !== "string") {
    const parsed = JudgeOutputSchema.safeParse(value);
    return parsed.success ? parsed.data : undefined;
  }

  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed = JudgeOutputSchema.safeParse(JSON.parse(trimmed));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function isEligibleWinner(
  winnerId: StrategyId,
  candidates: readonly CandidateResult[],
): boolean {
  const winner = candidates.find((candidate) => candidate.id === winnerId);
  if (!winner) return false;
  const hasQualifiedCandidate = candidates.some(
    (candidate) => !candidate.score!.disqualified,
  );
  return !hasQualifiedCandidate || !winner.score!.disqualified;
}

/**
 * Ask Codex for a schema-constrained final decision. Invalid output, process
 * failure, or an ineligible selection falls back to the stable local ranking.
 */
export async function judgeCandidates(
  candidates: readonly CandidateResult[],
  options: JudgeCandidatesOptions = {},
): Promise<JudgeDecision> {
  if (candidates.length === 0) {
    throw new Error("Cannot judge an empty candidate set");
  }

  const scored = ensureScores(candidates);
  const fallback = deterministicJudge(scored);
  const invocation: CodexJudgeInvocation = {
    prompt: buildJudgePrompt(scored, options.task),
    cwd: options.cwd ?? process.cwd(),
    timeoutMs: options.timeoutMs ?? DEFAULT_JUDGE_TIMEOUT_MS,
    schema: CODEX_JUDGE_JSON_SCHEMA,
  };

  try {
    const raw = options.runner
      ? await options.runner(invocation)
      : await defaultCodexJudgeRunner(invocation, options.codexBinary);
    const decision = parseJudgeOutput(raw);
    if (!decision || !isEligibleWinner(decision.winnerId, scored)) return fallback;
    return { ...decision, source: "codex" };
  } catch {
    return fallback;
  }
}
