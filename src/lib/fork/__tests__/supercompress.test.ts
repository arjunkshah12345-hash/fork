import { describe, expect, it } from "vitest";

import { parseCompressionPayload } from "../supercompress";

describe("SuperCompress result parsing", () => {
  it("normalizes hosted and local response metrics", () => {
    expect(
      parseCompressionPayload({
        compressed_text: "kept context",
        original_tokens: 1_000,
        kept_tokens: 360,
        tokens_saved_pct: 64,
      }),
    ).toEqual({
      compressed_text: "kept context",
      original_tokens: 1_000,
      kept_tokens: 360,
      tokens_saved: 640,
      tokens_saved_pct: 64,
    });
  });

  it("rejects malformed responses instead of sending empty context to agents", () => {
    expect(() => parseCompressionPayload({ compressed_text: "missing metrics" })).toThrow(
      "invalid result",
    );
  });
});
