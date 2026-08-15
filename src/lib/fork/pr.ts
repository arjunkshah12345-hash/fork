import { getRun, updateRun } from "./store";
import { runProcess, type ProcessResult } from "./process";
import type { ForkRun } from "./types";

const GIT_TIMEOUT_MS = 60_000;
const GH_TIMEOUT_MS = 90_000;

export type PullRequestErrorCode =
  | "RUN_NOT_FOUND"
  | "RUN_NOT_READY"
  | "WINNER_NOT_FOUND"
  | "INVALID_REMOTE"
  | "INVALID_BRANCH"
  | "COMMIT_FAILED"
  | "PUSH_FAILED"
  | "GH_UNAVAILABLE"
  | "PR_CREATE_FAILED";

export class PullRequestError extends Error {
  constructor(
    readonly code: PullRequestErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PullRequestError";
  }
}

export interface GitHubRemote {
  owner: string;
  name: string;
  repository: string;
}

function validRepositoryPart(value: string): boolean {
  return (
    value !== "." &&
    value !== ".." &&
    /^[a-zA-Z0-9_.-]+$/.test(value)
  );
}

function githubRepository(owner: string, rawName: string): GitHubRemote | undefined {
  const name = rawName.replace(/\.git$/i, "");
  if (!validRepositoryPart(owner) || !validRepositoryPart(name)) return undefined;
  return { owner, name, repository: `${owner}/${name}` };
}

/** Parse a public github.com Git remote without ever returning embedded credentials. */
export function parseGitHubRemote(remote: string): GitHubRemote | undefined {
  const value = remote.trim();
  if (!value) return undefined;

  const scpStyle = value.match(/^(?:git@)?github\.com:([^/\s]+)\/([^/\s]+)$/i);
  if (scpStyle) return githubRepository(scpStyle[1], scpStyle[2]);

  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() !== "github.com") return undefined;
    if (url.search || url.hash) return undefined;
    if (["http:", "https:"].includes(url.protocol) && (url.username || url.password)) {
      return undefined;
    }
    if (!["http:", "https:", "ssh:", "git:"].includes(url.protocol)) return undefined;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) return undefined;
    return githubRepository(parts[0], parts[1]);
  } catch {
    return undefined;
  }
}

function publicCommandFailure(
  code: PullRequestErrorCode,
  status: number,
  message: string,
): PullRequestError {
  return new PullRequestError(code, message, status);
}

async function runGit(cwd: string, args: readonly string[]): Promise<ProcessResult> {
  return runProcess("git", args, {
    cwd,
    timeoutMs: GIT_TIMEOUT_MS,
    maxCaptureChars: 8_000,
  });
}

async function successfulGit(
  cwd: string,
  args: readonly string[],
  failure: PullRequestError,
): Promise<string> {
  const result = await runGit(cwd, args);
  if (result.exitCode !== 0 || result.timedOut || result.spawnError) throw failure;
  return result.stdout.trim();
}

function validBranchName(branch: string): boolean {
  return (
    branch.length > 0 &&
    branch.length <= 240 &&
    !branch.startsWith("-") &&
    !branch.startsWith("/") &&
    !branch.endsWith("/") &&
    !branch.endsWith(".") &&
    !branch.includes("..") &&
    !/[\s~^:?*]/.test(branch) &&
    !branch.includes("[") &&
    !branch.includes("\\")
  );
}

function pullRequestUrl(output: string, remote: GitHubRemote): string | undefined {
  for (const token of output.split(/\s+/)) {
    try {
      const url = new URL(token);
      if (
        url.protocol === "https:" &&
        url.hostname.toLowerCase() === "github.com" &&
        url.pathname
          .toLowerCase()
          .startsWith(`/${remote.owner}/${remote.name}/pull/`.toLowerCase())
      ) {
        return url.toString();
      }
    } catch {
      // Non-URL CLI output is ignored.
    }
  }
  return undefined;
}

async function findExistingPullRequest(
  cwd: string,
  remote: GitHubRemote,
  branch: string,
): Promise<string | undefined> {
  const result = await runProcess(
    "gh",
    [
      "pr",
      "view",
      "--repo",
      remote.repository,
      "--json",
      "url",
      "--jq",
      ".url",
      branch,
    ],
    { cwd, timeoutMs: GH_TIMEOUT_MS, maxCaptureChars: 8_000 },
  );
  if (result.exitCode !== 0) return undefined;
  return pullRequestUrl(result.stdout, remote);
}

function prTitle(run: ForkRun): string {
  const winner = run.candidates.find((candidate) => candidate.id === run.winnerId);
  return `FORK: ${winner?.label ?? "winning candidate"}`.slice(0, 120);
}

function prBody(run: ForkRun): string {
  const winner = run.candidates.find((candidate) => candidate.id === run.winnerId);
  return [
    "## FORK result",
    "",
    `Publishes the selected **${winner?.label ?? "winning"}** candidate from run \`${run.id}\`.`,
    "",
    "Only the winning candidate branch is included. Losing candidates remain local run artifacts.",
  ].join("\n");
}

