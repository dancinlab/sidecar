---
description: /paper <args> — arxiv-style LaTeX paper scaffolder. Verbs — new <slug> · sample <slug> · fig <size> <prompt> <out.png> · compile [dir] · list · help. `new` writes a minimal arxiv-style skeleton (main.tex + references.bib + Makefile + README.md); `sample` copies the bundled demiurge `sample-nb-bcs-absorbed` verbatim; `fig` wraps fal.ai gpt-image-2 (key via `secret get fal.api_key`); `compile` runs pdflatex × 3 + bibtex.
argument-hint: "<new <slug> | sample <slug> | fig <size> <prompt> <out.png> | compile [dir] | list | help>"
allowed-tools: Bash
---

!`H="$(command -v _paper.hexa)"; hexa run "$H" --root "$(dirname "$H")/.." $ARGUMENTS`
