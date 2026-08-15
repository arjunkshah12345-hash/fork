import path from "node:path";

import {
  DEFAULT_AGENT_TIMEOUT_MS,
  DEFAULT_COMMAND_TIMEOUT_MS,
} from "./constants";
import { runCodexAgent } from "./codex";
import { evaluateCandidates } from "./evaluator";
import {
  candidateBranchName,
  createWorktree,
  gatherDiff,
  resolveRepository,
} from "./git";
import { judgeCandidates } from "./judge";
import { detectTestCommands, executeCommand } from "./process";
import {
  appendCandidateLog,
  createRun as createStoredRun,
  emitHeartbeat,
  getRun,
  subscribeRun,
  updateRun,
} from "./store";
import { STRATEGIES } from "./types";
import type {
  CandidateResult,
  CandidateStatus,
  CommandResult,
  ForkEvent,
  ForkRun,
  RunRequest,
  StrategyId,
} from "./types";

export interface RunForkOptions {
  onEvent?: (event: ForkEvent) => void;
}

const activeKey = Symbol.for("fork.active-runs");
const activeGlobal = globalThis as typeof globalThis & {
  [activeKey]?: Map<string, Promise<ForkRun>>;
};
const activeRuns = activeGlobal[activeKey] ?? (activeGlobal[activeKey] = new Map());

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function updateCandidate(
  runId: string,
  candidateId: StrategyId,
  update: (candidate: CandidateResult) => void,
): Promise<ForkRun> {
  return updateRun(runId, (run) => {
    const candidate = run.candidates.find((item) => item.id === candidateId);
    if (!candidate) throw new Error(`Unknown candidate: ${candidateId}`);
    update(candidate);
  });
}

function progressLine(kind: string, detail: Record<string, unknown>): string {
  return JSON.stringify({ type: kind, ...detail });
}

function commandFailed(result: CommandResult): boolean {
  return result.required && result.status !== "passed";
}

async function executeCandidate(
  runId: string,
  candidateId: StrategyId,
  baseCommit: string,
): Promise<void> {
  const run = await getRun(runId);
  const candidate = run?.candidates.find((item) => item.id === candidateId);
  if (!run || !candidate) throw new Error(`Candidate ${candidateId} disappeared`);

  const startedMs = Date.now();
  const errors: string[] = [];
  let finalStatus: CandidateStatus = "complete";
  let agentExitCode: number | null = null;
  let agentSummary: string | undefined;
  const commands: CommandResult[] = [];

  await updateCandidate(runId, candidateId, (current) => {
    current.status = "preparing";
    current.startedAt = new Date(startedMs).toISOString();
  });

  try {
    if (run.request.setupCommand) {
      appendCandidateLog(
        runId,
        candidateId,
        progressLine("command.started", { name: "setup", command: run.request.setupCommand }),
      );
      const setup = await executeCommand(
        { name: "setup", command: run.request.setupCommand, required: true },
        candidate.worktreePath,
        run.request.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS,
        (line) =>
          appendCandidateLog(
            runId,
            candidateId,
            progressLine("command.output", { name: "setup", line }),
          ),
      );
      commands.push(setup);
      await updateCandidate(runId, candidateId, (current) => {
        current.commands = structuredClone(commands);
      });
      if (commandFailed(setup)) {
        finalStatus = setup.status === "timed_out" ? "timed_out" : "failed";
        errors.push(`Setup command ${setup.status}`);
      }
    }

    if (finalStatus === "complete") {
      await updateCandidate(runId, candidateId, (current) => {
        current.status = "coding";
      });
      const strategy = STRATEGIES.find((item) => item.id === candidateId)!;
      const instruction = run.request.strategyInstructions?.[candidateId] ?? strategy.instruction;
      const agent = await runCodexAgent({
        cwd: candidate.worktreePath,
        task: run.request.task,
        strategyId: candidateId,
        strategyLabel: candidate.label,
        strategyInstruction: instruction,
        timeoutMs: run.request.agentTimeoutMs ?? DEFAULT_AGENT_TIMEOUT_MS,
        runDirectory: path.join(run.runRoot, "candidates", candidateId),
        onJsonLine: (line) => appendCandidateLog(runId, candidateId, line),
      });
      agentExitCode = agent.exitCode;
      agentSummary = agent.summary;
      if (agent.timedOut) {
        finalStatus = "timed_out";
        errors.push("Codex agent timed out");
      } else if (agent.exitCode !== 0) {
        finalStatus = "failed";
        errors.push(agent.error ?? agent.stderr.trim() ?? `Codex exited with ${agent.exitCode}`);
      }

      await updateCandidate(runId, candidateId, (current) => {
        current.agentExitCode = agentExitCode;
        current.agentSummary = agentSummary;
        current.status = "testing";
      });

      const testCommands =
        run.request.commands !== undefined
          ? run.request.commands
          : await detectTestCommands(candidate.worktreePath);
      for (const spec of testCommands) {
        appendCandidateLog(
          runId,
          candidateId,
          progressLine("command.started", { name: spec.name, command: spec.command }),
        );
        const result = await executeCommand(
          spec,
          candidate.worktreePath,
          run.request.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS,
          (line) =>
            appendCandidateLog(
              runId,
              candidateId,
              progressLine("command.output", { name: spec.name, line }),
            ),
        );
        commands.push(result);
        if (commandFailed(result) && finalStatus === "complete") {
          finalStatus = result.status === "timed_out" ? "timed_out" : "failed";
          errors.push(`Required command "${spec.name}" ${result.status}`);
        }
        await updateCandidate(runId, candidateId, (current) => {
          current.commands = structuredClone(commands);
        });
      }
    }

    await updateCandidate(runId, candidateId, (current) => {
      current.status = "reviewing";
    });
    const gathered = await gatherDiff(candidate.worktreePath, baseCommit);
    await updateCandidate(runId, candidateId, (current) => {
      current.diff = gathered.diff;
      current.diffStats = gathered.stats;
    });
  } catch (error) {
    finalStatus = "failed";
    errors.push(errorMessage(error));
  }

  const finishedMs = Date.now();
  await updateCandidate(runId, candidateId, (current) => {
    current.status = finalStatus;
    current.finishedAt = new Date(finishedMs).toISOString();
    current.runtimeMs = finishedMs - startedMs;
    current.agentExitCode = agentExitCode;
    current.agentSummary = agentSummary;
    current.commands = structuredClone(commands);
    current.error = errors.length ? errors.join("; ").slice(0, 4_000) : undefined;
  });
}

