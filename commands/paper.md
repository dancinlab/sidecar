---
description: /paper <new|build|cover|list|publish|update|unpublish|status> [slug] [flags] — demiurge-house scientific paper — `new` scaffolds PAPERS/<slug>/ (emoji title · g5 tier badges · TikZ+pgfplots · fal.ai cover) → `cover` (imagine) → `build` (xelatex+bibtex×3 · g51 ≥10-page gate). `publish --to zenodo|arxiv|both [--sandbox][--source]` deploys (Zenodo REST → DOI · arXiv submission tarball+guide); `update` Zenodo new-version; `unpublish` deletes a Zenodo draft; `status` shows the publish ledger. Keys via secret (zenodo.token). `list`. Triggers — "논문 만들어", "paper scaffold", "new paper", "compile paper", "논문 빌드", "논문 표지", "논문 배포", "zenodo 배포", "arxiv 제출", "publish paper", "/paper new", "/paper build", "/paper publish", "arxiv 논문".
argument-hint: "<new|build|cover|list|publish|update|unpublish|status> [slug] [flags]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar paper $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
