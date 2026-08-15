import { describe, expect, it } from "vitest";

import { readRunRequest, RunRequestError } from "../_lib/run-request";

function request(body: string): Request {
  return new Request("http://localhost/api/runs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("readRunRequest", () => {
  it("accepts the supported run options without inventing defaults", async () => {
    const input = {
      repository: "/tmp/example",
      task: "Fix the failing merge logic",
      agentProvider: "opencode",
      useSupercompress: true,
      baseBranch: "main",
      commands: [{ name: "test", command: "npm test", timeoutMs: 30_000 }],
      useGreptile: false,
      strategyInstructions: { "root-cause": "Trace the source of the bug." },
    };

    await expect(readRunRequest(request(JSON.stringify(input)))).resolves.toEqual(input);
  });

  it("returns field-level issues for invalid requests", async () => {
    const result = readRunRequest(request(JSON.stringify({ repository: "", task: "" })));
    await expect(result).rejects.toBeInstanceOf(RunRequestError);
    await expect(result).rejects.toMatchObject({
      status: 422,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: "repository" }),
        expect.objectContaining({ path: "task" }),
      ]),
    });
  });

  it("rejects malformed JSON with an actionable client error", async () => {
    await expect(readRunRequest(request("{"))).rejects.toMatchObject({
      status: 400,
      message: "The request body must be valid JSON.",
    });
  });

  it("rejects unknown top-level fields", async () => {
    await expect(
      readRunRequest(
        request(
          JSON.stringify({
            repository: "/tmp/example",
            task: "Fix it",
            token: "must-not-be-accepted",
          }),
        ),
      ),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("rejects unknown agent providers", async () => {
    await expect(
      readRunRequest(
        request(
          JSON.stringify({
            repository: "/tmp/example",
            task: "Fix it",
            agentProvider: "mystery-agent",
          }),
        ),
      ),
    ).rejects.toMatchObject({
      status: 422,
      issues: expect.arrayContaining([expect.objectContaining({ path: "agentProvider" })]),
    });
  });
});
