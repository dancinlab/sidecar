---
name: paper
description: Arxiv-style LaTeX paper scaffolder (v0.6 — rich template). Verbs — new <slug> · sample <slug> · fig <size> <prompt> <out> · compile [dir] · lint [dir] · list. Template ships a 9-section spine (Intro · Background · §Full Pipeline tier table · Method · Verify · Results · Limitations · Reproducibility · Conclusion) + companion/ data records (verify-ledger.json · pr-roll.json · session-journal.md · adapter-defect-catalog.json) + 3 figures (fig01 matplotlib · fig02 TikZ line · fig03 TikZ pipeline) + cover prompt-design guide. Makefile pins xelatex (emoji-native — kills the pdflatex tier-emoji fatal) with new wordcount · pages · lint · arxiv-tar · figures-clean targets. Extended g51 lint adds section presence + table/figure counts + bibtex entry threshold + emoji guard + cite-key resolution warn-list. Triggers — "논문 만들어", "paper scaffold", "new arxiv paper", "arxiv 템플릿", "compile this paper", "fal.ai figure for paper".
allowed-tools: Bash
---

@D paper := "arxiv-style LaTeX paper scaffolder (v0.6 rich template)" :: skill
  do   = "`/paper {new|sample|fig|compile|lint|list}` — scaffold rich template, copy sample, gen figure, xelatex×3, or run extended g51 lint"
  dont = "duplicate the image generator — `/paper fig` delegates to the sister `imagine` plugin"
