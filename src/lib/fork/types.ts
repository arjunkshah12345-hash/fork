export const STRATEGIES = [
  {
    id: "minimal",
    label: "Minimal patch",
    shortLabel: "MINIMAL",
    description: "Smallest safe change with the narrowest possible diff.",
    instruction:
      "Prefer the smallest correct patch. Preserve the existing design and public API. Avoid unrelated cleanup and new dependencies.",
  },
  {
    id: "root-cause",
    label: "Root-cause fix",
    shortLabel: "ROOT CAUSE",
    description: "Trace the failure to its source and repair the underlying behavior.",
    instruction:
      "Investigate the underlying cause before editing. Fix the source of the bug, cover important edge cases, and add or update focused tests when appropriate.",
  },
  {
    id: "architecture",
    label: "Best architecture",
    shortLabel: "ARCHITECTURE",
    description: "Optimize for clarity, durability, and the surrounding system.",
    instruction:
      "Choose the strongest maintainable solution. Consider neighboring abstractions and future correctness, but keep the implementation proportionate to the task.",
  },
] as const;

export type StrategyId = (typeof STRATEGIES)[number]["id"];
export type RunStatus =
  | "queued"
  | "preparing"
  | "running"
  | "evaluating"
  | "complete"
  | "failed";
export type CandidateStatus =
  | "queued"
  | "preparing"
  | "coding"
  | "testing"
  | "reviewing"
  | "scoring"
  | "complete"
  | "failed"
  | "timed_out";

export interface CommandSpec {
  name: string;
  command: string;
  required?: boolean;
  timeoutMs?: number;
}

export interface RunRequest {
  repository: string;
  task: string;
  baseBranch?: string;
  commands?: CommandSpec[];
  setupCommand?: string;
  agentTimeoutMs?: number;
  commandTimeoutMs?: number;
  useGreptile?: boolean;
  strategyInstructions?: Partial<Record<StrategyId, string>>;
}

export interface CommandResult {
  name: string;
  command: string;
  required: boolean;
  status: "passed" | "failed" | "timed_out" | "skipped";
  exitCode: number | null;
  runtimeMs: number;
  stdout: string;
  stderr: string;
}

export interface DiffStats {
  filesChanged: number;
  additions: number;
  deletions: number;
  files: string[];
}

export interface ReviewFinding {
  severity: "info" | "warning" | "error";
  title: string;
  body: string;
  file?: string;
  line?: number;
  source: "local" | "codex" | "greptile";
}

export interface CandidateScore {
  tests: number;
  review: number;
  simplicity: number;
  speed: number;
  total: number;
  disqualified: boolean;
}

export interface CandidateResult {
  id: StrategyId;
  label: string;
  description: string;
  branch: string;
  worktreePath: string;
  status: CandidateStatus;
  startedAt?: string;
  finishedAt?: string;
  runtimeMs: number;
  agentExitCode: number | null;
  agentSummary?: string;
  error?: string;
  logs: string[];
  commands: CommandResult[];
  diff: string;
  diffStats: DiffStats;
  findings: ReviewFinding[];
  score?: CandidateScore;
}

export interface JudgeDecision {
  winnerId: StrategyId;
  rationale: string;
  source: "codex" | "deterministic";
}

export interface ForkRun {
  id: string;
  status: RunStatus;
  request: RunRequest;
  runRoot: string;
  sourcePath?: string;
  baseBranch?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  candidates: CandidateResult[];
  winnerId?: StrategyId;
  judge?: JudgeDecision;
  error?: string;
  prUrl?: string;
}

export type ForkEvent =
  | { type: "run.updated"; run: ForkRun }
  | { type: "candidate.log"; runId: string; candidateId: StrategyId; line: string }
  | { type: "heartbeat"; runId: string; at: string };
