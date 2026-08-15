import { getRun, startRun, updateRun } from "@/lib/fork";
import { AuthenticationRequiredError, requireUser } from "@/lib/auth";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    issues?: Array<{ path: string; message: string }>;
  };
}

export function apiError(
  code: string,
  message: string,
  status: number,
  issues?: Array<{ path: string; message: string }>,
): Response {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      ...(issues?.length ? { issues } : {}),
    },
  };
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function requireApiUser(request: Request): Promise<Response | null> {
  try {
    await requireUser(request);
    return null;
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return apiError("AUTH_REQUIRED", "Sign in to access FORK runs.", 401);
    }
    return apiError(
      "AUTH_UNAVAILABLE",
      "Authentication could not be verified. Check local auth storage and retry.",
      503,
    );
  }
}

export function launchRun(runId: string): void {
  void startRun(runId).catch(async () => {
    // executeRun normally persists its own failure. This covers failures before
    // that boundary without returning a process error or environment detail.
    try {
      const run = await getRun(runId);
      if (!run || run.status === "complete" || run.status === "failed") return;
      await updateRun(runId, (current) => {
        current.status = "failed";
        current.error = "The run could not be started. Check the server logs and retry.";
        current.finishedAt = new Date().toISOString();
      });
    } catch {
      // Persistence may itself be the unavailable dependency. Nothing safe can
      // be added to the run from here.
    }
  });
}
