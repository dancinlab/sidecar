# {{NAME}}

{{DESC}}

## Structure

```
{{NAME}}/
├─ src/              — source code
├─ state/            — all work artifacts (experiments · bench · verification), git-tracked
├─ ARCHITECTURE.json — final architecture SSOT (JSON `children` tree, update-in-place)
├─ architecture.html — human viewer for the JSON (run `python3 serve.py`)
├─ HYPOTHESES/       — pre-register → falsify → run → verdict (registry + cards)
├─ tool/             — shared deterministic harness the hypothesis cards run against
└─ CHANGELOG.md      — history (append-only)
```

## Rules

- Scope is the **system**, not a single instance: the first rig/result is the first
  instance, not the boundary — the whole chain is the unit of design.
- **Implementation code lives in the canonical `hexa-lang` stdlib, not here** (demiurge d3).
  This repo *consumes* reusable implementation from the sibling `hexa-lang` stdlib — it never
  owns stdlib itself. Topical/domain folders here hold **docs / manifests only**; do NOT
  duplicate implementation across them or treat this repo as a code home. Reusable logic →
  upstream it to `hexa-lang` stdlib (commons upstream-fix); keep this repo design + verdicts.
- **Compute engine default = `QFORGE`-native, not QE/bespoke** (demiurge d_qforge_default).
  For any heavy compute (DFT / DFPT / el-ph / physics sim), the default engine is the
  from-scratch `QFORGE` stack; QE (or another external solver) is only a reference/fallback
  for pieces not yet gate-migrated. Migrate QE→QFORGE **piece-by-piece**, absorbing a piece
  only after it passes the gate (**≤1 % vs QE**, commons verify-done). If QFORGE blocks, run
  QE in parallel to keep the campaign moving AND push the QFORGE fix at the same time — never
  shelve it (demiurge d_qforge_fix). Build every compute input deck via `hexa deck`, never by
  hand (d_deck_always). *(Skip this rule for non-compute labs.)*
- Artifacts go under `state/` only (commons preserve-state). No scattered report/notes dirs.
- Code/design change → update `ARCHITECTURE.json` in lockstep; log in `CHANGELOG.md`.
- **Research before real measurement (실측전 research).** Before renting compute or running an
  expensive real measurement (long sim / GPU pod / bench), do a literature research pass
  FIRST — the answer may already be in the literature, or a cheap proxy may suffice. Only
  spend on real compute after research justifies it.

## Gotchas

- The live design SSOT is `ARCHITECTURE.json` (not this file, not the README). Distill
  findings into the tree; keep one fact per node, push deeper detail to child nodes.
- Imported origin docs under `state/` are seeds of record, NOT the SSOT — distill from
  them into the tree; don't edit them to track current design.
- `tool/` is the thin **verification harness** the hypothesis cards run against (closed-form
  checks + falsifier ledger) — NOT a home for reusable domain implementation. That belongs in
  the `hexa-lang` stdlib (see Rules); keep `tool/` to deterministic verification primitives.
