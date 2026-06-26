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
