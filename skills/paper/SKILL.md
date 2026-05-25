---
name: paper
description: Arxiv-style LaTeX paper scaffolder (v0.9 — monograph mode). Verbs — new <slug> · monograph-init <slug> [N] · fill <appendix-letter> · sample [<name>] [<dest>] · fig <size> <prompt> <out> · compile [dir] · lint [dir] · list · help · companion {init|sync} · outline [dir] · pipeline <stage1> ... · atoms <domain> · verify-block <fn> <args...> <expected> · bib add <doi-or-arxiv> · pr-roll <repo> <since-ref> · arxiv-prep [<dir>]. v0.9 adds monograph mode — `monograph-init` scaffolds a main.tex \appendix + N (default 12) appendix/<L>_*.tex chapter stubs + companion/ (the HEXA-FUSION 58p structure); `fill` prints a per-appendix runbook; `companion sync` rebuilds data records; lint traverses \input'd appendix files + auto-detects a monograph tier (>=30p/>=6figs/companion) + warns on comparison tables with no chart; the Makefile rebuilds on appendix/figure edits (no distclean); pgfplots ships in the default preamble. FOUR bundled samples: sample-nb-bcs-absorbed · sample-fusion-7gate · sample-cost-routing · sample-blue-max. Triggers — "논문 만들어", "monograph", "모노그래프", "paper scaffold", "new arxiv paper", "arxiv 템플릿", "compile this paper", "fal.ai figure for paper", "/paper monograph-init", "/paper fill", "/paper sample fusion", "/paper sample cost-routing", "/paper sample blue-max".
allowed-tools: Bash
---

@D paper := "arxiv-style LaTeX paper scaffolder (v0.9 — monograph mode)" :: skill
  do   = "`/paper {new|monograph-init|fill|sample|fig|compile|lint|list|companion|outline|pipeline|atoms|verify-block|bib|pr-roll|arxiv-prep}` — scaffold, run, verify, fetch, ship"
  dont = "duplicate the image generator — `/paper fig` delegates to the sister `imagine` plugin"
