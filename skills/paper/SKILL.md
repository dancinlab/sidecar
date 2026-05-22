---
name: paper
description: |
  Arxiv-style LaTeX paper scaffolder. Invoke when the user wants to
  start, copy, compile, or generate figures for an arxiv-quality paper.
  Triggers on phrases like "논문 만들어", "paper scaffold", "new arxiv
  paper", "arxiv 템플릿", "compile this paper", "fal.ai figure for
  paper". Five verbs: `/paper new <slug>` scaffolds a minimal
  single-column 11pt skeleton at `./<slug>/`; `/paper sample <slug>`
  copies the bundled demiurge `sample-nb-bcs-absorbed` verbatim
  (an arxiv-quality reference exhibit, ~14-page LTS BCS attestation);
  `/paper fig <size> <prompt> <out>` wraps fal.ai gpt-image-2 (queue +
  poll, key via `secret get fal.api_key`); `/paper compile [dir]` runs
  pdflatex × 3 + bibtex; `/paper list` shows bundled samples.
allowed-tools: Bash
---

# paper — arxiv-style LaTeX paper scaffolder

## When to use

- *"새 논문 시작해줘"* / *"scaffold a new arxiv paper"* → `/paper new <slug>`
- *"BCS 샘플 가져와"* / *"copy that demiurge sample"* → `/paper sample <slug>`
- *"이 논문 컴파일"* / *"compile this paper"* → `/paper compile [dir]`
- *"figure 생성"* / *"fal.ai cover image"* → `/paper fig <size> <prompt-file> <out>.png`
- *"어떤 샘플 있어?"* → `/paper list`

The slash command writes scaffolded files, runs `pdflatex`/`bibtex`, or
calls fal.ai — output lands in the conversation context.

## Verbs

```
/paper new <slug>                          scaffold ./<slug>/ from template/
/paper sample <slug>                       copy bundled samples/sample-nb-bcs-absorbed/ verbatim
/paper fig <image_size> <prompt> <out.png> fal.ai gpt-image-2 (queue + poll)
/paper compile [dir]                       pdflatex × 3 + bibtex (default cwd)
/paper list                                list bundled samples
/paper help                                show usage
```

`<image_size>`: `square_hd` (1024×1024) · `landscape_16_9` (1792×1024) ·
`portrait_16_9` (1024×1792) · `square` (512×512).

## What's bundled

- `template/` — minimal arxiv-style skeleton: `main.tex` (single-column
  11pt, A4, with amsmath / graphicx / natbib / tikz / hyperref preamble),
  `references.bib` (placeholder DOI entry), `Makefile` (3-pass + bibtex),
  `README.md`, `figures/_prompts/` (verbatim fal.ai prompt storage for
  provenance).
- `samples/sample-nb-bcs-absorbed/` — the demiurge sample verbatim
  (~14 pages compiled): main.tex + references.bib + Makefile + figures/
  + _prompts/. Arxiv-quality reference exhibit; copy with `/paper sample`
  to study the structure.
- `_tools/fal_gen.sh` — queue-pattern fal.ai gpt-image-2 generator
  (1 submit → 3s × 80 poll → fetch). Reads key via `secret get
  fal.api_key`; payload JSON via mktemp (argv never exposes prompt).

## Provenance discipline (carried over from demiurge PAPERS)

- BibTeX entries should carry **DOI · arxiv id · or stable URL** —
  untraceable claims don't enter the paper.
- fal.ai-generated figure prompts are kept verbatim under
  `figures/_prompts/<name>.txt` so the input is reproducible.
- Captions for AI-generated figures should mark provenance:
  `% generated via fal.ai gpt-image-2 (prompt: figures/_prompts/cover.txt)`.

## Guardrails

- `/paper fig` requires the `secret` CLI on PATH and a stored
  `fal.api_key` (set via `secret set fal.api_key`). The script exits
  with a clear error if the key isn't there.
- `/paper compile` requires `pdflatex` + `bibtex` (BasicTeX or TeX Live).
- `/paper new <slug>` refuses to overwrite an existing `./<slug>/`.
- Compiled `.pdf` / `.aux` / `.log` / `.bbl` / `.blg` / `.out` are NOT
  bundled inside the plugin — only source. Run `make` to produce the PDF.
