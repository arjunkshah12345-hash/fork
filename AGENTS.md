<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# FORK repository guidance

- Keep the core workflow real: Git worktrees, Codex processes, repository checks,
  deterministic scoring, judge, then explicit PR publication.
- Never replace subprocess state with mocked UI data.
- Runtime artifacts belong under `.fork/` and secrets belong in environment
  variables only.
- Follow `design.md` and Vercel’s Web Interface Guidelines for interface work.
- Keep the UI dark, restrained, keyboard-operable, and honest about every state.
- Preserve the 3 strategy IDs and the 50/30/10/10 score weights unless the
  product contract changes explicitly.
