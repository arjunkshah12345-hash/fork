import { describe, expect, it } from "vitest";

import { authAliasDestination } from "../redirect-target";

describe("auth route aliases", () => {
  it.each([
    ["/sign-in", undefined, "/sign-in"],
    ["/sign-up", undefined, "/sign-up"],
    ["/sign-in", "/dashboard", "/sign-in?next=%2Fdashboard"],
    [
      "/sign-up",
      "/dashboard/runs/run-123?tab=logs",
      "/sign-up?next=%2Fdashboard%2Fruns%2Frun-123%3Ftab%3Dlogs",
    ],
    ["/sign-in", "https://evil.example", "/sign-in"],
    ["/sign-up", "//evil.example/path", "/sign-up"],
    ["/sign-in", "/\\evil.example", "/sign-in"],
  ] as const)("maps %s with next %s to %s", (canonical, next, expected) => {
    expect(authAliasDestination(canonical, next)).toBe(expected);
  });

  it("uses only the first next value", () => {
    expect(authAliasDestination("/sign-in", ["/dashboard", "//evil.example"])).toBe(
      "/sign-in?next=%2Fdashboard",
    );
  });
});
