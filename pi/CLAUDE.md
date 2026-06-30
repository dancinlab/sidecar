# pi — Pi coding-agent bridge

> Local guide for the AI/human working in this folder. Top-level design is repo-root [ARCHITECTURE.json](../ARCHITECTURE.json).

## Purpose
Wires sidecar governance into **Pi (earendil-works/pi-coding-agent)**. Claude Code does it via
`hooks/hooks.json` + `run.sh`; Pi does it via the single TS extension in this folder — **both call the same
`sidecar` CLI (modules/*.ts)**. The engine (60 modules) is not touched by a single line; this
file is the adapter that translates Pi events ↔ CC-style hook JSON.

## Key files
| File | Role |
|------|------|
| `sidecar.ts` | Pi extension — `pi.on()` lifecycle handlers spawn `sidecar <verb>`, translating CC-style output (`hookSpecificOutput.additionalContext` / `permissionDecision:"deny"`) into Pi return shapes (`{message}` / `{block}`) |

## Surface mapping (CC hooks.json ↔ Pi events)
| Claude Code | Pi event | sidecar verb |
|------|------|------|
| UserPromptSubmit (per-turn inject + prompt-scan) | `before_agent_start` | commons·claudemd·recommend·prefs·easy·load·ing inject + prompt |
| SessionStart (one-time inject + gc) | `session_start` + first `before_agent_start` | architecture·git-context·toolkit·companions inject · worktree gc |
| PreToolUse (guards) | `tool_call` (can block) | pre bash/write/touch/tool |
| PostToolUse (Write\|Edit) | `tool_result` (advisory) | post edit |
| Stop (hard re-turn gate) | — | **not wired** (Pi has no blocking stop hook → CC-only) |

## Rules / gotchas
- **No engine edits** — only this adapter handles the Pi-side translation. When a new CC hook surface appears, mirror its mapping here in lockstep.
- The inject verbs must read stdin's `{"hook_event_name": "..."}` before they emit (CC's run.sh inherits stdin) — `before_agent_start` synthesizes the `UserPromptSubmit`/`SessionStart` carrier and pipes it.
- Inject text has **two** carriers — most via stdout JSON (`additionalContext`), some (toolkit·companions) via **stderr plain text** → `extractContext(.., true)` absorbs both.
- `git-context` is intentionally silent when clean + on the default branch (empty output is normal).
- block uses the current CC schema `hookSpecificOutput.permissionDecision:"deny"` (the legacy `decision:"block"` is also parsed).
- Install: `sidecar pi install` symlinks this file to `~/.pi/agent/extensions/sidecar.ts` (global clone → self-update refreshes it too) + adds `~/.claude/skills` to Pi settings.skills[]. `sidecar install` also wires it automatically when Pi is detected.

## Related
- CC wiring: [hooks/](../hooks/) · install module: [modules/pi.ts](../modules/pi.ts) · design SSOT: [ARCHITECTURE.json](../ARCHITECTURE.json)
