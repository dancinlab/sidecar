---
name: inject
description: |
  Immediately inject the latest sidecar commons.tape + project.tape
  into the CURRENT session and sync the local install for the next
  session. Use when sidecar plugins have been shipped (commons rule
  bumped, project.tape edited, etc.) and the user wants the new
  rules to take effect NOW without restarting Claude Code. Triggers
  on phrases like "inject", "주입", "최신 룰 적용", "refresh
  sidecar", "sidecar sync", "현재 세션에 반영", "다시 로드".
allowed-tools: Bash
---

# inject — immediate in-session rule refresh + install sync

## When to use

Sidecar plugins were shipped (a `commons` version bump, an updated `project.tape`, etc.) and the user wants the new content to apply RIGHT NOW in the running Claude Code session — not just on the next SessionStart.

## What it does (one slash, two effects)

`/inject` runs two things in one go:

1. **`sidecar sync`** — marketplace clone pull → cache copy any new versions → patch `installed_plugins.json` with version/installPath/lastUpdated/gitCommitSha. The NEXT session bootstraps cleanly with the latest.

2. **Print latest `commons.tape` + (cwd's) `project.tape`** to stdout. The slash command's output enters the conversation as the prompt result — the model reads it on the next turn. That IS the immediate injection.

The combination: current turn picks up the new rules (via the printed content); next session loads them via the normal SessionStart + project-tape hooks.

## Why two surfaces

- The `commons` hook fires on SessionStart + PreCompact + PostCompact — but ONLY at those events. A mid-session ship without `/inject` means the current session keeps running on the stale version that was loaded at start.
- The `project-tape` hook fires on PreCompact + PostCompact only. An updated `project.tape` mid-session isn't injected until the next compaction.
- `/inject` forces both surfaces NOW.

## Output shape

```
sidecar sync: N plugin(s) updated · HEAD=<sha7>
  ✓ <plugin>@<version>
  ...

═══ commons.tape (v<latest>) ═══
<full commons.tape content>

═══ project.tape (<cwd-path>/project.tape) ═══     ← only if cwd has project.tape
<full project.tape content>
```

## When NOT to use

- New session about to start anyway — just exit + restart, SessionStart loads fresh.
- No sidecar updates shipped recently — no-op, just wastes tokens with the dump.
- In a non-project cwd (no `project.tape`) — still useful for commons refresh, just no project.tape section.

## Related

- `bin/sidecar sync` — the underlying sync verb (extracted from the manual marketplace pull + cache copy + installed_plugins.json patch pattern).
- `commons` hook — auto-injects on SessionStart + PreCompact + PostCompact.
- `project-tape` hook — auto-injects on PreCompact + PostCompact.
