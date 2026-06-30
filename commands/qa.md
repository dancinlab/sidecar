---
description: /qa [--min <n>] — formal all-PASS QA bar for the harness: ci (verify) + lint (L0/injectCaps/CHANGELOG/convergence) + audit (NO axis at 0 · --min raises the floor). ship's pre-flight gate; exit 1 on any red. Triggers — "qa", "하네스 점검", "ship 전 검증", "all pass 점검", "/qa".
argument-hint: "[--min <n>]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar qa $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
