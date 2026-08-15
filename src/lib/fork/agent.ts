import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildAgentPrompt,
  runCodexAgent,
  type CodexAgentOptions,
  type CodexAgentResult,
} from "./codex";
import { runProcess } from "./process";
import type { AgentProvider } from "./types";

export interface AgentOptions extends CodexAgentOptions {
  provider: AgentProvider;
}

export type AgentResult = CodexAgentResult;

export interface AgentPreflight {
  provider: AgentProvider;
  binary: string;
  available: boolean;
  version?: string;
  reason?: string;
}

export const FREEBUFF_AUTOMATION_REASON =
  "Freebuff currently exposes an interactive CLI only. FORK will not script its TUI; choose Codex, OpenCode, or Cursor for unattended parallel execution.";

export function providerBinary(provider: AgentProvider): string {
  if (provider === "codex") return process.env.FORK_CODEX_BIN ?? "codex";
  if (provider === "opencode") return process.env.FORK_OPENCODE_BIN ?? "opencode";
  if (provider === "cursor") return process.env.FORK_CURSOR_BIN ?? "cursor-agent";
  return process.env.FORK_FREEBUFF_BIN ?? "freebuff";
}

export function providerLabel(provider: AgentProvider): string {
  if (provider === "opencode") return "OpenCode";
  if (provider === "cursor") return "Cursor";
  if (provider === "freebuff") return "Freebuff";
  return "Codex";
}

export interface AgentInvocation {
  executable: string;
  args: string[];
  input?: string;
}

export function buildAgentInvocation(options: AgentOptions): AgentInvocation {
  const prompt = buildAgentPrompt(options);
  const executable = providerBinary(options.provider);

  if (options.provider === "opencode") {
    return {
      executable,
      args: [
        "run",
        "--format",
        "json",
        "--auto",
        ...(options.useSupercompress ? [] : ["--pure"]),
        prompt,
      ],
    };
  }

  if (options.provider === "cursor") {
    return {
      executable,
      args: [
        "-p",
        "--force",
        ...(options.supercompressMcpReady ? ["--approve-mcps"] : []),
        "--output-format",
        "stream-json",
        "--workspace",
        options.cwd,
        prompt,
      ],
    };
  }

  if (options.provider === "freebuff") {
    throw new Error(FREEBUFF_AUTOMATION_REASON);
  }

  throw new Error(`Codex uses its dedicated invocation path, not buildAgentInvocation().`);
}

function conciseSummary(stdout: string): string | undefined {
  const trimmed = stdout.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(-4_000);
}

async function closeStream(stream: ReturnType<typeof createWriteStream>): Promise<void> {
  await new Promise<void>((resolve) => stream.end(resolve));
}

async function runGenericAgent(options: AgentOptions): Promise<AgentResult> {
  await mkdir(options.runDirectory, { recursive: true });
  const jsonlPath = path.join(options.runDirectory, "agent.jsonl");
  const summaryPath = path.join(options.runDirectory, "agent-summary.txt");
  const stream = createWriteStream(jsonlPath, { flags: "w" });
  const invocation = buildAgentInvocation(options);
  const result = await runProcess(invocation.executable, invocation.args, {
    cwd: options.cwd,
    input: invocation.input,
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
        // Preserve formatted provider output as a raw progress line.
      }
      options.onJsonLine?.(line, event);
    },
    onStderrLine(line) {
      const wrapped = JSON.stringify({ type: "stderr", message: line });
      stream.write(`${wrapped}\n`);
      options.onJsonLine?.(wrapped, { type: "stderr", message: line });
    },
  });
  await closeStream(stream);

  const summary = conciseSummary(result.stdout);
  if (summary) await writeFile(summaryPath, `${summary}\n`, "utf8");
  return {
    exitCode: result.exitCode,
    runtimeMs: result.runtimeMs,
    timedOut: result.timedOut,
    summary,
    stderr: result.stderr,
    error: result.spawnError,
  };
}

export async function preflightAgentProvider(
  provider: AgentProvider,
  cwd: string,
): Promise<AgentPreflight> {
  const binary = providerBinary(provider);
  if (provider === "freebuff") {
    return { provider, binary, available: false, reason: FREEBUFF_AUTOMATION_REASON };
  }
  const result = await runProcess(binary, ["--version"], {
    cwd,
    timeoutMs: 10_000,
    maxCaptureChars: 4_000,
  });
  const version = (result.stdout || result.stderr).trim().split(/\r?\n/).at(-1);
  if (result.exitCode !== 0) {
    return {
      provider,
      binary,
      available: false,
      reason: result.spawnError ?? result.stderr.trim() ?? `${providerLabel(provider)} CLI is unavailable.`,
    };
  }
  return { provider, binary, available: true, version };
}

export async function runAgent(options: AgentOptions): Promise<AgentResult> {
  if (options.provider === "codex") {
    return runCodexAgent({ ...options, binary: providerBinary("codex") });
  }
  return runGenericAgent(options);
}
