---
name: hexa-help
description: Wrap `hexa --help` (no arg, top-level catalog) or `hexa <verb> --help` (verb-specific signature) — consult before guessing unfamiliar hexa verbs (commons g7). Triggers — "hexa 뭐있어", "hexa <verb> 뭐야", "hexa help", "hexa --help", "hexa 사용법".
allowed-tools: Bash
---

@D hexa-help := "wrap `hexa --help` / `hexa <verb> --help`" :: skill
  do   = "consult `hexa --help` (catalog) or `hexa <verb> --help` (signature) before guessing (g7)"
  dont = "guess an unfamiliar hexa verb's signature without checking help first"
