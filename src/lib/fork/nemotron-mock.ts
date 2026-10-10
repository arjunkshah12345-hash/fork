// A scripted stand-in for Nebius Token Factory, for offline demos and tests.
//
// It speaks the same OpenAI-compatible wire format as Token Factory (GET
// /models, POST /chat/completions with tool calls), so the real agent loop,
// tools, worktrees, checks and scoring all run unchanged. Only the model is
// replaced: each strategy replays a fixed tool-call script for the bundled
// demo task (examples/demo-repo). No model is called, and the run page says
// so. Any other task is refused with a clear error.
//
// Enable with FORK_NEMOTRON_MOCK=1.

import { TIER_FALLBACK } from "./nemotron-models";

type ScriptStep =
  | { say?: string; tool: string; args: Record<string, string> }
  | { say?: string; finish: string };

const INVALID = "windows must contain [start, end] pairs of finite numbers where start < end";

const ROOT_CAUSE_SOURCE = `/**
 * Turn a list of half-open availability windows into a canonical schedule.
 *
 * Each window is a two-item tuple: [startMinute, endMinute].
 */
const INVALID_WINDOWS = "${INVALID}";

export function mergeWindows(windows) {
  if (!Array.isArray(windows)) throw new TypeError(INVALID_WINDOWS);
  for (const window of windows) {
    if (
      !Array.isArray(window) ||
      window.length !== 2 ||
      !window.every(Number.isFinite) ||
      window[0] >= window[1]
    ) {
      throw new TypeError(INVALID_WINDOWS);
    }
  }

  // Copy every tuple so the caller's data is never mutated.
  const sorted = windows
    .map(([start, end]) => [start, end])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];

  for (const current of sorted) {
    const previous = merged.at(-1);
    // Half-open windows that touch ([10, 20] and [20, 30]) merge too.
    if (previous && current[0] <= previous[1]) {
      previous[1] = Math.max(previous[1], current[1]);
    } else {
      merged.push(current);
    }
  }

  return merged;
}
`;

const ARCHITECTURE_SOURCE = `/**
 * Canonicalize half-open availability windows.
 *
 * A window is a [startMinute, endMinute] tuple with finite numbers and
 * start < end. The result is sorted, merges overlapping or touching windows,
 * and is always made of fresh tuples: inputs are never mutated.
 */

export const INVALID_WINDOWS_MESSAGE =
  "${INVALID}";

/** @param {unknown} value */
function isWindow(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] < value[1]
  );
}

/** @param {unknown} windows */
function assertWindows(windows) {
  if (!Array.isArray(windows) || !windows.every(isWindow)) {
    throw new TypeError(INVALID_WINDOWS_MESSAGE);
  }
}

/** Numeric order: start minute, then end minute. */
function compareWindows(a, b) {
  return a[0] - b[0] || a[1] - b[1];
}

/**
 * @param {Array<[number, number]>} windows
 * @returns {Array<[number, number]>}
 */
export function mergeWindows(windows) {
  assertWindows(windows);

  const merged = [];
  for (const [start, end] of [...windows].sort(compareWindows)) {
    const last = merged.at(-1);
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}
`;

