---
name: pool
description: Wrap the `pool` CLI — host roster + remote exec for host-specific / heavy / GPU work. Verbs — list · add · on <host> <cmd> · status · install tailscale · rm. Triggers — "pool 호스트", "다른 호스트에서 돌려", "remote exec", "GPU 호스트에 dispatch", "host 추가", "pool status".
allowed-tools: Bash
---

@D pool := "wrap the `pool` CLI — host roster + remote exec" :: skill
  do   = "`/pool {list|add|on <host> <cmd>|status|rm}` for host-specific / heavy / GPU work (g9)"
  dont = "run host-specific work (swift · xcodebuild · GPU) on the current shell"
