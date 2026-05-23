---
name: atlas
description: Run `hexa atlas` — the atlas SSOT surface (PR-only landing per @D g_atlas_binary_builtin). Read verbs hash · stats [--audit] · lookup <K> <id> · dump [K]. Write verbs append-witness · register --from-{verify,drill,check} [--auto-pr] · pr --staging <file.n6>. Triggers — "atlas lookup", "atlas stats", "아틀라스 조회", "아틀라스 등록", "atlas absorb", "register from drill".
allowed-tools: Bash
---

@D atlas := "wrap `hexa atlas` — SSOT read + PR-only write surface" :: skill
  do   = "route atlas reads/writes to `hexa atlas` · use register --from-{verify,drill,check} for in-memory node-gen (DiscoveryEvent sink)"
  dont = "edit compiler/atlas/embedded.gen.hexa directly · stage atlas changes outside the `pr --staging` landing verb"