async function publish(runId: string): Promise<ForkRun> {
  const run = await getRun(runId);
  if (!run) {
    throw new PullRequestError("RUN_NOT_FOUND", "Run not found.", 404);
  }
  if (run.prUrl) return run;
  if (run.status !== "complete") {
    throw new PullRequestError(
      "RUN_NOT_READY",
      "The run must finish successfully before a pull request can be created.",
      409,
    );
  }

  const winner = run.candidates.find((candidate) => candidate.id === run.winnerId);
  if (!winner || winner.status !== "complete") {
    throw new PullRequestError(
      "WINNER_NOT_FOUND",
      "This run does not have a completed winning candidate to publish.",
      409,
    );
  }
  if (!validBranchName(winner.branch)) {
    throw new PullRequestError(
      "INVALID_BRANCH",
      "The winning candidate branch is invalid. Re-run FORK before publishing.",
      409,
    );
  }

  // Check the remote before mutating the winning worktree. Local demo repositories
  // and non-GitHub remotes must remain local-only.
  const remoteValue = await successfulGit(
    winner.worktreePath,
    ["remote", "get-url", "--push", "origin"],
    publicCommandFailure(
      "INVALID_REMOTE",
      422,
      "This repository has no pushable GitHub origin. Add a github.com origin before creating a PR.",
    ),
  );
  const remote = parseGitHubRemote(remoteValue);
  if (!remote) {
    throw new PullRequestError(
      "INVALID_REMOTE",
      "Only a github.com origin can be published. Local and non-GitHub remotes stay local.",
      422,
    );
  }

  const currentBranch = await successfulGit(
    winner.worktreePath,
    ["branch", "--show-current"],
    publicCommandFailure(
      "INVALID_BRANCH",
      409,
      "Could not verify the winning candidate branch. Re-run FORK before publishing.",
    ),
  );
  if (currentBranch !== winner.branch) {
    throw new PullRequestError(
      "INVALID_BRANCH",
      "The winning worktree no longer matches its selected branch. Re-run FORK before publishing.",
      409,
    );
  }

  const status = await successfulGit(
    winner.worktreePath,
    ["status", "--porcelain=v1", "--untracked-files=all"],
    publicCommandFailure(
      "COMMIT_FAILED",
      500,
      "Could not inspect the winning candidate changes.",
    ),
  );
  if (status) {
    await successfulGit(
      winner.worktreePath,
      ["add", "--all", "--", "."],
      publicCommandFailure(
        "COMMIT_FAILED",
        500,
        "Could not stage the winning candidate changes.",
      ),
    );
    await successfulGit(
      winner.worktreePath,
      ["commit", "-m", prTitle(run)],
      publicCommandFailure(
        "COMMIT_FAILED",
        422,
        "Could not commit the winning candidate. Configure git user.name and user.email, then retry.",
      ),
    );
  }

  const pushed = await runGit(winner.worktreePath, [
    "push",
    "--set-upstream",
    "--",
    "origin",
    `HEAD:refs/heads/${winner.branch}`,
  ]);
  if (pushed.exitCode !== 0 || pushed.timedOut || pushed.spawnError) {
    throw new PullRequestError(
      "PUSH_FAILED",
      "Could not push the winning branch. Verify Git credentials and branch permissions, then retry.",
      502,
    );
  }

  let url = await findExistingPullRequest(winner.worktreePath, remote, winner.branch);
  if (!url) {
    const baseBranch = run.request.baseBranch ?? run.baseBranch;
    if (!baseBranch || !validBranchName(baseBranch)) {
      throw new PullRequestError(
        "INVALID_BRANCH",
        "A named GitHub base branch is required to create this pull request.",
        422,
      );
    }
    const created = await runProcess(
      "gh",
      [
        "pr",
        "create",
        "--repo",
        remote.repository,
        "--base",
        baseBranch,
        "--head",
        winner.branch,
        "--title",
        prTitle(run),
        "--body",
        prBody(run),
      ],
      { cwd: winner.worktreePath, timeoutMs: GH_TIMEOUT_MS, maxCaptureChars: 8_000 },
    );
    if (created.spawnError) {
      throw new PullRequestError(
        "GH_UNAVAILABLE",
        "GitHub CLI (`gh`) is not installed or could not be started.",
        503,
      );
    }
    if (created.exitCode !== 0 || created.timedOut) {
      throw new PullRequestError(
        "PR_CREATE_FAILED",
        "GitHub could not create the pull request. Run `gh auth status`, verify repository access, then retry.",
        502,
      );
    }
    url = pullRequestUrl(created.stdout, remote);
    if (!url) {
      throw new PullRequestError(
        "PR_CREATE_FAILED",
        "GitHub reported success but did not return a pull request URL. Check the repository and retry.",
        502,
      );
    }
  }

  return updateRun(runId, (current) => {
    current.prUrl = url;
  });
}

const pendingKey = Symbol.for("fork.pending-pull-requests");
const pendingGlobal = globalThis as typeof globalThis & {
  [pendingKey]?: Map<string, Promise<ForkRun>>;
};
const pending =
  pendingGlobal[pendingKey] ?? (pendingGlobal[pendingKey] = new Map<string, Promise<ForkRun>>());

/** Commit, push, and publish only the selected worktree. Call only from an explicit CTA. */
export async function createWinningPullRequest(runId: string): Promise<ForkRun> {
  const existing = pending.get(runId);
  if (existing) return existing;

  const publication = publish(runId).finally(() => pending.delete(runId));
  pending.set(runId, publication);
  return publication;
}

export const createPullRequest = createWinningPullRequest;
