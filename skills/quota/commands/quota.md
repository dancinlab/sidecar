---
description: /quota — Claude account 5h/7d usage limits + multi-account registry + live credential swap + per-account nicknames. Bare form → unified all-accounts table (6-col 한글 헤더 표; ★ = 현재 활성 계정, 라이브 · 나머지 캐시). Verbs — list (= status = bare, the unified table) · all (every account fetched live) · add [<nick>] · nick <ref> [<nick>] · switch <ref> · remove <ref> · refresh [<ref>] · help. <ref> = nickname · email · numeric index. Active account fetched live via OAuth usage endpoint with 45s cache; others show last cached (`—` = never fetched). own-accounts-serial only. ⚠ uses non-public Anthropic OAuth endpoints — may break if rotated.
argument-hint: "[list | status | all | add [<nick>] | nick <ref> [<nick>] | switch <ref> | remove <ref> | refresh [<ref>] | help]"
allowed-tools: Bash
---

Run the bash command below via the Bash tool. `$ARGUMENTS` carries the verb + args (empty = `list`).

```bash
H="$CLAUDE_PLUGIN_ROOT/bin/_quota.hexa"
if [ ! -f "$H" ]; then
    V="$(ls -1t "$HOME/.claude/plugins/cache/sidecar/quota" 2>/dev/null | head -1)"
    [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/quota/$V/bin/_quota.hexa"
fi
[ -f "$H" ] || { echo "✗ _quota.hexa not found — run /reload-plugins or hx install sidecar" >&2; exit 1; }
hexa run "$H" $ARGUMENTS
```

Then render based on verb:

**If verb is `list` · `status` · `all` · empty (the unified table)** — output has these lines:
- `Row=<nick>|<email>|<session-bar>|<session-time-left>|<week-bar>|<week-time-left>` — 6 pipe-separated cells, ONE per registered account, in order. A `★ ` prefix in the nick cell marks the currently active account; `—` cells = never fetched (honest, never faked).
- `StaleCache=...` — optional callout above the table (live fetch failed, showing cache).
- `Empty=...` — no registered accounts; report it and stop.
- `Error=...` — error path; report it and stop.
- `AgentSDKCredit=...` — italic footer.
- `Registry=N account(s)` — italic footer.

If `Error=` or `Empty=` is present, report that line and stop. Otherwise render exactly this shape — **one table row per `Row=` line, in the order emitted**:

```
> ⚠ <StaleCache value>   ← only if a StaleCache= line was present

| 닉네임 | 이메일 | 세션 사용량 | 세션 리밋 | 주간 사용량 | 주간 리밋 |
|---|---|---|---|---|---|
| <nick> | <email> | <session-bar> | <session-time-left> | <week-bar> | <week-time-left> |
| …one row per Row= line… |

_레지스트리: N개 계정 · ★ = 현재 활성 · `/quota all` = 전 계정 라이브_
_Agent SDK credit: <AgentSDKCredit value>_
```

**For any other verb** (`add` · `nick` · `switch` · `remove` · `refresh` · `autoadd` · `help`) — output is already human-readable. Show verbatim in a fenced code block. (`autoadd` is normally silent — if it prints nothing, just note that no new account needed registering.)

Render exactly what the binary emitted. Never fake values. No extra prose unless the user asked for analysis.
