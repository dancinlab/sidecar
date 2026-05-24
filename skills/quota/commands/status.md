---
description: /quota:status — current Claude account + live 5h/7d usage (45s cache). Surfaces `nick (email)` when the live account is registered with a nickname. The agent runs the bash binary, parses the key=value lines, and renders a markdown table directly in chat so CC's TUI renders it as a real visible table.
allowed-tools: Bash
---

Run the bash command below via the Bash tool to fetch the current Claude account's live 5h/7d quota and registry summary.

```bash
H="$CLAUDE_PLUGIN_ROOT/bin/_quota.hexa"
if [ ! -f "$H" ]; then
    V="$(ls -1t "$HOME/.claude/plugins/cache/sidecar/quota" 2>/dev/null | head -1)"
    [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/quota/$V/bin/_quota.hexa"
fi
[ -f "$H" ] || { echo "✗ _quota.hexa not found — run /reload-plugins or hx install sidecar" >&2; exit 1; }
hexa run "$H" status
```

The stdout is plain `Key=Value` lines (one per row, in this exact order when present): `Account`, `Org`, `StaleCache` (optional — only when live fetch failed + cache is served), `5h`, `7d` (or `Limits` when both unavailable), `AgentSDKCredit`, `Registry`.

Then **respond to the user with a markdown table** rendered exactly like this:

```
| Field | Value |
|---|---|
| Account | <Account value> |
| Org | <Org value> |
| 5h | <5h value> |
| 7d | <7d value> |
| Agent SDK credit | <AgentSDKCredit value> |
| Registry | <Registry value> · `/quota:list` |
```

Rules:
- Omit the `Org` row when not present in the output.
- When `StaleCache=...` is present, prepend a one-line callout **above** the table:
  `> ⚠ <StaleCache value>`
- When `Limits=(unavailable) ...` is present (no `5h`/`7d` rows), collapse the two rows into a single `Limits` row carrying that message.
- Do not invent values. Render exactly what the binary emitted (never faked).
- Add no extra prose around the table unless the user clearly asked for analysis — just the table.
