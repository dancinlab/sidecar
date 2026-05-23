---
description: Search the arXiv API by free-text query, or look up a paper by arXiv id. Returns title / authors / date / categories / pdf link / abstract for each result. No API key needed.
argument-hint: "<query | arxiv-id> [--n N]"
allowed-tools: Bash
---

!`H="$(command -v _arxiv.hexa)"; hexa run "$H" $ARGUMENTS`
