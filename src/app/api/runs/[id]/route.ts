import { getRun } from "@/lib/fork";

import { apiError } from "../../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context): Promise<Response> {
  const { id } = await context.params;
  try {
    const run = await getRun(id);
    if (!run) return apiError("RUN_NOT_FOUND", "Run not found.", 404);
    return Response.json({ run }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return apiError(
      "RUN_UNAVAILABLE",
      "The run could not be loaded. Verify the server's .fork/runs storage and retry.",
      500,
    );
  }
}

