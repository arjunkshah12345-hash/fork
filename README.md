# FORK

Fork runs the same engineering task three ways—minimal patch, root-cause fix,
and architecture-first—inside isolated git worktrees. It executes the repository's
checks, reviews the diffs, scores the candidates, and selects a winner without
mixing candidate changes into your checkout.

## Setup

Requirements: Node.js 20+, npm, git, and the Codex CLI available as `codex`.

```bash
npm install
codex login
cp .env.example .env.local
```

For deployed environments, set `AUTH_SECRET` to a random value generated with
`openssl rand -base64 32`. Local development can boot without it and uses a
clearly non-production signing fallback. Accounts are stored under the ignored
`.fork/auth/` directory so the complete sign-up and sign-in flow works without
provisioning an identity vendor for the demo.

Confirm the agent is usable before starting a paid or long run:

```bash
codex --version
codex exec --help
```

Fork invokes Codex non-interactively. Your normal `codex login` session is the
recommended authentication path; an API key is not required when that session is
valid. The Codex process must be allowed to read and write the generated worktrees
and execute the configured repository commands.

## Reproducible CLI demo

The fixture in `examples/demo-repo` is a dependency-free JavaScript project with
a deliberately broken interval merger, a visible test suite, evaluator tests,
and a sample `fork.config.json`. Run the entire demo with:

```bash
npm run demo
```

If the package script is unavailable in an intermediate checkout, the equivalent
command is `npx tsx scripts/demo.ts`. It copies the fixture to a unique directory
under `.fork/demo`, initializes and commits a local git repository, then calls the
core `runFork(request, { onEvent })` orchestrator. The template never contains a
nested `.git` directory, so every run starts from the same clean commit.

The intentionally broken baseline should fail its tests:

```bash
cd examples/demo-repo
npm test
npm run test:hidden
```

Run Fork against another repository with a task string or a JSON config:

```bash
npx tsx scripts/run-fork.ts --repo /absolute/path/to/repo \
  --task "Fix the flaky cache invalidation test without changing the public API"

npx tsx scripts/run-fork.ts --repo /absolute/path/to/repo \
  --config /absolute/path/to/fork.config.json
```

The CLI imports `src/lib/fork/orchestrator.ts` first and the public
`src/lib/fork/index.ts` barrel second. Either must export
`runFork(request, { onEvent? }): Promise<ForkRun>`; if neither does, the command
stops with that exact integration contract instead of silently faking a run.

## Web UI

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create a local account, and
enter the workspace. The product is split into focused surfaces:

- `/` explains the speculative-execution model.
- `/sign-up` and `/sign-in` manage the local account and signed session.
- `/dashboard` creates runs and shows real run history.
- `/dashboard/runs/:id` streams the three candidates and progressively reveals
  checks, review findings, files, diffs, logs, and the final decision.

Enter a local Git path or a cloneable repository URL, describe the task, and
start the run. Keep the dev server alive while candidates execute. Runtime state,
generated worktrees, and local account records live under `.fork/`; they are
operational artifacts and should not be committed.

## Checks and scoring

Every command in the run request records its exit code, runtime, and captured
output. Required failed or timed-out checks disqualify a candidate. Candidates
that remain eligible are ranked using test results, review quality, patch
simplicity, and completion speed; the result shows the component scores and the
judge rationale. A small fast diff does not outrank a correct diff when required
checks fail.

The demo calls both `npm test` and `npm run test:hidden`. In a real integration,
keep evaluator-only tests outside the candidate's source checkout and expose them
to the command runner through your CI or evaluation harness. The fixture includes
them in-tree solely to make the public demo reproducible.

## Optional Greptile review

Local scoring works without Greptile. To enable the optional review provider,
install and authenticate the `greptile` CLI so `greptile --version` succeeds in
the server environment. If your Greptile setup uses an environment token, set
`GREPTILE_API_KEY` only on the server. Then enable reviews in the request config,
set `FORK_USE_GREPTILE=true`, or pass `--greptile` to the CLI. `--no-greptile`
always wins over config and environment settings. Never expose the key through a
`NEXT_PUBLIC_` variable or commit it to a config file.

## GitHub pull requests

Local demo runs stay local. For a GitHub-backed repository, configure an `origin`
remote and authenticate git/GitHub in the server environment. Evaluation itself
does not publish anything. The explicit **Create PR** action may publish only the
selected candidate branch and create one pull request; losing branches remain
local run artifacts. It does not merge, force-push, or rewrite the base branch. If
authentication or push fails, the evaluated result and winner remain available
and the UI reports PR publication as a separate error.

Use a narrowly scoped token with access only to the target repository. Protected
branches, required reviews, and CI continue to apply normally.

## Security model

Fork executes repository-controlled setup and test commands and gives coding
agents write access inside generated worktrees. Treat every target repository as
untrusted code: run Fork in a disposable VM or container for unknown projects,
use least-privilege credentials, do not mount SSH keys or cloud credentials, and
review commands before execution. Keep `.env.local`, `.fork/`, and agent logs out
of version control because they can contain secrets or sensitive source output.

The orchestrator should enforce command and agent timeouts, bounded output
capture, isolated worktrees, and explicit allowed repository locations. Fork is
not a security sandbox by itself.
