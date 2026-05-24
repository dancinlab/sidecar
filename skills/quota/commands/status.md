---
description: /quota:status — 현재 Claude 계정 한 줄 (닉네임 · 이메일 · 세션 사용량 · 세션 리밋 · 주간 사용량 · 주간 리밋). 에이전트가 hexa 바이너리 실행 → Row= 라인 파싱 → 채팅에 markdown 표 렌더링 (CC TUI가 실제 표로 표시).
allowed-tools: Bash
---

Run the bash command below via the Bash tool. The binary emits one `Row=...` line for the current Claude account plus metadata lines.

```bash
H="$CLAUDE_PLUGIN_ROOT/bin/_quota.hexa"
if [ ! -f "$H" ]; then
    V="$(ls -1t "$HOME/.claude/plugins/cache/sidecar/quota" 2>/dev/null | head -1)"
    [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/quota/$V/bin/_quota.hexa"
fi
[ -f "$H" ] || { echo "✗ _quota.hexa not found — run /reload-plugins or hx install sidecar" >&2; exit 1; }
hexa run "$H" status
```

Output shape (lines, in this order when present):
- `Row=<nick>|<email>|<session-bar>|<session-time-left>|<week-bar>|<week-time-left>` — 6 pipe-separated cells. `<nick>` is `—` when no nickname. Bars are `▓▓▓░░ NN%`.
- `StaleCache=<message>` — optional; only when live fetch failed + cache was served.
- `AgentSDKCredit=<note>` — informational footer.
- `Registry=N account(s)` — count footer.
- `Error=<message>` — error path; only this line appears, no `Row=`.

**If `Error=` appears**, just report the error. Stop.

**Otherwise**, respond with this exact shape (Korean headers, columns mapped from the Row cells):

```
| 닉네임 | 이메일 | 세션 사용량 | 세션 리밋 | 주간 사용량 | 주간 리밋 |
|---|---|---|---|---|---|
| <nick cell> | <email> | <session-bar> | <session-time-left> | <week-bar> | <week-time-left> |
```

Then below the table:
- If `StaleCache=...` was present: prepend `> ⚠ <StaleCache value>` (markdown blockquote) **above** the table.
- Footer: `_레지스트리: N개 계정 · `/quota:quota list`_` (italic).
- Footer: `_Agent SDK credit: <AgentSDKCredit value>_` (italic).

Render exactly what the binary emitted. Never fake values. No extra prose unless the user asked for analysis.
