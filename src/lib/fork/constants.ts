import path from "node:path";

export const PROJECT_ROOT = process.cwd();
export const FORK_RUNTIME_ROOT = path.join(PROJECT_ROOT, ".fork", "runs");
export const DEFAULT_AGENT_TIMEOUT_MS = 12 * 60 * 1000;
export const DEFAULT_COMMAND_TIMEOUT_MS = 5 * 60 * 1000;
export const MAX_CAPTURE_CHARS = 120_000;
export const MAX_LOG_LINES = 240;
