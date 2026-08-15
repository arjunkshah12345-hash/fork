import { getRun, startRun, updateRun } from "@/lib/fork";

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
  return Response.json(body, { status });
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