export const MOCK_SCRIPTS: Record<"minimal" | "root-cause" | "architecture", ScriptStep[]> = {
  minimal: [
    { say: "Reading the function named in the task.", tool: "read_file", args: { path: "src/merge-windows.js" } },
    {
      say: "The sort is lexicographic. Per the narrow constraint, change only the sort call.",
      tool: "replace_in_file",
      args: {
        path: "src/merge-windows.js",
        old: "const sorted = windows.sort();",
        new: "const sorted = windows.sort((a, b) => a[0] - b[0] || a[1] - b[1]);",
      },
    },
    { tool: "run_command", args: { command: "npm test" } },
    {
      finish:
        "Replaced the default (string) sort with a numeric comparator. Kept to the demo constraint, so touching windows, validation and mutation are not addressed; the visible touching-windows test still fails.",
    },
  ],
  "root-cause": [
    { say: "Starting from the task contract.", tool: "read_file", args: { path: "TASK.md" } },
    { tool: "read_file", args: { path: "src/merge-windows.js" } },
    { tool: "read_file", args: { path: "test/visible.js" } },
    {
      say: "Three root causes: default sort compares strings, `<` misses touching windows, and the function sorts and edits the caller's arrays in place. Rewriting with validation and copies.",
      tool: "write_file",
      args: { path: "src/merge-windows.js", content: ROOT_CAUSE_SOURCE },
    },
    { tool: "run_command", args: { command: "npm test" } },
    {
      finish:
        "Validate input with the exact TypeError message, copy tuples before sorting numerically by start then end, and merge when start <= previous end so touching windows join. npm test passes.",
    },
  ],
  architecture: [
    { say: "Surveying the package first.", tool: "list_files", args: { path: "." } },
    { tool: "read_file", args: { path: "src/merge-windows.js" } },
    {
      say: "Splitting the contract into named pieces: a window predicate, an assertion, and a comparator, so the rules in TASK.md read directly from the code.",
      tool: "write_file",
      args: { path: "src/merge-windows.js", content: ARCHITECTURE_SOURCE },
    },
    { tool: "run_command", args: { command: "npm test" } },
    {
      finish:
        "Restructured mergeWindows around isWindow, assertWindows and compareWindows, with fresh output tuples and touching-window merges. npm test passes.",
    },
  ],
};

interface MockMessage {
  role: string;
  content?: string | null;
}

function strategyFrom(messages: MockMessage[]): keyof typeof MOCK_SCRIPTS | undefined {
  const prompt = messages.find((m) => m.role === "user")?.content ?? "";
  const match = /Candidate strategy: .*\((minimal|root-cause|architecture)\)/.exec(prompt);
  return match?.[1] as keyof typeof MOCK_SCRIPTS | undefined;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** A fetch implementation that answers like Token Factory from the scripts above. */
export function createMockTokenFactory(options: { delayMs?: number } = {}): typeof fetch {
  const delayMs = options.delayMs ?? Number(process.env.FORK_NEMOTRON_MOCK_DELAY_MS ?? 400);
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    if (url.endsWith("/models")) {
      return json({ data: Object.values(TIER_FALLBACK).map((id) => ({ id })) });
    }
    if (!url.endsWith("/chat/completions")) return json({ error: "not found" }, 404);

    const body = JSON.parse(String(init?.body ?? "{}")) as { messages?: MockMessage[] };
    const messages = body.messages ?? [];
    const prompt = messages.find((m) => m.role === "user")?.content ?? "";
    const strategy = strategyFrom(messages);
    if (!strategy || !prompt.includes("mergeWindows")) {
      return json(
        {
          error:
            "FORK_NEMOTRON_MOCK only replays the bundled demo task. Set NEBIUS_API_KEY (and unset FORK_NEMOTRON_MOCK) to run Nemotron on this repository.",
        },
        400,
      );
    }
    const step = messages.filter((m) => m.role === "assistant").length;
    const script = MOCK_SCRIPTS[strategy];
    const next = script[Math.min(step, script.length - 1)];
    const id = `mock_${strategy}_${step}`;
    const toolCall =
      "finish" in next
        ? { id, type: "function", function: { name: "finish", arguments: JSON.stringify({ summary: next.finish }) } }
        : { id, type: "function", function: { name: next.tool, arguments: JSON.stringify(next.args) } };
    return json({
      choices: [{ message: { content: next.say ?? null, tool_calls: [toolCall] }, finish_reason: "tool_calls" }],
      // Nothing was generated, so no usage is reported.
      usage: { prompt_tokens: 0, completion_tokens: 0 },
    });
  }) as typeof fetch;
}
