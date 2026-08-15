#!/usr/bin/env tsx

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { ForkEvent, ForkRun, RunRequest } from "../src/lib/fork/types";

type RunFork = (
  request: RunRequest,
  options?: { onEvent?: (event: ForkEvent) => void },
) => Promise<ForkRun>;

type DemoConfig = Omit<RunRequest, "repository" | "task"> & {
  repository?: string;
  task?: string;
  taskFile?: string;
};

const MODULE_CANDIDATES = [
  "../src/lib/fork/orchestrator.ts",
  "../src/lib/fork/index.ts",
] as const;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

function usage(): string {
  return `Usage: npx tsx scripts/run-fork.ts --repo <path-or-url> (--task <text> | --config <file>)

Options:
  --repo <value>      Local git repository or cloneable URL
  --task <value>      Task to give each strategy
  --config <file>     JSON request config (taskFile is resolved beside the config)
  --greptile          Enable optional Greptile review
  --no-greptile       Disable Greptile even when config enables it
  --help              Show this message`;
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const key = argument.slice(2);
    if (["help", "greptile", "no-greptile"].includes(key)) {
      parsed[key] = true;
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    parsed[key] = value;
    index += 1;
  }

  return parsed;
}

async function loadConfig(configPath: string): Promise<DemoConfig> {
  const absoluteConfig = path.resolve(configPath);
  const config = JSON.parse(await readFile(absoluteConfig, "utf8")) as DemoConfig;

  if (config.taskFile && !config.task) {
    config.task = await readFile(
      path.resolve(path.dirname(absoluteConfig), config.taskFile),
      "utf8",
    );
  }

  delete config.taskFile;
  return config;
}

async function findRunFork(): Promise<RunFork> {
  const attempted: string[] = [];

  for (const candidate of MODULE_CANDIDATES) {
    const absolutePath = path.resolve(scriptDirectory, candidate);
    if (!existsSync(absolutePath)) continue;

    attempted.push(absolutePath);
    const candidateModule = (await import(pathToFileURL(absolutePath).href)) as {
      runFork?: RunFork;
      default?: RunFork;
    };
    const runner = candidateModule.runFork ?? candidateModule.default;
    if (typeof runner === "function") return runner;
  }

  throw new Error(
    [
      "Fork's core orchestrator is not available.",
      "Expected `src/lib/fork/orchestrator.ts` (or the public barrel)",
      "to export `runFork(request, { onEvent? }): Promise<ForkRun>`.",
      attempted.length > 0
        ? `Modules checked: ${attempted.join(", ")}`
        : "Neither orchestrator module exists in this checkout.",
    ].join(" "),
  );
}

function printEvent(event: ForkEvent): void {
  if (event.type === "candidate.log") {
    const raw = event.line.trim();
    if (!raw || raw.includes("[ad]  Earning Kickback")) return;

    try {
      const parsed = JSON.parse(raw) as {
        type?: string;
        message?: string;
        item?: {
          type?: string;
          text?: string;
          command?: string;
          exit_code?: number | null;
          status?: string;
        };
      };
      if (parsed.type === "item.completed" && parsed.item?.type === "agent_message") {
        process.stdout.write(`[${event.candidateId}] ${parsed.item.text ?? "Agent update"}\n`);
      } else if (parsed.type === "item.started" && parsed.item?.type === "command_execution") {
        const command = (parsed.item.command ?? "command").replace(/\s+/g, " ").slice(0, 120);
        process.stdout.write(`[${event.candidateId}] $ ${command}${command.length === 120 ? "…" : ""}\n`);
      } else if (parsed.type === "item.completed" && parsed.item?.type === "command_execution") {
        process.stdout.write(
          `[${event.candidateId}] command ${parsed.item.exit_code === 0 ? "passed" : "finished"}\n`,
        );
      }
    } catch {
      process.stdout.write(`[${event.candidateId}] ${raw.slice(0, 180)}\n`);
    }
    return;
  }

  if (event.type === "run.updated") {
    const completed = event.run.candidates.filter(
      (candidate) => candidate.status === "complete",
    ).length;
    process.stdout.write(
      `[fork] ${event.run.status} (${completed}/${event.run.candidates.length} candidates complete)\n`,
    );
  }
}

export async function executeFork(request: RunRequest): Promise<ForkRun> {
  const runFork = await findRunFork();
  return runFork(request, { onEvent: printEvent });
}

export async function runFromCli(argv = process.argv.slice(2)): Promise<ForkRun | null> {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return null;
  }

  const config =
    typeof args.config === "string" ? await loadConfig(args.config) : {};
  const repository =
    typeof args.repo === "string" ? args.repo : config.repository;
  const task = typeof args.task === "string" ? args.task : config.task;

  if (!repository || !task) {
    throw new Error(`Both repository and task are required.\n\n${usage()}`);
  }

  const useGreptile = args["no-greptile"]
    ? false
    : args.greptile
      ? true
      : config.useGreptile ?? process.env.FORK_USE_GREPTILE === "true";
  const request: RunRequest = {
    ...config,
    repository,
    task,
    useGreptile,
  };

  const result = await executeFork(request);
  process.stdout.write(`\nRun ${result.id}: ${result.status}\n`);
  if (result.winnerId) process.stdout.write(`Winner: ${result.winnerId}\n`);
  if (result.prUrl) process.stdout.write(`Pull request: ${result.prUrl}\n`);
  if (result.error) process.stdout.write(`Error: ${result.error}\n`);
  return result;
}

const isEntrypoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  runFromCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`fork: ${message}\n`);
    process.exitCode = 1;
  });
}
