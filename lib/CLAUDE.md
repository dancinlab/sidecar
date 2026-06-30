# lib — shared primitives (engine shared primitives)

> Local guide for the AI/human working in this folder. Higher-level design lives in repo-root [ARCHITECTURE.json](../ARCHITECTURE.json).

## Purpose
Low-level primitives shared by every feature in `modules/`. repo-root discovery, config load, logging, JSONL, shell exec, lockdown judgment. Domain-agnostic — no rules (what to check) are hardcoded here.

## Key files
| File | Role |
|------|------|
| `paths.ts` | repo-root auto-discovery (walk up for harness.config.json/.git) + `LOGS` (.harness/logs/*.jsonl paths) |
| `config.ts` | `config()` = load harness.config.json + merge defaults (SSOT for all guard toggles/thresholds) · `repoPath()` |
| `lockdown.ts` | L0 (lockdown) file judgment (config + 🔴 markdown block parsing) |
| `log.ts` | `info`/`ok`/`warn`/`loudFail` + `appendJsonl` (H1: success quiet, failure loud) |
| `json.ts` | `readJsonl`/`readJsonOr` safe parsing |
| `exec.ts` | `execShell`/`execArgs` shell/argv exec wrappers |

## Rules / conventions
- Add new guard toggles/thresholds to **the `config.ts` interface + defaults here**, and have `modules/` read them only via `config().<key>` (no engine hardcoding · H4 config-driven).
- Go through `repoPath()`/`REPO_ROOT` for paths (no cwd assumptions — linked-worktree safe).
- Emit output via the `log.ts` helpers (no raw `console.log` · H1 consistency).

## Gotchas
- `config()` merges on every call — be mindful of the cost of frequent calls.
- The root discovery in `paths.ts` can walk past a config-less worktree (that's why ing.ts separately uses `git rev-parse --show-toplevel`).

## Related
- Consumers: [modules/](../modules/CLAUDE.md) · design SSOT: [ARCHITECTURE.json](../ARCHITECTURE.json)
