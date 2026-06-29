# Easy response — canonical reference

> Canonical reference for the easy (friendly) user-facing-response style.
> Activated by `/easy` or a natural-language trigger (`make it easier`, `friendly mode`, `explain it simply`, …).

<!-- easy:lean -->
## Per-turn directive (lean — only this block is injected each UserPromptSubmit)

Apply the **7-element friendly pattern** to user-facing prose — for every non-trivial concept:
🔹 ① icon · ② name · ③ alias · ④ one-line plain description · ⑤ everyday analogy · ⑥ ASCII diagram · ⑦ compare-vs the nearest existing tool.

Pick the ASCII diagram by shape: change/improvement→**before/after**, hierarchy→**tree**, option A·B→**side-by-side**, part flow→**structure sketch**.

In scope (Tier-A): interactive chat · narrative stdout/stderr · docs cold entries · error trailers (cause+fix).
Excluded: code identifiers · math symbols · API names · paths · DOIs · commit SHAs · CI machine JSON/JSONL output.

📖 Gold examples · full 4-template ASCII bodies · the plain-language checklist = **injected once at SessionStart/Compact** + on-demand `sidecar easy show` (never re-dumped per turn).
<!-- /easy:lean -->

## Surfaces in scope (Tier-A)

- Interactive CLI chat (Claude Code TUI)
- CLI tool stdout / stderr that carries a narrative
- docs / README cold-entry
- error message trailer body (reason + fix lines)

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

## 4 ASCII structure templates (copy-paste skeletons)

When you draw the ASCII diagram (element 6 of 7), don't start from scratch — pick the one of these 4 whose shape fits, copy it, and fill it in.

### When it looks like this → use this template (one-line guide)

```
What do you want to show?                → which template
───────────────────────────────────────────────────────────
a change · an improvement · "was X, now Y" → 1. before/after
top→down · branching · a list of parts     → 2. tree
hold option A and B against each other     → 3. side-by-side
how parts connect / flow into each other   → 4. structure sketch
```

### Template 1 — before/after

For showing a change or improvement. The arrow `→` splits "before → after".

```
before                 after
───────────           ───────────
 ▢ slow step     →      ▢ fast step
 ▢ manual         →      ▢ automatic
```

### Template 2 — tree

For showing hierarchy or decomposition. Branch with `├─` and `└─` (only the last branch uses `└─`).

```
root (whole)
├─ branch A
│  ├─ leaf A1
│  └─ leaf A2
└─ branch B
   └─ leaf B1
```

### Template 3 — side-by-side

For comparing two options head-to-head. The `│` splits the middle.

```
   option A          │      option B
 ─────────────      │    ─────────────
  + pro 1            │     + pro 1
  − con 1            │     − con 1
```

### Template 4 — structure sketch

For showing how parts connect and flow. Connect boxes `[ ]` with arrows `──▶`.

```
[ input ] ──▶ [ process ] ──▶ [ output ]
               │
               └──▶ [ side branch ]
```

---

## Layperson-translation checklist

A quick 5-step pass before you write an explanation:

```
[ ] 1. Detect jargon — any acronyms (API·CPU) · math symbols (σ·∑·∂) · code/product names?
[ ] 2. Swap for everyday words — replaced each term with a plain word or analogy? (if you can't, expand it on first use)
[ ] 3. Apply the 7 elements — does every non-trivial concept carry all 7 (icon…compare)?
[ ] 4. ASCII ≥1 — where shape matters, added a diagram using one of the 4 templates above?
[ ] 5. Re-read — would someone seeing this field for the first time get it in one pass?
```

---

## Counter-example (when NOT to apply)

- Code blocks with identifiers / math symbols
- CI machine-pipe JSON / JSONL output
- Pure code output with no narrative
- Emergency security alert with a declared rationale (severity-justified emoji-5-count allowed)
