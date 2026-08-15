import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import type { SessionPayload } from "./types";

export const SESSION_COOKIE_NAME = "fork_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const DEVELOPMENT_AUTH_SECRET =
  "fork-development-only-auth-secret-not-for-production-v1";

const payloadSchema = z
  .object({
    v: z.literal(1),
    sub: z.string().min(1).max(128),
    iat: z.number().int().nonnegative(),
    exp: z.number().int().positive(),
  })
  .strict();

export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

export function getAuthSecret(explicitSecret?: string): string {
  const configured = explicitSecret ?? process.env.AUTH_SECRET;
  if (configured) {
    if (configured.length < 32) {
      throw new AuthConfigurationError("AUTH_SECRET must contain at least 32 characters.");
    }
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    throw new AuthConfigurationError("AUTH_SECRET is required in production.");
  }
  return DEVELOPMENT_AUTH_SECRET;
}

function signature(value: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(value).digest();
}

export interface SignSessionOptions {
  secret?: string;
  now?: number;
  maxAgeSeconds?: number;
}

export function signSessionToken(
  userId: string,
  options: SignSessionOptions = {},
): string {
  const now = options.now ?? Math.floor(Date.now() / 1_000);
  const payload: SessionPayload = {
    v: 1,
    sub: userId,
    iat: now,
    exp: now + (options.maxAgeSeconds ?? SESSION_MAX_AGE_SECONDS),
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${signature(encoded, getAuthSecret(options.secret)).toString("base64url")}`;
}

export interface VerifySessionOptions {
  secret?: string;
  now?: number;
}

export function verifySessionToken(
  token: string | undefined,
  options: VerifySessionOptions = {},
): SessionPayload | null {
  if (!token || token.length > 2_048) return null;
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return null;

  try {
    const expected = signature(encoded, getAuthSecret(options.secret));
    const supplied = Buffer.from(suppliedSignature, "base64url");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const parsed = payloadSchema.safeParse(
      JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown,
    );
    if (!parsed.success) return null;
    const now = options.now ?? Math.floor(Date.now() / 1_000);
    if (parsed.data.exp <= now || parsed.data.iat > now + 60) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function safeRedirectTarget(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  if (value.includes("\\") || /[\r\n\0]/.test(value)) return fallback;
  try {
    const target = new URL(value, "http://fork.local");
    if (target.origin !== "http://fork.local") return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}

