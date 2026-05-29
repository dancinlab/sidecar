---
name: hexa
description: Generic passthrough to the hexa CLI — `/hexa <verb> [args...]` runs `hexa $ARGUMENTS`. For the 80+ verbs without a dedicated wrapper (run · build · test · parse · check · bench · qrng · sim-universe · qmirror · loop · tool · status · …). Triggers — "hexa run", "hexa build", "hexa test", "hexa <verb> 돌려", "run hexa <verb>", "hexa 동사 실행".
allowed-tools: Bash
---

@D hexa := "generic passthrough to the hexa CLI" :: skill
  do   = "`/hexa <verb> [args]` → `hexa $ARGUMENTS` for any verb lacking a dedicated wrapper · paste output verbatim"
  dont = "proxy a dedicated-wrapper verb (cloud·deck·kick·atlas·verify) — /hexa refuses + redirects to the dedicated skill so its guards/preflight aren't bypassed"
