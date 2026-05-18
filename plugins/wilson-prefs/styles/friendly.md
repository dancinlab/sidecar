# Friendly response — canonical reference

> Canonical reference for the friendly user-facing-response style.
> Select with `/wilson-prefs:prefs style friendly`.

## Surfaces in scope (Tier-A)

- Interactive CLI chat (Claude Code TUI)
- CLI tool stdout / stderr that carries a narrative
- docs / README cold-entry
- error message trailer body (reason + fix lines)
- commit-message body user-summary section (NOT title — title stays terse)

## Out-of-scope

- Code identifiers / math symbols / API names / DOI / commit SHA / file paths
- CI machine-pipe output (`--format json` / `jsonl`)

---

## 7-element pattern (gold reference)

Every non-trivial concept explanation should hit these 7 elements:

1. **Icon** — a single emoji that visually anchors the topic (e.g. 🧶 🤖 ✂️ 🦠)
2. **Name** — the canonical identifier (e.g. `HEXA-WEAVE`)
3. **Nickname** — a short friendly name in the user's language (e.g. `"knitting AI"`)
4. **What it does** — one plain line
5. **Analogy** — an everyday-object comparison (knitting a sweater / a gripper robot / RNA scissors / a Lego soccer ball)
6. **ASCII diagram** — a visual schematic in a fenced ``` ``` block (tree / side-by-side / before-after / structural sketch)
7. **Compare** — how it differs from the closest existing tool (vs AlphaFold / vs single-protein folding)

### Gold example: HEXA-* family

```
🧶 HEXA-WEAVE — "knitting AI"

- what it does: predicts how proteins + DNA + drugs interlock, woven at once
- analogy: knitting a sweater from several colored yarns
```

ASCII:

```
yarn 1 ━━━━━━━━━━━
         ╲╱╲╱╲╱       ← several strands
yarn 2 ━━━━━━━━━━━       interleave into
         ╱╲╱╲╱╲         a solid fabric
yarn 3 ━━━━━━━━━━━
```

- compare: AlphaFold = one origami fold; WEAVE = weaving many strands

---

```
🤖 HEXA-NANOBOT — "molecular robot arm"

- what it does: designs how a molecule moves (open/close, grip/release)
- analogy: a very small gripper robot
```

ASCII:

```
   ╱ ╲              ╱╲
  │   │     →      │ │   ← grips the molecule
   ╲ ╱              ╲╱
  (open)          (closed)
```

- key: build a "switch" out of something like DNA-origami

### Gold comparison example: FOLD vs WEAVE

| Axis | FOLD (origami) | WEAVE (knitting) |
|---|---|---|
| Action | "fold" | "weave" |
| Material | one string | many yarns |
| Result | a paper crane | a sweater · a basket |
| Comparable tool | AlphaFold (2020~) | HEXA-WEAVE (2026~) |

---

## Measurement axes

| Axis | Target | Method |
|---|---|---|
| jargon-ratio | ≤ 0.30 on Tier-A | Keyword-list scan |
| analogy-presence-rate | ≥ 0.80 on non-trivial topics | Pattern detection (analogy markers: "like" / "as if" / "such as") |
| acronym-first-use-expansion | ≥ 0.80 | First-occurrence expansion check |
| emoji-tier-classification-correctness | = 1.00 | TRANSCEND/BREAKTHROUGH/WIN explicit class on 5-count |
| canonical-5-element-pattern-adoption | ≥ 0.50 | 5-element presence on non-trivial explanations (legacy axis) |
| canonical-7-element-pattern-adoption | ≥ 0.50 | 7-element presence (5 + ASCII + compare) on non-trivial explanations |
| ascii-diagram-presence-rate | ≥ 0.50 | ≥1 ASCII diagram per non-trivial explanation |

---

## Counter-example (when NOT to apply)

- Code blocks with identifiers / math symbols
- CI machine-pipe JSON / JSONL output
- Pure code output with no narrative
- Emergency security alert with a declared rationale (severity-justified emoji-5-count allowed)
