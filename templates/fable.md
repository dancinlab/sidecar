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
· `--cwd <dir>` (child working dir) · `--sources <l>` (setting sources, default `project,local`)
· `--timeout <s>` (stall backstop) · after `--` verbatim to claude.

## Hook isolation — the big one (why fable no longer stalls)

`sidecar fable` runs the child with `--setting-sources project,local` BY DEFAULT,
which DROPS the global `user` source (`~/.claude/settings.json`). That is where
the host-wide governance Stop-hooks live. Without this, a headless child launched
in a git repo with uncommitted changes would:

- produce its answer, then hit a **blocking** Stop-hook (architecture/convergence
  stop-check: "uncommitted change but no 🏛️ report") → be forced to CONTINUE →
  loop across turns → never exit → `--timeout` kills it at **exit 124**, AND
- have its final-turn `.result` overwritten by governance meta-commentary
  (`🧬 CONVERGENCE …` / `🏛️ ARCHITECTURE …`) instead of the real output.

Proven A/B (full mitosis brainstorm, `--cwd /…/anima`):

```
inherit global hooks (--sources user,project,local)   default drop (--sources project,local)
────────────────────────────────────────────────      ──────────────────────────────────────
 exit 124 · 200s kill · num_turns 3                     exit 0 · 111s · num_turns 1
 .result = CONVERGENCE/ARCHITECTURE boilerplate         .result = 7.7 KB clean brainstorm
```

Keychain auth is NOT a setting source, so dropping `user` keeps the child logged
in; `project,local` still gives it the repo's CLAUDE.md for context. Do NOT reach
for `claude --bare` — it also skips keychain reads and lands "Not logged in".

## Hard caveats (violations observed in the field — each one has bitten)

1. **NEVER inline free text on a shell line.** Textual substitution cannot be
   quoted safely for arbitrary text (broke on `(`, then on `"`). File-mediated
   `--file` is the only safe channel (convergence `fable-md-1`).
2. **ALWAYS set `--timeout <s>` on unattended/background runs.** It is the
   backstop for a stalled headless run (auth wait, or a blocking hook if you
   opted back into `--sources user,…`). Exit `124` = stalled.
3. **NEVER wrap with an external `timeout` command.** A backgrounding shim
   points the child's stdin at /dev/null and silently eats a piped prompt
   ("stdin delivered 0 bytes"). The native `--timeout` flag is the cap.
4. **Only opt into `--sources user,project,local` when you WANT governance.**
   Default `project,local` is clean + non-stalling. Inherit the global source
   only for a run that should itself obey the host hooks — and then commit first
   (uncommitted changes in the cwd repo re-arm the blocking Stop-hook stall).
5. **Point `--cwd` deliberately.** The child is a real agent in that directory
   and may use tools there per its settings. Restrict/grant explicitly when
   needed: `-- --allowedTools <list>` / `-- --permission-mode <mode>`.
6. **No recursion / no unbounded fan-out.** Never let the delegated prompt
   itself call `sidecar fable` (fork storm), and don't fire N parallel fable
   calls without a timeout on each.
7. **Batch OR continue — don't ping blindly.** Each call is stateless by
   DEFAULT, so either pack related sub-questions into ONE prompt, or make it
   STATEFUL: `-r/--resume <session_id>` (from a prior `--json` run) or
   `-c/--continue` (most recent in `--cwd`). See "Continuity" below.
8. **Background pattern.** `sidecar fable --file <f> --timeout <s> --json > <log> 2>&1 &`
   then poll the log; a 0-byte log after exit means the run FAILED (read the
   exit code) — do not report it as "still thinking".

## Exit codes

| exit | meaning | your move |
|---|---|---|
| 0 | answered | relay `.result` (--json) or the stream |
| 1 | usage / prompt-source error (exclusive: argv \| --file \| -) | fix the invocation |
| 124 | killed at `--timeout` (stall) | `claude /login` for auth; or you used `--sources user,…` in a dirty repo → drop back to default `project,local` |
| 127 | `claude` CLI not on PATH | install Claude Code |
| other | claude's own exit | relay stderr |

## Continuity — multi-turn delegation (stateful)

fable is stateless per-call UNLESS you ask for continuity. Two knobs, both keyed
to `--cwd` (claude stores sessions per working directory):

```
1. Seed  : sidecar fable --file <p1> --json --cwd <dir>   → read .session_id from the JSON
2. Resume: sidecar fable --file <p2> --json --cwd <dir> --resume <session_id>   (precise)
   or     : sidecar fable --file <p2> --json --cwd <dir> --continue             (most recent in <dir>)
```

- `-r/--resume <id>` is precise — it targets the exact `session_id` you captured;
  survives other fable calls in between.
- `-c/--continue` grabs the MOST RECENT session in that `--cwd` — simple but
  ambiguous if several ran there; prefer `--resume` for parallel work.
- Proven: seed "codeword=천리마" → `--resume` recalled 천리마 → `--continue` recalled it too.
- `--continue` and `--resume` are mutually exclusive (fable rejects both).
- Continuity works UNDER the default hook-free `--sources project,local` — session
  persistence is not a setting source, so dropping global hooks doesn't disable it.

## Async — fire-and-forget (don't babysit a poll loop)

fable blocks until claude answers (seconds → minutes). To not wait:

```
sidecar fable --bg --file <p> --json --cwd <dir>   → prints a job id, returns NOW
sidecar fable result <id>    → prints the answer if DONE, else "RUNNING" (exit 3)
sidecar fable wait <id> [--timeout <s>]   → block until DONE, then print
sidecar fable list           → all jobs + status
```

- Jobs live under `~/.sidecar/fable-jobs/<id>/` (prompt · out · err · exitcode).
- Do NOT hand-roll `sidecar fable … & ` + a `pgrep`/`ps|grep` poll loop — that
  self-matches its OWN command line ("RUNNING" false positive; the remote-poll-pgrep
  trap) AND you have to babysit it. Use `--bg` + `result`/`wait`.
- In Claude Code specifically, running a plain (blocking) `sidecar fable …` as a
  **background Bash tool call** also works — the harness re-invokes you on exit, no
  polling. `--bg` is the shell-native equivalent for terminals / cross-tool use.
- Runs are UNLIMITED by default (no timeout) — pass `--timeout <s>` to opt into a cap
  (foreground kills at s seconds; a `--bg` job gets a shell watchdog → exitcode 124).

## Recipe — brainstorm / design divergence into a repo (the proven one)

```
1. Write the full prompt (repo context + task + "design only, no code/commit") to a file.
2. sidecar fable --file <f> --timeout 600 --json --cwd <the-repo>
3. Read .result — it is the clean divergence (default --sources project,local, no boilerplate).
4. Absorb the output into THIS session's ING/ARCHITECTURE yourself — fable is stateless and
   ran hook-free, so it neither recorded nor committed anything.
```

## Related

- Slash surface: `commands/fable.md` (/fable — file-mediated runbook, prompt-only).
- Keyword trigger: `config/keywords.json` `fable-delegate` (mentions of "fable" surface the lean hint).
- Session-wide backend swap (NOT per-call): `sidecar switch`.
