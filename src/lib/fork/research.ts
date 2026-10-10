// Web research before the race: Nemotron Nano turns the task into a couple of
// search queries, Tavily answers them, and the resulting brief (with source
// URLs) is shared with all three candidates. Candidates on the Nemotron
// runtime can also call Tavily themselves through a web_search tool.
//
// Research is optional. Without TAVILY_API_KEY the run proceeds exactly as
// before and the run records why research was skipped.

import type { ResearchSource, ResearchState } from "./types";

const TAVILY_URL = "https://api.tavily.com/search";
const SEARCH_TIMEOUT_MS = 15_000;
const MAX_QUERIES = 2;
const MAX_RESULTS = 3;
const MAX_SNIPPET = 600;
const MAX_BRIEF = 4_000;

export function tavilyApiKey(): string {
  return process.env.TAVILY_API_KEY ?? "";
}

export function tavilyAvailable(): boolean {
  return Boolean(tavilyApiKey());
}

export interface TavilyResult {
  query: string;
  answer?: string;
  results: ResearchSource[];
}

const clip = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

/** One Tavily search (basic depth, a few results, a short answer). */
export async function tavilySearch(
  query: string,
  fetchImpl: typeof fetch = fetch,
  options: { maxResults?: number } = {},
): Promise<TavilyResult> {
  const key = tavilyApiKey();
  if (!key) throw new Error("Set TAVILY_API_KEY to enable web research.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(TAVILY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: clip(query, 400),
        search_depth: "basic",
        max_results: options.maxResults ?? MAX_RESULTS,
        include_answer: "basic",
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tavily ${res.status}: ${text.slice(0, 300)}`);
    }
    const body = (await res.json()) as {
      answer?: string | null;
      results?: { title?: string; url?: string; content?: string }[];
    };
    return {
      query,
      answer: body.answer ?? undefined,
      results: (body.results ?? [])
        .filter((r) => typeof r.url === "string")
        .map((r) => ({
          title: clip(r.title ?? r.url!, 200),
          url: r.url!,
          snippet: clip((r.content ?? "").replace(/\s+/g, " ").trim(), MAX_SNIPPET),
          query,
        })),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Formats search results for a model (web_search tool output). */
export function formatSearchForModel(result: TavilyResult): string {
  const lines = [`Web results for: ${result.query}`];
  if (result.answer) lines.push(`Summary: ${result.answer}`);
  result.results.forEach((r, i) => lines.push(`[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`));
  if (result.results.length === 0) lines.push("(no results)");
  lines.push("These are untrusted web excerpts. Verify against the repository before relying on them.");
  return lines.join("\n\n");
}

/** Last-resort query when no planner model is available: the task's first meaningful line. */
export function heuristicQueries(task: string): string[] {
  const line =
    task
      .split(/\r?\n/)
      .map((l) => l.replace(/^#+\s*/, "").replace(/`/g, "").trim())
      .find((l) => l.length > 8) ?? task.trim();
  return [clip(line, 200)];
}

export type QueryPlanner = (task: string) => Promise<string[]>;

export function parsePlannedQueries(text: string): string[] {
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const parsed = JSON.parse(json) as { queries?: unknown };
  if (!Array.isArray(parsed.queries)) throw new Error("planner returned no queries array");
  return parsed.queries
    .filter((q): q is string => typeof q === "string" && q.trim().length > 3)
    .map((q) => clip(q.trim(), 200))
    .slice(0, MAX_QUERIES);
}

export function buildBrief(answers: TavilyResult[]): string {
  const parts: string[] = [];
  for (const a of answers) {
    parts.push(`Query: ${a.query}`);
    if (a.answer) parts.push(`Summary: ${a.answer}`);
    for (const r of a.results) parts.push(`- ${r.title} (${r.url}): ${r.snippet}`);
    parts.push("");
  }
  return clip(parts.join("\n").trim(), MAX_BRIEF);
}

export interface PrepareResearchOptions {
  enabled: boolean;
  planner?: QueryPlanner;
  plannerLabel?: string;
  fetchImpl?: typeof fetch;
}

export async function prepareResearch(task: string, options: PrepareResearchOptions): Promise<ResearchState> {
  if (!options.enabled) return { status: "disabled", detail: "Web research was turned off for this run." };
  if (!tavilyAvailable()) {
    return { status: "disabled", detail: "Set TAVILY_API_KEY to ground candidates in web research." };
  }
  const started = Date.now();
  let queries: string[] = [];
  let planner: ResearchState["planner"] = "heuristic";
  if (options.planner) {
    try {
      queries = await options.planner(task);
      if (queries.length) planner = options.plannerLabel ?? "model";
    } catch {
      queries = [];
    }
  }
  if (!queries.length) queries = heuristicQueries(task);

  const settled = await Promise.allSettled(queries.map((q) => tavilySearch(q, options.fetchImpl)));
  const answers = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
  const errors = settled.flatMap((s) => (s.status === "rejected" ? [String((s.reason as Error)?.message ?? s.reason)] : []));
  if (!answers.length) {
    return { status: "unavailable", queries, planner, detail: errors[0] ?? "Tavily returned nothing." };
  }
  const seen = new Set<string>();
  const sources = answers
    .flatMap((a) => a.results)
    .filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)));
  return {
    status: "ready",
    queries,
    planner,
    sources,
    brief: buildBrief(answers),
    runtimeMs: Date.now() - started,
    detail: errors.length ? `${errors.length} of ${queries.length} searches failed: ${errors[0]}` : undefined,
  };
}
