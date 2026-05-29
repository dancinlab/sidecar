# hexa-native

Hard-deny `.py` / `.sh` writes inside any project rooted at a directory containing a `project.tape` marker.

## What it does

`PreToolUse(Write | Edit | NotebookEdit | Bash)` — when the AI tries to create a `.py` / `.sh` / `.c` / … source file whose path lies inside a project whose root contains `project.tape`, the tool call is **denied** with a fixed message redirecting the operator to `.hexa`.

Non-hexa-native projects (no `project.tape` at any ancestor) are unaffected — write `.py` / `.sh` freely there.

## Three write channels

A file can be created through more than one surface, so the guard covers **three** channels (all hard-deny, no advisory mode):

1. **Write / Edit / NotebookEdit** — the structured file tools (`file_path` / `notebook_path`).
2. **Bash redirect** — `> X.py`, `>> X.sh`, heredoc-to-redirect (`cat > X.py << EOF`), `tee [-a] X.py`, `dd … of=X.py`, and `cp` / `mv` whose destination is a `.py` / `.sh`. Relative targets resolve against the payload `cwd`. `python X.py` / `cat X.py` / `chmod X.sh` (non-write commands) pass through.
3. **python-write** — `python3 -c "open('x.py','w').write(…)"` and `python3 - <<EOF … open('y.sh','w') … EOF`. These write from **inside** the interpreter (not a shell redirect), so the whole command string is scanned for an `open(…, 'w' | 'a' [+ / b / …])` / `Path('x.py').write_text(…)` / `open(...).write(…)` whose path literal ends in `.py` / `.sh`. Read mode (`open('x.py')`, `open('x.py','r')`) and data writes (`.json` / `.txt` / `.csv` / `.md`) pass through.

## Scope

For channels 1–2 the hook fires when **all** are true:

1. `tool_name ∈ {Write, Edit, NotebookEdit, Bash}`
2. The target path ends in `.py` / `.sh` / `.c` / `.cc` / `.cpp` / `.cxx` / `.h` / `.hpp` / `.hh` / `.inl` / `.ipp` / `.tcc` / `.s` / `.S` / `.asm` / `.o`
3. Walking up the target path's ancestors finds a `project.tape` file before reaching `/` or `$HOME`

For channel 3 (python-write) the extension gate is narrowed to **`.py` / `.sh` only** (the source languages a python script realistically emits), plus a write-mode requirement. If any condition is false, the call passes through.

**Note**: `project.tape` is sidecar's canonical project identity marker (added by `sidecar init`). So the enforcement automatically applies to every sidecar-managed project — including sidecar itself and its sibling plugins / CLIs. If a sidecar-managed project legitimately needs to keep its existing `.py` / `.sh` tooling editable via AI, edit those files outside of Claude Code Write/Edit (shell tools), or uninstall this plugin.

## No opt-out — by design

There is **no** escape hatch:

- ❌ No env-var bypass (no `BYPASS_HEXA_LANG=1`, no `NO_HEXA_NATIVE=1`, etc.)
- ❌ No `~/.claude/sidecar/disabled.json` honoring for this plugin
- ❌ No per-project exception list
- ❌ No self-exclusion for this plugin's own files

If you need a way out, **uninstall the plugin**. The point of this hook is that there's nothing else to disable.

Rationale: `.py` and `.sh` are already supported as ai-native English in other environments. Projects marked `project.tape` opt in to sidecar-managed hexa-native — the policy is the project, not a config switch.

## Files

```
hexa-native/
├── .claude-plugin/plugin.json
├── README.md
├── bin/
│   └── _hexa_native.hexa      # logic — reads PreToolUse JSON, denies if applicable (hexa-native)
└── hooks/hooks.json           # PreToolUse matcher: Write|Edit|NotebookEdit|Bash
```

## Example block

```
hexa-native: this project (hexa-lang) is hexa-native — `project.tape` marker found at the project root.
  Refusing to write `tools/lint.py` (.py).
  `.py` / `.sh` are already supported as ai-native (English) in other environments — this project intentionally only accepts `.hexa` source.
  Write your logic in `.hexa` instead. There is no env-var / flag override by design.
```
