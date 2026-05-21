# inject

Immediately inject the latest sidecar `commons.tape` + `project.tape` into the current session AND sync the local install for the next session.

## Trigger

- Slash: `/inject`
- Natural language: *"inject"* · *"주입"* · *"최신 룰 적용"* · *"refresh sidecar"* · *"sidecar sync"* · *"현재 세션에 반영"* · *"다시 로드"*

## What it does

`/inject` runs two things in one slash call:

1. **`sidecar sync`** — marketplace clone pull → cache copy any new versions → patch `installed_plugins.json` (version · installPath · lastUpdated · gitCommitSha). The NEXT session bootstraps with the latest.

2. **Print latest `commons.tape` + (cwd's) `project.tape`** to stdout. The slash output becomes prompt content — the model reads it on the next turn. That's the immediate in-session injection.

## Why both

| Hook | Fires on | Mid-session refresh? |
|---|---|---|
| `commons` | SessionStart · PreCompact · PostCompact | only at those events |
| `project-tape` | PreCompact · PostCompact | only at those events |

Without `/inject`, the current session keeps running on the version loaded at SessionStart — a mid-session sidecar ship is invisible until next session.

`/inject` forces both surfaces NOW.

## When NOT to use

- About to restart Claude Code anyway — SessionStart will load fresh.
- No sidecar updates shipped recently — just wastes tokens.
- In a non-project cwd (no `project.tape`) — still useful for commons; just no project.tape section in output.

## Related

- `bin/sidecar sync` — the underlying mechanical sync (also runs standalone, no Claude session needed).
- `commons` hook — auto-injects on SessionStart + PreCompact + PostCompact.
- `project-tape` hook — auto-injects on PreCompact + PostCompact.
