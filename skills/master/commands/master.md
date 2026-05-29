---
description: /master <verb> — owner-only sidecar maintenance control-plane. Verbs — bare/status · update (check→plan→dispatch to /sbs, runs to `go`) · check · audit · lint · sync. Master-tier (gated by ~/.sidecar/master). Never edits governance SSOT or ships directly — delegates to /sbs.
argument-hint: "[status|update|check|audit|lint|sync]"
allowed-tools: Bash, WebSearch, WebFetch, Skill, Read
---

`/master` is the sidecar OWNER (creator) maintenance console. Parse `$ARGUMENTS`:
first token = verb (empty → `status`). It maintains sidecar ITSELF; it never
edits a governance SSOT (commons.tape · project.tape) and never commits/ships
directly — all actual changes are delegated to `/sbs auto`, which keeps the
agreement-screen `go` checkpoint. Read-only verbs (status · check · audit · lint)
must not mutate anything. Render output with markdown tables + ✓/⚠ marks.

## status (bare)
Owner health snapshot (READ-ONLY). Gather and render:
1. plugin count — entries in `.claude-plugin/marketplace.json`.
2. version drift — for each marketplace entry, compare its `version` to the
   plugin's own `.claude-plugin/plugin.json` `version`; list mismatches.
3. enabled profile — `cat ~/.sidecar/profile` (default `full`); note whether the
   `~/.sidecar/master` marker exists (master-tier active?).
4. open PRs by me — `gh pr list --author @me --state open` (count + titles).
5. working tree — `git status -s` (uncommitted) + ahead/behind origin.
6. master-tier inventory — plugins with tier `master` in profiles.json.
Close with ✅ (clean) / ⚠ (residue) verdict + the single most useful next verb.

## update  ★ (runs to the `go` step)
Three stages, end at the `/sbs` agreement screen.
① CHECK
   - external: WebSearch / WebFetch the latest Claude model (Opus) changelog and
     the Claude Code release notes; summarize NEW models/features since the
     versions sidecar currently references. Also note hexa: `hexa --version`.
   - internal: marketplace↔plugin.json drift (from `status`) · `~/.sidecar/profile`
     + sync freshness · open PRs · a light `audit`/`lint` pass for fresh gaps.
② PLAN
   - derive concrete sidecar UPDATE CANDIDATES from ① (e.g. model-id refs to bump ·
     a new Claude/CC feature to wire into a hook/skill · a drifted plugin to
     reconcile · a doc/changelog to refresh). Rank by impact/effort, risk=low first.
     Render a candidate table: `| # | candidate | source(①) | impact | effort | risk |`.
   - pick the TOP candidate (or a tightly-related consolidated set).
③ DISPATCH
   - synthesize a one-line task from the top candidate and invoke the `/sbs` skill
     as `/sbs auto '<synthesized update task>'`. /sbs auto runs its own
     disambiguation + agreement screen and STOPS at `go`. Do not type `go` for the
     user — hand control back AT that checkpoint.
   - list the remaining candidates below; tell the owner they can `/abg` to fan
     them all out, or re-run `/master update` to take the next one.
   NEVER edit/commit here — everything routes through /sbs.

## check
The ① CHECK stage only (READ-ONLY). Render the external + internal availability
dashboard, then STOP — no plan, no dispatch. Use when the owner just wants "what's
new / what's drifted" without starting work.

## audit
Governance ↔ enforcement integrity (s7 — "ship governance + its enforcement
together"). READ-ONLY:
1. parse `@D` rule names from `hooks/commons/commons.tape` (and project.tape).
2. for each rule, grep `hooks/` for an enforcing guard/lint that references it.
3. flag ORPHAN RULES (a rule with no enforcing hook) and ORPHAN GUARDS (a guard
   referencing no live rule). Render `| rule/guard | kind | enforced-by/enforces | status |`.
Close with a count + the highest-priority gap.

## lint
Repo-wide plugin-standard sweep (READ-ONLY). Prefer the `sidecar-lint` hook's
checks if available; else replicate: untagged plugins in profiles.json (tier
missing) · SKILL.md bodies beyond a single do/dont `@D` block (s6) · absolute
paths in plugin scripts (s3) · concept-separation violations (s1). Aggregate
`| plugin | rule | violation |` + a total.

## sync
`sidecar sync` (marketplace pull + cache copy + installed_plugins.json patch) then
report the enable propagation (active profile · enabled count). This is the only
mutate-local verb; it is reversible. Paste the sync output tail verbatim.

## honest constraints
- read-only verbs (status·check·audit·lint) MUST NOT write/commit/ship.
- update + sync are the only acting verbs; `update` delegates ALL file edits to
  `/sbs` (never self-edits governance — s7·s13·g0).
- paste tool/command output verbatim where it is the evidence (g5 culture).
- owner-only — assumes the `~/.sidecar/master` marker; the master tier enforces it.
