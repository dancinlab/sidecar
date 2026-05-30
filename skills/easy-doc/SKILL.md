---
name: easy-doc
description: Author a layperson-friendly `<name>.easy.md` from a technical file or topic. Reads the input, applies the canonical easy contract (7-element pattern · 4 ASCII structure templates · jargon→everyday translation checklist) from hooks/easy-auto/styles/easy.<lang>.md, and writes the sibling `.easy.md` as output. Triggers — "/easy-doc", "easy doc", "쉬운 문서 만들어", "쉬운 버전 문서", "layperson doc", "explain this file simply as a doc", "make an easy version of this file".
allowed-tools: Read, Write, Bash
---

@D easy-doc := "author a layperson `<name>.easy.md` from a technical file/topic" :: skill
  do   = "read the input file (or take the topic) · apply the canonical easy contract from hooks/easy-auto/styles/easy.<lang>.md (source-of-truth — do NOT duplicate it) · write the sibling `<name>.easy.md`"
  do   = "apply the 7-element pattern to every non-trivial concept · pick ASCII templates per document shape · run the translation checklist before writing"
  do   = "use the `hexa easy` builtin for the DETERMINISTIC halves — `hexa easy scaffold` for the skeleton (empty 7-element slots + 4 ASCII templates + checklist), `hexa easy lint` as the final quality gate; the LLM owns ONLY the creative slot-fill between them"
  dont = "duplicate the whole easy reference into the doc · style code/math/paths/JSON identifiers · overwrite the source file · author an executable hook · output anything but markdown · hand-roll the skeleton or self-judge the axes when `hexa easy` is available"

## What `/easy-doc` does

`/easy-doc <file-or-topic>` produces a layperson-friendly **sibling document**:

```
[ technical input ] ──▶ [ apply easy contract ] ──▶ [ <name>.easy.md ]
   FILE  spec.md              7-element +                 spec.easy.md
   or    "a topic"            4 ASCII templates +         (sibling, same dir)
                              translation checklist
```

- **Input** — a path to a technical file (`spec.md`, `README.md`, `design.txt`, `foo.hexa`, …) **or** a free-text topic string.
- **Output** — a sibling Markdown file `<name>.easy.md` next to the input file. For a topic with no file, write `<slug>.easy.md` in the current directory (slugify the topic).
- **Audience** — a layperson seeing the field for the first time. Jargon ratio low, analogy on every non-trivial concept, at least one ASCII diagram where shape matters.

## Source-of-truth: the easy reference (do NOT duplicate)

The authoring contract lives in the sibling `easy-auto` plugin's styles, NOT here. Read it first:

- **Pattern reference** — `hooks/easy-auto/styles/easy.<lang>.md` (or the cached install copy
  `$HOME/.claude/plugins/cache/sidecar/easy-auto/<version>/styles/easy.<lang>.md`, highest version
  via `ls -1 | sort -V | tail -1`). Pick the file matching the input/output document language
  (`en` / `ko` / `ja` / `zh` / `ru`). This skill **applies** that reference; it does not restate it.

The contract summarized (the reference is authoritative for details and golds):

### 7-element pattern (per non-trivial concept)

`icon · name · alias(nickname) · plain-line(what it does) · analogy(everyday object) · ASCII diagram · compare(vs closest existing thing)`

### 4 ASCII structure templates — pick by the section's shape

```
What does the section show?                → which template
───────────────────────────────────────────────────────────
a change · an improvement · "was X, now Y"  → 1. before/after  (split by →)
top→down · branching · a list of parts      → 2. tree          (├─ └─)
hold option A and B against each other      → 3. side-by-side  (split by │)
how parts connect / flow into each other    → 4. structure sketch ([ ] ──▶ [ ])
```

### Translation checklist (run before writing)

```
[ ] 1. Detect jargon — acronyms (API·CPU) · math symbols (σ·∑·∂) · code/product names?
[ ] 2. Swap for everyday words — each term → plain word or analogy (expand on first use if you can't)
[ ] 3. Apply the 7 elements — every non-trivial concept carries all 7?
[ ] 4. ASCII ≥1 — where shape matters, used one of the 4 templates?
[ ] 5. Re-read — would a first-time reader get it in one pass?
```

