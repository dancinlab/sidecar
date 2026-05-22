---
name: paper
description: Arxiv-style LaTeX paper scaffolder. Verbs — new <slug> · sample <slug> · fig <size> <prompt> <out> · compile [dir] · list. Triggers — "논문 만들어", "paper scaffold", "new arxiv paper", "arxiv 템플릿", "compile this paper", "fal.ai figure for paper".
allowed-tools: Bash
---

@D paper := "arxiv-style LaTeX paper scaffolder" :: skill
  do   = "`/paper {new|sample|fig|compile|list}` — scaffold, copy sample, gen figure, or pdflatex×3"
  dont = "duplicate the image generator — `/paper fig` delegates to the sister `imagine` plugin"
