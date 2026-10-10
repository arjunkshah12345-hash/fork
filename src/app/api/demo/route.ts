import { activeRunCount, HOSTED_DEMO_MAX_ACTIVE_RUNS, hostedDemoMode } from "@/lib/fork";
import { startDemoRun } from "@/lib/fork/demo";
import { z } from "zod";

import { apiError, getApiUserSupercompressKey, requireApiUser } from "../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const authError = await requireApiUser(request);
  if (authError) return authError;
  try {
    const text = await request.text();
    let input: unknown = {};
    if (text.trim()) {
      try {
        input = JSON.parse(text);
      } catch {
        return apiError("INVALID_DEMO_REQUEST", "The demo request must be valid JSON.", 400);
      }
    }
    const parsed = z
      .object({
        agentProvider: z.enum(["codex", "opencode", "cursor", "nemotron", "freebuff"]).optional(),
        useSupercompress: z.boolean().optional(),
        useResearch: z.boolean().optional(),
      })
      .strict()
      .safeParse(input);
    if (!parsed.success) {
      return apiError(
        "INVALID_DEMO_REQUEST",
        "Choose a supported agent provider and retry.",
        422,
        parsed.error.issues.map((issue) => ({
          path: issue.path.join(".") || "$",
          message: issue.message,
        })),
      );
    }
    const hosted = hostedDemoMode();
    if (hosted && activeRunCount() >= HOSTED_DEMO_MAX_ACTIVE_RUNS) {
      return apiError(
        "DEMO_BUSY",
        "Another demo run is in progress on this server. Open it from the run list, or try again in a minute.",
        429,
      );
    }
    const supercompressApiKey = await getApiUserSupercompressKey(request);
    const options = hosted
      ? // The hosted demo always runs on Nemotron via Token Factory, without hosted compression.
        { ...parsed.data, agentProvider: "nemotron" as const, useSupercompress: false }
      : { ...parsed.data, supercompressApiKey };
    const run = await startDemoRun(options);
    return Response.json(
      { run },
      {
        status: 202,
        headers: {
          "Cache-Control": "no-store",
          Location: `/api/runs/${encodeURIComponent(run.id)}`,
        },
      },
    );
  } catch {
    return apiError(
      "DEMO_START_FAILED",
      "The demo could not be prepared. Verify that examples/demo-repo exists and .fork/demo is writable.",
      500,
    );
  }
}
