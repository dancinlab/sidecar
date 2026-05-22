---
name: easy
description: Easy (friendly) response style — apply the 7-element pattern from styles/easy.<lang>.md to user-facing prose for the session. Triggers — "친근하게", "쉽게 설명해줘", "이지 모드", "easy", "easy mode", "explain it simply", "もっと分かりやすく", "简单点说", "попроще".
allowed-tools: Read
---

@D easy := "friendly response style — styles/easy.<lang>.md" :: skill
  do   = "read styles/easy.<lang>.md · apply the 7-element pattern to user-facing prose for the session"
  dont = "style code · math · paths · JSON · commit titles · retro-rewrite past turns · re-read per turn"
