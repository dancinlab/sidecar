# {{NAME}}

{{DESC}}

## The thesis

> State the one-line reframing this campaign argues — the claim a casual reader would
> dispute, and why this repo reaches a different conclusion.

**(the central claim — a floor/ceiling reopened, a problem recast as engineering-and-volume
rather than a fixed wall).**

```
Framing claim                     {{NAME}} verdict
─────────────────────────         ───────────────────────────────────────
"(the conventional wall)"      →  (why it is a floor, not a wall)
"(the conventional cost)"      →  (the headroom this repo argues exists)
```

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

## Provenance

Record where this campaign's origin spec came from (imported docs live under `state/` as
seeds of record). The live design SSOT is `ARCHITECTURE.json`; the imported spec is the
seed of record, not the SSOT.

## Viewing

```
python3 serve.py        # serve on :8000, open architecture.html
```
