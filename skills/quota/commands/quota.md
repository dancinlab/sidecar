---
description: /quota — Claude account 5h/7d usage limits + multi-account registry + live credential swap + per-account nicknames. Bare form → status (6-col row). Verbs — status · list · add [<nick>] · nick <ref> [<nick>] · switch <ref> · remove <ref> · refresh [<ref>] · help. <ref> = nickname · email · numeric index. Live fetch via OAuth usage endpoint with 45s per-account cache; labelled-stale fallback (honest, never faked). Per-account OAuth blob in macOS keychain svc "sidecar-quota" / linux $HOME/.sidecar/quota/creds/<email>.json (0600). own-accounts-serial only. ⚠ uses non-public Anthropic OAuth endpoints — may break if rotated.
argument-hint: "[status | list | add [<nick>] | nick <ref> [<nick>] | switch <ref> | remove <ref> | refresh [<ref>] | help]"
allowed-tools: Bash
---

Run the bash command below via the Bash tool. `$ARGUMENTS` carries the verb + args (empty = `status`).

```bash
H="$CLAUDE_PLUGIN_ROOT/bin/_quota.hexa"
if [ ! -f "$H" ]; then
    V="$(ls -1t "$HOME/.claude/plugins/cache/sidecar/quota" 2>/dev/null | head -1)"
    [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/quota/$V/bin/_quota.hexa"
fi
[ -f "$H" ] || { echo "✗ _quota.hexa not found — run /reload-plugins or hx install sidecar" >&2; exit 1; }
hexa run "$H" $ARGUMENTS
```

Then render in chat based on verb:

**If verb is `status` or empty (default)** — output has these lines (in order, when present):
- `Row=<nick>|<email>|<session-time-left>|<week-time-left>|<session-bar>|<week-bar>` — 6 pipe-separated cells. `<nick>` is `—` when unset. Bars are `▓▓▓░░ NN%`.
- `StaleCache=...` — optional callout above the table.
- `AgentSDKCredit=...` — italic footer.
- `Registry=N account(s)` — italic footer.
- `Error=...` — error path; just report and stop.

If `Error=`, report the error. Otherwise render this exact shape:

```
> ⚠ <StaleCache value>   ← only if StaleCache= line was present

| nick | email | session limit | week limit | session | week |
|---|---|---|---|---|---|
| <nick> | <email> | <session-time> | <week-time> | <session-bar> | <week-bar> |

_Registry: N account(s) · `/quota:quota list`_
_Agent SDK credit: <AgentSDKCredit value>_
```

**For any other verb** (`list`, `add`, `nick`, `switch`, `remove`, `refresh`, `help`) — the binary's output is already human-readable. Show it verbatim in a fenced code block.

Render exactly what the binary emitted. Never fake values. Add no extra prose unless the user clearly asked for analysis.
