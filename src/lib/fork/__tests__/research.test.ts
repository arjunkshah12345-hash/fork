import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildAgentPrompt } from "../codex";
import {
  formatSearchForModel,
  heuristicQueries,
  parsePlannedQueries,
  prepareResearch,
  tavilySearch,
} from "../research";

function fakeTavily(fail = false) {
  const requests: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const impl = (async (url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    requests.push({ url, headers: init?.headers as Record<string, string>, body });
    if (fail) return new Response('{"detail":{"error":"Unauthorized"}}', { status: 401 });
    return new Response(
      JSON.stringify({
        query: body.query,
        answer: `answer for ${body.query}`,
        results: [
          { title: "Array.prototype.sort() - MDN", url: "https://developer.mozilla.org/sort", content: "The default sort order is ascending, built upon converting the elements into strings." },
          { title: "Interval merging", url: `https://example.com/${encodeURIComponent(body.query)}`, content: "Merge overlapping intervals." },
        ],
        images: [],
        response_time: 0.5,
      }),
    );
  }) as typeof fetch;
  return { impl, requests };
}

beforeEach(() => {
  process.env.TAVILY_API_KEY = "tvly-test";
});

afterEach(() => {
  delete process.env.TAVILY_API_KEY;
});

describe("tavilySearch", () => {
  it("posts a basic-depth search with a bearer key and maps results", async () => {
    const { impl, requests } = fakeTavily();
    const result = await tavilySearch("javascript sort numbers", impl);

    expect(requests[0].url).toBe("https://api.tavily.com/search");
    expect(requests[0].headers.Authorization).toBe("Bearer tvly-test");
    expect(requests[0].body).toMatchObject({ query: "javascript sort numbers", search_depth: "basic", max_results: 3 });
    expect(result.answer).toBe("answer for javascript sort numbers");
    expect(result.results[0]).toMatchObject({ title: "Array.prototype.sort() - MDN", url: "https://developer.mozilla.org/sort" });
    expect(formatSearchForModel(result)).toContain("untrusted web excerpts");
  });

  it("surfaces API errors", async () => {
    await expect(tavilySearch("x", fakeTavily(true).impl)).rejects.toThrow(/Tavily 401/);
  });
});

describe("prepareResearch", () => {
  it("is skipped, with a reason, when no key is set", async () => {
    delete process.env.TAVILY_API_KEY;
    const { impl, requests } = fakeTavily();
    const state = await prepareResearch("fix the bug", { enabled: true, fetchImpl: impl });
    expect(state.status).toBe("disabled");
    expect(state.detail).toMatch(/TAVILY_API_KEY/);
    expect(requests).toHaveLength(0);
  });

  it("is skipped when the run turns it off", async () => {
    const state = await prepareResearch("fix the bug", { enabled: false, fetchImpl: fakeTavily().impl });
    expect(state.status).toBe("disabled");
  });

  it("searches the planner's queries and builds a cited, de-duplicated brief", async () => {
    const { impl, requests } = fakeTavily();
    const state = await prepareResearch("# Repair mergeWindows\nsort is wrong", {
      enabled: true,
      fetchImpl: impl,
      planner: async () => ["js numeric sort comparator", "merge touching intervals"],
      plannerLabel: "Nemotron Nano",
    });
    expect(requests.map((r) => r.body.query)).toEqual(["js numeric sort comparator", "merge touching intervals"]);
    expect(state.status).toBe("ready");
    expect(state.planner).toBe("Nemotron Nano");
    // The MDN URL came back for both queries but is listed once.
    expect(state.sources?.filter((s) => s.url === "https://developer.mozilla.org/sort")).toHaveLength(1);
    expect(state.brief).toContain("https://developer.mozilla.org/sort");
  });

  it("falls back to the task's first line when the planner fails", async () => {
    const { impl, requests } = fakeTavily();
    const state = await prepareResearch("# Repair `mergeWindows`\n\nmore detail", {
      enabled: true,
      fetchImpl: impl,
      planner: async () => {
        throw new Error("model down");
      },
    });
    expect(state.planner).toBe("heuristic");
    expect(requests[0].body.query).toBe("Repair mergeWindows");
  });

  it("reports unavailable when every search fails", async () => {
    const state = await prepareResearch("fix it please", { enabled: true, fetchImpl: fakeTavily(true).impl });
    expect(state.status).toBe("unavailable");
    expect(state.detail).toMatch(/Tavily 401/);
  });
});

describe("query planning helpers", () => {
  it("parses at most two queries from model JSON", () => {
    expect(parsePlannedQueries('Sure: {"queries": ["a b c d", "e f g h", "i j k l"]}')).toEqual(["a b c d", "e f g h"]);
    expect(() => parsePlannedQueries('{"nope": 1}')).toThrow();
  });

  it("skips short heading lines", () => {
    expect(heuristicQueries("# Fix\nThe parser drops trailing commas")).toEqual(["The parser drops trailing commas"]);
  });
});

describe("agent prompt", () => {
  it("passes the research brief to candidates as untrusted reference", () => {
    const prompt = buildAgentPrompt({
      cwd: "/tmp",
      task: "do it",
      strategyId: "minimal",
      strategyLabel: "Minimal patch",
      strategyInstruction: "small",
      timeoutMs: 1000,
      runDirectory: "/tmp/x",
      researchBrief: "Query: q\n- MDN (https://developer.mozilla.org/sort): default sort is string order",
    });
    expect(prompt).toContain("untrusted excerpts");
    expect(prompt).toContain("https://developer.mozilla.org/sort");
  });
});
