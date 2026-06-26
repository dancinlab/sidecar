---
description: /paper <new|build|cover|list|publish|update|unpublish|status> [slug] [flags] — demiurge scientific paper: scaffold → cover → build (xelatex+bibtex · ≥10-page gate) → publish to zenodo|arxiv (DOI / tarball). Keys via secret. Flags → `--help`. Triggers — "논문 만들어", "논문 빌드", "논문 배포", "publish paper", "arxiv 제출", "/paper".
argument-hint: "<new|build|cover|list|publish|update|unpublish|status> [slug] [flags]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar paper $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
