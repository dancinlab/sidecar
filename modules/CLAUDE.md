# modules — feature modules (one file per command + code-level guards)

> Local guide for the AI/human working in this folder. Higher-level design lives in repo-root [ARCHITECTURE.json](../ARCHITECTURE.json).

## Purpose
The implementation of each subcommand dispatched by `cli/index.ts` + PreToolUse/PostToolUse hook logic. Sits on top of the `lib/` parts and holds "when/how to check". The rule data (what to check) is read from `config/`·`.harness/` JSON.

## Key files (representative)
| File | Role |
|------|------|
| `pre.ts` | PreToolUse(Bash/Write/AskQuestion) — evaluate code-level guards → config enforcement regexes (guards run before config and cannot be turned off) |
| `post.ts` | PostToolUse — exit routing · L0 edit warning · folder nudge |
| `cloud-guard.ts` | block raw GPU provider CLI/API (vast/vastai/runpod/runpodctl·api.runpod.*) · quote-aware segments |
| `naming-guard.ts` | block version/copy-suffix file·folder names (`_v2`·`_copy`…) |
| `state-guard.ts` | block scatter directories (.verdicts/bench/…) → steer to `state/` |
| `docs.ts` | single-doc discipline (block scatter `.md` + quickref) |
| `lint.ts` | commit-time gate — collection of staged checks (CHANGELOG·folder-guide·convergence-record…) |
| `ing.ts` · `folders.ts` · `architecture.ts` · `toolkit.ts` … | in-progress board · folder guide · design-inject+recurrence-learning store · command catalog |

## Rules / conventions
- New command = `modules/<name>.ts` + `cli/index.ts` registration + help line + CHANGELOG (+ `templates/`·`commands/`) → `toolkit write` catalog 100%.
- Code guards run **before config** and cannot be turned off via profile edits (only inline `# …-ok` markers are the exception) — recurrence-prevention learning is recorded in the single SSOT `convergence.records[]` of `ARCHITECTURE.json` (inline markers retired · lint enforces well-formed · auto-surfaced on file touch).
- Toggles·thresholds only in `lib/config.ts` (no hardcoding here).

## Gotchas
- PreToolUse input is read from **STDIN** (`$CLAUDE_TOOL_INPUT` is not populated by current CC) · block uses the `hookSpecificOutput.permissionDecision:deny` schema (legacy `decision:block` is ignored).
- When parsing shell commands, `|`/`;` inside quotes are data — split after quote-awareness like `segments()` in `cloud-guard.ts` (avoid quoted-regex false-blocks).
- The help block is a backtick template literal — putting a backtick in a description breaks the string (use single quotes).

## Related
- Parts: [lib/](../lib/CLAUDE.md) · dispatch: `cli/index.ts` · rule data: `config/`·`.harness/` · design SSOT: [ARCHITECTURE.json](../ARCHITECTURE.json)
