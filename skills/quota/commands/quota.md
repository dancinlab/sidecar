---
description: /quota:quota — Claude account 5h/7d usage limits + multi-account registry + live credential swap + per-account nicknames. Bare form → unified all-accounts table (6-col table — Nickname · Email · Session Used/Reset · Weekly Used/Reset; ★ = active account, live · others cached). Verbs — list (= status = bare, the unified table) · all (every account fetched live) · add [<nick>] · nick <ref> [<nick>] · switch <ref> · remove <ref> · refresh [<ref>] · help. <ref> = nickname · email · numeric index. Active account fetched live via OAuth usage endpoint with 45s cache; others show last cached (`—` = never fetched). own-accounts-serial only. ⚠ uses non-public Anthropic OAuth endpoints — may break if rotated.
argument-hint: "[list | status | all | add [<nick>] | nick <ref> [<nick>] | switch <ref> | remove <ref> | refresh [<ref>] | help]"
allowed-tools: Bash
---

Run the bash command below via the Bash tool. `$ARGUMENTS` carries the verb + args (empty = `list`).

```bash
H="$CLAUDE_PLUGIN_ROOT/bin/_quota.hexa"
if [ ! -f "$H" ]; then
    V="$(ls -1 "$HOME/.claude/plugins/cache/sidecar/quota" 2>/dev/null | sort -V | tail -1)"
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

| Nickname | Email | Session Used | Session Reset | Weekly Used | Weekly Reset |
|---|---|---|---|---|---|
| <nick> | <email> | <session-bar> | <session-time-left> | <week-bar> | <week-time-left> |
| …one row per Row= line… |

_레지스트리: N개 계정 · ★ = 현재 활성 · `/quota:quota all` = 전 계정 라이브_
_Agent SDK credit: <AgentSDKCredit value>_
```

**For any other verb** (`add` · `nick` · `switch` · `remove` · `refresh` · `autoadd` · `help`) — output is already human-readable. Show verbatim in a fenced code block. (`autoadd` is normally silent — if it prints nothing, just note that no new account needed registering.)

Render exactly what the binary emitted. Never fake values. No extra prose unless the user asked for analysis.

## 데이터 소스 · 캐시 · 안전성 (reference)

| 항목 | 위치 |
|---|---|
| 5h/7d 한도 | `GET https://api.anthropic.com/api/oauth/usage` (`anthropic-beta: oauth-2025-04-20`) |
| 토큰 갱신 | `POST https://platform.claude.com/v1/oauth/token` (refresh-token grant) |
| live access token | `~/.claude/.credentials.json` (Linux) · Keychain svc `"Claude Code-credentials"` (macOS) |
| 계정 ID | `~/.claude.json` → `oauthAccount.{emailAddress,accountUuid}` |
| 캐시 | `$HOME/.sidecar/quota/usage_cache_<uuid>.json` (45s TTL) |
| 레지스트리 | `$HOME/.sidecar/quota/accounts.json` |
| 백업 cred | Keychain svc `"sidecar-quota"` (macOS) · `$HOME/.sidecar/quota/creds/<email>.json` chmod 600 (Linux) |

**캐시 (45s TTL)** — 첫 호출 → endpoint → 캐시 write → 표시 · 0~44s 재호출 → 캐시 hit(network skip) · 45s+ → 재호출 · endpoint 실패 + 캐시 있음 → `(stale Xs ago, fetch failed)` 라벨로 반환 (honest · 가짜 숫자 없음).

**`switch` 안전성** (fail-loud + rollback) — snapshot OUTGOING cred → write LIVE store → verify (re-read · bytes-equal?) → FAIL이면 rollback → apply `~/.claude.json` identity → FAIL이면 cred rollback → commit registry active. 각 실패 시점마다 rollback; rollback도 실패하면 `claude /login` 안내. switch 후 `claude` 재시작 필요.

**한계** — Anthropic 비공식 OAuth endpoint 2곳(`oauth/usage` · `oauth/token`) 의존 → 회전 시 깨짐 · `client_id` 하드코딩(Claude Code public OAuth client) · Agent SDK credit(2026-06-15 dual-bucket billing 이후)은 구독 한도와 별개 — 현재 구독 5h/7d만 표시, SDK credit 통합 deferred(`future:agent-sdk-credit` 라벨, faking 없음) · own-accounts-serial only(멀티-테넌트 라우팅 금지 · ToS red-line).
