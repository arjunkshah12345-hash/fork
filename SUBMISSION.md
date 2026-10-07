# FORK on Nemotron — Nebius × NVIDIA Global AI Hackathon

> Devpost fields below. Demo video must show a FORK run with `--agent nemotron`: three candidates on Nemotron Nano/Super/Ultra, Ultra judging, one winner. Track: Coding and Agentic Engineering.

**Tagline:** Run the same engineering task three ways on NVIDIA Nemotron, test every branch, ship the best one — all on Nebius Token Factory.

**Repo:** https://github.com/arjunkshah12345-hash/fork

---

## Inspiration
A coding agent gives you one attempt at a task. FORK runs three strategies in parallel — minimal patch, root-cause fix, architecture-first — in isolated git worktrees, scores them, and ships the winner. The Nebius × NVIDIA hackathon was the push to make those candidates run natively on NVIDIA Nemotron, with the right-sized model for each strategy.

## What it does
`--agent nemotron` runs all three candidates on NVIDIA Nemotron via Nebius Token Factory, with no external agent CLI:
- **Minimal patch → Nemotron 3 Nano** (fast, cheap edits)
- **Root-cause fix → Nemotron 3 Super** (tracing a bug through the code)
- **Best architecture → Nemotron 3 Ultra** (deepest reasoning, broadest change)
- **Judge → Nemotron 3 Ultra** reads every scored candidate and picks the one to ship.

Each candidate works in its own worktree through six tools (`list_files`, `read_file`, `write_file`, `replace_in_file`, `run_command`, `finish`), runs the repo's real checks, gets a deterministic score, and only the winner is surfaced. Nothing else touches your checkout.

## How we used the required tech
- **Nebius Token Factory**: every model call is an OpenAI-compatible `chat/completions` request to Token Factory. Model IDs are discovered live from the account's `GET /v1/models`.
- **NVIDIA open-source models**: all candidates and the judge run on **Nemotron 3** (Nano / Super / Ultra). The repo actually calls Token Factory in code (`src/lib/fork/nemotron.ts`), routing each strategy to its model and streaming every step to `agent.jsonl`.

## Built during the hackathon
FORK existed before as a speculative-execution harness driving external CLIs (Codex/Cursor/OpenCode). **New for this hackathon:** the entire `nemotron` provider — an in-process tool-calling agent loop against Nebius Token Factory, strategy→model routing across Nemotron Nano/Super/Ultra, Ultra as the judge, a worktree-sandboxed tool set, and 8 new tests (73 total passing).

## How to run / test
`npm install`, set `NEBIUS_API_KEY`, then:
```
npx tsx scripts/run-fork.ts --repo examples/demo-repo --task "$(cat examples/demo-repo/TASK.md)" --agent nemotron
```
`npx vitest run` → 73 passing tests, including the full read→edit→verify→finish loop against a scripted fake Token Factory and the Ultra judge.

## Tech
Next.js/TypeScript, Nebius Token Factory (OpenAI-compatible API), NVIDIA Nemotron 3, git worktrees, deterministic scoring + judge.

## Challenges
Giving each Nemotron tier a tool loop that edits safely (worktree-confined file tools, exactly-one-match replacements) and surfaces every step to the existing dashboard unchanged, so the Nemotron runs look identical to the CLI-driven ones.

## What's next
Per-tier effort tuning, a cost-vs-quality view across the three Nemotron models, and parallel candidate execution on Token Factory serverless jobs.
