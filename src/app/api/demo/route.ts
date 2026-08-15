import { startDemoRun } from "@/lib/fork/demo";

import { apiError, requireApiUser } from "../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const authError = await requireApiUser(request);
  if (authError) return authError;
  try {
    const run = await startDemoRun();
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