async function executeRun(runId: string): Promise<ForkRun> {
  const existing = await getRun(runId);
  if (!existing) throw new Error(`Unknown run: ${runId}`);
  if (existing.status === "complete" || existing.status === "failed") return existing;

  const heartbeat = setInterval(() => emitHeartbeat(runId), 15_000);
  heartbeat.unref();
  try {
    await updateRun(runId, (run) => {
      run.status = "preparing";
      run.startedAt ??= new Date().toISOString();
      run.error = undefined;
    });
    const repository = await resolveRepository(
      existing.request.repository,
      existing.request.baseBranch,
      path.join(existing.runRoot, "repository"),
    );
    await updateRun(runId, (run) => {
      run.sourcePath = repository.sourcePath;
      run.baseBranch = repository.baseBranch;
    });

    const prepared: StrategyId[] = [];
    for (const strategy of STRATEGIES) {
      const current = await getRun(runId);
      const candidate = current!.candidates.find((item) => item.id === strategy.id)!;
      const branch = candidateBranchName(runId, strategy.id);
      await updateCandidate(runId, strategy.id, (item) => {
        item.status = "preparing";
        item.branch = branch;
      });
      try {
        await createWorktree({
          sourcePath: repository.sourcePath,
          worktreePath: candidate.worktreePath,
          branch,
          baseCommit: repository.baseCommit,
        });
        prepared.push(strategy.id);
      } catch (error) {
        const now = new Date().toISOString();
        await updateCandidate(runId, strategy.id, (item) => {
          item.status = "failed";
          item.error = errorMessage(error);
          item.startedAt = now;
          item.finishedAt = now;
        });
      }
    }

    if (prepared.length === 0) throw new Error("Failed to prepare all candidate worktrees");
    await updateRun(runId, (run) => {
      run.status = "running";
    });
    await Promise.all(
      prepared.map(async (candidateId) => {
        try {
          await executeCandidate(runId, candidateId, repository.baseCommit);
        } catch (error) {
          const now = new Date().toISOString();
          await updateCandidate(runId, candidateId, (candidate) => {
            candidate.status = "failed";
            candidate.error = errorMessage(error);
            candidate.finishedAt = now;
          });
        }
      }),
    );

    await updateRun(runId, (run) => {
      run.status = "evaluating";
      for (const candidate of run.candidates) {
        if (candidate.status === "complete") candidate.status = "scoring";
      }
    });
    const beforeEvaluation = await getRun(runId);
    const evaluated = await evaluateCandidates(beforeEvaluation!.candidates, {
      useGreptile: beforeEvaluation!.request.useGreptile,
    });
    const eligible = evaluated.filter((candidate) => candidate.status === "scoring");
    const decision = eligible.length
      ? await judgeCandidates(eligible, {
          task: beforeEvaluation!.request.task,
          cwd: repository.sourcePath,
        })
      : undefined;
    return await updateRun(runId, (run) => {
      run.candidates = evaluated.map((candidate) => ({
        ...candidate,
        status: candidate.status === "scoring" ? "complete" : candidate.status,
      }));
      run.judge = decision;
      run.winnerId = decision?.winnerId;
      run.status = run.candidates.some((candidate) => candidate.status === "complete")
        ? "complete"
        : "failed";
      if (run.status === "failed") run.error = "All candidates failed";
      run.finishedAt = new Date().toISOString();
    });
  } catch (error) {
    return await updateRun(runId, (run) => {
      run.status = "failed";
      run.error = errorMessage(error);
      run.finishedAt = new Date().toISOString();
    });
  } finally {
    clearInterval(heartbeat);
  }
}

export const createRun = createStoredRun;

export async function startRun(
  runId: string,
  options: RunForkOptions = {},
): Promise<ForkRun> {
  const unsubscribe = options.onEvent ? subscribeRun(runId, options.onEvent) : undefined;
  let execution = activeRuns.get(runId);
  if (!execution) {
    execution = executeRun(runId).finally(() => activeRuns.delete(runId));
    activeRuns.set(runId, execution);
  }
  try {
    return await execution;
  } finally {
    unsubscribe?.();
  }
}

export async function runFork(
  request: RunRequest,
  options: RunForkOptions = {},
): Promise<ForkRun> {
  const run = await createRun(request);
  if (options.onEvent) {
    try {
      options.onEvent({ type: "run.updated", run });
    } catch {
      // Listener errors are isolated from the run.
    }
  }
  return startRun(run.id, options);
}
