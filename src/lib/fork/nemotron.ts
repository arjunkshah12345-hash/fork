// NVIDIA Nemotron on Nebius Token Factory, as a native FORK agent.
//
// Each candidate strategy runs on the Nemotron model that fits it: the
// minimal patch on Nano (fast, cheap), the root-cause fix on Super, and the
// architecture-first rewrite on Ultra (deepest reasoning). The agent works
// inside its own git worktree through a small tool set: list, read, write,
// replace, run a command, finish. Every step is logged to agent.jsonl, the
// same stream the dashboard already renders for the CLI providers.

import { createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildAgentPrompt, type CodexAgentOptions, type CodexAgentResult } from "./codex";
import { runProcess } from "./process";
import type { StrategyId } from "./types";

const DEFAULT_BASE_URL = "https://api.tokenfactory.nebius.com/v1";
const MAX_STEPS = Number(process.env.FORK_NEMOTRON_MAX_STEPS ?? 40);
const MAX_TOOL_OUTPUT = 12_000;
const COMMAND_TIMEOUT_MS = 3 * 60 * 1000;

export type NemotronTier = "nano" | "super" | "ultra";

export const STRATEGY_TIER: Record<StrategyId, NemotronTier> = {
  minimal: "nano",
  "root-cause": "super",
  architecture: "ultra",
};

const TIER_PATTERN: Record<NemotronTier, RegExp> = {
  nano: /nemotron-3-nano(?!-omni)/i,
  super: /nemotron-3-super/i,
  ultra: /nemotron-3-ultra/i,
};

const TIER_FALLBACK: Record<NemotronTier, string> = {
  nano: "nvidia/nemotron-3-nano-30b-a3b",
  super: "nvidia/nemotron-3-super-120b-a12b",
  ultra: "nvidia/nemotron-3-ultra-550b-a55b",
};

