import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME, safeRedirectTarget, verifySessionToken } from "./session";
import { findUserById } from "./store";
import type { AuthUser } from "./types";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "AuthenticationRequiredError";
  }
}

function cookieFromRequest(request: Request): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== SESSION_COOKIE_NAME) continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function getUserFromSessionToken(
  token: string | undefined,
): Promise<AuthUser | null> {
  const session = verifySessionToken(token);
  if (!session) return null;
  return (await findUserById(session.sub)) ?? null;
}

export async function getUser(request?: Request): Promise<AuthUser | null> {
  const token = request
    ? cookieFromRequest(request)
    : (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return getUserFromSessionToken(token);
}

export async function requireUser(request?: Request): Promise<AuthUser> {
  const user = await getUser(request);
  if (!user) throw new AuthenticationRequiredError();
  return user;
}

export async function requirePageUser(nextTarget = "/dashboard"): Promise<AuthUser> {
  const user = await getUser();
  if (user) return user;
  const safeTarget = safeRedirectTarget(nextTarget);
  redirect(`/sign-in?next=${encodeURIComponent(safeTarget)}`);
}
