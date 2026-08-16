import { createRun, listRuns } from "@/lib/fork";

import { apiError, getApiUserSupercompressKey, launchRun, requireApiUser } from "../_lib/http";
import { readRunRequest, RunRequestError } from "../_lib/run-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request): Promise<Response> {
  const authError = await requireApiUser(request);
  if (authError) return authError;
  try {
    const runs = await listRuns();
    return Response.json({ runs }, { headers: NO_STORE });
  } catch {
    return apiError(
      "RUNS_UNAVAILABLE",
      "Runs could not be loaded. Verify that the server can read and write .fork/runs.",
      500,
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  const authError = await requireApiUser(request);
  if (authError) return authError;
  try {
    const input = await readRunRequest(request);
    const supercompressApiKey = await getApiUserSupercompressKey(request);
    const run = await createRun(input);
    launchRun(run.id, { supercompressApiKey });
    return Response.json(
      { run },
      {
        status: 202,
        headers: { ...NO_STORE, Location: `/api/runs/${encodeURIComponent(run.id)}` },
      },
    );
  } catch (error) {
    if (error instanceof RunRequestError) {
      return apiError("INVALID_RUN_REQUEST", error.message, error.status, error.issues);
    }
    return apiError(
      "RUN_CREATE_FAILED",
      "The run could not be created. Verify that the server can write to .fork/runs and retry.",
      500,
    );
  }
}