export function nebiusConfig() {
  return {
    apiKey: process.env.NEBIUS_API_KEY ?? "",
    baseUrl: (process.env.NEBIUS_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
  };
}

// ---- model resolution ---------------------------------------------------------

let resolvedModels: Promise<Record<NemotronTier, string>> | null = null;

/** Picks the exact Nemotron model IDs this Token Factory account serves. */
export function resolveNemotronModels(fetchImpl: typeof fetch = fetch): Promise<Record<NemotronTier, string>> {
  resolvedModels ??= (async () => {
    const override = (tier: NemotronTier) => process.env[`FORK_NEMOTRON_${tier.toUpperCase()}_MODEL`];
    let available: string[] = [];
    try {
      const { apiKey, baseUrl } = nebiusConfig();
      const res = await fetchImpl(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (res.ok) {
        const body = (await res.json()) as { data?: { id: string }[] };
        available = (body.data ?? []).map((m) => m.id);
      }
    } catch {
      // Fall back to the documented IDs; a wrong ID surfaces as a clear API error.
    }
    const pick = (tier: NemotronTier) =>
      override(tier) ??
      available.filter((id) => TIER_PATTERN[tier].test(id)).sort((a, b) => a.length - b.length)[0] ??
      TIER_FALLBACK[tier];
    return { nano: pick("nano"), super: pick("super"), ultra: pick("ultra") };
  })();
  return resolvedModels;
}

export function resetNemotronModelCache(): void {
  resolvedModels = null;
}

// ---- chat completions -------------------------------------------------------------

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

type Message =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

interface Completion {
  choices: { message: { content: string | null; tool_calls?: ToolCall[] }; finish_reason: string }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export async function chatCompletion(
  body: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<Completion> {
  const { apiKey, baseUrl } = nebiusConfig();
  for (let attempt = 0; ; attempt++) {
    const res = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return (await res.json()) as Completion;
    const text = await res.text();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= 3) {
      throw new Error(`Nebius Token Factory ${res.status}: ${text.slice(0, 500)}`);
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
}

// ---- tools --------------------------------------------------------------------------

const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files under a directory of the repository (recursive, skips .git and node_modules).",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "Directory relative to the repo root. Use '.' for the root." } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a text file from the repository.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a file with the full new contents.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "replace_in_file",
      description: "Replace one exact occurrence of `old` with `new` in a file. `old` must appear exactly once.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, old: { type: "string" }, new: { type: "string" } },
        required: ["path", "old", "new"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Run a shell command in the repository root (for tests, builds, grep). Returns exit code and output.",
      parameters: {
        type: "object",
        properties: { command: { type: "string" } },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finish",
      description: "Call when the implementation is complete. Summarize what changed and how it was verified.",
      parameters: {
        type: "object",
        properties: { summary: { type: "string" } },
        required: ["summary"],
      },
    },
  },
] as const;

/** Resolves a model-supplied path inside the worktree, refusing anything outside it. */
export function insideWorktree(root: string, relative: string): string {
  const resolved = path.resolve(root, relative);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new Error(`path escapes the worktree: ${relative}`);
  }
  if (resolved.split(path.sep).includes(".git")) throw new Error("the .git directory is off limits");
  return resolved;
}

const clip = (text: string) =>
  text.length <= MAX_TOOL_OUTPUT ? text : `${text.slice(0, MAX_TOOL_OUTPUT)}\n[truncated ${text.length - MAX_TOOL_OUTPUT} characters]`;

async function listFiles(root: string, dir: string): Promise<string> {
  const out: string[] = [];
  async function walk(abs: string) {
    for (const entry of await readdir(abs, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules" || entry.name === ".fork") continue;
      const child = path.join(abs, entry.name);
      if (entry.isDirectory()) await walk(child);
      else out.push(path.relative(root, child));
      if (out.length > 2_000) return;
    }
  }
  await walk(insideWorktree(root, dir));
  return out.sort().join("\n") || "(empty)";
}

export async function executeTool(root: string, name: string, args: Record<string, string>): Promise<string> {
  switch (name) {
    case "list_files":
      return clip(await listFiles(root, args.path || "."));
    case "read_file": {
      const file = insideWorktree(root, args.path);
      if ((await stat(file)).size > 400_000) return "file is too large to read in full";
      return clip(await readFile(file, "utf8"));
    }
    case "write_file": {
      const file = insideWorktree(root, args.path);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, args.content, "utf8");
      return `wrote ${args.path} (${args.content.length} chars)`;
    }
    case "replace_in_file": {
      const file = insideWorktree(root, args.path);
      const current = await readFile(file, "utf8");
      const count = current.split(args.old).length - 1;
      if (count !== 1) return `error: expected exactly one match for \`old\`, found ${count}`;
      await writeFile(file, current.replace(args.old, () => args.new), "utf8");
      return `updated ${args.path}`;
    }
    case "run_command": {
      const result = await runProcess("bash", ["-lc", args.command], {
        cwd: root,
        timeoutMs: COMMAND_TIMEOUT_MS,
        maxCaptureChars: MAX_TOOL_OUTPUT,
      });
      return clip(
        `exit ${result.timedOut ? "timeout" : result.exitCode}\n${result.stdout}${result.stderr ? `\n[stderr]\n${result.stderr}` : ""}`,
      );
    }
    default:
      return `error: unknown tool ${name}`;
  }
}

// ---- the agent loop ------------------------------------------------------------------

export interface NemotronAgentOptions extends CodexAgentOptions {
  fetchImpl?: typeof fetch;
}

export async function runNemotronAgent(options: NemotronAgentOptions): Promise<CodexAgentResult> {
  const started = Date.now();
  await mkdir(options.runDirectory, { recursive: true });
  const stream = createWriteStream(path.join(options.runDirectory, "agent.jsonl"), { flags: "w" });
  const emit = (event: Record<string, unknown>) => {
    const line = JSON.stringify(event);
    stream.write(`${line}\n`);
    options.onJsonLine?.(line, event);
  };

  const tier = STRATEGY_TIER[options.strategyId];
  const model = (await resolveNemotronModels(options.fetchImpl))[tier];
  emit({ type: "nemotron.start", model, tier, strategy: options.strategyId });

  const messages: Message[] = [
    {
      role: "system",
      content:
        "You are a careful software engineer working inside a git worktree. Use the tools to inspect the repository, " +
        "make the change, and verify it by running the repository's tests or checks. Paths are relative to the repo root. " +
        "Prefer replace_in_file for small edits. When done, call finish with a short summary.",
    },
    { role: "user", content: buildAgentPrompt(options) },
  ];

  let summary: string | undefined;
  let error: string | undefined;
  let timedOut = false;
  const usage = { prompt: 0, completion: 0 };

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      if (Date.now() - started > options.timeoutMs) {
        timedOut = true;
        break;
      }
      const completion = await chatCompletion(
        { model, messages, tools: TOOLS, tool_choice: "auto", temperature: 0.2, max_tokens: 8_192 },
        options.fetchImpl,
      );
      usage.prompt += completion.usage?.prompt_tokens ?? 0;
      usage.completion += completion.usage?.completion_tokens ?? 0;
      const message = completion.choices[0]?.message;
      if (!message) throw new Error("Nebius returned no choices");
      messages.push({ role: "assistant", content: message.content ?? null, tool_calls: message.tool_calls });
      if (message.content) emit({ type: "nemotron.message", text: message.content.slice(0, 2_000) });

      if (!message.tool_calls?.length) {
        summary = message.content?.trim() || "Finished without a summary.";
        break;
      }
      for (const call of message.tool_calls) {
        let args: Record<string, string>;
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          messages.push({ role: "tool", tool_call_id: call.id, content: "error: arguments were not valid JSON" });
          continue;
        }
        if (call.function.name === "finish") {
          summary = args.summary;
          messages.push({ role: "tool", tool_call_id: call.id, content: "ok" });
          continue;
        }
        emit({ type: "nemotron.tool", name: call.function.name, args: describeArgs(args) });
        let output: string;
        try {
          output = await executeTool(options.cwd, call.function.name, args);
        } catch (e) {
          output = `error: ${(e as Error).message}`;
        }
        emit({ type: "nemotron.tool_result", name: call.function.name, output: output.slice(0, 600) });
        messages.push({ role: "tool", tool_call_id: call.id, content: output });
      }
      if (summary) break;
    }
    if (!summary && !timedOut) error = `stopped after ${MAX_STEPS} steps without finishing`;
  } catch (e) {
    error = (e as Error).message;
    emit({ type: "nemotron.error", message: error });
  }

  emit({ type: "nemotron.done", model, usage, steps: messages.filter((m) => m.role === "assistant").length });
  await new Promise<void>((resolve) => stream.end(resolve));
  if (summary) await writeFile(path.join(options.runDirectory, "agent-summary.txt"), `${summary}\n`, "utf8");

  return {
    exitCode: error || timedOut ? 1 : 0,
    runtimeMs: Date.now() - started,
    timedOut,
    summary,
    stderr: error ?? "",
    error,
  };
}

