import { execFile } from "node:child_process";

import type { ReviewFinding } from "./types";

const DEFAULT_GREPTILE_TIMEOUT_MS = 2 * 60 * 1000;
const MAX_GREPTILE_OUTPUT_BYTES = 2 * 1024 * 1024;

export interface CliResult {
  stdout: string;
  stderr: string;
}

export interface CliInvocation {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
}

export type CliRunner = (invocation: CliInvocation) => Promise<CliResult>;

export interface GreptileReviewOptions {
  enabled: boolean;
  cwd: string;
  timeoutMs?: number;
  binary?: string;
  runner?: CliRunner;
}

export interface GreptileReviewResult {
  available: boolean;
  attempted: boolean;
  findings: ReviewFinding[];
  error?: string;
}

function defaultCliRunner(invocation: CliInvocation): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    execFile(
      invocation.command,
      invocation.args,
      {
        cwd: invocation.cwd,
        timeout: invocation.timeoutMs,
        maxBuffer: MAX_GREPTILE_OUTPUT_BYTES,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({ stdout, stderr });
      },
    );
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function firstString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function normalizeSeverity(value: unknown): ReviewFinding["severity"] {
  if (typeof value !== "string") return "warning";
  const severity = value.toLowerCase();
  if (
    severity.includes("error") ||
    severity.includes("critical") ||
    severity.includes("high") ||
    severity === "p0" ||
    severity === "p1"
  ) {
    return "error";
  }
  if (
    severity.includes("info") ||
    severity.includes("low") ||
    severity === "p3"
  ) {
    return "info";
  }
  return "warning";
}

function normalizeLine(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const line = Number(value);
    return line > 0 ? line : undefined;
  }
  return undefined;
}

function findingFromRecord(
  record: Record<string, unknown>,
): ReviewFinding | undefined {
  const location = asRecord(record.location);
  const title = firstString(record, ["title", "summary", "name"]);
  const body = firstString(record, [
    "body",
    "message",
    "description",
    "comment",
    "details",
  ]);

  if (!title && !body) return undefined;

  const file =
    firstString(record, ["file", "path", "filename"])
    ?? (location ? firstString(location, ["file", "path", "filename"]) : undefined);
  const line =
    normalizeLine(record.line)
    ?? normalizeLine(record.lineNumber)
    ?? normalizeLine(record.startLine)
    ?? (location
      ? normalizeLine(location.line)
        ?? normalizeLine(location.lineNumber)
        ?? normalizeLine(location.startLine)
      : undefined);

  return {
    severity: normalizeSeverity(record.severity ?? record.priority ?? record.level),
    title: title ?? body!.split("\n", 1)[0].slice(0, 160),
    body: body ?? title!,
    ...(file ? { file } : {}),
    ...(line ? { line } : {}),
    source: "greptile",
  };
}

function collectFindingRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectFindingRecords);
  }

  const record = asRecord(value);
  if (!record) return [];

  for (const key of ["findings", "comments", "issues", "results"]) {
    if (Array.isArray(record[key])) return collectFindingRecords(record[key]);
  }

  return [record];
}

function dedupeFindings(findings: ReviewFinding[]): ReviewFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = [
      finding.severity,
      finding.file ?? "",
      finding.line ?? "",
      finding.title,
      finding.body,
    ].join("\u0000");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Parse the JSON emitted by `greptile review --json`. */
export function parseGreptileJson(output: string): ReviewFinding[] {
  const trimmed = output.trim();
  if (!trimmed) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const firstBracket = trimmed.indexOf("[");
    const starts = [firstBrace, firstBracket].filter((index) => index >= 0);
    const start = starts.length ? Math.min(...starts) : -1;
    const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
    if (start < 0 || end <= start) return [];

    try {
      parsed = JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return [];
    }
  }

  return dedupeFindings(
    collectFindingRecords(parsed)
      .map(findingFromRecord)
      .filter((finding): finding is ReviewFinding => finding !== undefined),
  );
}

function parseGreptileAgentOutput(output: string): ReviewFinding[] {
  const trimmed = output.trim();
  if (!trimmed || /(?:no findings|no issues|looks good|nothing to report)/i.test(trimmed)) {
    return [];
  }

  const findings: ReviewFinding[] = [];
  const blocks = trimmed.split(/\n(?=(?:[-*]\s+)?(?:\[[^\]]+\]\s*)?(?:[^\n:]+):\d+\b)/);
  for (const block of blocks) {
    const location = block.match(/(?:^|\n)(?:[-*]\s+)?(?:\[[^\]]+\]\s*)?([^\n:]+):(\d+)\s*[-:]?\s*([^\n]*)/);
    if (!location) continue;
    const body = block.trim();
    const title = location[3]?.trim() || body.split("\n", 1)[0].trim();
    findings.push({
      severity: normalizeSeverity(block.match(/\b(error|critical|high|warning|medium|info|low|p[0-3])\b/i)?.[1]),
      title: title.slice(0, 160),
      body,
      file: location[1].trim().replace(/^`|`$/g, ""),
      line: Number(location[2]),
      source: "greptile",
    });
  }
  return dedupeFindings(findings);
}

/** Check for the local binary without invoking a shell. */
export async function isGreptileAvailable(
  options: Omit<GreptileReviewOptions, "enabled">,
): Promise<boolean> {
  const runner = options.runner ?? defaultCliRunner;
  try {
    await runner({
      command: options.binary ?? "greptile",
      args: ["--version"],
      cwd: options.cwd,
      timeoutMs: Math.min(options.timeoutMs ?? DEFAULT_GREPTILE_TIMEOUT_MS, 10_000),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run an optional local Greptile review. Every environmental failure is returned
 * as metadata rather than thrown so evaluation never depends on this integration.
 */
export async function runGreptileReview(
  options: GreptileReviewOptions,
): Promise<GreptileReviewResult> {
  if (!options.enabled) {
    return { available: false, attempted: false, findings: [] };
  }

  const available = await isGreptileAvailable(options);
  if (!available) {
    return {
      available: false,
      attempted: false,
      findings: [],
      error: "Greptile CLI is not available",
    };
  }

  const runner = options.runner ?? defaultCliRunner;
  const invocation = {
    command: options.binary ?? "greptile",
    cwd: options.cwd,
    timeoutMs: options.timeoutMs ?? DEFAULT_GREPTILE_TIMEOUT_MS,
  };

  try {
    const result = await runner({ ...invocation, args: ["review", "--json"] });
    return {
      available: true,
      attempted: true,
      findings: parseGreptileJson(result.stdout),
    };
  } catch (jsonError) {
    try {
      const result = await runner({ ...invocation, args: ["review", "--agent"] });
      return {
        available: true,
        attempted: true,
        findings: parseGreptileAgentOutput(result.stdout),
      };
    } catch (agentError) {
      return {
        available: true,
        attempted: true,
        findings: [],
        error: `Greptile review failed: ${errorMessage(agentError)} (JSON attempt: ${errorMessage(jsonError)})`,
      };
    }
  }
}
