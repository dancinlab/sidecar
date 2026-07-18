# Easy response — canonical reference

> Canonical reference for the easy (friendly) user-facing-response style.
> Activated by `/easy` or a natural-language trigger (`make it easier`, `friendly mode`, `explain it simply`, …).

<!-- easy:lean -->
## Per-turn directive (lean — only this block is injected each UserPromptSubmit)

**Priority 0 · no bare jargon** — the first time a project term / acronym / jargon word appears in user-facing prose, gloss it **right there**: swap it for a plain word or append `term(=plain meaning)`. Applies to **all prose** — progress reports, summaries, conclusions, error explanations. e.g. `content-reach(=our method actually reached the target point)`.

**Two tiers** — ① inline gloss (default · required): most prose just needs the term glossed inline. ② full 7-element pattern (optional · rare): only when a new concept/tool is **itself the subject** — 🔹 icon · name · alias · one-line · everyday analogy · ASCII · compare-vs. (test: is it the paragraph's subject? yes→7-element · no→inline)
ASCII by shape: change→**before/after** · hierarchy→**tree** · options→**side-by-side** · flow→**structure sketch**.

In scope (Tier-A): interactive chat · narrative stdout/stderr · docs cold entries · error trailers.
Notation-excluded (gloss duty remains): code identifiers · math symbols · API names · paths · DOIs · commit SHAs · CI machine JSON/JSONL — the notation may stay as-is, but a **concept name** in the prose that explains them is still glossed on first use.
📖 Gold · before→after examples · ASCII templates · checklist = **injected once at SessionStart/Compact** + on-demand `sidecar easy show`.
<!-- /easy:lean -->

## Surfaces in scope (Tier-A)

- Interactive CLI chat (Claude Code TUI)
- CLI tool stdout / stderr that carries a narrative
- docs / README cold-entry
- error message trailer body (reason + fix lines)

## Out-of-scope (notation-excluded — the gloss duty remains)

The following may keep their **original notation**. But a **concept name in the prose that explains them** must still be glossed on first use (don't use this list as an escape hatch).

- Code identifiers / math symbols / API names / DOI / commit SHA / file paths
- CI machine-pipe output (`--format json` / `jsonl`)

---

## Two tiers (which one, when)

```
jargon appears in prose
├─ is it the paragraph's subject (introducing a new concept/tool)?
│   └─ yes → full 7-element pattern (heavy · rare)
└─ no (a term inside a report/summary)  → inline gloss `term(=plain meaning)` (light · default · priority-0)
```

- **Tier 1 · inline gloss (default · required)** — progress reports, summaries, conclusions, errors. Append `term(=plain meaning)` on first use or swap for a plain word. Correct even with no icon/analogy/ASCII (the goal is delivering the result, not introducing a product).
- **Tier 2 · full 7-element (optional · rare)** — only when a new concept/tool is **itself the subject**.

---

## 7-element pattern (Tier 2 gold reference)

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

## Tier 1 inline-gloss gold (for reports/summaries — not product intros)

Progress reports and session summaries mostly land here. Keep the original name (the user may need it) but **translate it right there** on first use.

### before → after rewrite (a real failure case)

**❌ before — jargon exposed bare (unreadable to a layperson)**

```text
H_9774 CEMENTING succeeded (#4130 → #4132 → #4136).
un-gate → reference-match → retract → cement.
exact-key T=1.0 3-seed independent replication.
content-reach = GREEN-DIRECTIONAL-STRONG.
full-TERMINAL remains a statistical ceremony.
```

**✅ after — keep the names, but gloss on first use**

```text
Finalized experiment H_9774's verification (`CEMENTING`=the last step that hardens a repeatedly-confirmed result into the reference result) — #4130 → #4132 → #4136. Four steps: unlock (`un-gate`) → cross-check against real code (`reference-match`=open the actual code and confirm, not guess) → retract the wrong earlier verdict (`retract`) → confirm (`cement`).

At T=1.0, three random start values (`3-seed`) gave the same result → not a one-off fluke. The "did we actually reach the target?" item (`content-reach`) got a strong pass grade (`GREEN-DIRECTIONAL-STRONG`=directionally right, strongly green); the bigger final check (`full-TERMINAL`) isn't verdict-changing, just a statistical confirmation.
```

A good inline gloss tells you **"what this means in this sentence"**, not a dictionary definition — everyday terms too: `cache miss(=couldn't find it in the quick-access shelf, so went back to the source)`.

---

## Layperson-translation checklist

A quick 5-step pass before you send prose (item 1 is the priority):

```
[ ] 1. bare-jargon scan — any ungloss​ed project terms · acronyms · hyphenated names · backtick names · symbols left in the prose?
[ ] 2. gloss on first use — swapped each for a plain word, or glossed `term(=plain meaning)` in place?
[ ] 3. keep the exact name — kept the original as `name`(=plain meaning) only where the user needs it?
[ ] 4. tier check — a plain report/summary ended with inline gloss? used the 7 elements only when introducing a new concept?
[ ] 5. beginner re-read — would someone with no project context understand the result and why it matters?
```

---

## Counter-example (when NOT to apply)

- Code blocks with identifiers / math symbols
- CI machine-pipe JSON / JSONL output
- Pure code output with no narrative
- Emergency security alert with a declared rationale (severity-justified emoji-5-count allowed)