function describeArgs(args: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(args)) out[k] = typeof v === "string" && v.length > 160 ? `${v.slice(0, 160)}…` : v;
  return out;
}

export async function preflightNemotron(fetchImpl: typeof fetch = fetch): Promise<{ available: boolean; version?: string; reason?: string }> {
  if (!nebiusConfig().apiKey) return { available: false, reason: "Set NEBIUS_API_KEY to run candidates on Nebius Token Factory." };
  const models = await resolveNemotronModels(fetchImpl);
  return { available: true, version: `${models.nano} · ${models.super} · ${models.ultra}` };
}

// ---- the judge ------------------------------------------------------------------------

/** Nemotron Ultra reads the scored candidates and picks the one to ship. */
export async function nemotronJudgeRunner(
  invocation: { prompt: string; schema: unknown },
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const { ultra } = await resolveNemotronModels(fetchImpl);
  const completion = await chatCompletion(
    {
      model: ultra,
      temperature: 0,
      max_tokens: 4_096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Answer with one JSON object matching this JSON Schema, and nothing else:\n${JSON.stringify(invocation.schema)}`,
        },
        { role: "user", content: invocation.prompt },
      ],
    },
    fetchImpl,
  );
  const text = completion.choices[0]?.message.content ?? "";
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(json);
}
