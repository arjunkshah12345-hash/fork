#!/usr/bin/env tsx

import { cp, mkdir, mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

import type { RunRequest } from "../src/lib/fork/types";
import { executeFork } from "./run-fork";

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const fixtureRoot = path.join(projectRoot, "examples", "demo-repo");
const demoRoot = path.join(projectRoot, ".fork", "demo");

async function git(cwd: string, ...args: string[]): Promise<void> {
  await execFileAsync("git", args, { cwd });
}

async function materializeDemoRepository(): Promise<string> {
  await mkdir(demoRoot, { recursive: true });
  const repository = await mkdtemp(path.join(demoRoot, "run-"));
  await cp(fixtureRoot, repository, { recursive: true });

  await git(repository, "init", "--initial-branch=main");
  await git(repository, "config", "user.name", "Fork Demo");
  await git(repository, "config", "user.email", "fork-demo@example.invalid");
  await git(repository, "add", ".");
  await git(repository, "commit", "-m", "Add reproducible merge-windows bug");
  return repository;
}

async function main(): Promise<void> {
  const repository = await materializeDemoRepository();
  const fixtureConfigPath = path.join(repository, "fork.config.json");
  const config = JSON.parse(
    await readFile(fixtureConfigPath, "utf8"),
  ) as Omit<RunRequest, "repository" | "task"> & { taskFile: string };
  const { taskFile, ...requestConfig } = config;
  const task = await readFile(path.join(repository, taskFile), "utf8");

  process.stdout.write(`Demo repository: ${repository}\n`);
  process.stdout.write("Starting three isolated candidate strategies...\n\n");

  const result = await executeFork({
    ...requestConfig,
    repository,
    task,
  });

  process.stdout.write(`\nRun ${result.id}: ${result.status}\n`);
  if (result.winnerId) process.stdout.write(`Winner: ${result.winnerId}\n`);
  if (result.judge?.rationale) {
    process.stdout.write(`Why: ${result.judge.rationale}\n`);
  }
  if (result.prUrl) process.stdout.write(`Pull request: ${result.prUrl}\n`);
  if (result.error) process.stdout.write(`Error: ${result.error}\n`);
}

const isEntrypoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`demo: ${message}\n`);
    process.exitCode = 1;
  });
}
