---
description: /fable <지시> — delegate ONE instruction to the Fable 5 model via headless `claude -p` (sidecar fable · claude-fable-5 · per-call). Free-text safe — the prompt goes through a FILE (`--file`), never inlined on a shell line. Triggers — "fable 한테", "fable 모델로", "파블 시켜", "/fable".
argument-hint: "<prompt — free text, any shell-special chars OK>"
allowed-tools: Bash, Write
---

Delegate the instruction in `$ARGUMENTS` to the Fable 5 model. The text is FREE TEXT — quotes, parens, globs, backticks are all legal in it, so it must NEVER be inlined into a shell command line (a `!` one-liner with textual `$ARGUMENTS` substitution breaks on `"` and `(` — observed twice). Instead:

1. **Write the prompt to a file** — save the full `$ARGUMENTS` text VERBATIM (no rewording) to a scratch file, e.g. `<scratchpad>/fable-prompt.txt`, with the Write tool.
2. **Run** (Bash): `sidecar fable --file <that-file> --timeout 600`
   - add `--json` only if machine-readable output is needed; `-m <model>` only if the user asked for a different model; raise `--timeout` for long generations.
3. **Relay the answer** to the user. Exit meanings: `124` = the headless run stalled past --timeout (usually login credentials — suggest checking `claude /login`); `127` = claude CLI not on PATH; if `sidecar` itself is missing, say so (install dancinlab/sidecar).

Do NOT pipe the prompt inline (`printf '%s' "…" | sidecar fable -`) from this skill — that reintroduces the quoting trap. The file path is the safe channel.

Full agent caveat sheet (stall/124 · eaten-pipe · output boilerplate · --cwd tool reach · no recursion · batching · background pattern): `templates/fable.md` in dancinlab/sidecar — read it BEFORE an unattended or background run.
