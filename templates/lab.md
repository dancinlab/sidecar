# `sidecar lab` — frontier-model delegation hub (runbook)

Hand ONE instruction to a frontier model **per-call**, without switching the whole session backend.
Three backends behind one shared flag surface:

| backend | model | CLI | best at |
|---------|-------|-----|---------|
| `fable` | `claude-fable-5` | `claude -p` (headless) | deep design · analysis · hard problems (Anthropic Mythos tier) |
| `sol`   | `gpt-5.6-sol`   | `codex exec`           | agentic code work · long tool-use runs (OpenAI Codex 5.6) |
| `full`  | both            | both, in parallel      | a two-model consult — compare answers side by side |

```
sidecar lab fable "이 diff 요약"          # → Claude Fable 5
sidecar lab sol   --file spec.md          # → Codex 5.6
sidecar lab full  "이 설계안의 허점은?"    # → both, labeled sections
```

## Prompt channel — always a FILE (never inline)
The prompt is free text (quotes, parens, backticks, globs). It is ALWAYS fed through the child's
STDIN, never placed on argv — so shell quoting / argv limits / history leakage are non-issues. From a
slash-command or automation, write it to a file and pass `--file`:

```
sidecar lab fable --file <prompt.txt> --timeout 600
```

Exclusive prompt sources: argv words | `--file <f>` | `-` (stdin). Pick exactly one.

## Tiers — investigate (default) vs implement (`--write`)
- **DEFAULT (investigate)** — the child can MEASURE but not mutate repo files:
  - fable: `--permission-mode bypassPermissions` + `--disallowedTools Write Edit NotebookEdit`
    (Bash/Read/Grep/Glob run freely — git log, grep, pipelines — file-write tools denied).
  - sol: `-s read-only` (codex reads/greps/runs, no workspace writes).
- **`--write`** (aliases `--bypass` / `--agent`) — full unattended agent that edits/builds/commits:
  - fable: bypassPermissions with NO disallow.
  - sol: `-s workspace-write` (writes within the workspace; NOT `danger-full-access`).

Matches `lab-mode`: the delegated model analyzes, the caller implements — until you opt into `--write`.

## `--cwd` — where the child runs
`--cwd <dir>` sets the child's working directory (its tool reach — the files it can grep/edit). Default
is the current dir. Use it to point a delegate at a DIFFERENT repo than the session's.

## `--json` — machine-clean answer on stdout
- fable: `claude --output-format json` — a JSON blob whose `.result` is the answer.
- sol: codex has no single-blob json (its `--json` is JSONL events), so `lab sol --json` routes the
  final message to a temp file via `codex -o` and prints only that — bare answer text.
Without `--json`, both stream live to your terminal (stdout inherited).

## Continuity (single backend only)
- `-c` / `--continue` — continue the most recent session in `--cwd` (sol: `codex exec resume --last`).
- `-r` / `--resume <id>` — resume a specific session (fable: the `session_id` from a prior `--json`
  run; sol: a codex session id/name). Same `--cwd` as the original run.
- `full` REJECTS `-c`/`-r` (two unrelated session stores — ambiguous) and `--` passthrough.

## `--timeout <s>` — opt-in reaper (default UNLIMITED)
No cap by default. `--timeout <s>` SIGKILLs a stalled run after `s` seconds (exit **124**). The fable
default `--sources project,local` already drops the global governance Stop-hooks that used to stall a
headless child in a dirty repo, so a cap is only for a run you want bounded. `--timeout 0` = unlimited.

⚠ **eaten pipe** — if you wrap this in a naive `timeout` shim, POSIX sh points a backgrounded child's
stdin at `/dev/null` and swallows the prompt (0 bytes → empty-prompt error). Use the native
`--timeout` flag, not an external shim.

## Background jobs (`--bg`) — fire-and-forget
`--bg` detaches the child and returns a job id immediately; collect later (no hand-rolled poll loop):

```
sidecar lab sol --bg "긴 리팩터"     # → prints  sol-<id>
sidecar lab result <id>              # print if DONE, RUNNING = exit 3
sidecar lab tail   <id>              # follow the output stream LIVE until done
sidecar lab wait   <id> [--timeout s]# block until done, then print
sidecar lab list                     # all jobs + backend + status
```
Jobs live under `~/.sidecar/lab-jobs/<backend>-<ts>/`. `lab full --bg` launches TWO jobs (one per
backend) and prints both ids. sol jobs capture the clean final message to `last`; `result` prefers it.

## Passthrough — `-- <flags>`
Everything after `--` goes verbatim to the backend CLI (`claude` / `codex`), placed before the stdin
sentinel. A user's own `-- --permission-mode …` / `-- --add-dir …` wins over the defaults. `full`
rejects `--` (can't target both backends).

## Gotchas
- **No recursion** — a delegated prompt must NOT itself call `sidecar lab` (a child spawning a child).
- **fable-only flags** — `--sources` is claude-only; `lab sol --sources …` is rejected loudly. Under
  `full`, `--sources` applies to the fable leg only (info line, not an error).
- **opus fallback FORBIDDEN (fable)** — fable pins an `availableModels` allowlist without Opus, so a
  safety-classifier-flagged request refuses on the delegated model instead of silently re-running on
  Opus. Not a flag — it is the default.
- **exit codes** — `124` stalled (auth wait or blocking hook), `127` backend CLI not on PATH, `3`
  bg-job still RUNNING (from `result`/`wait`).
