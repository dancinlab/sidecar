# limit-guard

PostToolUse(Task) hook — catches a session/usage-limit signal in a subagent result and injects a checkpoint directive so work-in-progress is saved before more quota is spent.

## What it does

When a subagent (`Task` tool) completes, the hook scans its result for a session/usage-limit signal (`hit your session limit`, `hit your usage limit`, or `session limit` + `resets`). On a match it emits a non-blocking `additionalContext` instructing the agent to:

1. **Report how far it got** — per work item, what is committed (with SHAs) vs uncommitted, and where work stopped.
2. **Commit + push uncommitted work** — a limit hit mid-edit loses uncommitted work.
3. **Write `.claude/RESUME.md`** — a resume manifest: done items, remaining items, the limit reset time, the next concrete step.
4. **Stop parallel fan-out** — switch to sequential foreground work, one committed increment at a time.

No match → silent pass-through.

## Why

Parallel subagent fan-outs burn quota fast. When the limit hits, N agents fail at once and uncommitted work is lost. Sequential work with a commit per unit caps the loss at a single unit, and a resume manifest lets a post-reset session pick up cleanly.

## Implementation

`bin/_limit_guard.hexa`, invoked via `hexa run` from `hooks/hooks.json`. No Python, no shell shim.

## Opt out

- `SIDECAR_NO_LIMIT_GUARD=1`
- `~/.claude/sidecar/disabled.json` → `{"disabled":["limit-guard"]}`
