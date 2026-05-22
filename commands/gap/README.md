# gap

`/gap` — multi-axis gap exploration. Sweeps the current work through **42 breakthrough-strategy lenses** curated into **8 families** from the archived hive repo's `state/*_audit` catalogue.

## Modes

| Invocation | Behaviour |
|---|---|
| `/gap` | **mode C** — inline-triage all 40 lenses against the current work, then deep-dive (via subagents) only the families that surfaced ≥ 1 gap. Zero hot families ⇒ spawn nothing (fixpoint applied). |
| `/gap full` | **mode A** — fan-out one subagent per family (8 in parallel), no triage. Exhaustive audit. |
| `/gap <scope>` | mode C scoped to `<scope>` (rather than the inferred current work). |
| `/gap list` | print the 40-lens catalogue verbatim and STOP. |

## Families (8) — 5 lenses each (F4 and F6 have 6 — `occams-razor` lives in both)

1. **F1 Math-Structural** — does the shape hold? (functor · operadic · persistent-homology · tropical · bisimulation)
2. **F2 Adversarial-Stress** — break it on purpose (adversarial · byzantine · edge-chaos · perturbation · ablation)
3. **F3 Economic-Resource** — what does it cost? (pareto · landauer · info-budget · optimal-transport · dynamic-programming)
4. **F4 Epistemic-Evidence** — what do we know? (assumption-surfacing · bayesian · counterfactual · falsifier · honesty-triad · **occams-razor** — hypothesis side)
5. **F5 Convergence-Closure** — is it done? (fixpoint · success-criteria · closed-loop · regression-streak · defense-in-depth)
6. **F6 Simplicity-Canonical** — less, single-sourced (minimum-viable · architectural-simplicity · canonical-ssot · duplicated-helper · surgical-scope · **occams-razor** — design side)
7. **F7 Temporal-Dynamics** — over time (temporal-decay · temporal-hierarchy · heuristic-promotion · fix-introduces-axis · active-acquisition)
8. **F8 Coverage-Consistency** — did we cover it all? (axis-coverage · cross-tool-consistency · parallel-fanout · unowned-load-bearing · landscape)

Full per-lens text lives in `commands/gap.md`.

## Output

- **Triage line per lens** (`gap` / `clean` / `n/a`)
- **Deep-dive per hot family** — concrete finding + suggested fix per lens
- **Priority shortlist** — top 3 gaps by impact

Never fixes — surfaces and prioritises only. User drives what gets fixed.

## Related

- Complements [`brainstorm`](../skills/brainstorm/) (depletion-style breadth ideation) — gap is gap-finding on existing work, brainstorm is fresh-angle generation.
- Complements `hexa kick` (commons g6 · gap breakthroughs via the hexa CLI engine).
