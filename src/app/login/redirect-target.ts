import { safeRedirectTarget } from "../../lib/auth/session";

export function authAliasDestination(
  canonicalPath: "/sign-in" | "/sign-up",
  next: string | string[] | undefined,
): string {
  const requested = Array.isArray(next) ? next[0] : next;
  const safeNext = safeRedirectTarget(requested, "");
  return safeNext
    ? `${canonicalPath}?next=${encodeURIComponent(safeNext)}`
    : canonicalPath;
}

