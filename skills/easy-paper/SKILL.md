---
name: easy-paper
description: Author a layperson `.easy.paper.md` companion of a paper. Reads a PAPER/<slug>/ dir (per PAPER.tape roster) or a given paper .md, applies the easy 7-element pattern, and emits `<slug>.easy.paper.md` with four paper-specific sections — 평이-초록 (plain-language abstract) · ASCII figure sketches · 비유 섹션 (analogy-driven method/finding) · "이 논문이 한 일" (what-it-did summary). Triggers — "/easy-paper", "쉬운 논문 만들어", "논문 쉽게", "easy paper", "논문 일반인용", "explain this paper simply".
allowed-tools: Read, Bash
---

@D easy-paper := "layperson `.easy.paper.md` author — paper → friendly explainer (easy 7-element pattern)" :: skill
  do   = "`/easy-paper <slug-or-paper.md>` — read a PAPER/<slug>/ dir (PAPER.tape roster) or a paper .md, then write `<slug>.easy.paper.md` (4 sections: 평이-초록 · ASCII figure sketches · 비유 섹션 · 이 논문이 한 일)"
  do   = "apply the canonical easy reference (easy-auto/styles/easy.<lang>.md) — 7-element pattern + 4 ASCII templates + jargon→everyday translation checklist"
  dont = "modify the source paper · duplicate the whole easy reference (point + summarize) · invent results the paper didn't measure · publish a `.easy.paper.md` that contradicts the §finding"

# ── what it is ──────────────────────────────────────────────────────────────

`/easy-paper <slug-or-paper.md>` reads a paper and writes a layperson-friendly
companion next to it: `<slug>.easy.paper.md`. It is a **sidecar** to the
`paper` plugin (which scaffolds the formal LaTeX paper + the `PAPER.tape`
roster) and the `easy` plugin (which owns the friendly-prose style reference).
This skill reads only — it never edits the source paper.

# ── source of truth (do not duplicate) ──────────────────────────────────────

The friendly style is owned by the `easy` / `easy-auto` plugins. Read the
canonical reference and APPLY it — do not re-derive or copy the whole thing:

- `${CLAUDE_PLUGIN_ROOT}/../easy/styles/easy.<lang>.md` when both plugins are
  installed, else the cached mirror
  `$HOME/.claude/plugins/cache/sidecar/easy/<version>/styles/easy.<lang>.md`
  (highest version: `ls -1 | sort -V | tail -1`), else
  `$HOME/.claude/plugins/cache/sidecar/easy-auto/<version>/styles/easy.<lang>.md`.
- Pick the lang variant matching the paper / user language (`ko` default).

From that reference you reuse, verbatim in spirit:

- the **7-element pattern** (icon · name · alias · plain-line · analogy ·
  ASCII diagram · compare) for every non-trivial concept,
- the **4 ASCII structure templates** (① before/after · ② tree ·
  ③ side-by-side · ④ structure sketch) for the figure sketches,
- the **jargon → everyday translation checklist** (detect → substitute →
  7-element → ASCII ≥1 → re-read).

# ── how to find the paper ───────────────────────────────────────────────────

```
[ <slug-or-paper.md> arg ] ──▶ resolve source ──▶ read ──▶ write <slug>.easy.paper.md
                                   │
          ┌────────────────────────┴───────────────────────┐
   arg is a slug                                     arg is a path *.md
   → look up PAPER.tape (root roster, slug → dir)     → read that file directly
   → read PAPER/<slug>/PAPER.md (snapshot) +           (slug = basename minus .md
     the main paper body (main.tex / main.md /          / .paper)
     README.md in that dir)
```

Resolution order for a **slug**:

1. `PAPER.tape` at the repo root — find the row whose slug matches `$1`; the
   row's dir is the paper home (e.g. `./PAPER/<slug>`).
2. In that dir read `PAPER.md` (the @title · @goal · `- [ ]` milestone
   snapshot) for the headline, then the paper body — `main.tex`, else
   `main.md`, else `README.md` — for the abstract / method / finding text.
3. If `$1` is instead a path ending in `.md` (or `.paper.md` / `.tex`), read
   that file directly; the slug is its basename with the extension stripped.

Write the output as `<slug>.easy.paper.md` in the paper's own dir (next to the
source) when reading from `PAPER/<slug>/`, else in the cwd.

# ── the four paper-specific sections ────────────────────────────────────────

The output `<slug>.easy.paper.md` MUST contain these four sections, in order,
all written under the easy 7-element pattern (run the translation checklist
on every paragraph first):

1. **평이-초록 (plain-language abstract)** — the paper's abstract rewritten
   for someone outside the field. No acronym unexpanded on first use, no math
   symbol left raw. One icon + alias up top so the reader has an anchor.

2. **ASCII figure sketches** — for each real figure / key relationship in the
   paper, a fenced ASCII diagram chosen from the 4 templates. Match the shape:
   a before/after result → template ①; a taxonomy/decomposition → ②; an A-vs-B
   comparison → ③; a pipeline/data-flow → ④. Sketch the *idea* of the figure,
   not a pixel copy.

3. **비유 섹션 (analogy-driven method & finding)** — explain HOW the paper did
   it and WHAT it found using everyday-object analogies (the knitting-sweater /
   gripper-robot spirit of the gold examples). Tie each analogy back to one
   concrete thing the paper measured.

4. **"이 논문이 한 일" (what this paper did)** — exactly one paragraph, plain
   language, that a layperson could repeat to a friend: the question, the
   measurement, and the finding (a Δ-vs-baseline OR a ruled-out path). Honest
   to the paper's actual §finding — never upgrade a negative result.

# ── honesty / safety ────────────────────────────────────────────────────────

- READ-ONLY on the source paper. The `.easy.paper.md` is an additive companion;
  never touch `main.tex`, `PAPER.md`, the verdicts, or `PAPER.tape`.
- Do not invent numbers. Every figure / Δ / claim in the easy version must
  trace to something the paper actually reports. A closed-negative paper stays
  a negative result in the easy version (frame the ruled-out path plainly).
- The easy version is an explainer, not a re-judgement — it does not re-verify
  or re-tier anything.

# ── output template (skeleton) ──────────────────────────────────────────────

```
# <icon> <slug> — "<친근한 별칭>" (쉬운 버전)
> 원본 논문: PAPER/<slug>/ (또는 <path>) · 이 파일은 일반인용 companion 입니다.

## 평이-초록
<7-요소로 다시 쓴 초록 — 아이콘·별칭·하는 일·비유 + 약어 첫 등장 풀어쓰기>

## ASCII 그림 스케치
<그림/핵심 관계마다 4종 템플릿 중 하나로 펜스 다이어그램>

## 비유로 보는 방법 & 발견
<방법 HOW + 발견 WHAT 을 일상 비유로 — 각 비유는 실제 측정값에 연결>

## 이 논문이 한 일
<정확히 한 문단 — 질문 + 측정 + 발견(Δ 또는 배제된 경로)>
```

See `samples/` for a worked example.
