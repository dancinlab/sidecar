---
name: quota
description: /quota — Claude account 5h/7d usage limits + multi-account registry + live credential swap. Verbs — status (default · live fetch with 45s cache) · list (registered accounts, last-cached util) · add (snapshot account + capture credentials) · switch <ref> (live cred swap, verified + rollback) · remove <ref> · refresh [<ref>] (re-fetch usage; renews tokens) · help. Triggers — "quota", "/quota", "쿼터", "한도 보여줘", "session limit 얼마", "주 한도 남았어", "5h 한도", "7d 한도", "claude usage", "내 사용량", "계정 등록", "계정 전환", "계정 바꿔", "다른 계정으로".
allowed-tools: Bash
---

@D quota := "Claude 5h/7d limits + multi-account registry + cred swap" :: skill
  do   = "default to `quota status` for the live account · `quota add` after each `claude /login` so creds are captured for swap · `quota switch <ref>` to swap (verified + rollback on failure) · restart `claude` after a successful switch · own-accounts-serial only (one user, one account live at a time) · honour `(stale ...)` labels — they're honest, never faked"
  dont = "treat a `(unavailable)` row as the limit being unlimited · hammer `/quota` faster than the 45s cache · cite limits without showing whether they came from live or cache · route OTHER users' traffic through these creds (ToS red-line — not a multi-tenant router) · `quota switch` to an account that was never `quota add`-ed while logged in (no creds to swap in)"
