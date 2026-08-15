import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { runProcess } from "./process";
import type { StrategyId } from "./types";

export interface CodexAgentOptions {
  cwd: string;
  task: string;
  strategyId: StrategyId;
  strategyLabel: string;
  strategyInstruction: string;
  timeoutMs: number;
  runDirectory: string;
  onJsonLine?: (line: string, event?: Record<string, unknown>) => void;
}

export interface CodexAgentResult {
  exitCode: number | null;
  runtimeMs: number;
  timedOut: boolean;
  summary?: string;
  stderr: string;
  error?: string;
}

function buildPrompt(options: CodexAgentOptions): string {
  return [
    "You are one candidate in a parallel implementation run.",
    `Candidate strategy: ${options.strategyLabel} (${options.strategyId}).`,
    `Strategy instruction: ${options.strategyInstruction}`,
    "",
    "Implement the following task in the current worktree:",
    options.task,
    "",
    "Work autonomously and make the implementation complete. Read and obey repository instructions.",
    "Only change files needed for the task. Run focused verification when practical.",
    "Do not create branches, commit, push, open pull requests, or modify another worktree.",
    "Finish with a concise summary of changes and verification.",
  ].join("\n");
}

async function closeStream(stream: ReturnType<typeof createWriteStream>): Promise<void> {
  await new Promise<void>((resolve) => stream.end(resolve));
}

export async function runCodexAgent(options: CodexAgentOptions): Promise<CodexAgentResult> {
  await mkdir(options.runDirectory, { recursive: true });
  const jsonlPath = path.join(options.runDirectory, "agent.jsonl");
  const summaryPath = path.join(options.runDirectory, "agent-summary.txt");
  const stream = createWriteStream(jsonlPath, { flags: "w" });

  const result = await runProcess(
    "codex",
    [
      "exec",
      "--ignore-user-config",
      "--json",
      "--color",
      "never",
      "--sandbox",
      "workspace-write",
      "-c",
      'approval_policy="never"',
      "--output-last-message",
      summaryPath,
      "-C",
      options.cwd,
      "-",
    ],
    {
      cwd: options.cwd,
      input: buildPrompt(options),
      timeoutMs: options.timeoutMs,
      onStdoutLine(line) {
        stream.write(`${line}\n`);
        let event: Record<string, unknown> | undefined;
        try {
          const parsed: unknown = JSON.parse(line);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            event = parsed as Record<string, unknown>;
          }
        } catch {
          // Preserve malformed/non-JSON output as a raw progress line.
        }
        options.onJsonLine?.(line, event);
      },
      onStderrLine(line) {
        const wrapped = JSON.stringify({ type: "stderr", message: line });
        stream.write(`${wrapped}\n`);
        options.onJsonLine?.(wrapped, { type: "stderr", message: line });
      },
    },
  );
  await closeStream(stream);

  let summary: string | undefined;
  try {
    summary = (await readFile(summaryPath, "utf8")).trim() || undefined;
  } catch {
    // Codex can exit before producing a final message.
  }

  return {
    exitCode: result.exitCode,
    runtimeMs: result.runtimeMs,
    timedOut: result.timedOut,
    summary,
    stderr: result.stderr,
    error: result.spawnError,
  };
}
