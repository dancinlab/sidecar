---
name: paper
description: Arxiv-style LaTeX paper scaffolder (v0.7 — verbs). Core verbs — new <slug> · sample <slug> · fig <size> <prompt> <out> · compile [dir] · lint [dir] · list. New v0.7 verbs — companion init · outline [dir] · pipeline <stage1> <stage2> ... · atoms <domain> · verify-block <fn> <args...> <expected> · bib add <doi-or-arxiv> · pr-roll <repo> <since-ref> · arxiv-prep [<dir>]. companion init scaffolds the companion/ data-record dir in cwd. outline prints main.tex sections / figures / tables TOC. pipeline emits a §Full Pipeline LaTeX table skeleton pre-filled with 🟠 tier. atoms scans hexa-lang verify_cli.hexa for atoms matching a domain. verify-block runs hexa verify and emits a ready-to-paste lstlisting block. bib add fetches CrossRef DOI or arxiv API metadata and appends a bibtex entry. pr-roll uses gh CLI to emit a merged-PR list as both LaTeX paragraph and companion/pr-roll.json. arxiv-prep produces out/<slug>-arxiv.tar.gz with arxiv-mandatory files and validates per arxiv rules. Triggers — "논문 만들어", "paper scaffold", "new arxiv paper", "arxiv 템플릿", "compile this paper", "fal.ai figure for paper", "/paper companion init", "/paper pipeline", "/paper verify-block", "/paper bib add", "/paper pr-roll", "/paper arxiv-prep".
allowed-tools: Bash
---

@D paper := "arxiv-style LaTeX paper scaffolder (v0.7 verbs)" :: skill
  do   = "`/paper {new|sample|fig|compile|lint|list|companion|outline|pipeline|atoms|verify-block|bib|pr-roll|arxiv-prep}` — scaffold, run, verify, fetch, ship"
  dont = "duplicate the image generator — `/paper fig` delegates to the sister `imagine` plugin"
