---
description: /quota — Claude account 5h/7d usage limits + multi-account registry + live credential swap + per-account nicknames. Bare form → status. Each verb also has its own picker entry: /quota:status · /quota:list · /quota:add [<nick>] · /quota:nick <ref> [<nick>] · /quota:switch <ref> · /quota:remove <ref> · /quota:refresh [<ref>] · /quota:help. <ref> = nickname (e.g. claude1) · email · numeric index. Live fetch via OAuth usage endpoint with 45s per-account cache; labelled-stale fallback (honest, never faked). Per-account OAuth blob in macOS keychain svc "sidecar-quota" / linux $HOME/.sidecar/quota/creds/<email>.json (0600). own-accounts-serial only. ⚠ uses non-public Anthropic OAuth endpoints — may break if rotated.
argument-hint: "[status | list | add [<nick>] | nick <ref> [<nick>] | switch <ref> | remove <ref> | refresh [<ref>] | help]"
allowed-tools: Bash
---

Run the bash command below via the Bash tool. The first argument (`$ARGUMENTS`) is the verb; empty means `status`.

```bash
H="$CLAUDE_PLUGIN_ROOT/bin/_quota.hexa"
if [ ! -f "$H" ]; then
    V="$(ls -1t "$HOME/.claude/plugins/cache/sidecar/quota" 2>/dev/null | head -1)"
    [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/quota/$V/bin/_quota.hexa"
fi
[ -f "$H" ] || { echo "✗ _quota.hexa not found — run /reload-plugins or hx install sidecar" >&2; exit 1; }
hexa run "$H" $ARGUMENTS
```

Then render the result in chat based on the verb:

**If the verb is `status` or empty (default)** — the output is plain `Key=Value` lines (one per row, in this order when present): `Account`, `Org`, `StaleCache` (optional), `5h`, `7d` (or `Limits` when both unavailable), `AgentSDKCredit`, `Registry`. Render as a markdown table:

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

Rules for the status table:
- Omit the `Org` row when not present.
- When `StaleCache=...` is present, prepend a one-line callout **above** the table: `> ⚠ <StaleCache value>`.
- When `Limits=(unavailable) ...` is present (no `5h`/`7d` rows), collapse into a single `Limits` row.
- Render exactly what the binary emitted — never faked.

**For any other verb** (`list`, `add`, `nick`, `switch`, `remove`, `refresh`, `help`) — the output is already human-readable. Show it verbatim in a fenced code block. Do not invent or reformat values.

Add no extra prose unless the user clearly asked for analysis.
