---
description: Foreground-sequential fan-out trigger — print a plan table, then run each branch the previous assistant turn offered ONE AT A TIME in the foreground (await each before the next). Equivalent to "all fg go" in natural language. Optional argument lists specific branches (defaults to all). The sequential sibling of /all-bg-go.
argument-hint: "[branch-label, ...]"
allowed-tools: Agent, Bash, Read
---

Engage the `all-fg-go` skill: look at the immediately-preceding assistant turn, enumerate every distinct branch / option / direction it proposed to the user, then:

1. Print a compact plan table — `| # | label | subagent_type | iso | goal |` — so the sequential plan is visible.
2. Run the branches ONE AT A TIME, in order. For each branch `i/N`: print `▶ i/N <label>`, execute it in the FOREGROUND (an `Agent` call with `run_in_background: false`, `isolation: "worktree"` if it edits code, a fully self-contained prompt), AWAIT its completion, then print `✅`/`⚠`/`❌` with a one-line result before moving to the next.

SEQUENTIAL + FOREGROUND — exactly one branch runs at a time, no parallelism, no background fan-out. This is the sibling of `/all-bg-go` (parallel background); pick this when each branch must be watched in order (careful review · a single-threaded shared resource · step-by-step debugging).

HALT on failure: if a branch fails, stop, report the failed branch + its verbatim error + the un-run tail, and do NOT continue to the next branch until the user resolves it (same bar as the `bypass` self-check / `/sbs` halt).

REACTIVE only — run exactly what the prior turn offered. For a self-generating repeatable foreground loop (enumerate next work → plan → run → loop), the user wants `/cycle-fg`, not this; if there is no prior-turn list, point there.

If `$ARGUMENTS` is non-empty, restrict the run to the branches matching those labels; otherwise run everything. Follow the guardrails in SKILL.md (no parallelism, no invented branches, no destructive runs, cap >8 with confirm, no nesting).

End the message with this exact shape:

```
N branches run sequentially (foreground): <branch labels> — <done>/<N> ✅

Next iteration: `all fg go` to run the next round of branches in order.
```

The `Next iteration` line is intentional — it biases the TUI's prompt-suggestion-generator (ghost-text auto-suggest) toward proposing `all fg go` again.
