# harness gap — multi-axis gap exploration

A structured sweep of the current work through **40 breakthrough-strategy lenses**,
curated into 8 families. Each lens is one probing question. A "gap" is anything the
current work fails to answer well under that lens. `gap` only SURFACES and prioritises
— it never fixes; the user drives what gets fixed next.

## Step 1 — resolve mode from the arguments

- arguments empty       → **mode C**, target = the current work in context
- arguments == `list`   → print "The catalogue" section verbatim, then STOP
- first word == `full`  → **mode A**; remaining words (if any) = scope
- anything else         → **mode C**, target = the argument text as scope

If the target is ambiguous (empty arguments, no obvious "current work"), state your
assumption in one line — usually the uncommitted diff, else the task under discussion,
else the repo at the cwd — and proceed; do not stop to ask (commons c3).

## The catalogue — 40 lenses in 8 families

### F1 · Math-Structural — does the shape hold?
- `functor` — does this transform preserve composition: compose-then-map = map-then-compose?
- `operadic` — do the part-assembly rules associate, or does wiring order change the result?
- `persistent-homology` — which structural "holes" survive across scales, and which are noise?
- `tropical` — under min/max-plus algebra, what is the actual optimal path / bottleneck?
- `bisimulation` — equal observable behaviour — is the internal state really equivalent?

### F2 · Adversarial-Stress — break it on purpose
- `adversarial` — a malicious input out to break this would strike where?
- `byzantine` — if one component lies (arbitrary fault), does the whole still hold?
- `edge-chaos` — what collapses at boundaries, concurrency, reordered events?
- `perturbation` — nudge the input slightly: does output move proportionally or blow up?
- `ablation` — remove this part — does it still work, and what exactly breaks?

### F3 · Economic-Resource — what does it cost?
- `pareto` — on the multi-objective frontier, which choice is dominated (strictly worse)?
- `landauer` — what is the information-theoretic lower-bound cost; how much is wasted now?
- `info-budget` — is more information worth gathering here, or past the break-even point?
- `optimal-transport` — minimum-cost plan to move state A's distribution to state B's?
- `dynamic-programming` — are overlapping sub-problems recomputed; can they be memoised?

### F4 · Epistemic-Evidence — what do we actually know?
- `assumption-surfacing` — are all implicit assumptions and hidden dependencies named?
- `bayesian` — was belief updated on the new evidence, or anchored to the prior?
- `counterfactual` — had we not done this, what happens — true cause vs mere correlation?
- `falsifier` — was it pre-declared what observation would prove this wrong?
- `honesty-triad` — does every claim carry a citation and a severity (claim/proof/severity)?
- `occams-razor` — among competing hypotheses for the same observation, is the simplest one (fewest assumptions) tried first?

### F5 · Convergence-Closure — is it done?
- `fixpoint` — have iteration returns gone flat — have we hit the stop-here fixed point?
- `success-criteria` — is "done" pinned to a measurable definition, not a vibe?
- `closed-loop` — does output feed back to self-correct, or is the loop left open?
- `regression-streak` — is there durable evidence (an N-day clean streak), not a one-off?
- `defense-in-depth` — is enforcement single-layer, or does it hold if agent/tool/OS dies?

### F6 · Simplicity-Canonical — less, single-sourced
- `minimum-viable` — what is the smallest surviving form; any speculative additions?
- `architectural-simplicity` — can fewer moving parts do the same job?
- `canonical-ssot` — is the same fact written in two places that can disagree?
- `duplicated-helper` — is the same helper / logic cloned instead of shared?
- `surgical-scope` — does every changed line trace to the request, or did scope leak?
- `occams-razor` — among working designs for the same outcome, is the one with the fewest parts / abstractions chosen?

### F7 · Temporal-Dynamics — over time
- `temporal-decay` — does this value / cache / assumption rot with time; what refreshes it?
- `temporal-hierarchy` — are a fast loop and a slow loop fused into one cadence by mistake?
- `heuristic-promotion` — was a temporary heuristic promoted to a rule without verification?
- `fix-introduces-axis` — does this fix create a new failure axis / debt to audit later?
- `active-acquisition` — what should we actively go learn next to cut uncertainty most?

### F8 · Coverage-Consistency — did we cover it all?
- `axis-coverage` — is any check axis itself missing — gaps in the gap list?
- `cross-tool-consistency` — do independent tools / paths give the same answer?
- `parallel-fanout` — is independent work parallelised, or needlessly serialised?
- `unowned-load-bearing` — what part is owned by nobody yet holds the structure up?
- `landscape` — was the whole solution-space surveyed, or did we settle on the first peak?

## Step 2 — mode C (default): triage, then deepen

1. **Triage all 40 lenses inline.** For each lens, against the target, emit a one-line
   verdict: `gap` (a real shortfall) · `clean` (handled well) · `n/a` (lens does not
   apply). Keep it terse — one line per lens, grouped by family.
2. **Collect hits.** A family is "hot" if it has ≥1 `gap` verdict.
3. **Deepen the hot families.** Dispatch one subagent per hot family. With ≥3 hot
   families, route them through a **single `Workflow` call** (one `agent()` per family
   inside `parallel()`) — the concurrency cap + queue + shared token budget prevents the
   rate-limit death that N simultaneous `Agent` streams cause (commons c27). With 1–2 hot
   families, direct `Agent` calls in one message are fine. Each agent gets the target plus
   that family's `gap` lenses, returning a concrete finding + a suggested fix per gap. Use
   the `Explore` agentType for read-only investigation, `general-purpose` when a fix needs
   cross-file reasoning.
4. If **zero** families are hot, report "no gaps surfaced across 40 lenses" and stop —
   spawn nothing. (This is the `fixpoint` lens applied to `gap` itself.)

## Step 2′ — mode A (`gap full`): fan-out everything

Skip triage. Dispatch **8 family subagents via a single `Workflow` call** (one `agent()`
per family inside `parallel()`) — Workflow caps concurrency at min(16,cores−2), queues the
overflow, and shares one token budget, so 8 simultaneous sweeps don't trigger a rate-limit
death the way 8 direct background `Agent` streams would (commons c27). Each agent sweeps the
target through all of its lenses (5 for F1·F2·F3·F5·F7·F8, 6 for F4 and F6 — `occams-razor`
lives in both) and returns per-lens findings. Use this when triage might miss a latent gap
and an exhaustive audit is worth the cost.

## Step 3 — aggregate

Merge the subagent findings into one **gap report**:

- group by family; within a family, one bullet per `gap` lens
- each bullet: `lens — the gap (one line) — suggested fix (one line)`
- end with a **priority shortlist**: the top 3 gaps by impact, ordered
- if this is decision-bearing work, flag any gap that contradicts a logged decision in
  `ARCHITECTURE.md` / `CHANGELOG.md`

`gap` only surfaces and prioritises — it does **not** fix anything. The user drives
what gets fixed next.
