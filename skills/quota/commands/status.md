---
description: /quota:status — current Claude account in a 6-column row (nick · email · session-time-left · week-time-left · session-bar · week-bar). The agent runs the hexa binary, parses the `Row=...` line, and renders a markdown table in chat so the CC TUI shows it as a real visible table.
allowed-tools: Bash
---

Run the bash command below via the Bash tool. The binary emits one `Row=...` line for the current Claude account plus a few metadata lines.

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
- `Row=<nick>|<email>|<session-time-left>|<week-time-left>|<session-bar>|<week-bar>` — 6 pipe-separated cells. `<nick>` is `—` when no nickname is set. Bars are `▓▓▓░░ NN%`.
- `StaleCache=<message>` — optional; only when the live fetch failed and a stale cache was served.
- `AgentSDKCredit=<note>` — informational, render as a small footer.
- `Registry=N account(s)` — count footer.
- `Error=<message>` — error path; only this line appears, no `Row=`.

**If an `Error=` line appears**, just report the error to the user. Stop.

**Otherwise**, respond with this exact shape:

```
| nick | email | session limit | week limit | session | week |
|---|---|---|---|---|---|
| <nick cell from Row> | <email> | <session-time-left> | <week-time-left> | <session-bar> | <week-bar> |
```

Then below the table, on separate lines:
- If `StaleCache=...` was present: `> ⚠ <StaleCache value>` (markdown blockquote) **above** the table.
- Footer line: `_Registry: N account(s) · `/quota:quota list`_` (italic, with the count from `Registry=`).
- One more footer line for SDK credit: `_Agent SDK credit: <AgentSDKCredit value>_` (italic).

Do not invent values. Render exactly what the binary emitted (never faked). Add no extra prose unless the user clearly asked for analysis — just the table + the two footer lines.
