# fable — Fable 5 delegation runbook (FOR AI AGENTS)

> You (the agent) are about to delegate ONE instruction to the Fable 5 model via
> `sidecar fable` (headless `claude -p --model claude-fable-5`). This page is the
> full caveat sheet — read top-to-bottom before an unattended or background run.
> The call is PER-CALL and STATELESS: the session backend (`sidecar switch`) is
> untouched, and consecutive calls share NO memory.

## Invocation matrix (pick exactly ONE prompt source)

| Prompt shape | Correct invocation |
|---|---|
| free text (quotes/parens/globs possible) | Write it VERBATIM to a scratch file → `sidecar fable --file <f> --timeout 600` |
| simple safe words (no shell-special chars) | `sidecar fable --timeout 600 "<words>"` |
| output of another command | `<cmd> \| sidecar fable - --timeout 600` |

Flags: `-m <model>` (override) · `--json` (machine output) · `--dry` (argv preview, no run)
· `--cwd <dir>` (child working dir) · `--timeout <s>` (stall cap) · after `--` verbatim to claude.

## Hard caveats (violations observed in the field — each one has bitten)

1. **NEVER inline free text on a shell line.** Textual substitution cannot be
   quoted safely for arbitrary text (broke on `(`, then on `"`). File-mediated
   `--file` is the only safe channel (convergence `fable-md-1`).
2. **ALWAYS set `--timeout <s>` on unattended/background runs.** A headless
   claude that hits a login-credential wait sleeps FOREVER at 0% CPU (observed
   8m+, empty log). Exit `124` = stalled → check `claude /login` auth.
3. **NEVER wrap with an external `timeout` command.** A backgrounding shim
   points the child's stdin at /dev/null and silently eats a piped prompt
   ("stdin delivered 0 bytes"). The native `--timeout` flag is the cap.
4. **Expect boilerplate in prose output.** The child inherits GLOBAL hooks and
   the `--cwd` repo's CLAUDE.md — streamed answers carry governance lines. For
   machine consumption use `--json` and read `.result` (clean); for fewer repo
   injects point `--cwd` at a neutral dir (scratchpad).
5. **Point `--cwd` deliberately.** The child is a real agent in that directory
   and may use tools there per its settings. Restrict/grant explicitly when
   needed: `-- --allowedTools <list>` / `-- --permission-mode <mode>`.
6. **No recursion / no unbounded fan-out.** Never let the delegated prompt
   itself call `sidecar fable` (fork storm), and don't fire N parallel fable
   calls without a timeout on each.
7. **Batch, don't ping.** Fable 5 is the top-tier model and each call is
   stateless — pack related sub-questions into ONE prompt instead of a loop of
   tiny calls. For a continued conversation pass claude's own flag: `-- --continue`
   (same `--cwd`).
8. **Background pattern.** `sidecar fable --file <f> --timeout <s> --json > <log> 2>&1 &`
   then poll the log; a 0-byte log after exit means the run FAILED (read the
   exit code) — do not report it as "still thinking".

## Exit codes

| exit | meaning | your move |
|---|---|---|
| 0 | answered | relay `.result` (--json) or the stream |
| 1 | usage / prompt-source error (exclusive: argv \| --file \| -) | fix the invocation |
| 124 | killed at `--timeout` (stall) | report + suggest `claude /login` |
| 127 | `claude` CLI not on PATH | install Claude Code |
| other | claude's own exit | relay stderr |

## Related

- Slash surface: `commands/fable.md` (/fable — file-mediated runbook, prompt-only).
- Keyword trigger: `config/keywords.json` `fable-delegate` (mentions of "fable" surface the lean hint).
- Session-wide backend swap (NOT per-call): `sidecar switch`.
