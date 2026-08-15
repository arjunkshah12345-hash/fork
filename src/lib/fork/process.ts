import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { MAX_CAPTURE_CHARS } from "./constants";
import type { CommandResult, CommandSpec } from "./types";

export interface ProcessOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  timeoutMs?: number;
  maxCaptureChars?: number;
  onStdoutLine?: (line: string) => void;
  onStderrLine?: (line: string) => void;
}

export interface ProcessResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  runtimeMs: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  spawnError?: string;
}

function appendCaptured(current: string, chunk: string, limit: number): string {
  const combined = current + chunk;
  if (combined.length <= limit) return combined;
  return `[output truncated; showing final ${limit.toLocaleString()} characters]\n${combined.slice(-limit)}`;
}

function makeLineConsumer(callback?: (line: string) => void) {
  let pending = "";

  return {
    push(chunk: string) {
      pending += chunk;
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() ?? "";
      for (const line of lines) {
        try {
          callback?.(line);
        } catch {
          // A progress listener must never take down its subprocess.
        }
      }
    },
    flush() {
      if (!pending) return;
      try {
        callback?.(pending);
      } catch {
        // See push().
      }
      pending = "";
    },
  };
}

function terminateProcess(pid: number | undefined, signal: NodeJS.Signals) {
  if (!pid) return;
  try {
    if (process.platform !== "win32") process.kill(-pid, signal);
    else process.kill(pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // It already exited.
    }
  }
}

export async function runProcess(
  executable: string,
  args: readonly string[],
  options: ProcessOptions,
): Promise<ProcessResult> {
  const startedAt = Date.now();
  const captureLimit = options.maxCaptureChars ?? MAX_CAPTURE_CHARS;
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let spawnError: string | undefined;

  return new Promise((resolve) => {
    const stdoutLines = makeLineConsumer(options.onStdoutLine);
    const stderrLines = makeLineConsumer(options.onStderrLine);
    const child = spawn(executable, [...args], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: "pipe",
      detached: process.platform !== "win32",
    });

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout = appendCaptured(stdout, chunk, captureLimit);
      stdoutLines.push(chunk);
    });
    child.stderr.on("data", (chunk: string) => {
      stderr = appendCaptured(stderr, chunk, captureLimit);
      stderrLines.push(chunk);
    });
    child.on("error", (error) => {
      spawnError = error.message;
      stderr = appendCaptured(stderr, `${error.message}\n`, captureLimit);
    });

    let hardKillTimer: NodeJS.Timeout | undefined;
    const timeout =
      options.timeoutMs && options.timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            terminateProcess(child.pid, "SIGTERM");
            hardKillTimer = setTimeout(() => terminateProcess(child.pid, "SIGKILL"), 2_000);
            hardKillTimer.unref();
          }, options.timeoutMs)
        : undefined;
    timeout?.unref();

    if (options.input !== undefined) child.stdin.end(options.input);
    else child.stdin.end();

    child.on("close", (exitCode, signal) => {
      if (timeout) clearTimeout(timeout);
      if (hardKillTimer) clearTimeout(hardKillTimer);
      stdoutLines.flush();
      stderrLines.flush();
      resolve({
        exitCode,
        signal,
        runtimeMs: Date.now() - startedAt,
        stdout,
        stderr,
        timedOut,
        spawnError,
      });
    });
  });
}

export function runShellCommand(
  command: string,
  options: ProcessOptions,
): Promise<ProcessResult> {
  if (process.platform === "win32") {
    return runProcess(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command], options);
  }
  return runProcess(process.env.SHELL ?? "/bin/sh", ["-lc", command], options);
}

export async function executeCommand(
  spec: CommandSpec,
  cwd: string,
  defaultTimeoutMs: number,
  onLine?: (line: string) => void,
): Promise<CommandResult> {
  const required = spec.required ?? true;
  const result = await runShellCommand(spec.command, {
    cwd,
    timeoutMs: spec.timeoutMs ?? defaultTimeoutMs,
    onStdoutLine: onLine,
    onStderrLine: onLine,
  });

  return {
    name: spec.name,
    command: spec.command,
    required,
    status: result.timedOut ? "timed_out" : result.exitCode === 0 ? "passed" : "failed",
    exitCode: result.exitCode,
    runtimeMs: result.runtimeMs,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function packageRunCommand(manager: string, script: string): string {
  return manager === "npm" ? `npm run ${script}` : `${manager} run ${script}`;
}

export async function detectTestCommands(cwd: string): Promise<CommandSpec[]> {
  const commands: CommandSpec[] = [];
  const packageJsonPath = path.join(cwd, "package.json");

  if (await exists(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
        scripts?: Record<string, string>;
      };
      const manager = (await exists(path.join(cwd, "pnpm-lock.yaml")))
        ? "pnpm"
        : (await exists(path.join(cwd, "yarn.lock")))
          ? "yarn"
          : (await exists(path.join(cwd, "bun.lockb"))) ||
              (await exists(path.join(cwd, "bun.lock")))
            ? "bun"
            : "npm";
      const scripts = packageJson.scripts ?? {};
      for (const names of [
        ["test"],
        ["typecheck", "type-check", "check-types"],
        ["lint"],
      ]) {
        const name = names.find((candidate) => scripts[candidate]);
        if (!name) continue;
        if (name === "test" && /no test specified/i.test(scripts[name])) continue;
        commands.push({
          name,
          command: packageRunCommand(manager, name),
          required: true,
        });
      }
      if (commands.length > 0) return commands;
    } catch {
      // Fall through to ecosystem marker detection.
    }
  }

  if ((await exists(path.join(cwd, "pyproject.toml"))) || (await exists(path.join(cwd, "pytest.ini")))) {
    return [{ name: "pytest", command: "python -m pytest", required: true }];
  }
  if (await exists(path.join(cwd, "go.mod"))) {
    return [{ name: "go test", command: "go test ./...", required: true }];
  }
  if (await exists(path.join(cwd, "Cargo.toml"))) {
    return [{ name: "cargo test", command: "cargo test", required: true }];
  }
  if (await exists(path.join(cwd, "pom.xml"))) {
    const executable = (await exists(path.join(cwd, "mvnw"))) ? "./mvnw" : "mvn";
    return [{ name: "maven test", command: `${executable} test`, required: true }];
  }
  if (
    (await exists(path.join(cwd, "build.gradle"))) ||
    (await exists(path.join(cwd, "build.gradle.kts")))
  ) {
    const executable = (await exists(path.join(cwd, "gradlew"))) ? "./gradlew" : "gradle";
    return [{ name: "gradle test", command: `${executable} test`, required: true }];
  }
  return [];
}
