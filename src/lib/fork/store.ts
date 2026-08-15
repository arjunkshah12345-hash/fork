import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { FORK_RUNTIME_ROOT, MAX_LOG_LINES } from "./constants";
import { STRATEGIES } from "./types";
import type { CandidateResult, ForkEvent, ForkRun, RunRequest, StrategyId } from "./types";

export type ForkEventListener = (event: ForkEvent) => void;

interface StoreState {
  runs: Map<string, ForkRun>;
  listeners: Map<string, Set<ForkEventListener>>;
  allListeners: Set<ForkEventListener>;
  writeChains: Map<string, Promise<void>>;
}

const storeKey = Symbol.for("fork.run-store");
const globalStore = globalThis as typeof globalThis & { [storeKey]?: StoreState };
const state: StoreState =
  globalStore[storeKey] ??
  (globalStore[storeKey] = {
    runs: new Map(),
    listeners: new Map(),
    allListeners: new Set(),
    writeChains: new Map(),
  });

function cloneRun(run: ForkRun): ForkRun {
  return structuredClone(run);
}

function emit(event: ForkEvent) {
  const runId = event.type === "run.updated" ? event.run.id : event.runId;
  for (const listener of [...(state.listeners.get(runId) ?? []), ...state.allListeners]) {
    try {
      listener(event.type === "run.updated" ? { ...event, run: cloneRun(event.run) } : event);
    } catch {
      // Subscriber failures are isolated from execution and other subscribers.
    }
  }
}

function runFile(run: ForkRun): string {
  return path.join(run.runRoot, "run.json");
}

function safeRunId(id: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(id);
}

async function persist(run: ForkRun): Promise<void> {
  const snapshot = cloneRun(run);
  const previous = state.writeChains.get(run.id) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      await mkdir(snapshot.runRoot, { recursive: true });
      const target = runFile(snapshot);
      const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
      await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
      await rename(temporary, target);
    });
  state.writeChains.set(run.id, next);
  await next;
  if (state.writeChains.get(run.id) === next) state.writeChains.delete(run.id);
}

function initialCandidate(strategy: (typeof STRATEGIES)[number], runRoot: string): CandidateResult {
  return {
    id: strategy.id,
    label: strategy.label,
    description: strategy.description,
    branch: "",
    worktreePath: path.join(runRoot, "worktrees", strategy.id),
    status: "queued",
    runtimeMs: 0,
    agentExitCode: null,
    logs: [],
    commands: [],
    diff: "",
    diffStats: { filesChanged: 0, additions: 0, deletions: 0, files: [] },
    findings: [],
  };
}

export async function createRun(request: RunRequest): Promise<ForkRun> {
  const id = `run-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const runRoot = path.join(FORK_RUNTIME_ROOT, id);
  const run: ForkRun = {
    id,
    status: "queued",
    request: structuredClone(request),
    runRoot,
    createdAt: new Date().toISOString(),
    candidates: STRATEGIES.map((strategy) => initialCandidate(strategy, runRoot)),
  };
  state.runs.set(id, run);
  await persist(run);
  emit({ type: "run.updated", run });
  return cloneRun(run);
}

export async function getRun(id: string): Promise<ForkRun | undefined> {
  const cached = state.runs.get(id);
  if (cached) return cloneRun(cached);
  if (!safeRunId(id)) return undefined;
  try {
    const parsed = JSON.parse(
      await readFile(path.join(FORK_RUNTIME_ROOT, id, "run.json"), "utf8"),
    ) as ForkRun;
    if (parsed.id !== id) return undefined;
    state.runs.set(id, parsed);
    return cloneRun(parsed);
  } catch {
    return undefined;
  }
}

export async function listRuns(): Promise<ForkRun[]> {
  await mkdir(FORK_RUNTIME_ROOT, { recursive: true });
  const ids = await readdir(FORK_RUNTIME_ROOT);
  const runs = await Promise.all(ids.filter(safeRunId).map((id) => getRun(id)));
  return runs
    .filter((run): run is ForkRun => Boolean(run))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function updateRun(
  id: string,
  update: (run: ForkRun) => void,
): Promise<ForkRun> {
  if (!state.runs.has(id)) await getRun(id);
  const run = state.runs.get(id);
  if (!run) throw new Error(`Unknown run: ${id}`);
  update(run);
  await persist(run);
  emit({ type: "run.updated", run });
  return cloneRun(run);
}

export function appendCandidateLog(id: string, candidateId: StrategyId, line: string): void {
  const run = state.runs.get(id);
  const candidate = run?.candidates.find((item) => item.id === candidateId);
  if (candidate) {
    candidate.logs.push(line);
    if (candidate.logs.length > MAX_LOG_LINES) {
      candidate.logs.splice(0, candidate.logs.length - MAX_LOG_LINES);
    }
  }
  emit({ type: "candidate.log", runId: id, candidateId, line });
}

export function emitHeartbeat(id: string): void {
  emit({ type: "heartbeat", runId: id, at: new Date().toISOString() });
}

export function subscribeRun(id: string, listener: ForkEventListener): () => void {
  const listeners = state.listeners.get(id) ?? new Set<ForkEventListener>();
  listeners.add(listener);
  state.listeners.set(id, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) state.listeners.delete(id);
  };
}

export function subscribeRuns(listener: ForkEventListener): () => void {
  state.allListeners.add(listener);
  return () => state.allListeners.delete(listener);
}
