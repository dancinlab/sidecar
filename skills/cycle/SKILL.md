---
name: cycle
description: Autonomous work-loop driver — enumerate the active domain's open milestones (commons @D g58) → plan table → fan out one background Agent per item → auto-continue to DEPLETION. The whole family (bare /cycle · /cycle-full · /cycle-loop · /cycle-full-loop) drains the domain's `## deferred` backlog to the bottom by self-continuing (ScheduleWakeup) each round until open milestones = 0 AND deferred empty AND no other signal. Triggers — "/cycle", "사이클", "계속 진행", "다음 라운드 진행", "keep cycling", "march on", "next round". Distinct from all-bg-go (reactive); /cycle self-generates each round, scoped to the session's active domain.
allowed-tools: Agent, Bash, Read
---

@D cycle := "autonomous loop — active-domain next-list → plan → fan-out → auto-continue to depletion" :: skill
  do   = "enumerate active <NAME>.md `- [ ]` milestones (g58) · when next-list empty auto-seed ≤N (default 3) — PRIMARY signal = the domain's own `## deferred` section (promote next batch into the milestone board + drain from deferred), then user hint · prior /gap shortlist · log tail · print plan table · fan 1 bg Agent per item, one msg · auto-continue: bare `/cycle` (and `/cycle-full`) self-continue via ScheduleWakeup each round, draining the whole `deferred` backlog to DEPLETION (cap throttles per-round WIDTH, auto-continue provides DEPTH) — terminate (omit ScheduleWakeup) ONLY when open milestones = 0 AND deferred empty AND no other signal"
  dont = "off-domain enumerate · fabricate seeds with no signal (stop with steer-options when zero milestones + empty deferred + no signal) · poll/sleep · fan destructive ops · nest /cycle · serialize disjoint items · re-seed an already-promoted deferred item (drain it from deferred when promoting) · stop after one round while backlog remains (bare `/cycle` is depletion-driving by default — only stop at true depletion) · schedule a wake-up once all three depletion conditions hold"

@D dup_race_precheck := "auto-skip already-resolved INBOX handoffs before fan-out" :: skill [required active]
  do   = "between next-list and plan: for each item naming an INBOX handoff (slug/header present in INBOX.log.md), grep its entry status + `gh pr list --search <slug>` + `git log --all --grep=<slug>` · mark SKIP if any signal resolved-class (fixed · resolved · closed · landed · shipped · absorbed · superseded · merged · `- [x]`) · mark PROCEED otherwise · render judgement column in plan table · only PROCEED rows get an Agent"
  dont = "fan out an INBOX handoff without precheck · suppress SKIP silently (always print reason) · grep without slug anchor (fp on partial names) · block items naming no INBOX entry (precheck is opt-in by slug presence)"

@D throttle_resilience := "fan-out agents survive rate-limit death — checkpoint-commit + resume contract" :: skill [required active]
  do   = "auto-inject into EVERY spawned Agent prompt at Stage 4: (1) `CHECKPOINT-COMMIT after each milestone (kernel/oracle/measurement) — git add -A && git commit -m 'wip: <milestone>' in your isolated worktree so a rate-limit death loses no work` (2) `if 'Server is temporarily limiting requests / Rate limited' fires, wait briefly and resume — the task remains valid; cite the last checkpoint commit`. Parent-recovery: if an Agent dies mid-flight on throttle, re-fire it as a single-agent retry against the same worktree branch (the checkpoint history is replay-safe — pattern: `feedback-crash-recovery-artifact-pattern`)"
  dont = "spawn an Agent without the checkpoint-commit clause · let the agent treat rate-limit as a fatal · re-fire on a fresh branch (loses checkpoint chain) · checkpoint outside the agent's isolated worktree (cross-agent index race)"

## Family — all four drain to depletion, differ only in entry shape

All four commands now drain the active domain's `## deferred` backlog to DEPLETION (open milestones = 0 AND deferred empty AND no other signal). They share the per-round cap (WIDTH throttle), the full 5-stage structure, the plan table, the dup-race precheck, and the leak guardrails. They differ ONLY in how they enter and pace the loop:

- **`/cycle`** — the plain entry. Self-generates the next batch from open milestones (else auto-seeds from `deferred`), then **auto-continues via ScheduleWakeup** each round until depletion. No phase-0 brainstorm; no external `loop` skill.
- **`/cycle-full`** — `/cycle` preceded by a **one-time phase-0 depletion brainstorm** (width-first idea exhaustion, cap 8 rounds). After the first fan-out it auto-continues exactly like bare `/cycle` (plain `/cycle` semantics, no re-brainstorm), draining to the same depletion condition.
- **`/cycle-loop`** — bare `/cycle` handed to the built-in `loop` skill for **explicit continuous intent + dynamic ScheduleWakeup pacing**. Same depletion termination; use when you want the loop's pacing/interval surface rather than bare `/cycle`'s inline self-continue.
- **`/cycle-full-loop`** — `/cycle-full` once (one-time brainstorm + first fan-out), then handed to the `loop` skill with plain `/cycle` as the recurring payload. Same depletion termination.

Bare `/cycle` and `/cycle-loop` now reach the same depletion end-state; the (now-thin) distinction is the entry/pacing surface (bare = inline self-continue · `-loop` = explicit `loop`-skill pacing). Both are kept — removing a published command is out of scope.
