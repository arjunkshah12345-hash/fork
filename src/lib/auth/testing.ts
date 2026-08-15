import { SESSION_COOKIE_NAME, signSessionToken } from "./session";

/** Stable helper for route tests. Set AUTH_SECRET to this value in the test process. */
export const AUTH_TEST_SECRET = "fork-auth-test-secret-at-least-thirty-two-characters";

export function createAuthTestCookie(userId: string, now?: number): string {
  const token = signSessionToken(userId, { secret: AUTH_TEST_SECRET, now });
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
}

