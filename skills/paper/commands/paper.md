---
description: /paper <args> — arxiv-style LaTeX paper scaffolder. Verbs — new <slug> · sample <slug> · fig <size> <prompt> <out.png> · compile [dir] · lint [dir] · list · help. `new` writes a minimal arxiv-style skeleton; `sample` copies the bundled demiurge sample verbatim; `fig` wraps fal.ai gpt-image-2; `compile` runs pdflatex × 3 + bibtex; `lint` enforces commons @D g51 (≥10 pages + ≥1 fal.ai figure).
argument-hint: "<new <slug> | sample <slug> | fig <size> <prompt> <out.png> | compile [dir] | lint [dir] | list | help>"
allowed-tools: Bash
---

!`H="$(command -v _paper.hexa)"; hexa run "$H" --root "$(dirname "$H")/.." $ARGUMENTS`