## Deterministic backbone: the `hexa easy` builtin

The skeleton and the scoring are **deterministic** — those belong to the
`hexa easy` builtin (`stdlib/easy/cli.hexa`), not the LLM. The skill wraps it:

```
[ /easy-doc ] ─▶ ① hexa easy scaffold ─▶ ② LLM fills slots ─▶ ③ hexa easy lint ─▶ .easy.md
                    skeleton (det.)         creative rewrite        quality gate (det.)
                    7 slots + 4 ASCII       ← the ONLY LLM part      per-axis + PASS/FAIL
```

- `hexa easy scaffold "<topic>" --out <name>.easy.md` — emit the empty
  7-element slots + the 4 ASCII templates + the checklist comments. Start here
  instead of hand-rolling the skeleton.
- `hexa easy lint <name>.easy.md` — deterministically score the finished file
  against the 측정 축 (jargon-ratio · ascii-presence · acronym-expansion ·
  analogy-presence · 7-element). Run it as the final gate; iterate if FAIL.
- `hexa easy axes` — print the axes + targets.

**Graceful fallback** — if `hexa easy` is unavailable (toolchain not synced),
build the skeleton manually from the templates below and self-check against the
checklist; the output is identical, only the determinism guarantee is lost. The
LLM **never** does the creative rewrite inside the builtin — scaffold/lint are
empty-slots + scores only.

## Authoring procedure

1. **Resolve the input.** If `$ARGUMENTS` is an existing path, `Read` it. Otherwise treat it as a topic string.
2. **Detect the document language** (of the source, or of the user's request for a topic) → pick `easy.<lang>.md`.
3. **`Read` the easy reference** style file (plugin-root path, else the cache fallback above).
4. **Scaffold the skeleton (deterministic).** Run `hexa easy scaffold "<topic>" --out <name>.easy.md` to emit the empty 7-element slots + 4 ASCII templates + checklist. If `hexa easy` is unavailable, build the same skeleton manually from the templates.
5. **Map the input's shape to sections.** A spec/design → tree + structure-sketch; a "v1 vs v2" / migration → before/after; an A-vs-B decision → side-by-side. One concept = one 7-element block.
6. **Translate (the creative part — LLM only).** Run the 5-step checklist. Fill the scaffold's empty slots: rewrite every jargon sentence into everyday words with an analogy. Keep code identifiers / math symbols / paths / JSON keys verbatim (out-of-scope per the reference) — never "friendly-ize" those.
7. **Write the sibling.** `Write` to `<dir>/<name>.easy.md` (file input) or `./<slug>.easy.md` (topic). Title the doc plainly, open with a one-line "what this is", then one 7-element block per concept, ASCII where shape matters, and a closing "if you remember one thing" line.
8. **Lint the result (deterministic gate).** Run `hexa easy lint <name>.easy.md`; report the per-axis scores + PASS/FAIL. If any axis FAILs, revisit step 6 and re-lint. If `hexa easy` is unavailable, self-check against the checklist instead.
9. **Never** modify the source file, and never emit anything but the `.easy.md`.

## Output skeleton (what a generated `.easy.md` looks like)

```
# <Plain title> — the easy version

> What this is, in one line.

🧩 <Concept> — "<friendly nickname>"
- what it does: <one plain line>
- analogy: <everyday object>
  ```
  <ASCII diagram from one of the 4 templates>
  ```
- compare: <vs the closest familiar thing>

… (repeat one block per non-trivial concept) …

## If you remember one thing
<the single takeaway, jargon-free>
```

See `samples/cache.easy.md` for one worked end-to-end example.

## Guardrails

- New, additive, authoring-only. Reads the easy-auto reference; never edits it or `skills/easy/`.
- Markdown output only — no executable logic, no hook, no code transformation of the source.
- `hexa easy` is invoked for the deterministic backbone only: `scaffold` emits an empty skeleton, `lint` scores the result — neither reads or mutates the source file. The creative rewrite stays with the LLM.
- Code blocks, math symbols, API names, paths, commit SHAs stay verbatim (the reference's out-of-scope list).
- The sibling is a **new** file; if `<name>.easy.md` already exists, confirm before overwriting.
