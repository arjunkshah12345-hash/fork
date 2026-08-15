import { z } from "zod";

import type { RunRequest } from "@/lib/fork";

const MAX_BODY_BYTES = 1_000_000;

const nonBlank = (label: string, max: number) =>
  z
    .string({ error: `${label} must be a string.` })
    .max(max, `${label} must be at most ${max.toLocaleString()} characters.`)
    .refine((value) => value.trim().length > 0, `${label} is required.`);

const timeout = (label: string, max: number) =>
  z
    .number({ error: `${label} must be a number of milliseconds.` })
    .int(`${label} must be a whole number of milliseconds.`)
    .min(1_000, `${label} must be at least 1,000ms.`)
    .max(max, `${label} must not exceed ${max.toLocaleString()}ms.`);

export const runRequestSchema = z
  .object({
    repository: nonBlank("repository", 2_048),
    task: nonBlank("task", 100_000),
    baseBranch: nonBlank("baseBranch", 255).optional(),
    commands: z
      .array(
        z
          .object({
            name: nonBlank("command name", 120),
            command: nonBlank("command", 20_000),
            required: z.boolean().optional(),
            timeoutMs: timeout("command timeout", 3_600_000).optional(),
          })
          .strict(),
      )
      .max(20, "At most 20 commands may be supplied.")
      .optional(),
    setupCommand: nonBlank("setupCommand", 20_000).optional(),
    agentTimeoutMs: timeout("agentTimeoutMs", 7_200_000).optional(),
    commandTimeoutMs: timeout("commandTimeoutMs", 3_600_000).optional(),
    useGreptile: z.boolean().optional(),
    strategyInstructions: z
      .object({
        minimal: nonBlank("minimal strategy instruction", 30_000).optional(),
        "root-cause": nonBlank("root-cause strategy instruction", 30_000).optional(),
        architecture: nonBlank("architecture strategy instruction", 30_000).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export class RunRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues?: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = "RunRequestError";
  }
}

export async function readRunRequest(request: Request): Promise<RunRequest> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new RunRequestError("The request body is too large.", 413);
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new RunRequestError("The request body is too large.", 413);
  }

  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new RunRequestError("The request body must be valid JSON.", 400);
  }

  const parsed = runRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new RunRequestError(
      "The run request is invalid. Fix the listed fields and retry.",
      422,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join(".") || "$",
        message: issue.message,
      })),
    );
  }
  return parsed.data;
}
