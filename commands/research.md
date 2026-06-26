---
description: /research arxiv|yt|web|fetch — keyless external fetch (no key): arXiv · YouTube transcript · web search (DuckDuckGo) · page→text. web/fetch mirror Claude Code's WebSearch/WebFetch. Triggers — "논문 찾아줘", "유튜브 자막", "웹 검색", "web search", "페이지 가져와", "/research web", "/research fetch", "/research arxiv".
argument-hint: "arxiv <query|id> [--n N] [--sort relevance|date|updated] | yt <url|id> [lang] | web <query> [--n N] | fetch <url>"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar research $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
