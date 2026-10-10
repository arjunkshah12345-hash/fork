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
export const AGENT_PROVIDERS = [
  {
    id: "codex",
    label: "Codex",
    description: "OpenAI Codex CLI",
    automation: "headless",
  },
  {
    id: "opencode",
    label: "OpenCode",
    description: "Open-source agent runtime",
    automation: "headless",
  },
  {
    id: "cursor",
    label: "Cursor",
    description: "Cursor Agent CLI",
    automation: "headless",
  },
  {
    id: "nemotron",
    label: "Nemotron",
    description: "NVIDIA Nemotron on Nebius Token Factory",
    automation: "headless",
  },
  {
    id: "freebuff",
    label: "Freebuff",
    description: "Interactive Freebuff CLI",
    automation: "interactive",
  },
] as const;

export type AgentProvider = (typeof AGENT_PROVIDERS)[number]["id"];
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
  agentProvider?: AgentProvider;
  useSupercompress?: boolean;
  baseBranch?: string;
  commands?: CommandSpec[];
  setupCommand?: string;
  agentTimeoutMs?: number;
  commandTimeoutMs?: number;
  useGreptile?: boolean;
  /** Ground candidates in Tavily web research before they start (needs TAVILY_API_KEY). */
  useResearch?: boolean;
  strategyInstructions?: Partial<Record<StrategyId, string>>;
}

export interface SupercompressRunState {
  enabled: boolean;
  status: "pending" | "compressed" | "unavailable" | "disabled";
  mode?: "local" | "hosted";
  originalTokens?: number;
  keptTokens?: number;
  tokensSaved?: number;
  tokensSavedPct?: number;
  mcpReady?: boolean;
  detail?: string;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  query: string;
}

export interface ResearchState {
  status: "pending" | "ready" | "unavailable" | "disabled";
  /** Who wrote the search queries: a Nemotron model, or the task's first line. */
  planner?: string;
  queries?: string[];
  sources?: ResearchSource[];
  /** The text every candidate receives. */
  brief?: string;
  runtimeMs?: number;
  detail?: string;
}

/** Where candidate inference ran, recorded for the run page. */
export interface InferenceInfo {
  provider: "nebius-token-factory";
  /** "mock" is a scripted stand-in for offline demos and tests; no model is called. */
  mode: "live" | "mock";
  models: Record<"nano" | "super" | "ultra", string>;
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
  /** The model that produced this candidate (Nemotron runtime only). */
  model?: string;
  /** Token usage reported by the inference API (Nemotron runtime only). */
  usage?: { prompt: number; completion: number };
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
  source: "codex" | "nemotron" | "deterministic";
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
  supercompress?: SupercompressRunState;
  research?: ResearchState;
  inference?: InferenceInfo;
  error?: string;
  prUrl?: string;
}

export type ForkEvent =
  | { type: "run.updated"; run: ForkRun }
  | { type: "candidate.log"; runId: string; candidateId: StrategyId; line: string }
  | { type: "heartbeat"; runId: string; at: string };
