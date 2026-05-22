---
name: inject
description: Immediately inject the latest sidecar commons.tape + project.tape into the current session and sync the local install for the next session. Triggers — "inject", "주입", "최신 룰 적용", "refresh sidecar", "sidecar sync", "현재 세션에 반영", "다시 로드".
allowed-tools: Bash
---

@D inject := "in-session sidecar rule refresh + install sync" :: skill
  do   = "`/inject` runs `sidecar sync` then prints latest commons.tape + project.tape into the turn"
  dont = "use when no sidecar update shipped · use when a fresh session is about to start anyway"
