# FORK build workflow

Objective: ship and verify the local speculative-execution loop.

```text
types/contracts
  ├─> worktree + Codex runner ─┐
  ├─> evaluator + judge ───────┼─> CLI integration ─> real demo proof
  └─> demo fixture ────────────┘                         │
                                                       ├─> API + PR flow
                                                       └─> live UI
                                                               │
                                                build + browser verification
```

Edges exist only where the downstream stage consumes the upstream contract.
Candidate processes run concurrently and failures stay isolated. The fan-in
barrier is evaluation, because scoring and speed normalization require the full
candidate set.

Verify rule: a synthetic process/worktree integration must pass before a real
Codex run; the real run must persist diffs and command results; production build
and browser checks must pass before release.

Stop condition: app can start locally, run the included demo through all 3
worktrees, select a winner, and either create a winning PR or return an
actionable no-remote error.
