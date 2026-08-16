import { readFile } from "node:fs/promises";
import path from "node:path";

import { runProcess } from "./process";
import type { SupercompressRunState } from "./types";

const MAX_CONTEXT_CHARS = 160_000;
const MAX_FILE_CHARS = 30_000;
const CONTEXT_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "README",
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
] as const;

export interface PreparedSupercompressContext {
  context?: string;
  state: SupercompressRunState;
}

interface CompressionPayload {
  compressed_text: string;
  original_tokens: number;
  kept_tokens: number;
  tokens_saved?: number;
  tokens_saved_pct: number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function parseCompressionPayload(value: unknown): CompressionPayload {
  if (!value || typeof value !== "object") throw new Error("SuperCompress returned no result.");
  const payload = value as Partial<CompressionPayload>;
  if (
    typeof payload.compressed_text !== "string" ||
    typeof payload.original_tokens !== "number" ||
    typeof payload.kept_tokens !== "number" ||
    typeof payload.tokens_saved_pct !== "number"
  ) {
    throw new Error("SuperCompress returned an invalid result.");
  }
  return {
    compressed_text: payload.compressed_text,
    original_tokens: payload.original_tokens,
    kept_tokens: payload.kept_tokens,
    tokens_saved:
      typeof payload.tokens_saved === "number"
        ? payload.tokens_saved
        : Math.max(0, payload.original_tokens - payload.kept_tokens),
    tokens_saved_pct: payload.tokens_saved_pct,
  };
}

async function repositoryContext(repository: string): Promise<string> {
  const sections: string[] = [];
  const files = await runProcess("git", ["-C", repository, "ls-files"], {
    cwd: repository,
    timeoutMs: 15_000,
    maxCaptureChars: 120_000,
  });
  if (files.exitCode === 0 && files.stdout.trim()) {
    sections.push(`## Repository file map\n${files.stdout.trim()}`);
  }

  for (const relative of CONTEXT_FILES) {
    if (sections.join("\n\n").length >= MAX_CONTEXT_CHARS) break;
    try {
      const content = (
        await readFile(path.join(/* turbopackIgnore: true */ repository, relative), "utf8")
      ).slice(0, MAX_FILE_CHARS);
      if (content.trim()) sections.push(`## ${relative}\n${content.trim()}`);
    } catch {
      // Optional orientation files vary by ecosystem.
    }
  }
  return sections.join("\n\n").slice(0, MAX_CONTEXT_CHARS);
}

async function compressLocally(context: string, query: string): Promise<CompressionPayload> {
  const python = process.env.FORK_PYTHON_BIN ?? "python3";
  const script = [
    "import json, sys",
    "from supercompress import compress_context",
    "data = json.load(sys.stdin)",
    "result = compress_context(data['context'], data['query'])",
    "print(json.dumps({",
    "  'compressed_text': result.compressed_text,",
    "  'original_tokens': result.original_tokens,",
    "  'kept_tokens': result.kept_tokens,",
    "  'tokens_saved': result.tokens_saved,",
    "  'tokens_saved_pct': getattr(result, 'tokens_saved_pct', result.savings_pct),",
    "}))",
  ].join("\n");
  const result = await runProcess(python, ["-c", script], {
    cwd: process.cwd(),
    input: JSON.stringify({ context, query }),
    timeoutMs: 30_000,
    maxCaptureChars: MAX_CONTEXT_CHARS,
  });
  if (result.exitCode !== 0) {
    throw new Error(result.spawnError ?? result.stderr.trim() ?? "Local SuperCompress failed.");
  }
  return parseCompressionPayload(JSON.parse(result.stdout));
}

const SUPERCOMPRESS_COMPRESS_URL = "https://supercompress.dev/api/v1/compress";

export function hostedSupercompressUrl(): string {
  return SUPERCOMPRESS_COMPRESS_URL;
}

async function compressHosted(
  context: string,
  query: string,
  apiKey?: string,
): Promise<CompressionPayload> {
  const key = apiKey?.trim() || process.env.SUPERCOMPRESS_API_KEY;
  if (!key) throw new Error("No SuperCompress API key is configured.");
  const response = await fetch(SUPERCOMPRESS_COMPRESS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": key,
    },
    body: JSON.stringify({ context, query }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Hosted SuperCompress returned HTTP ${response.status}.`);
  return parseCompressionPayload(await response.json());
}

/**
 * Verifies that an API key is accepted by the hosted SuperCompress service.
 * Used when a user links their account so the connection is validated before
 * it is saved.
 */
export async function verifySupercompressApiKey(apiKey: string): Promise<CompressionPayload> {
  const key = apiKey.trim();
  if (!key) throw new Error("Enter a SuperCompress API key.");
  let response: Response;
  try {
    response = await fetch(SUPERCOMPRESS_COMPRESS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": key,
      },
      body: JSON.stringify({ context: "SuperCompress account verification.", query: "verify" }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("SuperCompress could not be reached. Check your connection and retry.");
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error("That SuperCompress API key was rejected. Check the key and retry.");
  }
  if (!response.ok) {
    throw new Error(`SuperCompress could not verify the key (HTTP ${response.status}).`);
  }
  return parseCompressionPayload(await response.json());
}

function stateFromPayload(
  payload: CompressionPayload,
  mode: "local" | "hosted",
  mcpReady: boolean,
): SupercompressRunState {
  return {
    enabled: true,
    status: "compressed",
    mode,
    originalTokens: payload.original_tokens,
    keptTokens: payload.kept_tokens,
    tokensSaved: payload.tokens_saved,
    tokensSavedPct: payload.tokens_saved_pct,
    mcpReady,
    detail: mcpReady
      ? "Shared repository orientation compressed before launch; MCP compression is ready inside each agent run."
      : "Shared repository orientation compressed before launch. Run `supercompress setup` to add MCP compression inside agent tool loops.",
  };
}

async function checkSupercompressMcp(cwd: string): Promise<boolean> {
  const result = await runProcess(
    process.env.FORK_SUPERCOMPRESS_BIN ?? "supercompress",
    ["mcp-check"],
    { cwd, timeoutMs: 15_000, maxCaptureChars: 4_000 },
  );
  return result.exitCode === 0 && !result.timedOut;
}

export async function prepareSupercompressContext(
  repository: string,
  task: string,
  enabled: boolean,
  apiKey?: string,
): Promise<PreparedSupercompressContext> {
  if (!enabled) {
    return { state: { enabled: false, status: "disabled", detail: "Disabled for this run." } };
  }

  try {
    const context = await repositoryContext(repository);
    if (!context.trim()) throw new Error("The repository has no compressible orientation context.");
    const mcpReady = await checkSupercompressMcp(repository);
    try {
      const compressed = await compressLocally(context, task);
      return {
        context: compressed.compressed_text,
        state: stateFromPayload(compressed, "local", mcpReady),
      };
    } catch (localError) {
      const hasKey = Boolean(apiKey?.trim() || process.env.SUPERCOMPRESS_API_KEY);
      if (!hasKey) throw localError;
      const compressed = await compressHosted(context, task, apiKey);
      return {
        context: compressed.compressed_text,
        state: stateFromPayload(compressed, "hosted", mcpReady),
      };
    }
  } catch (error) {
    return {
      state: {
        enabled: true,
        status: "unavailable",
        detail: `${errorMessage(error)} Connect a SuperCompress account or run \`pip install supercompress\`; candidates will continue without preprocessing.`,
      },
    };
  }
}
