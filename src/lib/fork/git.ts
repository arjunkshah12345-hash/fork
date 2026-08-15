import { access, mkdir, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { MAX_CAPTURE_CHARS } from "./constants";
import { runProcess } from "./process";
import type { DiffStats, StrategyId } from "./types";

const GIT_TIMEOUT_MS = 60_000;

export class GitError extends Error {
  constructor(
    message: string,
    readonly args: readonly string[],
    readonly exitCode: number | null,
  ) {
    super(message);
    this.name = "GitError";
  }
}

async function git(cwd: string, args: readonly string[], maxCaptureChars = MAX_CAPTURE_CHARS) {
  const result = await runProcess("git", args, {
    cwd,
    timeoutMs: GIT_TIMEOUT_MS,
    maxCaptureChars,
  });
  if (result.exitCode !== 0) {
    const detail = (result.stderr || result.stdout || result.spawnError || "unknown git error").trim();
    throw new GitError(`git ${args[0] ?? ""} failed: ${detail}`, args, result.exitCode);
  }
  return result.stdout;
}

export interface ResolvedRepository {
  sourcePath: string;
  baseBranch: string;
  baseCommit: string;
}

export async function resolveRepository(
  repository: string,
  requestedBaseBranch?: string,
  clonePath?: string,
): Promise<ResolvedRepository> {
  let repositoryPath: string;
  try {
    repositoryPath = await realpath(path.resolve(repository));
  } catch {
    if (!clonePath) {
      throw new Error(
        `Repository is not a local Git directory and no clone destination was provided: ${repository}`,
      );
    }
    if (repository.startsWith("-")) {
      throw new Error("Repository URL cannot start with a dash");
    }

    const cloneParent = path.dirname(clonePath);
    await mkdir(cloneParent, { recursive: true });
    const cloneArgs = ["clone", "--quiet"];
    if (requestedBaseBranch) cloneArgs.push("--branch", requestedBaseBranch);
    cloneArgs.push("--", repository, clonePath);
    await git(cloneParent, cloneArgs, MAX_CAPTURE_CHARS);
    repositoryPath = await realpath(clonePath);
  }
  const metadata = await stat(repositoryPath);
  if (!metadata.isDirectory()) throw new Error(`Repository is not a directory: ${repositoryPath}`);

  const sourcePath = (await git(repositoryPath, ["rev-parse", "--show-toplevel"])).trim();
  const isBare = (await git(sourcePath, ["rev-parse", "--is-bare-repository"])).trim();
  if (isBare === "true") throw new Error("Bare repositories are not supported");

  const baseRef = requestedBaseBranch || "HEAD";
  const baseCommit = (await git(sourcePath, ["rev-parse", "--verify", `${baseRef}^{commit}`])).trim();
  let baseBranch = requestedBaseBranch;
  if (!baseBranch) {
    try {
      baseBranch = (await git(sourcePath, ["symbolic-ref", "--quiet", "--short", "HEAD"])).trim();
    } catch {
      baseBranch = baseCommit;
    }
  }

  return { sourcePath, baseBranch, baseCommit };
}

export function candidateBranchName(runId: string, candidateId: StrategyId): string {
  const safeRunId = runId.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(0, 80);
  return `fork/${safeRunId}/${candidateId}`;
}

export async function createWorktree(options: {
  sourcePath: string;
  worktreePath: string;
  branch: string;
  baseCommit: string;
}): Promise<void> {
  await mkdir(path.dirname(options.worktreePath), { recursive: true });
  try {
    await access(options.worktreePath);
    try {
      const existingRoot = (
        await git(options.worktreePath, ["rev-parse", "--show-toplevel"])
      ).trim();
      if (path.resolve(existingRoot) === path.resolve(options.worktreePath)) return;
    } catch {
      // The path exists but is not a reusable worktree; Git will report the conflict.
    }
  } catch {
    // The path does not exist yet.
  }

  await git(options.sourcePath, [
    "worktree",
    "add",
    "--quiet",
    "-b",
    options.branch,
    options.worktreePath,
    options.baseCommit,
  ]);
}

export interface GatheredDiff {
  diff: string;
  stats: DiffStats;
}

export async function gatherDiff(worktreePath: string, baseCommit: string): Promise<GatheredDiff> {
  // Intent-to-add makes untracked files visible to diff without staging their content.
  await git(worktreePath, ["add", "--intent-to-add", "--", "."]);
  const [diff, namesOutput, shortStat] = await Promise.all([
    git(worktreePath, [
      "diff",
      "--no-ext-diff",
      "--binary",
      "--find-renames",
      baseCommit,
      "--",
    ]),
    git(worktreePath, ["diff", "--name-only", "-z", baseCommit, "--"]),
    git(worktreePath, ["diff", "--shortstat", baseCommit, "--"]),
  ]);

  const files = namesOutput.split("\0").filter(Boolean);
  const additions = Number(shortStat.match(/(\d+) insertion/)?.[1] ?? 0);
  const deletions = Number(shortStat.match(/(\d+) deletion/)?.[1] ?? 0);
  return {
    diff,
    stats: {
      filesChanged: files.length,
      additions,
      deletions,
      files,
    },
  };
}

export async function getHeadCommit(worktreePath: string): Promise<string> {
  return (await git(worktreePath, ["rev-parse", "HEAD"])).trim();
}
