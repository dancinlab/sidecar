---
name: cycle
description: Autonomous work-loop driver — enumerate the active domain's open milestones (commons @D g58) → plan table → fan out one background Agent per item → loop. Triggers — "/cycle", "사이클", "계속 진행", "다음 라운드 진행", "keep cycling", "march on", "next round". Distinct from all-bg-go (reactive); /cycle self-generates each round, scoped to the session's active domain.
allowed-tools: Agent, Bash, Read
---

@D cycle := "autonomous loop — active-domain next-list → plan → fan-out → loop" :: skill
  do   = "enumerate active <NAME>.md `- [ ]` milestones (g58) · when next-list empty auto-seed ≤N (default 3) — PRIMARY signal = the domain's own `## deferred` section (promote next batch into the milestone board + drain from deferred), then user hint · prior /gap shortlist · log tail · print plan table · fan 1 bg Agent per item, one msg"
  dont = "off-domain enumerate · fabricate seeds with no signal (stop with steer-options when zero milestones + empty deferred + no signal) · poll/sleep · fan destructive ops · nest /cycle · serialize disjoint items · re-seed an already-promoted deferred item (drain it from deferred when promoting)"

@D dup_race_precheck := "auto-skip already-resolved INBOX handoffs before fan-out" :: skill [required active]
  do   = "between next-list and plan: for each item naming an INBOX handoff (slug/header present in INBOX.log.md), grep its entry status + `gh pr list --search <slug>` + `git log --all --grep=<slug>` · mark SKIP if any signal resolved-class (fixed · resolved · closed · landed · shipped · absorbed · superseded · merged · `- [x]`) · mark PROCEED otherwise · render judgement column in plan table · only PROCEED rows get an Agent"
  dont = "fan out an INBOX handoff without precheck · suppress SKIP silently (always print reason) · grep without slug anchor (fp on partial names) · block items naming no INBOX entry (precheck is opt-in by slug presence)"
