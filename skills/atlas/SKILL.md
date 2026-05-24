---
name: atlas
description: Run `hexa atlas` — the atlas SSOT surface (SSOT = compiler/atlas/embedded.gen.hexa, served at runtime by static_atlas via TEXT-parse). Read verbs hash · stats [--audit] · lookup <K> <id> · dump [K]. Write verb register --from-verify <fn> <n> <v> · register --from-drill --seed "<text>" (folds the verified node DIRECTLY into embedded.gen.hexa — no rebuild, no staging shard). Export verb export [--out PATH] (portable .n6 artifact). Triggers — "atlas lookup", "atlas stats", "아틀라스 조회", "아틀라스 등록", "atlas absorb", "register from drill".
allowed-tools: Bash
---

@D atlas := "wrap `hexa atlas` — SSOT read + direct-fold register + export surface" :: skill
  do   = "route atlas reads/writes to `hexa atlas` · register --from-verify / --from-drill folds the verified node DIRECTLY into compiler/atlas/embedded.gen.hexa (visible to next lookup, no rebuild) · commit embedded.gen.hexa with normal git to share · export [--out PATH] to emit a portable n6/atlas.n6"
  dont = "hand-edit compiler/atlas/embedded.gen.hexa node bodies · treat n6/atlas.n6 as the runtime SSOT (it is an export artifact only)"
