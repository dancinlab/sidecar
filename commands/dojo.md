---
description: /dojo <domain> <slug> '<spec-json>' [--lang=hexa|py|both] — passthrough to `hexa dojo` (generic cloud training-job generator · 학습 빵틀 — emits .hexa+.py+run.sh into exports/<domain>/dojo/<slug>/). `dojo domains` lists known domains. Triggers — "학습잡 만들어", "training job", "hexa dojo", "학습 빵틀", "모델 학습 잡 생성", "/dojo".
argument-hint: "<domain> <slug> '<spec-json>' [--lang=hexa|py|both] | domains"
allowed-tools: Bash
---

!`command -v hexa >/dev/null 2>&1 && hexa dojo $ARGUMENTS || echo "hexa CLI not found — install dancinlab/hexa-lang (~/.hx/bin/hexa on PATH)"`
