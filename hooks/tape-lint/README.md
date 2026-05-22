# tape-lint

PreToolUse(Edit|Write) deny for `.tape` file edits. Three checks, all diff-aware (pre-existing violations on disk are grandfathered; only newly introduced or worsened items block).

Implemented in **hexa-lang** (`bin/_tape_lint.hexa`), invoked via `hexa run` directly from `hooks/hooks.json` — no Python interpreter, no shell shim. First sidecar hook to land hexa-native per `hexa-native` plugin policy.

## Checks

| # | check | scope | rule |
|---|---|---|---|
| 1 | fields | any `*.tape` | `@D` blocks may carry only `do = "..."` / `dont = "..."`. New `why` · `tool` · `note` · `ref` · `ex` · ... are refused. Fold rationale, tooling, refs into the do/dont prose or drop. |
| 2 | length cap | `commons.tape` + `project.tape` | `do` / `dont` value content (between the quotes) longer than **100 characters** is refused. Split overflow into multiple do/dont entries or distinct `@D` blocks. |
| 3 | authoring language | `commons.tape` + `project.tape` | Read `code` from `sidecar prefs` at runtime. When `code = english`, lines newly introducing non-Latin scripts (Hangul · CJK · Hiragana · Katakana) are refused. `/prefs code <lang>` reshapes the rule live; with `code` set to a non-English language, the check stands down. |

## Diff-aware

Each check compares the proposed file content against the on-disk content and acts only on the set difference:

- **fields**: only newly introduced `(@D <block>, <bad-field>)` pairs block.
- **length cap**: per `(@D <block>, do|dont)`, a proposed value blocks only when its length exceeds the cap AND exceeds the on-disk length.
- **authoring language**: only lines containing non-Latin script that don't already appear (verbatim) in the on-disk file block.

Legacy violations stay readable + editable around them. Forward-only cleanup, no flag day.

## Triggers

| event | matcher | data used |
|---|---|---|
| PreToolUse | Edit | `file_path` (must end in `.tape`), `old_string`, `new_string`, `replace_all` — applied against on-disk content to compute the proposed result |
| PreToolUse | Write | `file_path` (must end in `.tape`), `content` — used as the proposed result directly |

## No opt-out

There is none — no env var, no config file, no exception list. A guard you can switch off is a guard you will switch off. The checks are diff-aware (pre-existing violations are grandfathered), so they only block genuinely new violations — fix the finding rather than routing around it. If `tape-lint` is wrong for your workflow, uninstall the plugin.

## Runtime

Requires `hexa` on PATH (install via `hx install hexa-lang`). The hook line in `hooks/hooks.json` is:

```json
{ "type": "command", "command": "hexa run ${CLAUDE_PLUGIN_ROOT}/bin/_tape_lint.hexa" }
```

`hexa run` compiles the script to a native binary on first call (cached under `~/.hexa-cache/`) and reuses the binary on subsequent calls.
