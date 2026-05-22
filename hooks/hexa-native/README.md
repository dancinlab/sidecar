# hexa-native

Hard-deny `.py` / `.sh` writes inside any project rooted at a directory containing a `project.hexa` marker.

## What it does

`PreToolUse(Write | Edit | NotebookEdit)` — when the AI tries to write to a `.py` or `.sh` file whose path lies inside a project whose root contains `project.hexa`, the tool call is **denied** with a fixed message redirecting the operator to `.hexa`.

Non-hexa-native projects (no `project.hexa` at any ancestor) are unaffected — write `.py` / `.sh` freely there.

## Scope

The hook only fires when **both** are true:

1. `tool_name ∈ {Write, Edit, NotebookEdit}`
2. The target path ends in `.py` or `.sh`
3. Walking up the target path's ancestors finds a `project.hexa` file before reaching `/` or `$HOME`

If any of these is false, the call passes through.

## No opt-out — by design

There is **no** escape hatch:

- ❌ No env-var bypass (no `BYPASS_HEXA_LANG=1`, no `NO_HEXA_NATIVE=1`, etc.)
- ❌ No `~/.claude/sidecar/disabled.json` honoring for this plugin
- ❌ No per-project exception list

If you need a way out, **uninstall the plugin**. The point of this hook is that there's nothing else to disable.

Rationale: `.py` and `.sh` are already supported as ai-native English in other environments. Projects marked `project.hexa` opt in to hexa-native — the policy is the project, not a config switch.

## Files

```
hexa-native/
├── .claude-plugin/plugin.json
├── README.md
├── bin/
│   ├── hexa-native.sh         # entry — exec's _hexa_native.py
│   └── _hexa_native.py        # logic — reads PreToolUse JSON, denies if applicable
└── hooks/hooks.json           # PreToolUse matcher: Write|Edit|NotebookEdit
```

## Example block

```
hexa-native: this project (hexa-lang) is hexa-native — `project.hexa` marker found at the project root.
  Refusing to write `tools/lint.py` (.py).
  `.py` / `.sh` are already supported as ai-native (English) in other environments — this project intentionally only accepts `.hexa` source.
  Write your logic in `.hexa` instead. There is no env-var / flag override by design.
```
