---
description: /research arxiv <query|id> [--n N] [--sort relevance|date|updated] | yt <url|id> [lang] — fetch arXiv papers (search relevance-ranked + per-term AND, or by-id) or a YouTube transcript — no API key. Returns text the agent can read. Triggers — "arxiv 검색", "논문 찾아줘", "유튜브 자막", "research arxiv", "youtube transcript", "fetch paper", "/research arxiv", "/research yt".
argument-hint: "arxiv <query|id> [--n N] [--sort relevance|date|updated] | yt <url|id> [lang]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness research $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
