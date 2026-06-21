---
description: Search the arXiv API by free-text query, or look up a paper by arXiv id. Returns title / authors / date / categories / pdf link / abstract for each result. No API key needed. Triggers — "arxiv 검색", "논문 찾아줘", "arxiv 에서 종결됐는지", "is this on arxiv", "search arxiv", "fetch paper", "/arxiv".
argument-hint: "<query | arxiv-id> [--n N] [--sort relevance|date|updated]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness research arxiv $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
