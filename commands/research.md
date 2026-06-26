---
description: /research arxiv <query|id> [flags] | yt <url|id> [lang] — fetch arXiv papers (relevance/date-ranked or by-id) or a YouTube transcript — no API key. Returns text the agent can read. Triggers — "arxiv 검색", "논문 찾아줘", "유튜브 자막", "youtube transcript", "/research arxiv", "/research yt".
argument-hint: "arxiv <query|id> [--n N] [--sort relevance|date|updated] | yt <url|id> [lang]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar research $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
