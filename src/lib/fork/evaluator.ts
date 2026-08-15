import type {
  CandidateResult,
  CandidateScore,
  CommandResult,
  DiffStats,
  ReviewFinding,
} from "./types";
import {
  runGreptileReview,
  type CliRunner,
  type GreptileReviewResult,
} from "./greptile";

export const EVALUATION_WEIGHTS = Object.freeze({
  tests: 0.5,
  review: 0.3,
  simplicity: 0.1,
  speed: 0.1,
});

const REVIEW_PENALTIES: Readonly<Record<ReviewFinding["severity"], number>> = {
  error: 45,
  warning: 18,
  info: 4,
};

export interface TestScore {
  score: number;
  disqualified: boolean;
}

export interface EvaluateCandidatesOptions {
  useGreptile?: boolean;
  greptileTimeoutMs?: number;
  greptileBinary?: string;
  greptileRunner?: CliRunner;
  onGreptileResult?: (
    candidate: CandidateResult,
    result: GreptileReviewResult,
  ) => void | Promise<void>;
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, score));
}

function roundScore(score: number): number {
  return Math.round((score + Number.EPSILON) * 100) / 100;
}

/**
 * Required commands are an all-or-nothing gate: one failure, timeout, or skip
 * zeros the verification component and disqualifies the candidate. Optional
 * command failures are intentionally excluded from this component.
 */
export function calculateTestScore(commands: CommandResult[]): TestScore {
  const required = commands.filter((command) => command.required);
  if (required.length === 0) return { score: 100, disqualified: false };

  const failed = required.some((command) => command.status !== "passed");
  return failed
    ? { score: 0, disqualified: true }
    : { score: 100, disqualified: false };
}

/** Score correctness findings with deterministic, severity-weighted deductions. */
export function calculateReviewScore(findings: ReviewFinding[]): number {
  const penalty = findings.reduce(
    (total, finding) => total + REVIEW_PENALTIES[finding.severity],
    0,
  );
  return roundScore(clampScore(100 - penalty));
}

/**
 * Prefer narrow diffs. Each touched file costs five points and each changed line
 * costs 0.2 points; the bounded score stays interpretable across repositories.
 */
export function calculateSimplicityScore(diffStats: DiffStats): number {
  const filesChanged = Math.max(0, diffStats.filesChanged);
  const changedLines = Math.max(0, diffStats.additions) + Math.max(0, diffStats.deletions);
  return roundScore(clampScore(100 - filesChanged * 5 - changedLines * 0.2));
}

/** Fastest positive runtime gets 100; others receive the fastest/runtime ratio. */
export function calculateSpeedScore(
  runtimeMs: number,
  allRuntimesMs: readonly number[],
): number {
  const positiveRuntimes = allRuntimesMs.filter(
    (runtime) => Number.isFinite(runtime) && runtime > 0,
  );
  if (runtimeMs <= 0 || positiveRuntimes.length === 0) return 100;

  const fastest = Math.min(...positiveRuntimes);
  return roundScore(clampScore((fastest / runtimeMs) * 100));
}

export function calculateCandidateScore(
  candidate: CandidateResult,
  allRuntimesMs: readonly number[],
): CandidateScore {
  const testResult = calculateTestScore(candidate.commands);
  const tests = testResult.score;
  const review = calculateReviewScore(candidate.findings);
  const simplicity = calculateSimplicityScore(candidate.diffStats);
  const speed = calculateSpeedScore(candidate.runtimeMs, allRuntimesMs);
  const total = roundScore(
    tests * EVALUATION_WEIGHTS.tests
      + review * EVALUATION_WEIGHTS.review
      + simplicity * EVALUATION_WEIGHTS.simplicity
      + speed * EVALUATION_WEIGHTS.speed,
  );

  return {
    tests,
    review,
    simplicity,
    speed,
    total,
    disqualified: testResult.disqualified,
  };
}

/** Return scored copies without mutating candidate state held by the orchestrator. */
export function scoreCandidates(candidates: readonly CandidateResult[]): CandidateResult[] {
  const runtimes = candidates.map((candidate) => candidate.runtimeMs);
  return candidates.map((candidate) => ({
    ...candidate,
    score: calculateCandidateScore(candidate, runtimes),
  }));
}

function dedupeFindings(findings: ReviewFinding[]): ReviewFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = [
      finding.source,
      finding.severity,
      finding.file ?? "",
      finding.line ?? "",
      finding.title,
      finding.body,
    ].join("\u0000");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Optionally enrich candidates with local Greptile findings, then apply the
 * deterministic weighted score. Missing or failing Greptile never rejects.
 */
export async function evaluateCandidates(
  candidates: readonly CandidateResult[],
  options: EvaluateCandidatesOptions = {},
): Promise<CandidateResult[]> {
  if (!options.useGreptile) return scoreCandidates(candidates);

  const reviewed = await Promise.all(
    candidates.map(async (candidate) => {
      const result = await runGreptileReview({
        enabled: true,
        cwd: candidate.worktreePath,
        ...(options.greptileTimeoutMs
          ? { timeoutMs: options.greptileTimeoutMs }
          : {}),
        ...(options.greptileBinary ? { binary: options.greptileBinary } : {}),
        ...(options.greptileRunner ? { runner: options.greptileRunner } : {}),
      });
      await options.onGreptileResult?.(candidate, result);
      return {
        ...candidate,
        findings: dedupeFindings([...candidate.findings, ...result.findings]),
      };
    }),
  );

  return scoreCandidates(reviewed);
}
