import { describe, expect, it } from "vitest";

import {
  safeRedirectTarget,
  signSessionToken,
  verifySessionToken,
} from "../session";

const secret = "session-test-secret-that-is-longer-than-thirty-two-characters";

describe("signed sessions", () => {
  it("round-trips a signed, expiring user id", () => {
    const token = signSessionToken("user-123", {
      secret,
      now: 1_000,
      maxAgeSeconds: 300,
    });
    expect(verifySessionToken(token, { secret, now: 1_100 })).toMatchObject({
      sub: "user-123",
      iat: 1_000,
      exp: 1_300,
    });
  });

  it("rejects tampered, expired, and incorrectly signed tokens", () => {
    const token = signSessionToken("user-123", {
      secret,
      now: 1_000,
      maxAgeSeconds: 60,
    });
    expect(verifySessionToken(`${token}x`, { secret, now: 1_010 })).toBeNull();
    expect(verifySessionToken(token, { secret: `${secret}different`, now: 1_010 })).toBeNull();
    expect(verifySessionToken(token, { secret, now: 1_060 })).toBeNull();
  });
});

describe("safeRedirectTarget", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/runs/abc?tab=logs#latest", "/runs/abc?tab=logs#latest"],
    ["https://evil.example", "/dashboard"],
    ["//evil.example/path", "/dashboard"],
    ["/\\evil.example", "/dashboard"],
    ["/dashboard\r\nlocation:https://evil.example", "/dashboard"],
    [undefined, "/dashboard"],
  ])("maps %s to a safe local target", (input, expected) => {
    expect(safeRedirectTarget(input, "/dashboard")).toBe(expected);
  });
});

