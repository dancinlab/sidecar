---
name: secret
description: Wrap the `secret` CLI — macOS Keychain-backed credential store with dual-channel sync (dancinlab/secret). Verbs — get · set · rotate · check · delete · list · service · init · backup · sync · migrate. Triggers — "secret get", "secret set", "토큰 저장", "키체인", "credential 가져와", "API key 등록", "백업 push".
allowed-tools: Bash
---

@D secret := "wrap the `secret` CLI — macOS Keychain credentials" :: skill
  do   = "fetch creds via inline `$(secret get <k>)` · use the slash form for manage verbs (list/set/…)"
  dont = "`/secret get` into chat context · print/echo/commit a credential value · creds on argv (g28)"
