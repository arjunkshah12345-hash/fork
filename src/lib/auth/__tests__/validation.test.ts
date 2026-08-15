import { describe, expect, it } from "vitest";

import { signInSchema, signUpSchema } from "../validation";

describe("authentication validation", () => {
  it("normalizes valid email/password credentials", () => {
    expect(
      signInSchema.parse({
        email: "  PERSON@Example.com ",
        password: "a long password",
      }),
    ).toEqual({ email: "person@example.com", password: "a long password" });
  });

  it("returns field-level sign-up errors", () => {
    const result = signUpSchema.safeParse({
      email: "not-an-email",
      password: "short",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors).toMatchObject({
      email: expect.any(Array),
      password: expect.any(Array),
      confirmPassword: expect.any(Array),
    });
  });
});

