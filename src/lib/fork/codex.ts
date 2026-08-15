import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { runProcess } from "./process";
import type { StrategyId } from "./types";

export interface CodexAgentOptions {
  binary?: string;
  cwd: string;
  task: string;
  strategyId: StrategyId;
  strategyLabel: string;
  strategyInstruction: string;
  timeoutMs: number;
  runDirectory: string;
  useSupercompress?: boolean;
  supercompressMcpReady?: boolean;
  compressedContext?: string;
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

export function buildAgentPrompt(options: CodexAgentOptions): string {
  const prompt = [
    "You are one candidate in a parallel implementation run.",
    `Candidate strategy: ${options.strategyLabel} (${options.strategyId}).`,
    `Strategy instruction: ${options.strategyInstruction}`,
    "",
    "Implement the following task in the current worktree:",
    options.task,
    "",
  ];
  if (options.useSupercompress) {
    prompt.push(
      "SuperCompress is enabled for this run. The shared repository orientation below was compressed before launch to reduce redundant discovery.",
      "",
    );
  }
  if (options.supercompressMcpReady) {
    prompt.push(
      "Before reasoning over large file dumps, logs, diffs, or accumulated tool output, use the SuperCompress MCP compress_context tool with the current task as the query. Pass only new bulky context and reason from the compressed result.",
      "Do not compress or rewrite the engineering task itself.",
      "",
    );
  }
  if (options.compressedContext) {
    prompt.push(
      "Repository orientation prepared by SuperCompress (use it to avoid redundant discovery; verify source files before editing):",
      options.compressedContext,
      "",
    );
  }
  prompt.push(
    "Work autonomously and make the implementation complete. Read and obey repository instructions.",
    "Only change files needed for the task. Run focused verification when practical.",
    "Do not create branches, commit, push, open pull requests, or modify another worktree.",
    "Finish with a concise summary of changes and verification.",
  );
  return prompt.join("\n");
}

async function closeStream(stream: ReturnType<typeof createWriteStream>): Promise<void> {
  await new Promise<void>((resolve) => stream.end(resolve));
}

export async function runCodexAgent(options: CodexAgentOptions): Promise<CodexAgentResult> {
  await mkdir(options.runDirectory, { recursive: true });
  const jsonlPath = path.join(options.runDirectory, "agent.jsonl");
  const summaryPath = path.join(options.runDirectory, "agent-summary.txt");
  const stream = createWriteStream(jsonlPath, { flags: "w" });

  const args = [
      "exec",
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
    ];
  if (!options.useSupercompress) args.splice(1, 0, "--ignore-user-config");

  const result = await runProcess(
    options.binary ?? process.env.FORK_CODEX_BIN ?? "codex",
    args,
    {
      cwd: options.cwd,
      input: buildAgentPrompt(options),
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
