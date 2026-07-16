---
description: /lab <fable|sol|full> <지시> — delegate ONE instruction to a frontier model (sidecar lab · per-call). fable = Claude Fable 5 · sol = OpenAI Codex 5.6 · full = both in parallel. Free-text safe — the prompt goes through a FILE, never inlined. Triggers — "lab fable", "lab sol", "sol 한테", "파블 시켜", "/lab".
argument-hint: "<fable|sol|full> <prompt — free text, any shell-special chars OK>"
allowed-tools: Bash, Write
---

Delegate the instruction in `$ARGUMENTS` to a frontier model via `sidecar lab`. The FIRST word of `$ARGUMENTS` selects the backend (`fable`, `sol`, or `full`); the REST is the prompt — FREE TEXT (quotes, parens, globs, backticks all legal), so it must NEVER be inlined into a shell command line. Instead:

1. **Split** `$ARGUMENTS` — take the first token as `<sub>` (default `fable` if it isn't one of `fable`/`sol`/`full`, and treat the whole thing as the prompt).
2. **Write the prompt to a file** — save the prompt text VERBATIM (no rewording) to a scratch file, e.g. `<scratchpad>/lab-prompt.txt`, with the Write tool.
3. **Run** (Bash): `sidecar lab <sub> --file <that-file> --timeout 600`
   - `sub` = `fable` (Claude Fable 5) · `sol` (Codex 5.6, model gpt-5.6-sol) · `full` (both, printed under `── fable ──` / `── sol ──` sections).
   - add `--json` only if a machine-clean answer is needed; `-m <model>` only if the user asked for a different model; `--write` only if the child must actually edit/build/commit (default is investigate-only); raise `--timeout` for long generations.
4. **Relay the answer** to the user. Exit meanings: `124` = the run stalled past --timeout (fable: usually login — check `claude /login`; sol: check `codex login`); `127` = the backend CLI (`claude`/`codex`) not on PATH; if `sidecar` itself is missing, say so (install dancinlab/sidecar).

Do NOT pipe the prompt inline (`printf '%s' "…" | sidecar lab fable -`) from this skill — that reintroduces the quoting trap. The file path is the safe channel.

Full agent caveat sheet (backends · tiers · stall/124 · eaten-pipe · --cwd tool reach · no recursion · background pattern): `templates/lab.md` in dancinlab/sidecar — read it BEFORE an unattended or background run.
