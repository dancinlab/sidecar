---
name: master
description: Owner-only sidecar maintenance control-plane. `/master <verb>` — status · update (check→plan→dispatch to /sbs, runs to `go`) · check · audit · lint · sync. Master-tier (gated by ~/.sidecar/master). Triggers — "/master", "마스터", "sidecar 업데이트 체크", "sidecar 정비", "오너 콘솔", "update 체크", "master update", "owner maintenance".
allowed-tools: Bash, WebSearch, WebFetch, Skill, Read
---

@D master := "owner-only sidecar maintenance control-plane" :: skill
  do   = "`/master <verb>` — status·update·check·audit·lint·sync · `update` delegates all edits to `/sbs auto` (runs to the `go` checkpoint) · read-only verbs never mutate"
  dont = "edit governance SSOT (commons.tape·project.tape) or ship directly from /master — route every change through /sbs (s7·s13)"
