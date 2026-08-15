import { createWinningPullRequest, PullRequestError } from "@/lib/fork/pr";

import { apiError } from "../../../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context): Promise<Response> {
  const { id } = await context.params;
  try {
    const run = await createWinningPullRequest(id);
    return Response.json(
      { run, prUrl: run.prUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof PullRequestError) {
      return apiError(error.code, error.message, error.status);
    }
    return apiError(
      "PR_CREATE_FAILED",
      "The pull request could not be created. The winning result is still available; verify server GitHub access and retry.",
      500,
    );
  }
}

