---
name: verify
description: Run `hexa verify` — the cross-project tier rubric (TECS-L aligned, real-limits-first). Verdicts 🔵 SUPPORTED-FORMAL · 🟢 SUPPORTED-NUMERICAL · 🟡 SUPPORTED-BY-CITATION · 🟠 INSUFFICIENT/DEFERRED · 🔴 FALSIFIED · ⚪ SPECULATION-FENCED. Triggers — "verify this", "확인해", "검증해", "맞아?", "is this true?", "hexa verify 해".
allowed-tools: Bash
---

@D verify := "wrap `hexa verify` — tier-rubric verification" :: skill
  do   = "route correctness/purity/grade/identity claims to `hexa verify` · paste the badge VERBATIM"
  dont = "LLM self-judge a claim · paraphrase or auto-promote the verdict tier (⚪→🔵)"
