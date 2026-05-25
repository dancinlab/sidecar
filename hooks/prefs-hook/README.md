# prefs

User language preferences across 3 axes — code authoring · doc authoring · response language.

## Axes

| Axis | Covers | Default |
|---|---|---|
| `code` | `.tape` · `.hexa` · `.py` · `.sh` · `.swift` · `.ts` · `.rs` · `.c` · ... | `english` |
| `docs` | `.md` · `README` · `CHANGELOG` · code comments in doc form · ... | `english` |
| `response` | Agent's reply text to the user in chat | `korean` |

## Verbs

```
/prefs              show current values
/prefs show         (same)
/prefs code <lang>  set code-authoring language
/prefs docs <lang>  set doc-authoring language
/prefs response <lang>  set response language
```

CLI form: `prefs <verb>` if `$CLAUDE_PLUGIN_ROOT/bin/prefs.sh` is on PATH.

## Storage

`$CLAUDE_PLUGIN_DATA/prefs.json` (defaults to `~/.claude/plugins/data/prefs-sidecar/prefs.json`).

```json
{
  "code": "english",
  "docs": "english",
  "response": "korean"
}
```

## Auto-inject

SessionStart + PreCompact + PostCompact hook emits current values as `additionalContext`:

```
# prefs
- code authoring (.tape · .hexa · .py · .sh · .swift · ...): english
- doc authoring (.md · README · CHANGELOG · ...): english
- response language to user: korean
```

## SSOT

Language preferences live here — `commons.tape` defers to this plugin for the language axes. If this plugin is uninstalled, no language rule fires; other commons rules still apply.
