# tape-lint

PreToolUse(Edit|Write) deny for `.tape` edits that introduce `@D` governance blocks with fields other than `do` / `dont`. Per-project enforcement: triggers on any `*.tape` file path, in any repo.

## Rule

`@D <name> := ... :: ...` blocks carry only:

- `do = "..."`
- `dont = "..."`

Anything else (`why` · `tool` · `note` · `ref` · `ex` · ...) inside a `@D` block is refused. Rationale, tooling, refs fold into the prose of `do` / `dont`, or drop.

## Diff-aware

Only **newly-introduced** violating fields block. Pre-existing fields on disk are grandfathered — the lint compares the set of findings on the proposed content against the set on the current file, and acts only on the difference. This means a `.tape` already carrying a stray `tool =` won't lock down unrelated edits; you can still touch other lines and clean up the legacy field on your own cadence.

## Triggers

| event | matcher | data used |
|---|---|---|
| PreToolUse | Edit | `file_path` (must end in `.tape`), `old_string`, `new_string`, `replace_all` — applied against the on-disk content to compute the proposed result |
| PreToolUse | Write | `file_path` (must end in `.tape`), `content` — used as the proposed result directly |

## Opt out

```sh
SIDECAR_NO_TAPE_LINT=1
```

Or via the sidecar disable surface:

```sh
echo '{"disabled":["tape-lint"]}' > ~/.claude/sidecar/disabled.json
```
