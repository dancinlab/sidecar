---
description: Author a layperson `.easy.paper.md` companion of a paper. Reads a PAPER/<slug>/ dir (PAPER.tape roster) or a given paper .md, applies the easy 7-element pattern, and writes <slug>.easy.paper.md with four sections — 평이-초록 · ASCII figure sketches · 비유 섹션 · "이 논문이 한 일".
argument-hint: "<slug-or-paper.md>"
allowed-tools: Read, Bash
---

Engage the `easy-paper` skill. `$ARGUMENTS` is a paper slug or a path to a
paper `.md`.

1. **Resolve the source.** If `$ARGUMENTS` is a slug, look it up in the
   repo-root `PAPER.tape` roster (slug → dir) and read that dir's `PAPER.md`
   snapshot plus the paper body (`main.tex`, else `main.md`, else
   `README.md`). If it is a path ending in `.md` / `.paper.md` / `.tex`, read
   that file directly; the slug is its basename minus the extension.

2. **Load the easy reference (source of truth — do not duplicate).** Read the
   sister `easy` plugin's style file — when invoked as a plugin command try
   `${CLAUDE_PLUGIN_ROOT}/../easy/styles/easy.<lang>.md`, else the cached
   mirror `$HOME/.claude/plugins/cache/sidecar/easy/<version>/styles/easy.<lang>.md`
   (highest version via `ls -1 | sort -V | tail -1`), else the
   `easy-auto/<version>/styles/easy.<lang>.md` mirror. Pick the lang
   (`ko` default) matching the paper. APPLY its 7-element pattern, 4 ASCII
   templates, and jargon→everyday checklist — summarize, don't copy it whole.

3. **Write `<slug>.easy.paper.md`** (in the paper's dir when reading from
   `PAPER/<slug>/`, else cwd) with these four sections, in order, all under
   the 7-element pattern: (1) **평이-초록** plain-language abstract,
   (2) **ASCII 그림 스케치** figure sketches via the 4 templates, (3) **비유
   섹션** analogy-driven method & finding tied to real measurements,
   (4) **"이 논문이 한 일"** one paragraph — question + measurement + finding.

READ-ONLY on the source paper — never edit `main.tex` / `PAPER.md` /
`PAPER.tape` / verdicts. Do not invent numbers; a negative-result paper stays
a negative result. See SKILL.md for the full I/O contract and the
`samples/` worked example.

On activation, output one short confirmation line, write the file, then report
the output path.
