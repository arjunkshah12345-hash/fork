import { cp, mkdir, mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";

import { PROJECT_ROOT } from "./constants";
import { createRun, startRun } from "./orchestrator";
import { runProcess } from "./process";
import type { ForkRun, RunRequest } from "./types";

const DEMO_FIXTURE_ROOT = path.join(PROJECT_ROOT, "examples", "demo-repo");
const DEMO_RUNTIME_ROOT = path.join(PROJECT_ROOT, ".fork", "demo");
const GIT_TIMEOUT_MS = 30_000;

type DemoConfig = Omit<RunRequest, "repository" | "task"> & {
  taskFile: string;
};

async function demoGit(cwd: string, args: readonly string[], action: string): Promise<void> {
  const result = await runProcess("git", args, {
    cwd,
    timeoutMs: GIT_TIMEOUT_MS,
    maxCaptureChars: 4_000,
  });
  if (result.exitCode !== 0 || result.timedOut || result.spawnError) {
    throw new Error(`Could not ${action} the demo repository.`);
  }
}

/** Copy the fixture into a unique directory and give it a clean, local Git history. */
export async function materializeDemoRepository(): Promise<string> {
  await mkdir(DEMO_RUNTIME_ROOT, { recursive: true });
  const repository = await mkdtemp(path.join(DEMO_RUNTIME_ROOT, "run-"));
  await cp(DEMO_FIXTURE_ROOT, repository, { recursive: true });

  await demoGit(repository, ["init", "--initial-branch=main"], "initialize");
  await demoGit(repository, ["config", "user.name", "Fork Demo"], "configure");
  await demoGit(
    repository,
    ["config", "user.email", "fork-demo@example.invalid"],
    "configure",
  );
  await demoGit(repository, ["add", "--all", "--", "."], "stage");
  await demoGit(
    repository,
    ["commit", "-m", "Add reproducible merge-windows bug"],
    "commit",
  );
  return repository;
}

function parseDemoConfig(value: unknown): DemoConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The demo fixture configuration is invalid.");
  }
  const config = value as Partial<DemoConfig>;
  if (typeof config.taskFile !== "string" || !config.taskFile.trim()) {
    throw new Error("The demo fixture must define a taskFile.");
  }
  return config as DemoConfig;
}

export async function createDemoRequest(repository: string): Promise<RunRequest> {
  const rawConfig = JSON.parse(
    await readFile(path.join(repository, "fork.config.json"), "utf8"),
  ) as unknown;
  const config = parseDemoConfig(rawConfig);
  const taskPath = path.resolve(repository, config.taskFile);
  if (!taskPath.startsWith(`${path.resolve(repository)}${path.sep}`)) {
    throw new Error("The demo taskFile must stay inside the demo repository.");
  }
  const task = await readFile(taskPath, "utf8");
  const requestConfig = Object.fromEntries(
    Object.entries(config).filter(([key]) => key !== "taskFile"),
  ) as Omit<DemoConfig, "taskFile">;
  return { ...requestConfig, repository, task };
}

/** Materialize and queue a demo run without holding the HTTP response open. */
export async function startDemoRun(): Promise<ForkRun> {
  const repository = await materializeDemoRepository();
  const request = await createDemoRequest(repository);
  const run = await createRun(request);
  void startRun(run.id).catch(() => undefined);
  return run;
}
