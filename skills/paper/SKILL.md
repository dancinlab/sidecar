---
name: paper
description: Arxiv-style LaTeX paper scaffolder (v0.8 — 4 bundled samples). Verbs — new <slug> · sample [<name>] [<dest>] · fig <size> <prompt> <out> · compile [dir] · lint [dir] · list · help · companion init · outline [dir] · pipeline <stage1> <stage2> ... · atoms <domain> · verify-block <fn> <args...> <expected> · bib add <doi-or-arxiv> · pr-roll <repo> <since-ref> · arxiv-prep [<dir>]. v0.8 bundles FOUR samples (was one): sample-nb-bcs-absorbed (full reference exhibit) · sample-fusion-7gate (D-T fusion 10-stage §Full Pipeline pattern) · sample-cost-routing (cost-benchmark structure mirroring hexa-codex economics-routing-savings) · sample-blue-max (algebraic-root-only audit paper structure). Triggers — "논문 만들어", "paper scaffold", "new arxiv paper", "arxiv 템플릿", "compile this paper", "fal.ai figure for paper", "/paper sample fusion", "/paper sample cost-routing", "/paper sample blue-max".
allowed-tools: Bash
---

@D paper := "arxiv-style LaTeX paper scaffolder (v0.8 — 4 samples)" :: skill
  do   = "`/paper {new|sample|fig|compile|lint|list|companion|outline|pipeline|atoms|verify-block|bib|pr-roll|arxiv-prep}` — scaffold, run, verify, fetch, ship"
  dont = "duplicate the image generator — `/paper fig` delegates to the sister `imagine` plugin"
