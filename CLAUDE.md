# sidecar

Project-agnostic AI coding sidecar — guards, injects, and runbooks that wire a single `sidecar`
CLI into any agent via hooks. Config-driven, zero domain hardcoding; ships as a global command
(`~/.sidecar/cli` + `~/.local/bin/sidecar`, bootstrapped by `sidecar install`). One engine, two
agent surfaces: a **Claude Code plugin** (`/plugin` · `hooks/`) and a **Pi extension**
(`sidecar pi install` · `pi/`) — both call the SAME CLI; only the wiring is per-agent.

> 📍 SSOT pointers (this file = entry point + work rules only):
> · **structure/design → [ARCHITECTURE.json](ARCHITECTURE.json)** — the directory/module tree is the single SSOT **here** (`sidecar architecture inject` injects it at SessionStart · humans: `python3 serve.py` HTML viewer)
> · governance → [config/commons.md](config/commons.md) (always-on · slug-keyed do/dont)
> · history → [CHANGELOG.jsonl](CHANGELOG.jsonl) (append)

## Project
Project-agnostic AI coding sidecar — a single config-driven engine that wires guards, context injects,
and runbooks into any agent via hooks. The engine (when/how to check) is shared; the rules (what to
check) are per-repo data. Ships as a global `sidecar` CLI driving two agent surfaces: a Claude Code
plugin (`hooks/`) and a Pi extension (`pi/`). The 60 CLI modules are agent-neutral; each surface is a
thin adapter translating that agent's hook contract to/from the CLI. Stop hard-gates are CC-only
(Pi has no blocking stop hook); per-turn injects re-assert the rules on both.

## Tree
Top-level orientation map (deep module SSOT = [ARCHITECTURE.json](ARCHITECTURE.json)):

```
sidecar/
├─ bin/        — runtime auto-detect launcher (L1 exec entry)
├─ cli/        — index.ts dispatcher (L2 command routing)
├─ lib/        — shared primitives (paths·config·log·exec·lockdown · L3)
├─ modules/    — feature modules + code guards (one file per command · L4)
├─ config/     — bundled rule data (commons·enforcement·severity-map · L5)
├─ hooks/      — Claude Code plugin hook wiring (hooks.json + run.sh)
├─ pi/         — Pi coding-agent bridge extension (sidecar.ts · same CLI wired to Pi events)
├─ commands/   — slash-command delegators (the SOURCE shadow mirrors)
├─ templates/  — runbook-style command guides
└─ state/      — single root for work outputs (preserve-state)
```

## Work rules (this repo)
- do: **any impl/fix done → auto `sidecar ship`** (no 4-axis box): all surfaces (pr-cycle→self-update→shadow) · docs first (CHANGELOG+ARCHITECTURE) · config-only=`--no-doc` (`cycle-docs-pr`)
- do: new command = `modules/<name>.ts` + `cli/index.ts` register + help line + CHANGELOG (+ `templates/`·`commands/` md) → `help` loads + `sidecar toolkit write` (catalog 100%) + smoke-verify
- do: **hook-wired feature (guard·inject·lifecycle) → wire BOTH surfaces**: CC (`hooks/`) AND Pi (`pi/sidecar.ts`) — CLI shared, wiring per-surface · one side only = other agent unaffected (`wire-to-prod`)
- do: **new Stop/lifecycle hook → wire in BOTH `hooks/hooks.json` AND `modules/setup.ts` Stop[]** — the LIVE hooks are `~/.claude/settings.json` (calls `sidecar <cmd>` directly, NOT the plugin cache); `install-hooks` writes setup.ts's list there. hooks.json-only = never fires (reload/`/plugin update` are red herrings) → after adding: `install-hooks --global` + `grep <hook> ~/.claude/settings.json` to verify (`setup-ts-1`)
- dont: running only `pr-cycle`+`self-update`, skipping `shadow` — new slash won't show in picker, "not reflected" recurs (so all three bundle into `ship`) · wiring one surface only

## inject-lint — no truncation, lint at authoring time (why: per-turn inject bloat = context-rot → agent degradation · `commons-md-1`)
- do: keep each inject source lean **at author time** — per-turn bloat = context-rot → **agent dumber** · `lint.injectCaps` (per-source) + `lint.injectBudgetBytes` (aggregate) · lint+ship-0 block · new inject → add cap/budget
- do: injects from **emitters** (toolkit et al.) carry each item **complete-but-lean** — HELP line 1 = standalone summary ≤200B emitted VERBATIM (`toolkit check` gate) · overflow → JSONL `detail`
- dont: **never truncate an inject at emit/runtime — truncate·tail-cut·emitter `.slice(0,N)`** (140B cut ate `lab full=BOTH`) · if bloated trim the source · no unlinted inject · don't empty injectCaps
