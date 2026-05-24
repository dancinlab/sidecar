---
name: quota
description: /quota — Claude account 5h/7d usage limits + multi-account registry. Verbs — status (default · live fetch with 45s cache) · list (registered accounts, last-cached util) · add (snapshot live ~/.claude.json account into registry, metadata-only) · help. Triggers — "quota", "/quota", "쿼터", "한도 보여줘", "session limit 얼마", "주 한도 남았어", "5h 한도", "7d 한도", "claude usage", "내 사용량", "계정 등록".
allowed-tools: Bash
---

@D quota := "Claude 5h/7d limits + multi-account registry" :: skill
  do   = "default to `quota status` for the live account · use `quota list` to sweep cached util per registered account · `quota add` after each `claude /login` so a new account joins the registry · honour `(stale ...)` labels — they're honest, never faked"
  dont = "treat a `(unavailable)` row as the limit being unlimited · hammer `/quota` faster than the 45s cache · cite limits without showing whether they came from live or cache · re-run `quota add` expecting it to refresh creds (PR#3 adds the cred-capture path)"
