import { describe, expect, it } from "vitest";

import { parseGitHubRemote } from "../pr";

describe("parseGitHubRemote", () => {
  it.each([
    ["git@github.com:openai/codex.git", "openai/codex"],
    ["https://github.com/openai/codex.git", "openai/codex"],
    ["ssh://git@github.com/openai/codex.git", "openai/codex"],
    ["git://github.com/openai/codex", "openai/codex"],
  ])("accepts GitHub remote %s", (remote, repository) => {
    expect(parseGitHubRemote(remote)?.repository).toBe(repository);
  });

  it.each([
    "/tmp/local-repository",
    "file:///tmp/local-repository",
    "git@gitlab.com:openai/codex.git",
    "https://example.com/openai/codex.git",
    "https://token:secret@github.com/openai/codex.git",
    "https://github.com/openai/codex/extra",
  ])("rejects a local, credential-bearing, or non-GitHub remote: %s", (remote) => {
    expect(parseGitHubRemote(remote)).toBeUndefined();
  });
});

