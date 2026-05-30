---
name: pool
description: Wrap the sidecar-owned `pool` CLI — host roster + remote exec for host-specific / heavy / GPU work. Canonical entry `sidecar pool <args>` (bare `pool` is a kept-working deprecation shim → same binary). Verbs — list · add · on <host> <cmd> · status · health · route · bg · refresh · init · rm · clean · desc. Triggers — "pool 호스트", "다른 호스트에서 돌려", "remote exec", "GPU 호스트에 dispatch", "host 추가", "pool status".
allowed-tools: Bash
---

@D pool := "wrap the sidecar-owned `pool` CLI — host roster + remote exec" :: skill
  do   = "`/pool {list|add <host>|on <host> <cmd>|status|route|clean}` for host-specific / heavy / GPU work (g9)"
  do   = "canonical entry is `sidecar pool <args>`; bare `pool` still works (deprecation shim → same binary)"
  dont = "run host-specific work (swift · xcodebuild · GPU) on the current shell"
