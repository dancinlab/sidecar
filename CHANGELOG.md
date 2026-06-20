# CHANGELOG

## feat(convergence): capture-token enforcement loop (emit → resolve → Stop nudge)

The recurrence trigger no longer just prints an advisory hint — it now closes a
mechanical loop so a "detected a recurrence but never wrote the marker" gap can't
slip silently past (c1).

🎟️ 캡처 토큰 — "놓치면 안 되는 일에 번호표 붙이기"

- EMIT — a `convergence-recurrence` keyword match (rule gains `capture:CONVERGENCE-DUE`)
  prints a unique `⟦CONVERGENCE-DUE id=… matched="…"⟧` token AND records a debt to
  `logs/convergence-debt.json` (`markCaptureDebt`).
- RESOLVE — a post-edit that lands a *well-formed* `@convergence` marker in a code file
  clears the debt synchronously (`resolveConvergenceDebtOnEdit` → `scanFileMarkers`,
  reusing the same validator so a malformed marker does NOT count).
- ENFORCE — at session Stop, `harness convergence due-check` warns once if the debt is
  still open, then resets (`convergenceDueWarn`) — the same warn-only soft-nudge shape
  as `ing-staleness` (the recurrence keyword can false-positive, so no hard block).

Data-driven: the engine reads a generic `capture` field on the keyword rule (no trigger
id hardcoded). Wired into both the plugin Stop hook (`hooks.json`) and `harness init`
setup (`setup.ts`). Verified end-to-end: emit → token+debt, due-check → warn+reset,
marker edit → auto-resolve, malformed marker → does NOT resolve; `convergence scan`
stays clean (24/24 well-formed).

## feat(convergence): broaden recurrence-trigger patterns (user-curated + memory-frequency)

Expanded the `convergence-recurrence` keyword trigger so it fires on far more recurrence phrasings,
prompting the inline `@convergence` marker (c1). Patterns now include bare high-signal tokens curated
with the user + drawn from cross-repo memory frequency: `또`·`다시`·`실수`·`원인`·`⚠️`·`OOM`
(+`out of memory`·`oom-kill`·`메모리 부족`)·`재발`·`stale`·`낡은`·`구버전`·`회귀`·`regression`·
`recurr`·`broke again`·`keeps breaking`·`reintroduced`·`reopened`… (39 patterns). Bare `또`/`다시`/
`실수`/`원인` over-fire by design — the user opted for broad recall (the hint is an advisory reminder,
not a block). JSON validated; trigger fires on `또 OOM 으로 죽었어`.

## feat(convergence): mechanically ENFORCE inline @convergence markers (c1) — scan gate + recurrence trigger

@convergence recurrence-prevention markers (c1) were a guideline only — nothing validated them and
nothing fired when a defect actually recurred. Now hardened to a gate:
- **`harness convergence scan`** (NEW) — scans git-tracked code (ts/hexa/py/sh/go/rs/c…) and validates
  every `@convergence` marker carries the required keys `state`·`id` + a state in the allowed enum;
  exit 1 on any malformed. Detection requires a `<key>=` after the tag, so prose mentions of the tag
  in comments are skipped (no false positives). MARKER_TAG is split in-source so the scanner never
  flags its own file.
- **`harness lint` gate** — calls the scanner; malformed markers raise `CONVERGENCE-MALFORMED`
  (severity-map → block), so a commit can't ship a half-written marker.
- **recurrence keyword trigger** (`config/keywords.json` convergence-recurrence) — fires on recurrence
  signals and injects a reminder to write the inline marker. Patterns DIVERSIFIED from cross-repo
  memory frequency (top signals: stale·regression·again·재발·recurrence·repeat) — 재발·stale·낡은·
  구버전·회귀·"또 깨/터/났"·regression·recurr·"broke again"·"keeps breaking"·reintroduced·reopened…
- commons c1 + ARCHITECTURE convergence node + cli help reworded: marker is mechanically gated, not
  advisory. Verified: 22 existing markers pass scan (exit 0); a missing-state marker → exit 1.

## fix(shadow): marker AFTER frontmatter — picker shows command descriptions, not the marker comment

`harness shadow` PREPENDED `SHADOW_MARKER` (`<!-- harness-shadow … -->`) to each generated
`~/.claude/commands/*.md`, pushing the YAML frontmatter to line 2. Claude Code only parses
`description:` when the `---` fence is on line 1, so all 35 shadow-generated commands rendered the
marker comment as their slash-picker description (e.g. `/architecture  <!-- harness-shadow: …`).
Root cause (c1): marker placement broke frontmatter position. Fix: `withMarker()` inserts the marker
AFTER the closing `---` of the frontmatter (frontmatter stays on line 1 → description renders);
no-frontmatter files still prepend. Marker still present → `isHarnessShadow()` / `shadow remove`
tracking unchanged (35/35 retain it). `@convergence SHADOW_MARKER_AFTER_FRONTMATTER` records the
recurrence guard. Verified: regenerated shadows have `---` on line 1 + description intact.

## fix(plugin): `commands: []` — kill duplicate slash entries (`/fleet` + `/harness:fleet` → bare `/fleet` only)

The picker showed EVERY command twice: a bare `/fleet` (from `harness shadow`'s user-scope
`~/.claude/commands/fleet.md`) AND a namespaced `/harness:fleet` (from the plugin auto-loading its
`commands/` dir). Root cause (c1): the plugin double-registered commands that `harness shadow` already
exposes bare. Claude Code namespaces plugin commands as `/<plugin>:<cmd>` UNCONDITIONALLY (verified
against the plugins-reference manifest schema — there is no bare-command escape hatch from inside a
plugin; per-command "micro-plugins" still yield `/fleet:fleet`, NOT bare). The retired sidecar showed
bare single commands because it shipped them as user-scope files, not as plugin commands.

Fix: `.claude-plugin/plugin.json` adds `"commands": []`, which REPLACES the default `commands/`
directory scan with an empty list (plugins-reference: the `commands` field "replaces the default") →
the plugin registers ZERO namespaced commands. Slash commands now come ONLY from `harness shadow`'s
bare `~/.claude/commands/*.md` delegators → one bare `/fleet` in the picker, no `/harness:fleet`. The
`commands/` files still ship in the plugin (they are the source shadow mirrors from) — they are just
not loaded as plugin commands. Aligns the plugin with harness's own shadow design. plugin.json bumped
0.9.6 → 0.9.7; `comment_commands` field documents the intentional-empty so it is not "fixed" later.
Takes effect after `/plugin update` + reload. Docs lockstep: CLAUDE.md tree + ARCHITECTURE plugin
node + commands node. (Also `commands/fleet-lab.md` added so `/fleet-lab` shows bare via shadow.)

## feat(fleet): `fleet lab` — research-driven perpetual frontier lab (a `fleet` subcommand)

A research-specialized variant of `/fleet`. Each lane is a BLOCKING FRONTIER (a wall); every round
gates CHEAP research (web/arxiv/code-census, mini-safe) BEFORE expensive implement/measure
(pool/GPU/build), then records the measured result to SSOT, then re-researches or walls. Walls (🧱)
are declared only by MEASUREMENT and are REOPENABLE by new research. Codifies the manual
"research-first → measure → SSOT → repeat" loop (reference-first / implement-to-wall) so a frontier
gets peeled one researched lever at a time instead of being declared a wall on shallow grounds.

- `templates/fleet-lab.md` (NEW) — the lab runbook: research-gate lifecycle, wall discipline
  (measured + reopenable), 🔬 lab report shape, SSOT-record step (ARCHITECTURE.json
  `blocking-frontiers` + memory), cost/destructive halts inherited from fleet.
- `modules/fleet.ts` — leading `lab` token branches to a SEPARATE roster `.harness/fleet/lab`
  (so a research-lab run and a build-fleet run coexist without clobbering) + prints `fleet-lab.md`.
  Reached via the existing `/fleet` sidecar (`/fleet lab …` → `harness fleet lab …`) — NO new
  command/module/slash needed since `lab` is a `fleet` subcommand, not a top-level command.
- `cli/index.ts` — help line for `fleet lab`.

## chore: scrub dead `sidecar` provenance refs from live code/docs (history + convergence preserved)

`sidecar` was harness's RETIRED predecessor package; harness was ported from it, leaving
"(sidecar X parity)" provenance markers scattered through comments/docs/ARCHITECTURE. The package is
long gone, so these are dead references — zero function, only confusion. Removed all LIVE refs (25
files: `modules/*.ts` except shadow, `lib/config.ts`, `cli/index.ts`, `ARCHITECTURE.json`,
`CLAUDE.md`, `README.md`, `commands/verify.md`) with grammar preserved (`(sidecar X parity)` dropped;
prose forms rewritten; `(sidecar 패턴)` → `(슬래시-명령 패턴)`). PRESERVED: `CHANGELOG.md` (append-only
history — "ported from sidecar" was true when written, c4) and `modules/shadow.ts` (its
`@convergence SHADOW_GEN_NATIVE` record is the dead-sidecar-cache-path recurrence guard — the word is
load-bearing there, c1). Residual `sidecar` outside those two = 0 (grep-verified); `harness help`
loads + `ARCHITECTURE.json` valid.

## feat(danger-guard): rm-rf-root block is now opt-in (config dangerGuard.rmRfRoot, default OFF)

Per user request — `rm -rf` should not be guarded. The catastrophic-delete block (`rm -rf /` · `/*` · `~` ·
`$HOME` · `*`) is now gated by `config.dangerGuard.rmRfRoot`, default `false` = NOT guarded. The other
three code-level danger rules (`--no-verify` gate-bypass · `git reset --hard` tree-destroy · `curl|sh`
remote-exec) stay always-on.

- `modules/danger-guard.ts` — `detectDangerousBash` skips `DANGER-RM-RF-ROOT` when `!dangerGuard.rmRfRoot`.
- `lib/config.ts` — new `dangerGuard: { rmRfRoot: boolean }`, default `{ rmRfRoot: false }`.
- Removed the `H-RM-RF-ROOT` regex rule from `config/enforcement.json` AND `.harness/enforcement.json`
  (the config-layer backup would otherwise still block regardless of the code toggle).
- Verified: toggle off (default) → `rm -rf /` · `~` · `$HOME/*` pass; reset-hard + curl|sh still block;
  toggle on → rm-rf-root blocks again. Re-enable any time with `dangerGuard.rmRfRoot: true`.


## fix(self-update): always target the GLOBAL install (~/.harness/cli), never reset a dev clone

`self-update` updated `HARNESS_ROOT` — whichever clone the running binary lives in. Run via `npx tsx`
from a dev checkout it updated THAT clone and reported `already current` **without the path**, so it
looked like the global install on PATH had refreshed when it hadn't (the global `~/.harness/cli` stayed
stale). Worse, `git reset --hard origin/main` against a dev clone silently discards local commits/work.

- `modules/setup.ts` — `selfUpdate()` now ONLY ever refreshes `GLOBAL_CLI` (`~/.harness/cli`, what the
  `harness` wrapper on PATH runs) via the extracted `updateClone(dir)` helper. The path is printed even
  on `already current`, so it is never ambiguous which clone was checked. When invoked from a different
  (dev) clone it prints a note that the GLOBAL install was updated — not the running clone — and never
  touches the dev clone (no destructive `reset --hard` on hand-edited work; use git there).
- Verified: global behind → `318c5d3 → 6a65fc0 — global …` advance; already-current → path shown;
  dev-clone uncommitted changes preserved across the run.


## feat(mem-guard): OOM prevention — free-RAM preflight before bg-spawn + opt-in launchd notify watchdog

A recurring, expensive failure on a 16GB Mac: parallel fan-out (cycle-all / all-bg-go / fleet) accumulates
6+ detached `claude` agent processes (~400-490MB each) across sessions until macOS jetsam force-quits apps —
"the Mac keeps dying." Diagnosed from real `JetsamEvent-*.ips` reports (6/13–6/18) + a kernel panic (6/17):
the six top memory holders at OOM time were all `2.1.179` (claude) processes. Nothing throttled the spawn.

- `modules/mem-guard.ts` (new) — two layers:
  - **PreToolUse preflight** (always-on, `config.memGuard.enabled`): before a background-spawn bash command
    (`… &` / nohup / disown / setsid), `memInfo()` reads system available RAM from `vm_stat`+`sysctl`
    (free+inactive+speculative+purgeable). Below `warnPct` (15) → WARN; below `blockPct` (0 = off by default)
    → BLOCK the spawn. Wired into `modules/pre.ts` as `MEM-LOW`/`MEM-OOM`, before the config rules.
  - **launchd watchdog** (OPT-IN via `harness mem-guard install`): a LaunchAgent runs `mem-guard tick` every
    `watchdogIntervalSec` (45) and posts a macOS notification when available RAM is low — throttled to once
    per 5 min. NOTIFY-ONLY (never kills, never changes a setting). The only layer that sees ACROSS separate
    Claude sessions (each session's preflight is blind to the others — the actual accumulation that OOMs).
- Verbs: `status` (snapshot + top holders), `check` (exit 1 if low · scriptable), `tick`, `install`/`uninstall`.
  Registered in `cli/index.ts` (+ `mem` alias) + help line. Config `memGuard{enabled,warnPct,blockPct,watchdogIntervalSec}`.
- Verified: detection 11/11 (`&` matched, `&&` not); block path → `permissionDecision:deny`; warn-only path
  (blockPct=0) → stderr only, exit 0; non-spawn → no-op; `status`/`check`/`tick`/usage all pass.
  `@convergence in_flight MAC_OOM_FANOUT_JETSAM`.

## feat(git-context): SessionStart stale-branch guard — warn when HEAD is behind origin/<default> (plugin 0.9.5 → 0.9.6)

A recurring, expensive failure: a session starts on a stale branch (HEAD behind origin/main after a merge),
the agent reads the pre-merge code, believes it is current, and re-implements already-merged work. Real
incident — a duplicate fix PR (#3736) was built for work already merged (#3734) because the session began on
an old feature branch and never noticed HEAD ≠ the merged tip. Nothing flagged the staleness.

- `modules/git-context.ts` (new) — `git-context inject` (SessionStart) computes HEAD vs origin/<default>
  (main|master) from LOCAL refs (no network fetch): `rev-list --left-right --count <ref>...HEAD`. When HEAD
  is BEHIND (or detached-stale) it injects a loud ⚠️ block with the exact remedy — `git log origin/<default>
  -- <file>` before trusting any file as current, and checkout/rebase before starting new work. On a clean
  default branch it stays SILENT (no context noise). `git-context show` prints the position on demand.
- Wired into SessionStart in both `hooks/hooks.json` (plugin) and `modules/setup.ts` (settings.json install).
  Registered in `cli/index.ts` + help line.
- Verified: clean `main` → silent (0-char inject); synthetic branch 2-behind origin/main → ⚠️ STALE block
  fires (show + inject both). `@convergence in_flight STALE_BRANCH_TRAP`.
- plugin.json 0.9.5 → 0.9.6.

## feat(ing): c6 ing-staleness nudge — warn at Stop when code edited but board untouched (plugin 0.9.4 → 0.9.5)

The every-turn `ing inject` only ever SHOWED the board; nothing nudged the agent to UPDATE it as work
moved, so the board drifted stale and the next session's inject surfaced an out-of-date picture. Added a
soft staleness nudge. (A hard commit-block was rejected: there's no ground truth for "this edit should
change ing", so blocking would be a false-positive factory — this is warn-only.)

- `modules/ing-staleness.ts` (new) — a file-backed counter in LOG_DIR: `bumpEditIfCode` (called from
  `post edit`) increments on each CODE file edit (docs/config ignored); `resetIngStaleness` (called from
  `ing add/next/done`) clears it; `ingStalenessWarn(threshold)` returns a one-line warn + resets when the
  counter ≥ threshold (so it nags at most once per N edits, not every Stop).
- New `Stop` hook → `harness ing staleness-check` (wired in both `hooks/hooks.json` and the settings.json
  install path `modules/setup.ts`). Threshold is `config().ing.editThreshold` (default 5; 0 disables).
- This is the buildable slice of "강제 할수 있나": inject is already force-delivered every turn, and
  ARCHITECTURE currency is already a HARD commit block (lint CHANGELOG/ARCHITECTURE rules = `block`
  severity). ing freshness can only be nudged (warn), not forced — documented as such.
- Verified: 7/7 lifecycle cases (under-threshold silent · docs ignored · threshold-hit warns · resets after
  warn · ing-touch clears · threshold 0 disables) + CLI `ing staleness-check` warns once then goes silent.
- plugin.json 0.9.4 → 0.9.5.

## feat(heartbeat): c22 now auto-tracks un-registered `&`/nohup background long-runners (plugin 0.9.3 → 0.9.4)

The c22 abandonment guard (≥10-min check of a live long-runner) only ever fired for jobs registered via
`ing pod add` or the ledger work-registry. A fire-and-forget job thrown with a bare `&`/`nohup`/`disown` —
the most common way to leave something running and walk away — was invisible: `live` was empty so
`staleLongRunnerWarn` returned null and the 10-min nudge never came. This is exactly the gap "왜 10분 강제 안되지"
pointed at.

- `modules/heartbeat-guard.ts` — new `detectBackgroundLaunch(cmd)`: a detach construct
  (`nohup`·`setsid`·`disown`·trailing job-control `&`) over a known long-runner / sub-agent term
  (`claude -p`·`hexa cloud`·`torchrun`·`deepspeed`·`runpodctl`·`vastai`·`training`·`dojo`·`sbatch`/`srun`…).
  `recordAutoRunner` persists the detected job to `auto-runners.json` and arms the `.live-runner` marker;
  `autoRunnerLabels` reads non-expired entries and GCs them. `staleLongRunnerWarn` now merges these
  auto-detected labels alongside pods + ledger agents.
- 2h TTL (`AUTO_RUNNER_TTL_SEC`) auto-expires an auto-detected job — we can't observe a detached job's exit
  (its PID isn't in the command string), so the TTL bounds the false-nag window for jobs that already finished.
- `modules/post.ts` — `post bash` calls `detectBackgroundLaunch` + `recordAutoRunner` on every command, so an
  un-registered launch is tracked the moment it runs (no `ing pod add` needed).
- Verified: 9/9 detection cases (nohup/claude -p/disown/setsid match; `python train.py`, `ls -la &`,
  `echo && echo`, `2>&1` correctly NOT matched); warn fires for an un-registered bg job; TTL expires at 3h.
- plugin.json 0.9.3 → 0.9.4.

## feat(pool): `pool list` now shows LIVE CPU + GPU load per host (plugin 0.9.2 → 0.9.3)

`pool list` previously read only the cached roster (offline) — it showed static specs (cores/mem/GPU) but
nothing about how busy each host is right now. Added a live-load probe so `list` answers "which host is free?"
at a glance.

- `modules/pool.ts` — new `LOAD_PROBE` (POSIX-sh, Linux + macOS): emits `LOAD=<loadavg1>|CORES=<n>|GPU=<util,memUsedMiB,memTotalMiB,count|none>`.
  CPU load = 1-min loadavg ÷ cores → %; GPU = nvidia-smi averaged util + summed VRAM across all GPUs. `list`
  SSH-probes every non-blocked host in PARALLEL (pmap, cap 8) and appends a `⚡CPU N% · GPU M%·used/totalGiB` badge.
- Load is NOT cached (unlike specs) — it changes second-to-second, so `list` now does a live SSH round-trip
  (blocked restricted hosts are never reached; unreachable hosts show `⚡도달 불가`). Specs stay cached.
- Verified: `pool list` on the live roster shows `aiden ⚡CPU 141%(16.87) · GPU 0%·0.2/12GiB`, blocked
  hosts (akida·ghost) un-probed.
- plugin.json 0.9.2 → 0.9.3.

## fix(exec): spawn `error` event was unhandled → a SessionStart hook crash (plugin 0.9.1 → 0.9.2)

`/reload-plugins` in a repo with a stale linked worktree (its dir deleted) crashed the SessionStart hook
(`node:events` — "Emitted 'error' event on ChildProcess"): `worktree gc` ran `git status` with `cwd` set to
the gone worktree path, `spawn` raised ENOENT, and `lib/exec.ts execArgs` had NO `'error'` listener — so the
unhandled event killed the whole hook (and the promise would also have hung, never hitting `close`). Every
`execShell`/`execArgs` caller was exposed to this (any spawn ENOENT/EACCES, e.g. a minimal-PATH hook env).

- `lib/exec.ts` — `execArgs` now handles the child `'error'` event: degrade to a non-zero `ExecResult`
  (`code 127` + the spawn error in stderr) via a single-resolve guard, so a spawn failure never crashes the
  process or hangs. The stdin write/end is wrapped too (child may already be gone). `@convergence ossified
  EXEC_SPAWN_ERROR_UNHANDLED`.
- Effect: `worktree gc` (and all hooks) tolerate stale/dead worktree dirs — they degrade and get pruned
  instead of crashing SessionStart. Verified: `worktree gc` in the affected repo swept 42 items, exit 0;
  `execShell` on a nonexistent cwd returns code 127 (no crash).
- plugin.json 0.9.1 → 0.9.2.

## fix(guard): rm -rf guard was over-blocking — now matches the root ITSELF, not every absolute path (plugin 0.9.0 → 0.9.1)

`DANGER-RM-RF-ROOT` / `H-RM-RF-ROOT` matched any target starting with `/` (or `~`/`$HOME`), so legitimate
`rm -rf /tmp/x`, `rm -rf ~/foo`, `rm -rf /Users/me/build` were all vetoed — too conservative (kept tripping
real work, needing `# rm-ok` every time). Tightened to a boundary-anchored target: it now blocks ONLY the
catastrophic roots — bare `/` · `/*` · `~` · `~/` · `~/*` · `$HOME`(`/`,`/*`) · `${HOME}` · bare `*` — while
specific subpaths pass. The `# rm-ok <reason>` escape stays for an intentional root-level delete.

- `modules/danger-guard.ts` + `config/enforcement.json` (mirrored SSOTs) — same tightened regex.
- Verified with an 18-case block/allow matrix (10 catastrophic → block, 8 subpaths → allow): 18/18.
- README guard row clarified (root-only). plugin.json 0.9.0 → 0.9.1.

## feat(imagine): video generation — Seedance 2.0 text-to-video + image-to-video (plugin 0.8.0 → 0.9.0)

`imagine` was image-only. It now generates video too, routed by the output extension, with exact pinned
model versions. Image default stays `openai/gpt-image-2` ("image2").

- VIDEO by output extension (`.mp4/.mov/.webm/.m4v/.gif`) → fal queue, pinned **Seedance 2.0**
  (exact fal endpoints, verified): text-to-video `bytedance/seedance-2.0/text-to-video`; with `-i <image>`
  → image-to-video `bytedance/seedance-2.0/image-to-video` (the input image animates). Fast tier =
  `…/fast/…`; override any with `-m`.
- `-i <image-file|url>` (image-to-video input): http(s) URL passed through as `image_url`; a local file is
  inlined as a base64 data-URI (fal accepts data: URIs). `-i` with a non-video output is rejected.
- `backendFal` generalized to image+video (kind param + optional imageUrl): video payload is prompt
  (+ image_url for i2v), longer poll budget, result URL from `video.url`/`videos[].url`.
- header/usage/list + README + ARCHITECTURE imagine node document image2 + Seedance 2.0 t2v/i2v.
- plugin.json 0.8.0 → 0.9.0.

## feat(poll): `harness poll` — self-paced ≥10-min polling runbook (c19-sanctioned · plugin 0.7.1 → 0.8.0)

Codifies the "10분 폴링" pattern: watch slow background state (fleet lanes · pods · CI · queues) by waking
on a timer and checking ONCE per wake — not by reacting to every idle ping, and not via a hand-rolled bash
`sleep` loop (the c19 poll-interval guard blocks sub-30-min loops). `harness poll` is the sanctioned
alternative, sibling to `ci-track --watch` (which it points at for CI specifically).

- `templates/poll.md` (NEW) — the loop (wake→check once→fire-on-arrival→report→reschedule), the ≥10-min
  floor + why (prompt-cache 5-min TTL · default 1200–1800s), how to wait without bash sleep (ScheduleWakeup
  ≥600s / `/loop`), "don't poll what the harness already notifies you about," and stop conditions.
- `modules/runbooks.ts` `runPoll` — emits the runbook + echoes a `# interval:` (first numeric arg, clamped
  to a ≥600s floor, default 1200s) and `# target:` (remaining args).
- `cli/index.ts` — `poll` registered + help line. `commands/poll.md` (NEW) — `/poll [interval] [target]`
  slash delegator (triggers "10분 폴링"·"주기적으로 확인"·"poll every"·"watch loop").
- ARCHITECTURE poll node. plugin.json 0.7.1 → 0.8.0.

## fix(ing): `ing add/next --stdin` — register free text with shell-special chars safely (plugin 0.7.0 → 0.7.1)

`/ing add <free text>` broke when the text held shell-special chars (parens, quotes, `$`, `→`): the slash
command's unquoted `$ARGUMENTS` mis-parsed in bash, so agents fell back to hand-editing ING.jsonl. (The
companion "harness CLI not found" failure is resolved separately by `harness install` putting the global
command on PATH.)

- `modules/ing.ts` — `add`/`next` accept a STDIN text path: `--stdin` flag (or a lone `-`) reads the entry
  text from stdin instead of argv. Opt-in only, so an interactive no-text call still shows usage and never
  blocks on a TTY. Agent-safe form: `printf '%s' "<text>" | harness ing add --stdin` (works with `--to` too).
- `usage()` + `commands/ing.md` description document the STDIN-safe form.
- plugin.json 0.7.0 → 0.7.1.

## feat(kick): `harness kick` (alias `drill`) — hexa-lang gap-breakthrough/discovery passthrough (plugin 0.6.0 → 0.7.0)

Ports sidecar's `/kick` (skills/kick) into harness: a thin wrapper over `hexa kick --seed "<seed>"`
— the hexa-lang gap-breakthrough / discovery engine (aliased to `hexa drill`).

- `modules/kick.ts` (NEW) — resolves `hexa` on PATH; bare natural-language args join into
  `--seed "<seed>"`, a leading flag (`--rounds N`, `--engine mk9|mk10`, …) passes through verbatim.
  Long-running engine → INHERITED stdio (live stream, no capture/timeout), unlike the short
  `secret`/`research` captures. Missing `hexa` → exit 127 + install guidance.
- `cli/index.ts` — `kick` + `drill` alias registered; help line.
- `commands/kick.md` (NEW) — `/kick <seed>` slash delegator → `harness kick $ARGUMENTS` (sidecar parity:
  Korean + English triggers — "돌파해줘"·"발산"·"gap breakthrough on"·"drill <X>").
- ARCHITECTURE kick node. plugin.json 0.6.0 → 0.7.0.

## docs: sync CLAUDE.md/README/ARCHITECTURE with install·shadow·ci-track (no code change)

Project map / design SSOT had drifted from the commands shipped this session.

- `CLAUDE.md` — intro notes the global command is bootstrapped by `harness install`; modules tree line
  adds install(global bootstrap)/self-update/install-hooks/shadow + ci-track; scripts/ line names install.sh (SSOT).
- `ARCHITECTURE.json` — added the `shadow` module node (install·ci-track nodes already present).
- `README.md` — added the `harness shadow` plugin-less fallback note; renamed the `verify` command row to
  `ci` (verify kept as a legacy alias; config key stays `verify.checks`).

## feat(install): `harness install` — one-shot COMMON/global setup (clone + wrapper + global hooks · plugin 0.5.2 → 0.6.0)

There was no bootstrap for the GLOBAL command: README/`self-update` referenced `~/.harness/cli` +
`~/.local/bin/harness` as the install, but nothing CREATED it — first-time setup was manual, and the
`install` verb was just an undocumented alias of `init` (per-repo scaffold). `harness install` now means
"install harness on this machine as a common command," distinct from `init` (scaffold THIS repo).

- `scripts/install.sh` (NEW · SSOT) — curl-able bootstrap: clone `dancinlab/harness` → `~/.harness/cli`
  (ff-update if present) · write a `harness` exec-wrapper to `~/.local/bin/harness` (a script, NOT a
  symlink — `bin/harness` resolves its dir via `BASH_SOURCE` without readlink, so a symlink would
  mis-resolve the install dir) · PATH check · `install-hooks --global`. Idempotent. Flags
  `--no-hooks` · `--ref=` · `--dir=` · `--bin=` · `--dry-run`; env `HARNESS_DIR`/`HARNESS_BIN`/`HARNESS_REF`.
  One-liner: `curl -fsSL https://raw.githubusercontent.com/dancinlab/harness/main/scripts/install.sh | bash`.
- `modules/setup.ts` `runInstall` — `harness install` delegates to the SSOT script (same logic from the
  curl bootstrap and the CLI verb).
- `cli/index.ts` — `install` split from `init` (was an alias); registered + help line. `init` stays the
  per-repo scaffold.
- docs: README "0. 공용(전역) 설치" section + docs/install.md "공용(전역) 설치" table; ARCHITECTURE install node.

## fix(qa): full-command QA sweep — `--force-with-lease` dual-SSOT contradiction + 3 init/uninstall cosmetics (plugin 0.5.1 → 0.5.2)

Ran a 5-family parallel QA sweep over the whole CLI (~125 cases: setup/lifecycle · guards · gates/ledgers ·
runbooks · utility). One REAL bug + three cosmetic inconsistencies found and fixed; everything else PASS
(the inject commands' "0 output" on a bare call is by-design — they require a hook JSON envelope on stdin).

- **REAL — `git push --force-with-lease` was hard-blocked with no override** (`modules/git-guard.ts`): the
  code guard ran first and denied `--force-with-lease`, but `config/enforcement.json` H-FORCE-PUSH *exempts*
  it (it's the safe form — refuses to overwrite if the remote moved). The two SSOTs disagreed, breaking the
  standard rebase→lease-push workflow. Aligned the code guard to config intent: blind `--force`/`-f`/`+refspec`
  still blocked, `--force-with-lease` allowed, and a `# force-ok <reason>` inline marker overrides a bare-force
  block (escape parity with config). `@convergence ossified FORCE_LEASE_DUAL_SSOT`.
- cosmetic — `init` reported `state/` as "create" even when it already existed (`modules/init.ts`): now `skip`.
- cosmetic — `init --hooks` warned "Snippet below:" when an existing `.claude/settings.json` blocked the
  auto-merge but never printed the snippet: now prints it ("merge these hooks into your existing …").
- cosmetic — `uninstall` `.gitignore` drop-set was out of sync with `init`'s appended lines (dropped a dead
  `.harness/handoff/`, orphaned the `ING.jsonl*` lines): now drops exactly what `init` adds.
- plugin.json 0.5.1 → 0.5.2.

## fix(recommend): direct-execute commands (pr-cycle · ci · lint · ship …) run immediately — no 4-axis box / no confirmation (plugin 0.5.0 → 0.5.1)

When the user named a deterministic command to run — "pr cycle" / "머지해줘" — the every-turn
recommend-axes rule (FIXED ① complete) treated it as a recommendation moment and rendered the
4-axis box + waited for a pick, instead of just running the command. Executing a command the user
explicitly asked for is not a decision; the box is for genuine "which approach / what to build"
choices.

- `config/recommend.md` r1 — added an EXEMPT carve-out: direct-execute commands
  (`pr-cycle`·`ci`·`lint`·`ship`·`ci-track`·`self-update` …) run immediately, no box, no
  "진행할까요?" confirmation. A real branch/strategy choice INSIDE a command still uses the box.
- `commands/pr-cycle.md` — description marked ⚡ DIRECT-EXECUTE (run on request; doc-gate +
  branch-guard still protect, so "just do it" stays safe).
- plugin.json 0.5.0 → 0.5.1 so `/plugin update` re-copies the rule carrier.

## feat(ci-track): remote PR/CI tracker — replaces hand-rolled gh-poll + merge-on-green loops (plugin 0.4.1 → 0.5.0)

Long merge-on-green campaigns repeatedly hand-rolled CI polling — `gh pr checks <pr> | grep`,
`/tmp/pr_mon.sh` watch loops, manual pass/fail/pending counting — because harness had no command
to track a PR's remote CI. `harness ci-track` centralizes it.

- `modules/ci-track.ts` + `cli/index.ts` registration + `commands/ci-track.md` + help line.
- `harness ci-track <pr#|branch|url> [-R owner/repo]` — wraps `gh pr checks --json name,state,bucket`
  into an aggregate (pass/fail/pending counts + failing/pending check names) and a verdict:
  🟢 GREEN (exit 0) · 🔴 RED (exit 2) · 🟡 PENDING (exit 1) · ⚪ NONE (exit 0).
- `--watch [--interval=60] [--timeout=1800]` polls IN-PROCESS until terminal — the sanctioned
  replacement for a bash sleep loop (c19: the poll lives inside the CLI, not in agent-authored bash).
- `--merge-on-green` auto `gh pr merge --squash --admin --delete-branch` once all checks pass.
- `@convergence(ossified) CI_TRACK_NATIVE`. Verified against live GitHub CI: aggregate + verdict +
  pending-name listing + exit-code propagation all correct (NONE/PENDING/GREEN observed on real PRs).

## feat(hooks): inject ARCHITECTURE.json + ING.jsonl every turn (UserPromptSubmit), not just SessionStart (plugin 0.4.0 → 0.4.1)

`architecture inject` and `ing inject` were wired ONLY into SessionStart — surfaced once per
session, then buried as the conversation grew. The design SSOT (ARCHITECTURE.json) and the
in-progress board (ING.jsonl) deserve the same per-turn salience that `claudemd inject` (CLAUDE.md)
and `commons`/`recommend` already get. Both inject commands are event-agnostic (they echo the
received `hook_event_name`), so this is pure hook wiring — no code change.

- `hooks/hooks.json` + `modules/setup.ts` — added `architecture inject` and `ing inject` to the
  UserPromptSubmit chain (kept in SessionStart too). So the design tree + the WIP board re-inject
  every turn.
- `.claude-plugin/plugin.json` 0.4.0 → 0.4.1 so `/plugin update` re-copies the new hooks.json.
- ARCHITECTURE architecture-module node updated (SessionStart → SessionStart + every UserPromptSubmit).

## chore(plugin): bump 0.3.0 → 0.4.0 so `/plugin update` re-copies the bundled CLI

`claude plugin update` only re-copies the installed plugin cache when plugin.json's VERSION
changes — a same-version commit (CLI/command-only change) is reported "already at latest" and the
bundle goes stale, so hooks running `${CLAUDE_PLUGIN_ROOT}/bin/harness` keep the old CLI. The
self-contained-plugin commits since 0.3.0 (bare /arxiv·/yt #91, `harness shadow` #92, the
code-level danger+secret guards #93) only reached the global `~/.harness/cli` via `self-update`,
not the plugin bundle. Bumping the version makes `/plugin update` + reload pull all of them into
the bundle as one unit. Going forward: bump plugin.json on every shipped change that touches the
plugin payload (the whole repo is the payload now).

## feat(guards): code-level enforcement for the irreversible / gate-bypass commands (were regex-only)

Five `block`-policy rules lived ONLY in the `enforcement.json` regex layer — overridable by a
profile edit, and (until the STDIN fix earlier) silently dead when the whole pre-hook layer broke.
Per the repo's own `NO_RAW_CLOUD_CLI` principle ("hard rules belong in code, not a regex a profile
edit can weaken"), the genuinely irreversible / gate-bypassing ones are now mirrored into CODE
guards that run before the config layer, default-on:

- `modules/danger-guard.ts` (`pre bash`) — blocks `git --no-verify`/`-n` (bypasses the c14 lint+doc
  commit gate), `git reset --hard` / `clean -fd` / `checkout -- .` (working-tree destroy), `rm -rf`
  on `/` `~` `$HOME` or bare `*` (catastrophic), and `curl|wget … | sh` (remote code exec).
- `modules/secret-guard.ts` (`pre write`) — blocks hardcoded credential literals (AWS keys, private
  keys, `gh*_`/`sk-` tokens, `key/secret/password/token = "…"`) in code/config files (a committed
  secret is an irreversible git-history leak, commons c1).
- Each honors its INLINE escape marker (`# no-verify-ok` · `# reset-ok` · `# rm-ok` ·
  `# curl-pipe-ok` · `// @secret-ok`) — an explicit, per-command, visible opt-out (c16-compatible) —
  but is NOT a config toggle. The regex rules stay as a backup layer.
- Wired in `modules/pre.ts`; `@convergence(ossified)` markers in both guards. ARCHITECTURE PreToolUse
  node updated. Verified: each pattern denies via the real hook; inline markers + benign + non-code
  files pass.

## feat(shadow): `harness shadow` — native bare-/cmd generator (retires sidecar `shadow`)

Claude Code namespaces plugin commands as `/harness:cmd`; the bare `/cmd` form users actually type
needs a user-scope `~/.claude/commands/<name>.md`. The retired `sidecar` package generated those —
and when sidecar was removed, the generated shadows still pointed at a dead
`$CLAUDE_PLUGIN_ROOT` / `~/.claude/plugins/cache/sidecar/...` path, so `/arxiv` and friends died.
`harness shadow` is the harness-native, sidecar-free replacement: it mirrors harness's OWN
`commands/*.md` into `~/.claude/commands/` as bare delegators that always call `harness <cmd>`.

- `modules/shadow.ts` + `cli/index.ts` registration + `commands/shadow.md` + help line.
- Verbs — `shadow` (write/refresh), `shadow plan` (dry-run), `shadow remove` (delete only
  harness-generated shadows). Every generated file carries a `<!-- harness-shadow -->` marker, so
  `remove` never deletes a hand-authored same-name command and `apply` never clobbers one (skips + warns).
- `@convergence(ossified) SHADOW_GEN_NATIVE` — records the dead-sidecar-path recurrence this prevents.

## feat(commands): bare `/arxiv` + `/yt` delegators (research-skill parity, sidecar-free)

The host had a layer of user-scope shadow commands (`~/.claude/commands/*.md`) left over from the
retired `sidecar` package: they invoked `hexa run "$CLAUDE_PLUGIN_ROOT/bin/_*.hexa"` with a fallback
to a `~/.claude/plugins/cache/sidecar/...` path that no longer exists — so `/arxiv` and friends died
with "source file not found". harness already implements arxiv + youtube-transcript natively
(`modules/research.ts`, no API key, no sidecar), exposed as `/research arxiv|yt`.

- `commands/arxiv.md`, `commands/yt.md` — bare convenience commands delegating to `harness research
  arxiv|yt`, so the names users type resolve to harness's own implementation (sidecar dependency 0).
- Host cleanup (not in repo): the 43 broken sidecar shadows under `~/.claude/commands/` were
  triaged — 11 that harness backs were repointed to `harness <cmd>`, 32 sidecar-only ones (cycle
  family · mem · walkie · hf · quota · master · skillopt · sidecar · lab · inject · todo · trail …)
  were removed per the user's "제거" directive. Backup at `~/.harness-migration-backup/`.

## feat(plugin): SELF-CONTAINED plugin — CLI ships inside it, `/plugin update`+reload = everything latest (sidecar parity)

The harness shipped as TWO decoupled clones: the CLI lived at `~/.harness/cli` (refreshed only by
`harness self-update`'s git pull), and the CC plugin (`./plugin`) carried just hooks+commands that
called the global `harness`. So a CLI fix (e.g. the STDIN guard fix below) required a manual
`harness self-update` — reloading the plugin did NOT pick it up. sidecar avoided this by bundling
the CLI in the plugin; this change does the same.

- **repo root IS the plugin** — marketplace `source` `./plugin` → `.`; `plugin/.claude-plugin/plugin.json`
  → root `.claude-plugin/plugin.json`; `plugin/hooks` → `hooks/`; `plugin/commands` → `commands/`.
  The payload now includes `bin/ · cli/ · lib/ · modules/ · config/ · templates/ · styles/`.
- **hooks run the bundled CLI** — new `hooks/run.sh` dispatcher resolves `${CLAUDE_PLUGIN_ROOT}/bin/harness`
  first (the plugin's own copy), falls back to a global `harness` on PATH, and exits 0 silently if
  neither exists. `hooks/hooks.json` calls `run.sh` for every surface. So `/plugin update` + reload
  refreshes CLI+hooks+commands as ONE unit — no per-project copy, no separate `harness self-update`.
- `bin/harness` already resolves its dir relative to itself, so the bundled copy runs standalone
  (tsx via the repo walk-up or `npx --yes tsx` when the cloned payload has no `node_modules`).
- plugin.json 0.2.0 → 0.3.0; marketplace + README + ARCHITECTURE + CLAUDE.md updated in lockstep.
- Verified: plugin-context (`CLAUDE_PLUGIN_ROOT=$PWD`) blocks raw `vastai` via stdin; benign `ls`
  passes; global fallback still blocks when `CLAUDE_PLUGIN_ROOT` is unset; a host with neither is
  silent (exit 0); bundled `bin/harness help` loads.
- ⚠ Host step for TRUE reload-only updates: re-point the CC marketplace from the local `directory`
  source (`~/.harness/cli`) to the GitHub repo (`dancinlab/harness`) so `/plugin update` git-pulls.
  The classic `~/.harness/cli` + `harness self-update` install stays valid as a fallback.

## fix(pre): code-level guards (cloud-raw c11 · force-push · poll c19) read tool input from STDIN, not an unset env var

The `pre bash`/`pre write` hooks resolved their tool input ONLY from `$CLAUDE_TOOL_INPUT` /
`$CODEX_TOOL_INPUT` env vars. Current Claude Code does not set those — it pipes the PreToolUse
payload (`{tool_name, tool_input:{command|file_path|content}, …}`) on STDIN. So `parseToolInput()`
always saw an empty command, `if (!cmd) return 0` fired, and EVERY code-level guard silently
passed: raw `vastai`/`runpodctl`/`vast` provider CLIs (the ossified `NO_RAW_CLOUD_CLI` block),
git force-push, and the c19 poll-interval guard all no-op'd. The block logic was never wrong —
the input carrier was. (The 5 inject modules — commons·recommend·prefs·ing·architecture — already
read stdin via `readStdin()`; `pre.ts` was the lone hold-out on the dead env path.)

- `modules/pre.ts` — `parseToolInput()` now tries env FIRST (Codex back-compat), then STDIN
  (current CC), and unwraps a full payload's `.tool_input` or accepts a bare input object.
  New `@convergence(ossified) PRETOOLUSE_INPUT_FROM_STDIN` marks the recurrence guard.
- Verified via the real hook: stdin `{tool_input:{command:"vastai …"}}` → `permissionDecision:deny`;
  `hexa cloud …`/`ls` → pass; env legacy form still blocks; `pre write` unwraps `file_path` from stdin.
- ⚠ Live effect requires `harness self-update` (propagates to `~/.harness/cli`); the plugin copy
  updates on next plugin sync.

## feat(architecture): `architecture lint` — mechanical c4 tree-hygiene gate

The architecture module could only `inject`/`show` the design SSOT — nothing guarded the JSON
tree's *shape*. In practice a node drifts: instead of splitting into children, a single leaf
accretes a wall of ` · `-joined claims until one cell holds thousands of characters (commons c4
explicitly forbids this — "split piled-up cells into one child per logical item"). That drift was
only ever caught by a human eyeballing the rendered viewer, repo by repo, after the fact.

`harness architecture lint` now flags it mechanically, walking the repo-root `ARCHITECTURE.json`
and emitting one warning per offending leaf:

- `ARCH-BIG-CELL` — a string leaf past ~1.5 KB (a subsection masquerading as one cell).
- `ARCH-PILED` — a leaf gluing more than 10 ` · `-joined items (a child list flattened into text).
- `ARCH-HISTORY` — a `previous`/`deprecated`/`history`/`changelog`/`이전` key smuggling
  change-history into a current-state snapshot tree (history belongs in CHANGELOG + git, c4).

Wired into `harness lint` as a **warn-only** check (step 4c): violations are reported and logged
to the lint JSONL but never block — `classify()`'s `defer` fallback keeps pre-existing oversized
trees from failing CI on day one, while making the drift visible every run. `--strict` flips the
standalone `architecture lint` to exit 1 for repos that want a hard gate. Verified against the
hexa-lang tree (25 real warnings surfaced, incl. a 4563-char / 41-item domain cell); the harness's
own tree is clean.

- `modules/architecture.ts` — new `lint` subcommand + exported `lintArchitectureTree()` walker.
- `modules/lint.ts` — step 4c folds the walker's hits into the violation stream (warn-only).
- `cli/index.ts` — usage line documents the new `lint` verb.

## fix(recommend): default-mode path doc was stale `~/.sidecar`, code reads `~/.harness`

The recommend-axes rule carrier (`config/recommend.md`, injected EVERY turn) still documented
the standing default mode as living in `$HOME/.sidecar/recommend-default` — a leftover from the
old sidecar harness. But the implementation (`modules/recommend.ts`) has long read the two-tier
`.harness/recommend-default` (per-repo) → `~/.harness/recommend-default` (global). The map
pointed at a road the code doesn't walk: anyone following the injected rule set the mode in the
wrong file and it silently never took effect. The harness now documents the path it actually uses
(self-hosting, not sidecar host-state).

- `config/recommend.md` r4 — path corrected to per-repo `.harness/recommend-default` (committed,
  wins) → host-wide `~/.harness/recommend-default` (`set-default --global`), matching code precedence.
- `modules/recommend.ts` — dropped the stale `sidecar uses ~/.sidecar host-state` comparison comment.
- harness repo `.sidecar` reference count: 2 → 0 (verified by grep + inject-body scan).

## feat(plugin): global slash-command set — every harness command recognized as /cmd (sidecar pattern)

`plugin/commands/*.md` 50개 신설 — 하네스의 전체 사용자-대면 명령을 sidecar식 슬래시 명령으로 노출. 각 `.md`는 프런트매터(rich `description` + **Triggers** 자연어구 + `argument-hint` + `allowed-tools: Bash`) + `!`harness <cmd> $ARGUMENTS`` 본문의 얇은 위임자. Claude Code가 description/Triggers로 인지 → `/paper`·`/imagine`·`/pr-cycle`·`/sbs`·`/fleet`·`/ing`·`/verify`… 한국어("논문 만들어"·"PR 돌려"·"진행보드") + 영어 트리거 양쪽.

- **공용셋(shared/global) · 프로젝트 무관**: 명령이 플러그인 1곳(commands/)에 살고 harness 플러그인으로 배포 → 프로젝트마다 복사/갱신 불필요. 중앙 갱신 = `harness self-update` + 플러그인 update. (plugin.json 0.1.0→0.2.0 으로 update 트리거)
- **범위**: tools(paper·imagine·research·watch·secret·lsp) · runbooks(sbs·abg·afg·fleet·pod·dojo·micro-exp·bypass·go·brainstorm·gap·demi) · gates/ledgers(pr-cycle·lint·ci·verify·audit·gc·docs·folders·end·worktree·ing·verdict·atlas·upstream·convergence·sync·errors·ledger·bitter-gate·lockdown·pool) · config(recommend·prefs·easy·commons·architecture·claudemd) · setup(init·install-hooks·update·self-update·uninstall). hook-intern 전용(pre·post·prompt)은 제외.
- **생성 규율**: `_tools/gen_commands.py` 데이터테이블에서 일괄 생성(일관성·재생성 가능). YAML 프런트매터 안전성 검증(콜론-스페이스 0·50/50 파싱) + 본문은 `command -v harness` 가드(미설치 시 안내).

## feat(paper): demiurge-house scientific-paper command (scaffold · cover · build · g51 gate)

`harness paper` 신설 — demiurge 하우스 페이퍼 규율을 도구로 박제(self-improving tool). 매 캠페인마다 손으로 재조립하던 LaTeX 프리앰블·표지·빌드·페이지 게이트를 한 명령으로 통일.

- **modules/paper.ts** + cli/index.ts 디스패치/도움말 배선.
- **`paper new <slug>`**: `PAPERS/<slug>/{main.tex,references.bib,PAPER.md,figures/}` 스캐폴드 — 하우스 프리앰블(이모지 제목 · 🔵🟢🟡🟠🔴 g5 tier-badge 디스크 · TikZ+pgfplots(+calc) · natbib unsrtnat · fal.ai 표지 include · §hypothesis/method/measurement/finding/ledger/limitations). 표지를 `harness imagine`(fal)로 생성 후 빌드.
- **`paper build <slug|dir>`**: xelatex→bibtex→xelatex×2 → pages+refs 보고 + g51 ≥10p 게이트(기본 10). 유효성 강화: 깨진/빈 PDF(pdfinfo 0p 또는 <1KB)는 실패 처리하고 컴파일 에러 줄 출력.
- **`paper cover <slug|dir>`**: `harness imagine` 위임으로 figures/cover.png 재생성(키는 `secret get fal.api_key`, 본 모듈은 키 미취급).
- **`paper list`**.
- **QA(c2)**: help·메인help 노출·new(--no-cover)·list·end-to-end(new→fal 표지 851KB→build 2p 717KB·g51 PASS)·실패경로(표지없음→exit 2+원인/해결 줄) 전수 PASS.
- xref: `imagine`(secret 경유 fal/openai) 재사용 — 표지 백엔드/키 로직 중복 0.

## docs(architecture): ARCHITECTURE = current-state snapshot, not a history log

Sessions kept accreting history into ARCHITECTURE.json — version/dated/`이전엔…`/`deprecated`
nodes — because the guidance called it a "갱신형 SSOT"(updatable SSOT), which a model reads
as "add an update entry" rather than "replace the affected node in place". The tree should
show only the final/current structure; history belongs in CHANGELOG + git.

- `modules/architecture.ts` — the SessionStart inject note (surfaced EVERY turn) now spells
  out: 현재상태 스냅샷이지 이력 로그 아님 — update-in-place + delete old wording; NO
  history/version/dated/previous/deprecated nodes. `@convergence ARCH_SNAPSHOT_NOT_HISTORY`
  ossified in the module header.
- `config/commons.md` c4 — added the same rule to the governance SSOT: "갱신" = replace the
  node in-place, not append; tree = this-moment final structure only; history → CHANGELOG + git.
- ARCHITECTURE.json itself was already clean (no real history nodes) — this is a recurrence-
  prevention hardening, not a cleanup.

## fix(pre): PreToolUse block schema — every code-level guard was a silent no-op

Root cause for "직접 CLI 막았는데 `vastai destroy` 가 그냥 실행됨": `emitBlock` emitted the
legacy `{"decision":"block"}` (+exit 0), which current Claude Code **no longer honors for
PreToolUse** — it only reads `hookSpecificOutput.permissionDecision`. So the guard printed
its reason to stdout and the tool ran anyway. This silently neutered ALL code-level
PreToolUse blocks (force-push · cloud-raw c11 · poll c19) **and** every config
`action:"block"` rule across every repo — they had zero teeth.

- `modules/pre.ts` `emitBlock` now emits the current schema as the operative key —
  `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny",
  "permissionDecisionReason":"[id] …"}}` — and keeps the legacy `decision`/`reason`
  fields appended for older Claude Code builds (harmless; new builds read
  hookSpecificOutput, old read decision). One function → fixes pre bash + pre write +
  all config block rules at once.
- Verified via the actual `pre bash` hook output: raw `vastai destroy` and
  `git push --force` now return `permissionDecision:"deny"`. `@convergence
  PRETOOLUSE_DENY_SCHEMA` ossified inline.
- Propagation: needs commit → `harness self-update` (global `~/.harness/cli` is
  git-commit-based, not working-tree); per-repo `.harness-engine` submodules pick it
  up on their next bump.

## feat(heartbeat-guard): c22 — warn when a LIVE long-runner goes unchecked >10min (abandonment)

c19 caps how OFTEN you may poll (anti-cache-bust); the OPPOSITE failure mode had no
guard — firing a long-runner (GPU pod, background agent) then walking away, so it
idle-burns and its result is never harvested. New c22 + `modules/heartbeat-guard.ts`:
a live tracked long-runner must be CHECKED at least every `poll.maxSilenceSec`
(default 600s = 10min). Covers ALL tracked runners, not just pods — ing-board pods +
ledger background agents.

- We can't intercept the ABSENCE of an action, so: `markPollActivity()` stamps a
  `lastPoll` heartbeat (`.harness/logs/heartbeat.json`) whenever a status-check
  command runs (`hexa cloud poll/tail/list/status/…`, `harness ing`, `harness ledger
  list`, `harness check/lab`, `gh run watch`, `squeue/sacct`); `staleLongRunnerWarn()`
  fires on agent activity (`post bash`) + session start (`ing inject`) if a live
  runner exists and the heartbeat is older than maxSilenceSec. WARN (not block) —
  abandonment is a nudge, the inverse of c19's hard cap.
- Perf gate: `ing pod add` sets a cheap `.harness/logs/.live-runner` marker; `done`/
  `pod rm` clears it when no pod remains. `post bash` skips the git-backed pod read
  unless the marker is set OR a ledger agent is active — so the no-live-job common
  case costs one stat. `post bash` reads the command from positional args OR the
  PostToolUse tool-input env (fallback) so the stamp doesn't miss.
- config: new `poll.maxSilenceSec` (default 600). `lib/config.ts` + DEFAULTS.
- Verified: 5/5 heartbeat smoke (no-live → null; live+never-polled → warn 한 번도;
  live+just-polled → null; live+700s-silent → warn; non-poll cmd doesn't stamp); CLI
  loads. Convergence in-file (`NO_ABANDONED_LONGRUNNER`).

## feat(cloud/dojo): hand-rolled-fanout warn + config-carried dojo stack (flame+forge+hexa-cuda)

Two gaps surfaced by the anima decode workflow, where a session hand-wrote `/tmp/h1305_launch.sh`
(a 12-shard staggered `hexa run` loop), `hexa cloud copy-to`'d it, and ran it remotely — bypassing
`hexa cloud`'s structured dispatch / `pods.json` registration / cost accounting. `copy-to` is the
sanctioned (whitelisted) path, so the existing raw-cloud block never saw the fanout.

- **cloud-guard `detectHandrolledShardFanout()` (WARN + redirect)** — `pre bash`, sibling of the
  `CLOUD-RAW-CLI` block. Catches the launcher LOOP itself via FOUR corroborating signals (loop /
  `xargs -P` + `nohup`/`setsid` detach + backgrounding `&` + an engine/training launcher: `hexa
  run`, torchrun/deepspeed/`accelerate launch`, or `python …`), so a benign local loop won't trip.
  It is a WARN (not the no-override block): a local CPU-parallel batch is legitimate (pod.md allows
  it); the moment it targets a pod the redirect points at `hexa cloud fire-shards`. Verified: 7/7
  smoke (h1305 + xargs + torchrun POSITIVE; single-fire + wc-loop + http.server + bare-split
  NEGATIVE) AND `detectRawCloudCli(h1305)=null` (warn-only, never the block). Convergence in-file
  (`NO_HANDROLLED_SHARD_FANOUT`).
- **config-carried dojo stack** — new optional `config.dojo {defaultLang, stack, delegate}`. The
  engine stays domain-agnostic: the preferred training/kernel stack is carried in per-repo config,
  never hardcoded. `runDojo` now reads it — defaults `--lang` from `defaultLang`, surfaces the
  `stack` label, and when `delegate` is set AND `hexa` is on PATH it shells out to `hexa dojo
  <delegate> <slug>` for the REAL artifacts (flame/forge `train.hexa`, `hexa_cuda` nvptx kernel),
  else emits a hexa-native stub. The generic run.sh glue was also fixed: it referenced the
  NON-EXISTENT `harness pod fire` — now `hexa cloud fire` / `fire-shards` (the real verbs).
  anima/harness.config.json set to `defaultLang=hexa · stack="flame+forge+hexa-cuda" ·
  delegate=flame_forge`; documented in harness.config.example.json. Verified: CLI loads; py stub
  (back-compat) emits 0 `harness pod fire` + `hexa cloud fire`; hexa stub emits `train.hexa` +
  `hexa run`.
- **templates/pod.md** — adds the `fire-shards` sub-flow + an explicit "❌ 손수 launcher.sh 금지"
  note pointing at the new guard.

(The root-cause `hexa cloud fire-shards` verb itself lives in hexa-lang `feat/cloud-fire-shards`
— implemented + `fire_shards_test PASS`, commit deferred there: that working tree is shared with
other live sessions and its CHANGELOG is mid-edit, so a clean selective commit waits.)

## feat(poll-guard): code-level enforcement of c19 — block short-interval poll loops over external long-runners

c19 ("poll external long-runners at ≥30min") was a hint; the main session's ScheduleWakeup interval
can't be intercepted by harness (runtime tool, not bash). But the OTHER way sessions poll — a bash
`while …; do <status>; sleep <N>; done` loop — IS a bash command, so it's now code-guarded. New
`modules/poll-guard.ts` `detectShortPollLoop()` runs in `pre bash` before config rules, default-on:
blocks a poll LOOP (`while`/`until`/`for … do … done`, or `watch -n <N>`) that (a) references an
external long-runner (runpod/vast/pod/gpu/nvidia-smi/r2/measure/dojo/train/torchrun/deepspeed/squeue
/sacct/cloud) AND (b) has a smallest `sleep` (or `watch` interval) < 1800s. It parses sleep units
(`60`, `90s`, `5m`, `1h`). Fast LOCAL/CI waits are c19-exempt and pass — the external-long-runner
term gates it, so `while ! curl -sf localhost:8080; do sleep 2; done` is fine. Compliant ≥1800s
loops, single sleeps, and plain loops without sleep all pass. QA via the real `pre bash` hook
(CLAUDE_TOOL_INPUT env per c2): 5 block / 5 pass, 0 false positives. Convergence ossified in-file
(`NO_SHORT_POLL_LOOP`).

## feat(cloud-guard): code-level block of raw runpod/vast CLI·API + raw dojo/deck launches (c11)

A session ran `runpodctl pod create` / `cloud rent` directly because c11 ("use hexa builtins")
was only a hint + keyword warn — nothing blocked it, and an enforcement.json regex rule can be
silently weakened by a profile edit. Fix is CODE-level, mirroring the built-in force-push guard:
new `modules/cloud-guard.ts` `detectRawCloudCli()` runs in `pre bash` BEFORE config rules,
default-on, NO override. Two guard families:
- **raw cloud CLI/API**: blocks `runpodctl …`, `vastai …`, `vast <verb> …`, `cloud rent`, and
  `api.runpod.io`/`rest.runpod.io`/`console.vast.ai` endpoints → use `hexa cloud`.
- **raw dojo/deck launches** (`detectRawDojoDeck`): blocks distributed/training launchers in
  command position — `torchrun …`, `deepspeed …`, `accelerate launch …`, `python[3] …train|
  finetune|sft|pretrain….py` — and hand-running a `run.sh` under a `dojo/`|`decks/` tree →
  use `hexa dojo` / `hexa deck`.
Sanctioned path (`hexa cloud`/`hexa dojo`/`hexa deck`) and innocents pass: `grep runpodctl logs`,
`echo runpodctl`, `cat vast/notes.md`, `vast=3`, `python app.py`, `python serve.py`,
`accelerate config`, `bash scripts/build.sh`. Segment-aware (splits on shell operators, strips
`sudo `/env-assignments, inspects each segment's lead token) so it's command-position-precise,
not substring. QA via the real `pre bash` hook (CLAUDE_TOOL_INPUT env, not stdin — cross-checked
per c2): all block/pass cases correct, 0 false positives. Convergence ossified in-file
(`NO_RAW_CLOUD_CLI`, `NO_RAW_DOJO_DECK`).

## docs(arch): dogfood c4 — decompose harness ARCHITECTURE.json `ing` node into children

Applied the c4 children-tree rule to harness's own ARCHITECTURE.json (the rule author should dogfood).
The `ing` module node had a 391-char ` · `-joined dump in 상세; split it into child detail nodes (lead
role line on the parent, each ` · ` item a child with verbatim text — lossless, lead+children == original).
The other 3 long cells (`pr-cycle` 264 = coherent →-pipeline flow, `claudemd` 332 = coherent explanatory
paragraph, `pool` 298 = coherent multi-sentence prose) were intentionally LEFT — per c4's anti-over-
decomposition clause, coherent sentences/flows must not be shredded into orphan fragments. This closes
the dancinlab-wide ARCHITECTURE.json tree pass: anima/edge/hexa-lang/demiurge/forge/phanes/hexa-codex/
airgenome/drive/gamebox/pool/void all restructured to real children trees via parallel agents (each
lossless-verified by non-whitespace char-multiset + JSON-valid + viewer-renderable), now harness itself.

## fix(lockdown): CLAUDE.md is never L0 — drop the self-capturing CLAUDE*.md regex alternation

`lib/lockdown.ts`'s L0 path-parser (which reads the `🔴 L0` block of the guide named by
`lockdown.fromMarkdown`, normally CLAUDE.md) included `CLAUDE(?:-…)?\.md` as a path-like token — so
whenever the parser scanned CLAUDE.md and the text mentioned `CLAUDE.md`, it added the guide to its
OWN L0 list. That's why harness kept treating CLAUDE.md as L0 even though it's the project map /
re-injected guide, not protected engine core. Removed the `|CLAUDE…\.md` alternation; the regex now
captures only real source paths (`src/… lib/… modules/…` etc). Verified in a throwaway repo:
`isL0("CLAUDE.md")=false`, `isL0("lib/core.ts")=true`. `fromMarkdown: "CLAUDE.md"` (CLAUDE.md as the
*declaration site* of the L0 list) is unchanged and correct. Convergence note ossified in-file
(`CLAUDEMD_NOT_L0`).

## docs(commons): c4 — ARCHITECTURE.json must use a real `children` tree (no one-cell dump)

Strengthened c4: when authoring ARCHITECTURE.json, express hierarchy as a `children` tree — do NOT
cram many facts into one column (esp. `상세`/`detail`) joined by ` · `/newlines. Many items piling
into one cell is the signal to decompose them into child nodes (a module's subcommands · fields ·
failure modes each become a child). Column values hold only the node's own short attributes
(one-line role, kind tag); deeper content drops one level into `children`. Goal: scanning the tree
reveals structure and detail unfolds with depth — a real hierarchy, not a flat table padded with
long prose. A node that grows bulky without children is a refactor target.

## docs(commons): add c20 — Pi5-Akida is anima neuromorphic-only (no shared-resource use)

New rule c20: the Raspberry Pi 5 + Akida neuromorphic chip (`pi5-akida`) is reserved for anima's
neuromorphic experiments only — never share/reallocate it for anything else (no common `pool`
roster, no general build/bench/CI runner, no GPU substitute). Sharing it would break the dedicated
neuromorphic experiment environment's reproducibility. CLAUDE.md SSOT pointer → c1–c20.

## refactor(recommend): retire `recommend.tape` DSL → `recommend.md` (plain Markdown carrier)

The 4-axis recommend rubric lived in `config/recommend.tape`, but `recommend.ts` only ever read it as
TEXT and injected it verbatim (no DSL parsing), so the `.tape` form added nothing. Moved the same
rules to `config/recommend.md` (Markdown, like commons.md / easy.md); `body()` reads recommend.md and
the MUST-FOLLOW header now lives in the file's first line. set-default / auto / fixed-axis directives,
`resolve-mode` (the sbs dependency), and per-repo `.harness` override are all unchanged. QA: show /
inject emit recommend.md, `resolve-mode auto:safe` + FIXED-axis directive verified, `recommend.tape`
removed. This is step 1 of the dancinlab-wide `.tape` retirement — data-bearing `.tape` files
(CLAIMS / PROMOTION / … across the other repos) are dropped outright in follow-up per-repo sweeps.

## docs(commons): add c19 — poll external long-runners (pod/r2/cloud) at ≥30min when not delegated

New rule c19: when the main session itself polls an **external** long-running job — GPU `pod`
(training/build), remote `r2`/measure-class experiments/benches, cloud jobs — rather than delegating
to a sub-agent, the poll interval is **≥30min (1800s)**. These don't change minute-to-minute, and
sub-5min wakeups bust the prompt cache (5min TTL) every time for cost/latency with no benefit.
Register the job on `harness ing pod`/ING (c6) and poll only its status at ≥30min; CI/deploy-queue-
class jobs that finish in minutes are the exception (poll fast). Better yet, hand the polling itself
to a sub-agent (isolated worktree) and free the main session. CLAUDE.md SSOT pointer → c1–c19.

## feat(c17): upstream 막힘 = 그 세션 직접 fix (현재작업 ING 박제 → resume 복원)

c17 was a split — compiler/runtime core → ING hand-off, everything else → direct fix — and the
split kept stalling (cores got punted rather than fixed). New policy: an upstream blocker is fixed
**in that session, directly** (core or app), via the upstream repo + `harness pr-cycle`. High-risk
substrate (codegen/runtime/byteeq/toolchain) just gets an isolated `git worktree` + STOP-on-
concurrent-session (c7/c9) — conflicts are avoided by isolation, not by punting. Because a fix can
run long, the interrupted task is first stashed on the board:
`harness ing add "↩resume <task>: <where·why·next>"`. ing now sorts `↩`-prefixed resume items to the
FRONT of `ing show` / SessionStart inject so the thing to return to surfaces first; after the fix
merges, resume it and `ing done <id>`. cross-repo `--to` is now only for genuinely handing work to
another session/person.

## feat(ing): board on a dedicated `ing` git ref + 수렴진화 → hexa `@convergence` attr

The in-progress board is no longer a working-tree file — it lives on a dedicated `ing` git ref:
- `ing add/done/pod/next/show/inject` read via `git show ing:ING.jsonl` and write via plumbing
  (`hash-object` → `mktree` → `commit-tree` → `update-ref` on `refs/heads/ing`), then best-effort
  `push origin ing`. So the board is **branch-switch-proof** (never in the worktree, so checkout/
  `reset --hard` can't clobber it — the bug that kept eating it), **committed + shared** (push), and
  **protected-main-safe** (its own ref, not main). Offline / no-push-perm → the local ref still
  advances and warns to sync later.
- `readItems` falls back to a legacy working-tree ING.jsonl when the ref is absent (one-time
  migration); the first write graduates those items onto the ref. `--to <repo>` writes the sibling's
  `ing` ref the same way.
- QA (throwaway repo + bare remote): add×2 → ref created · feat branch + `reset --hard` → board
  preserved · done → scrub · push → reached bare remote · remote removed → local ref advances + warn.
  All PASS.

commons c1 — 수렴진화 (recurring-defect learning) now uses hexa-lang's `@convergence` attr format
verbatim instead of the ad-hoc ✅/🔄/🚫 labels (SSOT: hexa-lang `self/convergence_scan.hexa`;
`hexa convergence dump <file>` scans/aggregates it): `// @convergence state=<state> id=<ID>
value="…" threshold="…"` with the canonical state enum (ossified | stable | in_flight | pending |
completed | completed_gap | failed | blocked). ing.ts carries the first two real entries
(`ING_BOARD_DEDICATED_REF`=ossified, `ING_NO_DIRECT_MAIN_PUSH`=failed).

## fix(ing): untrack ING.jsonl (gitignore) — branch-switch/reset no longer clobbers the board

ING.jsonl was git-tracked, so a `git checkout`/`reset --hard` (e.g. switching branches, or a
zombie reset) rolled the board back to the committed version — silently wiping the session's
`ing add/done` edits. (This bit us mid-session during the hexa-cloud work.) It also contradicted
c6's "커밋 불필요". Fix: the in-progress board is **local session state** → gitignore it.
- `.gitignore`: add `ING.jsonl` (+ `.bak`/`.tmp.*` rotation); `git rm --cached ING.jsonl` (file
  kept locally, just un-tracked).
- `init.ts`: gitignore scaffold now seeds those 3 lines, so every newly-init'd repo is safe.
- commons c6: ING.jsonl is now stated as **gitignore(untrack)** — branch/reset can't overwrite
  it; completed/handoff content still persists via CHANGELOG and the target repo's board.
- ing.ts: dropped the stale "(commit ING.jsonl)" hint; `--to` message now says the target repo
  surfaces it at next SessionStart (no commit needed). CLAUDE tree updated.
Note: sibling repos (hexa-lang, anima, …) are still tracked — they pick this up on their next
`harness init`/manual `git rm --cached ING.jsonl`; not auto-migrated here.

## qa(harness): fix the 3 deferred QA findings + commons rules (수렴진화 3-state · QA → c2)

Resolved the 3 items the full-module QA sweep had deferred:
- **verdict arg-flatten (⑥)** — `record id -- <argv>` now shell-quotes each token (`shq`), so
  `record id -- sh -c 'exit 3'` correctly FAILs instead of silently mis-tiering. Without `--`,
  args stay one shell line so `record id "a && b"` keeps shell operators (no regression).
- **git -c push --force bypass (⑧)** — detectForcePush now walks past git-level options
  (`-c key=val`, `--flag`) between `git` and `push`, so `git -c x=y push --force` blocks; refspec
  `+main` still blocks; `git push origin main` / `git log` still pass.
- **docsActive .json mismatch (⑨)** — docs.ts now uses an `archName()` auto-detect (prefer
  ARCHITECTURE.json, mirroring lint), so a .json-SSOT repo no longer reads as docs-inactive.
  Set `docs.scopeDirs:["docs"]` in harness.config (templates/styles runbooks are not separate
  SSOT docs → quickref-exempt) + added quickref to docs/extending·languages → `docs check` rc 0.

commons rules:
- **c1 수렴진화 (재발방지)** — a recurring defect's lesson is recorded as an inline comment IN the
  offending file, classified by **verification state** (not a running log): `// ✅ 수렴[필수]`
  (must, verified) · `// 🔄 수렴[진행]` (doing/done) · `// 🚫 수렴[금지]` (tried→proven-not-to-do).
  No scattered `*-incident.md`.
- **c2 post-impl QA** — moved the "full QA after every feature/bugfix" rule from CLAUDE.md into
  commons c2 (cross-project), with the parallel-agent + test-harness-artifact cross-check note.

## qa(harness): full-module QA sweep — fix 7 bugs (atlas · enforcement · folders · worktree)

Ran a QA sweep across all ~55 commands (4 parallel agents, throwaway repos). Runbook/util
commands clean; fixed 7 real defects:
- **atlas regex injection (data loss)** — `add`/`link` built a `RegExp` from the raw id, so
  `link "row."` matched & mutated UNRELATED rows. Now compares the first table cell by exact
  string (`cellId`), never a regex.
- **atlas link to nonexistent id** — used to print success while writing nothing; now refuses
  with exit 1 ("add it first").
- **atlas unescaped `|`** — a `|` in a claim spawned phantom table columns; now escaped to `\|`.
- **enforcement `H-RM-RF-ROOT` under-match (safety)** — `rm -rf /*`, `rm -rf / && …`, and
  `rm -fr /` all slipped through (end-anchor `\s*$` + hardcoded r-before-f order). New regex:
  r/f flags order- & case-insensitive via lookahead, no end-anchor (so trailing glob/chained
  commands still block). `rm -rf build/` / `rm file.txt` still pass.
- **folders scaffold path traversal** — `folders scaffold ../x` wrote a CLAUDE.md OUTSIDE the
  repo; added a `relative(REPO_ROOT, abs)` containment guard (refuses `..`-escaping targets).
- **worktree stale-base warning regex** — only matched `add -b <branch> <path>`; the standard
  `add <path> -b <branch>` order never warned. Loosened to `add\b.*?-b\s+(\S+)`.

Deferred (reported, not fixed): verdict `record` arg-flattening (argv→shell quoting is an
inherent trade-off — forcing quotes would break `record id "a && b"`), `git -c … push --force`
adjacency bypass (very low real-world likelihood), and `docsActive()` keying on `.md` only
while `lint` gates on `.json` (a default mismatch — design call, not a crash).

## qa(ing): full-module QA + `done` multi-id / unified message; CLAUDE post-impl QA rule

Ran a full QA sweep of the `ing` module (24 cases over show·add·next·done·pod·inject·--to
in throwaway repos). All green except two real gaps in `done`, now fixed:
- **multi-id** — `harness ing done 1 2 3` scrubs several at once. Guard: only when EVERY
  token is a real id (a stray non-id refuses the whole batch instead of part-scrubbing),
  so `done task 1` still text-searches "task 1" rather than letting the "1" token hijack it.
- **message** — the not-found path said "no work/next item matching" even though `done`
  now also targets pods; unified to "no item matching" (+ usage hint lists pods as `(pod)`).
Also recorded a `CLAUDE.md` working rule: **after any feature/bugfix, run a full QA sweep**
of that feature (all subcommands + edge cases, PASS/FAIL tally per c2) and fix what it
finds before closing — cross-checking with direct args when a failure smells like a test
harness artifact (e.g. zsh not word-splitting `$var`, which faked 2 failures this run).

## fix(ing): `harness ing done <id>` now scrubs pods too (was work/next only)

Root cause: the `done` handler filtered with `r.kind !== "pod"` in BOTH the id match
and the open-id listing, so `harness ing done <pod-id>` always failed with "no work/next
item matching …" — a finished GPU pod could only be removed via the separate
`ing pod rm`. Now `done` matches ANY kind by exact id, so it is the single "this is
finished" verb for work · next · pod alike (id is a pod's only handle since pods carry
no text). The open-id usage hint also lists pods (tagged `(pod)`). Text fallback stays
work/next-only and single-match-guarded (a loose term still can't mass-scrub the board).

## docs(commons): add c18 — releases = semver tag → CI asset publish (no manual build/upload)

New always-on rule c18: repos that ship a user-facing artifact (compiler/binary/package/CLI/model)
unify releases on a single entry point — cut a **semver tag** (`vX.Y.Z`) on verified main, and let
`.github/workflows/release.yml` (CI) build per-target assets and upload them to the GitHub release
(install.sh / package managers fetch those verbatim); no local manual build→upload. A release gate
(e.g. hexa-lang's `release-runtime-compile-gate.yml` byteeq/compile check) must pass before publish.
Optional rolling `edge` prerelease on each main push. Release is a step SEPARATE from c12 (merge):
cut the version AFTER the merge lands. Derived from observing the actual deploy releases of
**hexa-lang** (`v0.240.x` · release.yml + compile-gate + edge) and **anima** (`v3.54.x` frequent
patch tags). Scope note: academic-archive/DOI/paper "releases" are explicitly OUT — c18 means real
shipped artifacts only. CLAUDE pointer c1–c17 → c1–c18.

## docs(commons): split c17 by blocker type — compiler/runtime core → ING, the rest → direct fix

c17 (upstream-fix) was "fix any upstream block directly". Split it by the kind of blocker:
- **Compiler/runtime core** (compiler/codegen · runtime.a · gen3/gen4 byteeq · toolchain build
  failure · OOM substrate) → do NOT touch directly; **hand off via ING**
  (`harness ing add <symptom+repro> --to hexa-lang`). This is a high-risk zone where multiple
  sessions dig deep concurrently, so a direct edit invites collisions/regressions — leave it on
  the board and proceed. (This session itself never touched hexa-lang's compiler core, only its
  cloud layer.)
- **Everything else** (app logic · CLI · stdlib · cloud · config · docs, i.e. outside the core)
  → still fix the upstream repo directly + land via `harness pr-cycle` (no local shim), in an
  isolated `git worktree`, STOP on concurrent-session activity.
Rationale: for the compiler/runtime substrate, ING hand-off IS the safe straight-ahead move (not
an escape hatch) precisely because of the multi-session collision risk. commons rule count unchanged.

## docs(commons): consolidate — merge c6+c11 into one ING rule, add upstream-fix rule, renumber to c1–c17

Two changes, one cleanup pass over the commons SSOT:

1. **New rule (upstream-fix)** — when work is blocked by a bug/limit/gap in an **upstream**
   dependency (esp. `hexa`/`hexa-lang`, or any dancinlab-owned repo), do NOT paper over it
   locally with a wrapper/shadow/fork/monkey-patch — go fix the upstream repo directly and
   land it via `harness pr-cycle` (proceed whenever needed; don't defer it as "someone
   else's code"). Work shared checkouts in an isolated `git worktree` and STOP on
   concurrent-session activity. Extends c1 (root cause) + the no-escape-hatch rule. This
   session's hexa cloud → ING.jsonl upstream fix (hexa-lang PR #3531) is the canonical instance.

2. **Merge (ING dedup)** — old c6 (인계/hand-off → ING) and old c11 (track in-progress → ING)
   were two rules for the **same `ING.jsonl` board**; merged into a single c6 ("ING 단일 보드 —
   진행추적 · 인계"), folding in the handoff/trail-retirement history. Removes the genuine duplicate.

Net renumber **c1–c18 → c1–c17**: with c11 absorbed into c6 and the new upstream rule appended,
the rules now read c6(ING) · c11(canonical CLI) · c12(docs+pr-cycle) · c13(papers) · c14(walls) ·
c15(pool) · c16(no escape hatch) · c17(upstream-fix). Internal cross-refs + CLAUDE.md pointer
(c1–c17) + README's two `commons c1x` refs all updated in lockstep.

## refactor(trail): retire the `trail` feature — ING is the sole progress tracker

Drop `harness trail` (the main-flow return stack persisted to `TRAIL.md`) entirely,
mirroring the earlier `handoff` retirement: progress/side-quest tracking now lives on
the repo-root `ING.jsonl` board alone (c11 add/next/done). Removed `modules/trail.ts`,
its `cli/index.ts` import + dispatch case + help line, and `TRAIL.md` from the lockdown
allow-list (`lib/config.ts`). Renumbered `config/commons.md` — the old c13 (trail) is
gone and c14–c18 shift up to **c13–c17** (now matching the long-standing `c1–c17`
header), with the three internal cross-references (c14→c13 ×2, c17→c16) updated in
lockstep. Command count 42 → 41. (Sibling repos' existing `TRAIL.md` files are their
own data — untouched; they fall out of use as the feature is gone.)

## refactor(ing): retire the `handoff` feature — ING absorbs cross-repo hand-off

- `harness handoff` (별도 `handoff.jsonl` 레지스트리 + add/ls/done/inject/snapshot) **완전 폐기**. cross-session/cross-repo 인계는 이제 ING 하나로 통합(c6 = c11 한 보드).
- **새 기능 `harness ing add <text> --to <repo>`** — 형제 프로젝트(`~/<repo>`)의 `ING.jsonl` 에 `from` 태그를 달아 직접 남긴다. 대상 repo SessionStart 에 `📥<from>` 으로 표면화(work/show inject 가 from 구분 표시). 대상 repo 부재 시 거부.
- 제거: `modules/handoff.ts` · cli `handoff` 등록/help · plugin+init `handoff inject` hook · setup hook 목록 · `lib/paths.ts` `HANDOFF_DIR` · init `.harness/handoff/` gitignore · keywords `session-handoff` tool→`harness ing`.
- 유지: `handoff-guard`(HANDOFF.md/INBOX.md/inbox/*.md 흩뿌리기 차단 — 안내를 ING 로 전환). enforcement 코드 `HANDOFF-SCATTER` 유지.
- c6 재정의: "인계는 ING 로, 흩뿌리지 말 것". 이 repo `handoff.jsonl` 3건 → ING 마이그레이션(2건 로컬 work · 1건 `--to kosmos` 전달).
- Command count 43 → 42. 검증: `tsx cli/index.ts help` 로드 OK · `ing add --to kosmos` 스모크(kosmos ING.jsonl 에 from:harness 기록) · 전 JSON valid · handoff 핵심 잔여 0.

## refactor(init): absorb the hardcore profile into the default + retire `--hardcore`

- `harness init --hardcore` 폐기. 흡수 후 **기본 init 이 곧 (구)hardcore** — strict 가 디폴트: `protectedBranches:[main,master]` · pre-push(verify + errors drain) hook · single-doc scaffolds(ARCHITECTURE.md/CHANGELOG.md/CLAUDE.md/state/) · ledger staleSec 1800 · enforcement 15룰(block-everything; `--no-verify`·force-push·destructive-git·debug-leftover·hardcoded-secret 차단) · severity fallback=block 가 전부 기본값.
- `profile` 키 제거(코드에서 읽지 않던 순수 표기). `config/enforcement.hardcore.json`·`severity-map.hardcore.json` → 기본 `enforcement.json`·`severity-map.json` 으로 승격 후 변종 삭제(8룰 → 15룰). `harness.config.hardcore.example.json`·`docs/hardcore.md` 폐기.
- `modules/init.ts`: hardcore 분기 9곳 전부 흡수(Flags·starterConfig param·ruleSrc·prefs·single-doc·pre-push·로그). prefs 단일값 = code/docs english · response korean(현행 prefs 일치).
- `cli/index.ts` help(strict by default), `README.md`(self-dogfooding), `CLAUDE.md`(tree), 코드 주석 `(hardcore)` 일반화. `harness-hardcore`(엔진 배포 브랜치명, update.ts)는 별개라 유지. self-dogfooding repo 자신은 `protectedBranches` 미설정(main 직접 push) 유지.
- 검증: temp repo `harness init` → profile 0·protectedBranches·staleSec 1800·15룰·prefs docs english·pre-push·ARCHITECTURE.md scaffold 전부 기본 생성 · `tsx cli/index.ts help` 로드 OK · 전 JSON valid · 잔여 hardcore 0.

## chore(domain): retire the `harness domain` feature — full removal

- `harness domain` (long-horizon goal/milestone tracker → `<NAME>.md` + `.tape` + `DOMAINS.tape` roster) is **fully retired**. It generated the very scattered domain `.md`/`.tape`/roster docs that c4 single-doc discipline now consolidates into a single `ARCHITECTURE.json` tree SSOT (cf. hexa-codex #161, anima #662) — keeping the scatter-generator contradicted that.
- Removed `modules/domain.ts` + its 3 wirings in `cli/index.ts` (import · help block · `case "domain"`). No other code references it.
- Command count 44 → 43 (CLAUDE.md tree). hexa `dojo <domain>`/`deck <domain>` are unrelated (hexa builtins) and untouched.
- Verified: `help` loads clean · `harness domain` → `unknown cmd` · zero residual references.

## fix(pr-cycle): 머지 후 로컬 base(main) 자동 ff-sync — 로컬 뒤처짐 방지

- 문제: `gh pr merge` 가 origin/main 만 갱신하고 **로컬 main 은 그대로** 둬, pr-cycle 반복 시 로컬 main 이 origin 보다 한참 뒤처짐 → 다음 작업 브랜치가 stale base 에서 분기.
- 수정(`modules/pr-cycle.ts`): 머지 검증(onBase) 직후 **step 4.5** 추가 — feature 브랜치에서 `git fetch origin <base>:<base>` 로 로컬 base ref 만 ff 갱신(checkout 전환·working tree 무변, non-ff 면 거부=안전). HEAD 가 base 면 `git pull --ff-only` 폴백.
- slash command(`~/.claude/commands/pr-cycle.md`)에도 동일 base-sync 블록 추가(머지 직후, sweep 전).
- commons **c14** 에 "항상 최신 base 유지 — 로컬 main 뒤처짐 금지 · 새 브랜치는 최신 base 에서 분기" 명문화.
- 검증(c2): `help` 로드 OK · pr-cycle 자기 자신 머지 사이클에서 로컬 main behind 0 확인.

## feat(state): 작업 산출물을 `state/` 단일 폴더로 통일 (scratch·verdicts 흡수)

- 요구: 실험·벤치마킹·검증 등 작업 산출물 보관을 일관화 — 흩어진 `scripts/scratch`·`.verdicts` 대신 **repo-root `state/` 폴더 하나만** 사용(하위 디렉토리 안 쪼갬).
- 변경:
  - `lib/config.ts` — `docs.scratchDir` 기본값 `scripts/scratch` → **`state`**.
  - `modules/verdict.ts` · `modules/verify.ts` · `modules/atlas.ts` — verdict/claim 기록 경로 `.verdicts/` → **`state/`** (verdict 파일 `state/<slug>/<id>.txt` · `state/claims.jsonl`).
  - `modules/init.ts` — 새 repo 스캐폴드가 `scripts/scratch/` 대신 `state/` 생성 + CLAUDE.md 템플릿 트리 갱신.
  - `.gitignore` — `build/`(재생성 가능 컴파일 결과) 추가. `state/` 는 git-tracked(`.gitkeep`). 머신 자동로그는 기존대로 `.harness/`.
- 명문화: commons **c5** 를 "산출물은 `state/` 하나로" 로 강화(흩어진 산출물 디렉토리 신설 금지) · `ARCHITECTURE.json` config 노드 + CLAUDE.md tree 에 `state/` 반영.
- 검증(c2): `help` 로드 OK · `verdict record smoke/t1` → `state/smoke/t1.txt` 🟢 생성 재현 · `verify fence` → `state/claims.jsonl` 기록 재현 · `docs status` scratch=state/ 확인 · 스모크 산출물 정리.

## docs(commons): 헤더에 ARCHITECTURE.json 선참고 안내 추가 (.md fallback 미표기)

- commons.md 헤더 문단에 `🏛️ 프로젝트 설계는 먼저 ARCHITECTURE.json 을 참고하라` 한 줄 추가 — `harness architecture inject`(SessionStart 주입) 의 설계 트리를 단일 출처로 읽고 lockstep 갱신(c4·c14)하라는 안내. 매 UserPromptSubmit 재주입되므로 매턴 상주.
- `.json` 만 명시(사용자 요청대로 `.md` fallback 은 표기하지 않음 — 이 repo 는 JSON 트리 채택).

## docs(commons): c14 매턴 마감 강제 + c11 상태변동 ING 트리거 (미완성/WIP 매턴 push 허용)

- 요구: ① 매 턴 파일이 바뀌면 그 턴에 즉시 닫기(미완성·WIP 여도 push, 다음 턴으로 미루지 않기) ② 파일이 안 바뀌어도 작업 상태가 바뀌면 ING 갱신.
- c14 강화(`config/commons.md`): **매 턴 마감(turn-close)** 조항 추가 — staged/working 변동은 그 턴에 docs+commit+push(사이클 완료면 pr-cycle)로 닫고, "완성될 때까지 묵히기" 금지. **미완성·WIP 무방** — `wip:` 커밋으로라도 매턴 push 해 작업 유실·문서 drift 방지(이 repo 정책; c2 검증은 완성 시점에 닫되 push 를 미루지 않음).
- c11 강화: **상태변동 트리거** 추가 — 파일 변동과 무관하게 작업 상태(시작·단계전환·블로커·완료·다음 한 수)가 바뀌면 그 턴에 ING add/next/done 으로 보드 현행화(ING 는 커밋 불필요).
- salience: commons inject 가 매 UserPromptSubmit 재주입하므로 두 조항 모두 매턴 컨텍스트 상주.

## feat(claudemd): 프로젝트 규칙 매턴 재주입 — CLAUDE.md 를 commons 급으로 강제

- 문제: repo-root `CLAUDE.md`(프로젝트 규칙)는 Claude Code 기본으로 **SessionStart 1회만** 주입돼, 대화가 길어지면 컨텍스트에서 묻혀 규칙이 약해진다. 반면 `commons inject` 는 매 UserPromptSubmit 재주입돼 강하다.
- 신규 `modules/claudemd.ts` + `harness claudemd {inject|show}` — `commons inject` 와 같은 운반 장치로 repo-root CLAUDE.md 를 **매 UserPromptSubmit 재주입**(MUST-FOLLOW 헤더 prepend). 프로젝트 규칙을 commons 급 salience 로 유지.
- 토큰 효율: 선택적 `<!-- enforce:start -->…<!-- enforce:end -->` 블록이 있으면 그 hard-rules 섹션만 재주입(전체 프로젝트 맵 재전송 회피), 없으면 전체. 80KB 초과 절단. CLAUDE.md 부재 시 무음.
- 배선: `cli/index.ts` 등록 + help 라인 · `modules/setup.ts` hookSpec UserPromptSubmit(commons 다음) · `plugin/hooks/hooks.json` UserPromptSubmit 추가.
- 검증(c2): help 로드 OK(import 정상) · `claudemd inject` UserPromptSubmit 모사 → 유효 envelope(MUST-FOLLOW 헤더) · `enforce` 마커 추출(맵 제외, RULE 블록만) 재현 · 이벤트/파일 부재 시 무음 확인.

## docs(commons): c18 신설 — 우회경로는 지시 전 작성 금지 (escape-hatch only on request)

- 계기: G-RAW-GPU-CLOUD 차단을 만들 때 AI 가 임의로 `# cloud-ok` 탈출구를 끼워 넣어 "전면 금지" 가 안 됐던 사례 → 거버넌스 규칙으로 박제.
- 신설(`config/commons.md` c18): 유저가 **명시적으로** 요청하기 전에는 구현 시 우회경로(exception/bypass 마커 · opt-out 플래그 · skip 조건 · fallback 분기 · 가드 무력화 탈출구)를 만들지 않는다. 금지·차단 요청은 글자 그대로 전면 차단으로 구현. c1(shadow 가드 금지)·c3(anti-punt)·c9(정직)의 연장선.
- 기존 마커 탈출구(force-push `# force-ok` 등)는 유지, **새로** 만드는 차단·가드·정책에만 적용.

## fix(enforcement): G-RAW-GPU-CLOUD 를 warn→block(전면차단) 승격 — runpod/vast 직접 사용 금지, hexa cloud 강제

- 요구: runpod·vast 의 CLI·API 직접 사용을 **전면 금지**(예외 없음)하고 GPU 클라우드 작업을 `hexa cloud` 로 강제 (commons c12 의 mechanical teeth).
- 변경(`config/enforcement.json` G-RAW-GPU-CLOUD): `action` warn→**block** 승격(이전엔 경고만 하고 통과) · `match` 패턴에 `pip install runpod|vastai` SDK 설치 경로 추가 · `exceptions` 를 **빈 배열로** 비워 `# cloud-ok` 탈출구 제거(마커가 있어도 차단) · `reason` 에 "전면 금지·예외 없음" 명시.
- 커버: `runpodctl`·`runpod`·`vastai` CLI · `pip install runpod|vastai` · `curl|wget` 로 `runpod.io|vast.ai` API 엔드포인트 호출. 정책 변경은 이 규칙을 직접 수정해야만 가능(인라인 우회 불가).
- 검증(c2): JSON valid · `pre bash` 로 runpodctl·vastai·`pip install runpod`·`curl api.runpod.io`·`runpodctl # cloud-ok` 5종 모두 `{"decision":"block"}` 재현 · `hexa cloud run …` 만 통과 확인.

## fix(pool): `status` 에 🔓 제한-해제 마커 추가 — 해제된 제한 호스트를 공용과 구분

- 증상: anima 컨텍스트(cwd 에 `anima` 세그먼트)에서 `pool status` 를 돌리면 akida 가 진짜 공용 호스트(aiden·summer)와 똑같은 🟢 로 떠, "잠금인지 아닌지" 구분이 안 됨. `list` 는 이미 `🔓 허용(via)` 으로 구분하는데 `status` 만 누락.
- 근본 원인(c1): 게이트는 설계대로 동작(akida `shared:false`+`allow:["anima"]` → anima 경로면 in-context 해제) — 버그가 아니라 **status 출력 레이어의 정보 결손**. 해제된 제한 호스트를 bare 🟢 로 뭉갬.
- 수정: `modules/pool.ts` status 출력부 — guard 통과한 제한 호스트(`isRestricted`)는 🔓 마커 + `— 제한 호스트 · 현재 해제(via)` 주석으로 표기. 도달 불가 시 ` · 도달 불가` 부기. roster·gate 로직 무변경(표시 레이어만).
- 검증(c2): `help` 로드 OK · harness cwd → akida 🔒 차단 · anima cwd → `🔓 akida … 현재 해제(in-context)` 양쪽 재현.

## feat(architecture): SessionStart 에 ARCHITECTURE.json 자동 주입 (CLAUDE.md 처럼)

- 신규 `modules/architecture.ts` + `harness architecture {inject|show}` — SessionStart 에서 repo-root `ARCHITECTURE.json`(우선)/`.md` 를 additionalContext 로 주입. CLAUDE.md 처럼 첫 턴부터 설계 SSOT(c4·c14)가 컨텍스트에 상주해, 매번 파일을 열지 않아도 최종 아키텍처를 참조·lockstep 갱신할 수 있음.
- JSON 우선(c4 — AI·툴 파싱 타깃). 80KB 초과 시 head+포인터로 절단해 컨텍스트 폭주 방지. 파일 부재·이벤트 없음 시 무음(다른 inject 와 동일 가드).
- hook 배선: `cli/index.ts` 등록 + help 라인 · `modules/setup.ts` hookSpec SessionStart · `plugin/hooks/hooks.json` SessionStart 에 `harness architecture inject` 추가 (commons·recommend 다음, worktree gc 앞).
- 검증(c2): `architecture inject` SessionStart 모사 → 유효 envelope JSON, additionalContext 8904자(미절단) · 이벤트 없음 시 무음 · `help` 로드 OK · hooks.json valid.

## docs(commons): c16 도입부 정정 — "한 번 시도"가 아니라 MULTI-LENS(≥2–3 렌즈) 이상

- c16 도입부가 "다른 렌즈로 돌파를 **한 번은** 시도하고서야 terminal" 로 약하게 쓰여 있던 것을 정정: terminal 로 받으려면 **MULTI-LENS(≥2–3 원리적 렌즈) 이상** 돌파를 시도하고 각각 통제(shuffle/ablation/negative-control)로 기각된 뒤에야 받아들인다 — **한 번 시도로 끝내지 않는다** (단일 렌즈 한 번 막힘은 미완). (d)천장 항목과 도입부의 강도를 일치시킴.

## docs(commons): c16 — 벽 분류(taxonomy) 5종 + MULTI-LENS·ablation 천장확정 + 법칙도 벽

- anima `a_break_the_wall` 거버넌스를 project-agnostic 으로 일반화해 commons c16 을 강화. 기존 "다른 렌즈로 한 번은 돌파 시도" 골격 위에 벽 **분류 우선** 체계를 추가:
  - (a) 틀린 측정/metric-artifact · (b) 틀린 방향/변수 혼재 · (c) substrate/인프라 벽 · (d) 진짜 천장/중복 · (e) 투자 부족 — 종류마다 돌파법·난이도가 다름.
  - (c) **인프라/측정 벽을 과학·성능 천장으로 박제 금지** — 근본수정(c1) 대상, substrate 가 돈 뒤에야 verdict.
  - (d) **CONFIDENT-terminal 은 MULTI-LENS** — 다른 원리적 렌즈 ≥2–3개를 각각 통제(shuffle/ablation/negative-control)로 기각한 뒤에야 천장 확정. ablation 동일 → 메커니즘 INERT.
  - (e) 투자 부족 → c17 대로 pool/`hexa cloud` 분산.
  - **LAW(법칙)도 벽** — 사후맞춤 descriptive 법칙은 새 케이스 frozen 예측 + 실측 falsify 후에만 확정.
- tune-to-green 금지(c9·p7) · frozen-first + 대조 원칙은 유지.

## feat(pool): `specs` — 호스트별 코어·메모리·GPU 프로브 + 인라인 표기

- 신규 `harness pool specs [name]` — 각 공용 호스트를 ssh 로 프로브해 **코어 수·총 메모리(GiB)·GPU 모델**을 수집하고 로스터(`~/.harness/pool.json`)의 `Host.specs` 에 캐시. 한 호스트만 지정(`specs <name>`)도 지원.
- 프로브는 POSIX-sh 단일 라인(`CORES=…|MEM=…|GPU=…`) — Linux(`nproc`·`/proc/meminfo`·`nvidia-smi`)와 macOS(`sysctl`·`system_profiler`) 양쪽 대응. 단일따옴표 awk/sed 로 원격 필드변수(`$2`) 보호, `${...}` 미사용으로 ssh verbatim 전달 안전.
- `list`·`status` 가 캐시된 스펙을 `〈12c · 30G · GPU:RTX 5070〉` 형태로 인라인 표기. `list` 는 미수집 시 `pool specs` 안내 1줄 출력. GPU 없으면 `GPU:없음`.
- `shared:false` **제한 호스트(akida·ghost)는 프로브하지 않음** — on/status 차단과 동일하게 공용 자원만 건드림.
- 검증(c2): `harness pool specs` 실동작 — aiden·summer 각 `12c · 30G · GPU:NVIDIA GeForce RTX 5070` 수집, akida·ghost 차단(프로브 안 함) 확인. `list`·`status` 인라인 반영 + `npx tsx cli/index.ts help` 로드 OK.

## docs(commons): c17 — 무거운 작업은 pool(공유 컴퓨트)에서 분산 실행

- 신규 always-on 규칙 **c17** 추가: 빌드·테스트·대규모 스윕·장시간 연산 등 무거운 작업은 로컬 단일 머신에 몰지 말고 `harness pool` 로 등록된 공유 컴퓨트 호스트에서 돌린다(`pool on`/`bg`/`route`/`status`). `shared:false` 제한 호스트는 공유 풀로 쓰지 않음(가드 차단). GPU·학습은 c12 대로 `hexa cloud`/`hexa dojo` 우선.
- CLAUDE.md SSOT 참조 `c1–c16` → `c1–c17` 갱신.

## chore(governance): GPU/학습/deck 강제를 hexa 빌트인으로 전환 · demi 폐기

- **cloud**: GPU 클라우드 권장 도구를 `harness pod` → **`hexa cloud`** 로 전환. keywords `gpu-cloud-pod`→`gpu-cloud-hexa` (tool=`hexa cloud`, hint 갱신), enforcement `G-RAW-GPU-CLOUD` reason/exception(`# pod-ok`→`# cloud-ok`)도 hexa cloud 로. runpod/vast raw 차단 룰 자체는 유지.
- **deck**: 신규 keywords `input-deck` 트리거 추가 (deck·빵틀·input deck → **`hexa deck <domain> <slug> '<spec>'`**). `hexa deck` 이 hexa-lang upstream 에서 1급 서브커맨드로 승격됨(PR #3453)에 따라 강제 가능해짐.
- **dojo**: 학습잡 권장 도구를 `harness dojo` → **`hexa dojo <domain> <slug> '<spec>'`** 로 전환 (keywords `training-job` hint 갱신).
- **demi 폐기**: 실수로 구성됐던 `design-architecture` keywords 트리거(→`harness demi`) 제거. demi 는 harness 엔진 모듈로 존재하지 않았고(트리거로만 강제) 설계 작업을 특정 도구로 강제할 근거 없음 → 트리거 삭제로 폐기.
- commons c12 전면 갱신: GPU·학습·deck = hexa 빌트인 명시, demi 제거, "폐기된 hexa cloud" 표현 삭제(이제 권장), `hexa` 글로벌 PATH 사용 추가.
- 검증(c2): keywords/enforcement JSON valid · demi 0건 · `harness prompt` 로 deck/cloud/dojo 트리거가 hexa 힌트 발화 + 설계 키워드 무발화(demi 폐기) 출력 확인 · `hexa deck` 머지된 toolchain 에서 실동작(rc=0, 6 domains).

## fix(ing): `done <id>` no longer mass-scrubs the board (substring → exact-id match)

- **데이터 유실 버그**: `modules/ing.ts` 의 `done` 이 `r.id === m || text.includes(m)` 로 매칭 — `done 1` 시 `text.includes("1")` 가 텍스트에 숫자 1이 든 **모든 항목**(H_1382·303M·id=12…)을 매칭해 보드 전체를 scrub. 텍스트에 숫자가 흔한 ING 에선 단일 id done 이 OPEN 항목까지 통째로 날림(anima 세션 2회 재현 + main merge 로 빈 ING 전파).
- **근본 수정**: id 정확매칭(`r.id === m`)을 **우선**. id 매칭이 없을 때만 text substring fallback 을 쓰되 **정확히 1건일 때만** 삭제 — 여러 건 매칭이면 거부(`모호 — 정확한 id 로 지정`)해 느슨한 term 의 대량 scrub 을 차단. pod 은 종전대로 제외.
- 검증(c2): 텍스트에 "1"이 든 3건 보드에서 `done 1` → id=1만 삭제(1건), #2·#3 유지 · `done 99` → 거부 · `done korean`(1건 매칭) → 삭제. 출력으로 확인.
- ARCHITECTURE.json L4 modules 에 `ing` 노드 추가(종전 누락).

## fix(doc-gate): pr-cycle gates ARCHITECTURE.json (not just .md) + adds ING.jsonl 현행화

- `modules/pr-cycle.ts` doc-gate 가 `ARCHITECTURE.md` 만 하드코딩하던 걸 **`ARCHITECTURE.json` 우선**(없으면 `.md`)으로 일반화 — lint.ts 와 동일 패턴. 의미있는 변경에 ARCHITECTURE(존재 형식) 미동반이면 거부.
- **신규 ING gate**: `ING.jsonl` 이 tracked 인 repo 는 사이클 변경 시 `ING.jsonl` 현행화(완료분 `harness ing done` / 다음 단계)도 함께 staged 안 됐으면 pr-cycle 거부. 진행상황이 매 사이클 따라오게 강제.
- commons c14: 사이클 문서 목록에 `ING.jsonl` 추가, doc-gate 거부 조건에 ING 포함. ARCHITECTURE.json `lint` 노드 상세도 현행화.
- 검증: `python3 json.load` PASS · `harness lint fast` = ok (pr-cycle.ts 컴파일 PASS).

## feat(architecture): serve.py — 로컬/LAN 뷰어 서버 (ghost 등 다른 기계에서도 접속)

- **신규 `serve.py`** — `python3 serve.py [port] [--no-open]`. `ARCHITECTURE.html`이 있는 디렉토리에서 정적 서버를 띄우고(`file://` fetch 차단 우회) 브라우저를 자동으로 연다. 포트 기본 8000, 사용 중이면 다음 포트 안내.
- **LAN 노출**: `0.0.0.0` 바인딩이라 같은 네트워크의 다른 기계(예: ghost `192.168.50.150`)도 접속 가능. 시작 시 이 기계의 LAN IP를 자동 탐지해 `http://<IP>:<port>/ARCHITECTURE.html` 안내를 출력(`--no-open`은 헤드리스용).
- `ARCHITECTURE.json`에 `viewer` 그룹(ARCHITECTURE.html · serve.py) + `serve` 메타 추가. README·commons c4에 로컬 보기(`python3 serve.py`) / 원격 보기(raw.githack.com · GitHub Pages) 명시.
- 검증: 헤드리스 기동 후 `localhost`·실제 LAN IP(192.168.50.39) 양쪽에서 `ARCHITECTURE.html`(text/html)·`ARCHITECTURE.json`(application/json) 200 + IP 안내 출력 PASS.

## docs(architecture): ARCHITECTURE.md → ARCHITECTURE.json (tree SSOT) + ARCHITECTURE.html (viewer)

- **신규 SSOT `ARCHITECTURE.json`** — 아키텍처를 산문(.md) 대신 **컬럼형 재귀 트리**로 표현. 노드마다 명시적 컬럼 키(`이름`·`역할`·`구분`·`상세`) + `children`. 상단 `columns[]`가 표시 열 순서를 정의(`tree:true` 컬럼이 가지 렌더). JSON이 단일 진실원 — AI/툴은 파싱, 사람은 뷰어로 본다.
- **신규 뷰어 `ARCHITECTURE.html`** — 의존성 0 자립형. `ARCHITECTURE.json`을 fetch해 컬럼 그리드 트리로 렌더(접기/펼치기·전체 검색·다크모드). `file://` fetch 차단 시 드래그&드롭 fallback + `python3 -m http.server` 안내. 데이터는 일절 안 들고 있음(SSOT는 json).
- **`ARCHITECTURE.md` 삭제** — 내용은 전량 json으로 이전(+ git history 보존).
- **lint doc-gate 일반화** (`modules/lint.ts`): 하드코딩 `ARCHITECTURE.md` → `ARCHITECTURE.json`이 있으면 그걸, 없으면 `.md`를 게이트. 둘 중 존재하는 형식만 현행화 강제. rule 이름(`ARCHITECTURE-MISSING`)은 유지.
- **commons 갱신** (`config/commons.md` c4·c14): ARCHITECTURE SSOT가 `.md` 산문 또는 `.json` 트리[+`.html` 뷰어] 중 택1임을 명시. README의 ARCHITECTURE 참조도 json/html로 갱신.
- 검증: `python3 json.load` PASS · flatten 시뮬 60행/4컬럼·트리 가지(`├─└─│`) 정렬 PASS.

## fix(pool): remote ssh command no longer expands locally — argv exec, not shell string

- `pool on <host> <cmd>` 가 `execShell` 으로 `ssh ... "remotecmd"` 전체 문자열을 **로컬 mac 셸(`bash -lc`)** 에 통과시키던 버그. ssh 가 보내기 *전에* 로컬 셸이 `$VAR`/`$(...)`/백틱을 먼저 전개 → `harness pool on aiden 'echo $(hostname)'` 가 원격 호스트가 아니라 **mac 의 hostname** 을 출력하고, 셸 변수는 로컬에서 빈 값으로 사라짐.
- 수정: `modules/pool.ts` 의 `SSH` 상수(공백조인 문자열)를 `SSH_ARGS` argv 배열로 바꾸고, `on`/`status` 의 ssh 호출을 `execArgs("ssh", [...SSH_ARGS, h.target, cmd], opts)` 로 전환 — ssh 바이너리를 직접 spawn(로컬 셸 없음). `cmd` 를 단일 argv 원소로 넘기므로 로컬 전개가 일어나지 않고, ssh 가 원격 로그인 셸로 그대로 전달해 거기서 전개(파이프 `| sudo tee`·리다이렉트 `>> file` 도 원격에서 정상 동작).
- 가드(제한 호스트 차단)·list/status 출력·pool.json 은 무변경. 검증(aiden): `echo REMOTE_$(hostname)` → `REMOTE_aiden-B650M-K` (mac 아님) · `echo hi | tr a-z A-Z` → `HI` · `echo OK` → `OK` · 비-anima cwd 에서 `on akida` → 차단(exit 1, 차단됨) PASS.

## feat(pool): enforce restricted hosts — private/research machines blocked from shared pool use

- `pool.json` 의 `shared:false` 플래그가 그동안 **로스터에 적혀만 있고 강제되지 않았음** (`Host` 인터페이스가 `name`/`target` 만 읽음) → 어느 repo 에서든 `harness pool on akida` 가 통과돼 anima 연구 전용 머신이 공용 컴퓨트로 사용됨.
- `modules/pool.ts` 에 가드 추가: `shared:false` = **제한 호스트**. `allow:[...]` 프로젝트 마커(cwd 경로 세그먼트, 대소문자 무시·정확한 세그먼트 매칭이라 `anima` 가 `animation` 에 안 걸림)와 현재 위치가 일치할 때만 허용. 불일치 시 `on` 차단(ssh 전 `loudFail`+exit 1) · `status` 는 ping 안 하고 🔒 표시 · `list` 는 🔓허용/🔒차단 + 허용 프로젝트 표기.
- 의도적 일회성 override 는 env `HARNESS_POOL_ALLOW="<name> ..."` (loud · 우연한 공용사용 아님). `allow` 없는 제한 호스트(ghost=개인 시스템)는 어느 프로젝트에서도 차단.
- `~/.harness/pool.json` 의 akida 에 `allow:["anima"]` 부여. 검증: dancinlab/harness 에서 `on akida`/`on ghost` → 차단(exit 1) · `on aiden` → 통과 · `/tmp/anima/sub` 에서 `on akida` → 통과 · env override → list 🔓 모두 출력 PASS.

## feat(verify): tier-rubric claim verification (sidecar parity) · old verify → `ci`

- **rename**: 기존 `harness verify`(설정된 빌드/테스트 검증명령 병렬 실행) → **`harness ci`**. config 키는 호환 위해 `verify.checks` 그대로. 로그 kind `verify`→`ci`. 문서/keywords/commons/enforcement 의 `harness verify` 참조 일괄 `harness ci` 로 치환.
- **신규 `harness verify`** = sidecar verify 이식 — 6단계 티어 루브릭(🔵 SUPPORTED-FORMAL · 🟢 NUMERICAL · 🟡 BY-CITATION · 🟠 INSUFFICIENT · 🔴 FALSIFIED · ⚪ SPECULATION-FENCED) + 규율(LLM 자가판정 금지·배지 verbatim·자동승격 금지·honesty-triad). `verify rubric`(루브릭 출력) · `verify fence "<claim>"`(⚪ 박제 → `.verdicts/claims.jsonl`) · `templates/verify.md` 런북. hexa 의존 form(`<id>`·`--expr`)은 범용 harness 에서 제외.
- commons c12 에 `harness ci`(검증명령)·`harness verify`(주장검증) 추가. 검증: `ci list`·`verify rubric`·`verify fence` 동작 + 엔진 로드 PASS.

## feat(lint): doc-gate at commit time too — ARCHITECTURE·README·CHANGELOG enforced every task

- pre-commit `harness lint` 에 doc-gate 추가: 의미있는 코드 변경이 staged 인데 `CHANGELOG.md` / (존재 시) `ARCHITECTURE.md`·`README.md` 가 같이 staged 안 됐으면 **commit 차단**. 기존엔 `pr-cycle` 시점에만 강제됐으나, 이제 pr-cycle 을 거치지 않는 모든 작업/커밋에도 동일 강제. 신규 룰 `ARCHITECTURE-MISSING`·`README-MISSING` = block (severity-map). 우회: `git commit --no-verify`.
- commons c14 에 "매 커밋 lint 에서도 발화" 명시. README·ARCHITECTURE 의 lint/doc-gate 설명 현행화.

## feat(domain): long-horizon goal/milestone tracker (sidecar parity)

- `harness domain` 추가 — 장기 목표·마일스톤 추적. `<NAME>.md`(snapshot: `@title:`·`@goal:`·`- [ ]`/`- [x]` 마일스톤) + `<NAME>.tape`(append 로그) + `DOMAINS.tape`(roster `@domain NAME := "./path"`) + `.harness/domain-active`(repo-local active 포인터). verbs: init·set|`<NAME>`·list|ls[--sync]·goal·ms|milestone·title·done `<match>`·absorb `<file>`[--state]·todo|new·bare(show). NAME = UPPERCASE/digit 시작 [A-Z0-9+-]+ (`_` reject, `+` 메타도메인 e.g. `RTSC+HTS`).
- 구현: `modules/domain.ts` + cli 등록. sidecar `skills/domain/_domain.hexa`(1565 LOC hexa) → harness ts 이식, active store 는 세션별 tsv 대신 repo-local 단일 파일로 단순화. ing(작업)·trail(곁가지)와 층위 구분: domain=장기 목표/마일스톤.
- 검증: 임시 repo 에서 init→goal→ms×3→done(▓░░░░ 25%)→list(★active)→bare-name 전환→absorb(포인터 교체)→`_` reject 전부 PASS.

## feat(setup): install-hooks enables SendMessage (agent-teams) by default

- `harness install-hooks [--global|--repo]` 가 hook 배선과 함께 `settings.json` 의 `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 을 세팅 — 백그라운드 subagent 에 `SendMessage`(Claude Code 실험 agent-teams)를 기본 활성화. 키가 이미 있으면 사용자 값 보존(덮어쓰지 않음). 검증: 신규 settings → flag=1, 기존 `"0"` → 재실행해도 보존.
- 배경: 실행 중 백그라운드 에이전트에 메시지를 못 붙이는 문제(SendMessage 미가용)를 신규 설치 시점에 자동 해소. ghost·mini 는 수동 적용 완료.

## feat(gap): multi-axis gap exploration runbook (sidecar parity)

- `harness gap [full|list|<scope>]` 추가 — 현재 작업을 40개 돌파전략 렌즈(8 family: Math-Structural·Adversarial-Stress·Economic-Resource·Epistemic-Evidence·Convergence-Closure·Simplicity-Canonical·Temporal-Dynamics·Coverage-Consistency)로 훑어 gap 을 표면화. 3모드: bare=mode C(40렌즈 인라인 트리아지 → hot family 만 subagent deep-dive) · `full`=mode A(family당 subagent fan-out, 트리아지 생략) · `list`=카탈로그 출력. surface·prioritise 만 하고 fix 안 함.
- 구현: `templates/gap.md`(런북 본문, sidecar `commands/gap` 이식) + `modules/runbooks.ts` runGap + cli 등록. DESIGN.log→ARCHITECTURE/CHANGELOG, subagent=Agent tool(Explore/general-purpose)로 harness 맥락 조정. 검증: 8 family·42 bullet(occams-razor F4·F6 중복) 출력 + args 힌트 확인.

## feat(pr-cycle): doc-gate also requires README.md current-info each cycle

- pr-cycle doc-gate 에 README.md 추가: 의미있는 변경 시 README.md(repo 에 존재하면) 미갱신이면 ARCHITECTURE 와 동일하게 **거부**. 매 사이클 README 최신정보 유지 강제. commons c14 문구도 README 포함으로 갱신.
- 검증: 이 PR 자체가 새 게이트를 통과(CHANGELOG+ARCHITECTURE 불필요·README 갱신 동반). `--no-doc` 우회 보존.

## docs(commons): c16 — break through walls (closed-negative ≠ terminal)

- mini 세션에서 작성된 c16 을 repo SoT 로 반영: 벽(closed-negative·블로커)에 부딪히면 다른 메커니즘·각도·렌즈로 돌파를 한 번은 시도한 뒤에야 terminal 로 인정. 단 tune-to-green 금지(c9·p7) — 돌파는 사전등록(frozen-first)+대조(shuffle/dissociation/negative-control)로 검증된 진짜 새 각도라야 하고, 진짜 시도 뒤의 정직한 terminal 도 유효한 결과. CLAUDE.md SSOT 참조 c1–c16 로 갱신.

## feat(enforce): warn on raw runpod/vast CLI·API → steer to `harness pod`

- `pre bash` 규칙 G-RAW-GPU-CLOUD 추가: `runpodctl`/`runpod`/`vastai` CLI 또는 `runpod.io`/`vast.ai` 로의 curl/wget/http 직접 호출 감지 시 **warn(유도)** — GPU 클라우드는 `harness pod` 런북으로 가도록 안내. block 아님(되돌리기·유도 성격). 의도적이면 `# pod-ok <이유>` 마커로 예외.
- 검증: runpodctl·vastai·curl runpod API 모두 warn 발화, `# pod-ok` 예외 침묵, "vast number" 류 오탐 없음(vastai 만 매칭, vast 단독 제외).

## feat(enforce): pod/demi/dojo to sidecar level (keyword triggers + c12)

- GPU 클라우드(`harness pod`)·설계(`harness demi`)·학습잡(`harness dojo`) 사용을 hint 가 아닌 **keywords 트리거**로 강제 — sidecar 수준. `config/keywords.json` 에 gpu-cloud-pod(gpu/runpod/vast/파인튜닝/hexa cloud…→pod), design-architecture(아키텍처 설계…→demi), training-job(학습잡/dojo…→dojo) 3룰 추가. UserPromptSubmit hook 매칭 시 자동 발화.
- commons c12 목록에 pod/demi/dojo 추가 + "수동 runpod·vast·train 스크립트" 안티패턴 명시. 검증: 세 트리거 모두 `harness prompt` 에서 발화 확인.

## fix(pr-cycle): strip own flags before `gh pr create`

- `pr-cycle --no-doc` 가 `--no-doc` 를 `gh pr create` passthrough 에 그대로 넘겨 `unknown flag` 로 실패하던 버그. pr-cycle 자기 플래그(OWN_FLAGS)는 passthrough 에서 제외. push 단계는 영향 없었음.

## docs(commons): c15 — no proactive papers before explicit ask

- commons 에 c15 추가: 유저가 명시적으로 논문/arXiv/레퍼런스/선행연구를 요청하기 전에는 논문을 먼저 언급·제시·추천·인용하지 않는다. 일반 응답에 곁다리 논문 나열 금지, `harness research` 도 유저 지시 시에만. CLAUDE.md SSOT 참조도 c1–c15 로 갱신.

## feat(lockdown): L0 is opt-in — none until designated + `harness lockdown` 관리 명령

- **DEFAULT 변경**: `lib/config.ts` DEFAULTS 에서 `lockdown.fromMarkdown: "CLAUDE.md"` 제거 → config 없는 repo 는 **L0 0개**(별도 지정 전엔 없음). 기존엔 CLAUDE.md 의 🔴 L0 블록을 자동 스캔해 L0 가 암묵적으로 생겼음(CLAUDE.md 자체 포함 가능) — 이제 OFF. markdown 스캔은 `lockdown.fromMarkdown` 을 명시한 repo 만 opt-in.
- **`harness lockdown` 신규 명령** (`modules/lockdown-cmd.ts`): `status`/`list` 조회 · `add <path...>` 지정 · `rm <path...>` 해제 · `check <path>` 판정. add/rm 은 `harness.config.json` 의 `lockdown.files` 를 다른 키 보존하며 갱신.
- 검증: 임시 repo 에서 🔴 CLAUDE.md 블록이 있어도 기본 NONE · add→config 기록→check L0→rm→NONE 라운드트립 PASS. harness-build 자체(명시 5파일)는 그대로 유지, CLAUDE.md 는 `not L0` 확인.

## docs(commons): c12 — prefer global `harness`, avoid stale `.harness-engine`

- 버그: repo `.harness-engine`(서브모듈) 핀이 stale 하면 global recommend default(완성도)를 못 읽어 `resolve-mode auto` 가 4축 balanced 로 떨어짐(글로벌 harness 는 정상). mini hexa-lang `.harness-engine` 49866ad → 최신 bump 으로 즉시 해소.
- c12 강화: 항상 PATH 글로벌 `harness` 사용, stale 가능한 `.harness-engine/bin/harness` 직접 호출 지양. 최신화 `harness self-update`.

## docs: root CLAUDE.md for the harness repo (self-dogfood c4)

- harness repo 자체에 루트 `CLAUDE.md`(프로젝트 설명 + 트리구조·노드별 설명 + SSOT 링크) 추가 → 자기 규칙(c4 메인 CLAUDE.md) 준수, lint `CLAUDE-MD-MISSING` 경고 해소.

## fix: single architecture SSOT at root — consolidate + enforce (둘 다 금지, 루트에만)

- harness-build 자체를 단일 SSOT 로 정리: `docs/architecture.md` → 루트 **`ARCHITECTURE.md`** 이동, guides·README 참조 갱신.
- **DOC-ARCH-NONROOT 가드**: `pre write` 에서 루트 외 architecture 문서(`docs/architecture.md`·`sub/ARCHITECTURE.md` 등) 생성 차단 → 루트 `ARCHITECTURE.md` 단일 SSOT 로 통합 유도. (아키텍처를 두 곳에 두는 것 금지.)

## feat: pr-cycle doc-gate — ARCHITECTURE.md도 매 사이클 필수 (존재 시)

- doc-gate 를 "권장"에서 **차단**으로 승격: repo 에 `ARCHITECTURE.md`(최종 아키텍처 SSOT)가 있으면 매 의미있는 사이클마다 갱신 없으면 CHANGELOG 와 함께 **거부**. 누락 문서 목록을 한 줄로 표시. (`--no-doc` 우회.)
- commons c14 문구도 ARCHITECTURE 필수로 갱신. (gate 는 루트 `ARCHITECTURE.md` 존재 여부로 판단 — 없는 repo 는 CHANGELOG 만.)

## feat: pr-cycle doc-gate + commons c14 — every cycle = docs + verified merge

- pr-cycle 에 **doc-update 게이트** 추가: 이번 사이클(origin/<base>...HEAD) 에 의미있는 변경이 있는데 `CHANGELOG.md` 갱신이 없으면 push 전 **거부**(`--no-doc` 로만 우회). `ARCHITECTURE.md`(SSOT) 존재 시 미갱신이면 권장 안내.
- commons **c14** 추가: 매 작업 사이클 = ① 문서(CHANGELOG append + 설계변경 시 ARCHITECTURE) ② `harness pr-cycle` 로 검증된 main 머지. 커밋만 쌓기/문서 없이 머지 금지.

## feat: pr-cycle — relay-verbatim Korean merge report block

- 최종 출력을 "✅ <base> 머지 완료 — 검증됨 / 상태 / 머지 커밋 → origin/<base> 포함 확인 / 최신 / PR #" 블록으로 (새 세션 에이전트가 그대로 복사해 보고하도록). 미검증 시 "⚠ <base> 머지 미검증 — 수동 확인 필요".

## feat: pr-cycle — verified merge confirmation + CI-retry + method fallback

- 머지 후 **실제 origin/<base> 에 올라갔는지 검증**: `gh pr view` 로 state·mergeCommit·base·PR# 조회 → `git fetch` + `git merge-base --is-ancestor <sha> origin/<base>` 로 확인 → `✅ MERGED → <base> @ <sha> (PR #N) · ✔ verified` 명확 블록 출력 ("PR #N 머지" 만 떠서 main 반영 여부 불명확하던 문제 해결).
- CI 대기(required status/pending/UNSTABLE) 시 20s 간격 12회 폴링-재시도.
- 머지방식 disallowed 시 `--squash → --merge → --rebase` 자동 fallback (레포별 룰셋 차이 대응).
- 검증 실패 시 `⚠ could NOT verify … check manually` 경고 + exit 비정상.

## docs(commons): add c13 (trail — main-flow return stack)

- commons.md 에 c13 추가 — 곁가지로 샐 때 `harness trail push`, 복귀 시 `pop` (repo-root TRAIL.md, git-tracked). 곁가지 타다 원래 작업 잊는 것 방지, 스택 깊어지면 복귀 우선.

## docs(commons): add c11 (ING in-progress tracking) + c12 (use the harness CLI)

- commons.md 에 c11 추가 — 다단계/장기 작업은 `ING.jsonl`(`harness ing add/next/pod`, done=scrub)에 추적, SessionStart 표면화.
- c12 추가 — 같은 일은 harness 명령으로(imagine·research·watch·pool·lsp·secret·sbs·micro-exp·verdict), raw/우회·폐기된 sidecar/hexa-cloud 습관 대신 harness 우선. (에이전트가 harness 기능을 안 쓰고 우회하던 문제 대응.)

## feat: Claude Code plugin package (marketplace) — reload via /plugin

- harness 를 **Claude Code 플러그인**으로 패키징: `.claude-plugin/marketplace.json`(마켓 "harness") + `plugin/.claude-plugin/plugin.json` + `plugin/hooks/hooks.json`(전역 `harness` CLI 를 guard 와 함께 호출). sidecar 처럼 `/plugin` 으로 reload·enable/disable 관리 가능.
- 설치: `claude plugin marketplace add ~/.harness/cli` → `claude plugin install harness@harness`. settings.json 직접 주입(install-hooks)과 **택일** — 플러그인 쓰면 `harness install-hooks --uninstall` 로 settings 훅 제거(중복발동 방지).
- `harness install-hooks --uninstall` 추가 (settings.json 에서 harness 훅 제거).

## feat: install-hooks (global) + self-update — harness fires everywhere (plugin-equivalent)

- 문제: harness 훅이 repo별 `.claude/settings.json` 에만 있어 (gitignore/미클론/미-init 시) **무시됨**. 이전 sidecar 는 전역 플러그인이라 항상 발동했는데 제거됨 → mini 전역 훅 0개 → 아무것도 안 걸림.
- **`harness install-hooks [--global|--repo]`** — `~/.claude/settings.json`(전역, 기본)에 harness 훅 블록(PreToolUse pre bash/write/askq · PostToolUse post edit · UserPromptSubmit prompt+commons+recommend+prefs+easy inject · SessionStart commons/recommend/worktree gc/handoff/ing inject)을 merge → **모든 세션/repo 에서 발동**(전역 플러그인 등가). 기존 비-harness 훅 보존, 재실행 시 harness 항목 dedup. 전역 `harness` 가 PATH 에 있어야 함.
- **`harness self-update`** — 이 바이너리가 실행되는 CLI clone(예: `~/.harness/cli`)을 최신 main 으로 git-pull. (repo 의 submodule 은 `harness update`.)
- 적용: mini·ghost 전역 훅 설치 + `~/.harness/cli` 최신화 완료.

## feat: commons — always-on cross-project governance SSOT

- **`harness commons {inject|show}`** — 프로젝트-무관 거버넌스 규칙(c1~c10: root-cause·verify·anti-punt·single-doc·preserve·handoff·git-safety·4축추천·honesty·surgical)을 번들 `config/commons.md` 에서 매 턴 inject(UserPromptSubmit) → 컨텍스트에서 안 사라짐. repo override: `.harness/commons.md`.
- 규칙들은 harness 훅(pre write root-cause·docs·tmp-guard·handoff-guard·git-guard·verify·recommend·askq)이 기계적으로도 강제 — commons 는 그 단일 살라이언스 SSOT.

## feat: ing — jsonl board + SessionStart inject (잘 안 쓰이던 ING 개선)

- ING.md → **repo-root `ING.jsonl`** (한 줄 1항목, 기계가독·append/scrub). kinds: work·next·pod.
- `done <id|match>` = **scrub**(완료분 제거 → CHANGELOG 로 졸업, ING 은 active 만 보유). 비면 파일 삭제.
- **`ing inject`**(SessionStart): 진행중 작업 + running pod 를 매 세션 표면화 → 패시브 .md 라 안 쓰이던 문제 해결. 비었으면 무음. init SessionStart 와이어.
- verbs: show·add·next·done·pod{add|rm|list}·inject.

## feat: askq-text — deny AskUserQuestion option-box, ask in plain chat (sidecar askq-text parity)

- **`harness pre askq`** (PreToolUse(AskUserQuestion), `config.askqText` 기본 on) — 화살표 옵션-트리 박스(문의선택지) 호출을 deny + 에이전트에게 "질문을 평문 채팅으로 다시 하라(옵션은 인라인 bullet + 추천 표시, 자유 답변 허용)" 지시. FORM 리다이렉트(질문 자체는 허용) — bypass(안 물어봐도 될 걸 안 묻기)와는 구분. ExitPlanMode 는 영향 없음.
- init: PreToolUse 에 `AskUserQuestion` matcher → `pre askq` 와이어링.

## feat: handoff rework — repo-root handoff.jsonl queue + anti-scatter guard (sidecar handoff parity)

- handoff 를 **per-project repo-root `handoff.jsonl`** open-work 큐로 재설계 (단일 글로벌 레지스트리 아님 · 커밋 → GitHub 보존 · repo 와 함께 이동).
- verbs: `add <text> [--to <repo>]` · `ls`(기본) · `done <id>` · `inject` · `snapshot`.
  - **`done` = scrub**: done 마커가 아니라 파일에서 항목 **제거**(rewrite) → handoff.jsonl 은 항상 *열린 항목만* 보유. 비면 파일 삭제.
  - **`inject`**(SessionStart): 이 repo 의 열린 handoff 를 additionalContext 로 표면화 → 잊힘 방지. 비었으면 무음.
  - `snapshot [reason]`: 기존 세션-상태 dossier(.harness/handoff/*.md) 보존.
- **handoff-guard** (`config.handoffGuard` 기본 on): Write/Edit 에서 흩어진 핸드오프 마크다운 **차단** — basename `HANDOFF.md`/`INBOX.md`, 또는 `(^|/)inbox/*.md` (임의 깊이) → handoff.jsonl 로 유도. `inbox/queue.json` 같은 비-md 는 통과(false-positive 가드).
- SessionStart 훅에 `handoff inject` 추가(init). inbox 폴더 패턴 폐기, handoff 일원화.

## fix: export runBypass/runGo/runBrainstorm from runbooks (engine load broken since 8675cbd)

- `cli/index.ts` 가 이 3개를 import 했지만 직전 커밋(8675cbd)이 `modules/runbooks.ts` 를 stage 안 해서, 커밋된 엔진이 로드 실패(`SyntaxError: no export named runBrainstorm`) → CLI 전체 비동작이었음. 로컬 working tree 엔 있어 테스트는 통과해 묻혀 있었고, engine-bump agent 들의 sanity gate(`harness help`)가 전파 직전 적발.
- 누락 export 3개를 커밋. (재발 방지 후속: 엔진 로드 스모크를 lint/CI 에 추가 검토.)

## fix: recommend — global default fallback (공용 완성도 auto-pick 미작동 수정)

- 증상: mini 에 "공용 완성도" default 를 걸어도 ★표시·auto-pick 둘 다 안 뜨고 4축 박스만 떠서 punt("어느 쪽으로?").
- 원인: harness 가 default 를 **per-repo `.harness/recommend-default`** 만 읽음 → repo 에 파일 없으면 `readDefault()`=present → `defaultDirective()` 빈값 → FIXED-axis(★+auto-proceed) directive 자체가 주입 안 됨.
- 수정: **global fallback** 추가 — 우선순위 `repo .harness/recommend-default` > `global ~/.harness/recommend-default` > `present`. `set-default <mode> [--global]` / `clear-default [--global]` / `get-default [source: repo|global|none]`. sbs 는 `resolveMode→readDefault` 경유라 자동 상속.
- 검증: clean repo 에서 global complete 상속, `resolve-mode ""`→`auto axis=complete inherited`, sbs bare→auto-pick.

## feat: tmp-guard + bypass · trail · go · brainstorm

- **tmp-guard** (`modules/tmp-guard.ts`, config `tmpGuard` 기본 on) — 진행/작업 데이터를 휘발 tmp(`/tmp`·`/private/tmp`·`/var/folders`·`$TMPDIR`)에 쓰면 `pre bash`(리다이렉트/tee/-o/--output 탐지)·`pre write`(파일경로)에서 경고 → git-추적 `docs.scratchDir`(scripts/scratch)에 쓰고 커밋해 **GitHub 보관** 유도. read-only `/tmp` 참조는 무시. warn-only.
- **`harness trail {push <note>|pop|show|drop <n>|clear}`** — main-flow 복귀 스택(sidecar trail parity). 곁가지로 샐 때 위치 push, 복귀 시 pop. repo-root **`TRAIL.md`(git-tracked·커밋)** 에 저장 → 세션/리부트 넘어 보존. docs.allow 에 TRAIL.md 추가.
- **`harness bypass`** — anti-punt self-check 런북: local+reversible 이면 묻지 말고 진행, outward/되돌리기어려움/유저결정 때만 질문.
- **`harness go`** — 직전 제안 액션 재확인 없이 계속.
- **`harness brainstorm`** — 고갈까지 라운드별 아이디어 발산(breadth) 런북.

## feat: micro-exp — context-driven micro-experiment sweep (sidecar micro-exp parity)

- **`harness micro-exp [<scope>]`** — N개의 작고 검증가능한 실험을 병렬로 돌리는 sweep 런북(런북 프린터 + 배치 산출물). domain-agnostic, `kind` 추상(`<runnable>`+`<parser>` 계약).
  - 흐름: context 에서 후보 self-enumerate(매니페스트 없음) → **Stage 1.5 인프라 존재 게이트**(미비 시 build 우선 HALT) → 예산 선언 → 디스패치(rented `harness pod` / local `harness pool on <host>`) → **Monitor** closed-loop → harvest → parse Agent → 흡수(closed-form=`harness atlas`/`verdict`, observation=verbatim verdict) → `exports/sweep/<batch_id>/ledger.json` 집계.
  - 정직성: FALSIFIED 는 CLOSED-negative 로 보존(skip 금지) · 예산 캡 · pod-cap≠agent-cap · parse Agent verbatim.
  - `<scope>` 주면 `exports/sweep/<batch_id>/{ledger,state}.json` 스캐폴드. `templates/micro-exp.md` 런북.

## feat: research + watch (sidecar research-skill / watch parity)

- **`harness research {arxiv|yt}`** — 외부 연구자료 fetch, **API 키 불필요**.
  - `arxiv <query|id> [--n N]` — arXiv 공식 API 검색/조회 → 제목·저자·날짜·카테고리·PDF·초록 (id 자동 판별, 기본 submittedDate desc).
  - `yt <url|id> [lang]` — YouTube 자막 트랜스크립트. InnerTube `player` API(ANDROID client 20.10.38) → caption track → `fmt=json3` 큐별 1줄(XML fallback) + 연속중복 dedup.
  - 검증: arXiv 1706.03762(Attention Is All You Need) · yt dQw4w9WgXcQ(60줄) 실동작.
- **`harness watch <url|path> [question] [flags]`** — 에이전트가 영상을 실제로 "보게" 함.
  - `yt-dlp` 다운로드(yt-dlp 지원 플랫폼 + 로컬파일) → `ffmpeg` 프레임(길이별 예산, 2fps/100 캡, `--start/--end` 윈도우 기준) + 타임스탬프 트랜스크립트(네이티브 자막 우선 → Whisper Groq/OpenAI 옵션) → 프레임 경로 + 트랜스크립트 출력(에이전트가 Read).
  - 자막은 best-effort(`--ignore-errors`, 429 시에도 영상 진행), Whisper 키 없으면 frames-only 로 graceful degrade(절대 hard-fail 안 함). 키는 env/`secret` CLI.
  - flags: `--start --end --max-frames --fps --resolution --whisper groq|openai --no-whisper --out-dir`.
  - 검증: dQw4w9WgXcQ 8초 윈도우 → 4프레임 + 89줄 트랜스크립트.

## feat: docs — write-time single-doc enforcement (안 지켜지던 규율을 쓰는 순간 강제)

- 문제: 단일문서 규율(ARCHITECTURE SSOT 통합 · 분리 시 quickref 연결)이 **lint/commit 시점에만** 검사돼 사후 → 에이전트가 이미 흩뿌린 뒤라 안 지켜짐.
- 해결: **`pre write`(PreToolUse Write/Edit)에 write-time 검사 추가** — `.md` 를 쓰는 순간 판정.
  - `DOC-SCATTER`: scatter 패턴(`*-report/summary/notes/audit…`, 날짜접두 등) + allow 외 + scope 내 → "ARCHITECTURE(갱신)/CHANGELOG(append)/scratch 로 통합" 안내.
  - `DOC-NO-QUICKREF`: 분리 문서 상단 12줄에 SSOT 링크/포인터 없으면 → quickref 추가 안내.
- `docs.enforce` 노브: `warn`(기본, 즉시 경고) · `block`(쓰기 veto) · `off`. ARCHITECTURE.md 존재 시에만 활성(opt-in), `docs.scopeDirs`/`docs.allow` 그대로 적용.
- 검증: scatter→warn, no-quickref→warn, quickref 있음/allow 파일→무음, block 모드→`{"decision":"block"}`.

## feat: imagine history — past-prompt history (fal provider API + local ledger)

- **`harness imagine history [-b fal|openai] [-m endpoint_id,…] [--start <iso>] [--limit N] [--status success|error] [--local] [--json]`**.
  - **fal**: 공급자 요청 히스토리를 직접 조회 — `GET https://api.fal.ai/v1/models/requests/by-endpoint?expand=payloads` (프롬프트=`json_input.prompt`, request_id, ended_at, status_code). `endpoint_id` 는 fal 필수값이라 기본=imagine fal 기본 모델(`openai/gpt-image-2`), `-m a,b` 로 다중 지정. 기본 윈도우 24h, `--start` 로 확장. auth 는 curl `-K` 로 키를 argv 밖에.
  - **openai / `--local`**: openai 는 list 엔드포인트가 없어 로컬 ledger 로 폴백.
- 생성 시 **로컬 provenance ledger**(`.harness/logs/imagine.jsonl`) 기록 — ts·backend·model·size·out·request_id·status + 프롬프트(280자 truncate). API 없이도 request_id↔출력파일 매핑 확보. 키는 절대 기록 안 함.

## feat: imagine — AI image generator (sidecar /imagine parity)

- **`harness imagine <prompt-file> <out.png> [-s size] [-b backend] [-m model]`** + `list` · `help`.
  - 백엔드: **fal**(기본, fal.ai queue+poll, 기본 모델 `openai/gpt-image-2` — user-pinned, `-m` 로만 변경) · **openai**(`/v1/images/generations` 동기, 기본 `gpt-image-1`, b64_json/url 모두 처리).
  - API 키는 `secret get fal.api_key` / `secret get openai.api_key` (방금 추가한 secret 모듈의 `secretGet` 재사용) — **인라인 금지·로그 금지**. 프롬프트는 **파일**에서 읽음(provenance·argv 유출 방지), payload 는 mktemp JSON.
  - canonical 사이즈: `square_hd · square · landscape_16_9 · portrait_16_9` (openai 는 1024²/1536×1024/1024×1536 으로 변환).
  - 보안 강화(sidecar 대비): auth 헤더를 curl `-K` config 파일로 전달 → **API 키가 process argv 에 남지 않음**. 임시파일은 finally 에서 삭제.
- secret 모듈에 `secretBin()` / `secretGet()` export 추가(DRY 재사용).

## feat: worktree — no-pileup/no-stranded enforcement (sidecar worktree-gc/worktree-guard parity)

원칙: PR/branch/worktree 누적 금지 · 워크트리에 작업 방치 금지 · 방치 작업 있으면 새 작업 시작 금지.

- **`harness worktree scan`** — linked worktree 전수 분류(clean/dirty/unpushed/merged[gone]/locked) + **방치(stranded=dirty 또는 unpushed) 적발**. stranded 존재 시 exit 1 → 새 작업 게이트로 사용 가능.
- **`harness worktree gc`** — merged([gone] upstream, squash-safe)·dangling **agent** worktree/branch 자동 sweep(`git worktree remove --force` + `git branch -D` + prune). UNCONDITIONAL live-work 가드: dirty·HEAD commit <1h·locked 는 SKIP → 진행 중 작업 절대 안 지움. 항상 exit 0.
- **`harness worktree guard <cmd>`** — `git worktree add` advisory: 방치 작업 선존재 시 "먼저 완료(pr-cycle)/정리 후 새 작업" + 기존 브랜치 재사용 stale-base(anima #1105) 경고.
- 자동 연동: ① SessionStart 훅에 `worktree gc` 추가(init) → 세션 시작마다 merged 자동 청소. ② `prompt`(UserPromptSubmit) 가 stranded worktree 있으면 새 작업 전 advisory 선출력. ③ `pre bash` 가 `git worktree add` 에 hygiene advisory.
- 14-case 라이프사이클 검증(stranded SKIP / merged old-commit sweep). pr-cycle 은 이미 push→PR→**main merge(squash·admin)**→delete-branch→worktree sweep 까지 자동 — 본 모듈이 누적/방치 방지를 보강.

## feat: git-guard — force-push deny in pre bash (sidecar git-guard parity)

- **`pre bash` built-in 가드** (`modules/git-guard.ts`): force-type push 를 config 규칙보다 먼저 차단(deny). 탐지 대상: `git push --force` / `-f`, `--force-with-lease[=…]`, `git push <remote> +<refspec>`(refspec-level force). 따옴표 strip 후 토크나이즈 → `'--force'` / `+"main"` 같은 인용형도 잡음. `cd … && git push --force` 도 토큰 인접성으로 탐지.
- `--no-verify` 는 force 가 아니므로 **차단하지 않음**(sidecar 와 동일, 하네스 자체 커밋도 사용). config `git.guardForcePush=false` 로 비활성(기본 on).
- 차단 메시지: 오버라이드 없음 — 정말 필요하면 에이전트 밖에서 실행하라 안내. 14 케이스 단위검증 통과.

## fix: pr-cycle — full post-merge worktree sweep (sidecar 0.5.0 parity)

- 기존엔 merge 후 `git worktree prune` 만 호출 → 실제 worktree 디렉토리·로컬 브랜치가 누적되는 누수. main merge(squash·admin·delete-branch into base)는 정상이었음.
- 이제 merge 성공 후 `sweepMergedWorktrees()`: MAIN worktree 로 cd(현재 worktree 안에서 실행한 경우 포함) → `git fetch -p` → upstream `[gone]`(squash-safe 머지 신호)인 **linked agent worktree**(`.claude/worktrees/`)만 `git worktree remove --force` + `git branch -D` + `git worktree prune`. main 체크아웃·locked·live/absent upstream(미푸시 작업 보유 가능)은 절대 건드리지 않음.

## feat: lsp (editor LSP wiring + grammar auto-rebuild)

- **`harness lsp {wire|status|rebuild <file>}`** — sidecar hexa-lsp/lsp-rebuild parity.
  - `wire` → repo-root `.lsp.json`(Claude Code 표준 파일명)에 `lsp.servers` 매핑 기록. 기본 서버: **hexa**(`hexa lsp`, `self/lsp.hexa` 보유 첫 후보 dir 로 cd 후 exec · `.hexa`) + **kosmos**(`kosmos-lsp` · `.kosmos`). n6/hxc/tape 는 동일 한 줄 패턴으로 추가 가능.
  - `status` → 서버별 바이너리 PATH 존재(🟢/🔴) + `.lsp.json` 와이어링 상태 + rebuild 플래그.
  - `rebuild <file>` → LSP grammar 소스(`*/lsp/*_lsp.hexa` 또는 hexa-lang `self/lsp.hexa`·`self/lsp/*.hexa`) 편집 시 prebuilt 바이너리를 **백그라운드 재빌드**(log: `~/.harness/lsp-rebuild.log`) + 비차단 advisory. 항상 exit 0(fail-open).
- PostToolUse(Write/Edit) 자동 연동: `post edit <file>` 가 `lspRebuildOnEdit` 호출 → grammar 소스 편집이 바이너리를 자동 lockstep. config `lsp.rebuild=false` 로 비활성.

## feat: secret (credential-store CLI passthrough)

- **`harness secret <verb> [args]`** — `secret` CLI 얇은 패스스루(sidecar /secret parity): get·set·rotate·check·delete·list·service·init·backup·sync·migrate. PATH → `/opt/homebrew/bin` → `~/.local/bin` → `~/.hx/bin` 순으로 바이너리 자동 탐색, 없으면 설치 안내(dancinlab/secret).
- 보안 가드: `secret get` 은 값이 세션 컨텍스트에 노출되므로 경고 출력 + tool 인자엔 인라인 `$(secret get <k>)` 권장. 모듈 자체는 값을 로그/캡처하지 않음. 자격증명 하드코딩 금지(G-SECRET-LITERAL)와 한 쌍.

## feat: end (session-closure safety check)

- **`harness end`** — 읽기전용 종료 점검 대시보드(sidecar /end parity): 미커밋·미푸시·stash·내 열린 PR·병합후미삭제 브랜치·linked worktree 를 ✓/⚠/○ 로 표시 + 최종 ✅/⚠ 판정.

## feat: verdict · atlas · upstream

- **`harness verdict {record <slug>/<id> <cmd>|list|show}`** — verification-evidence ledger (hexa verify/g5 parity): verify 명령 stdout 을 `.verdicts/<slug>/<id>.txt` 에 verbatim 기록 + PASS/FAIL tier + 통과율. LLM 자가판정 금지, 캡처 출력이 증거.
- **`harness atlas {add <id> <claim>|link <id> <vid>|list}`** — claim registry → `ATLAS.md`; atom 은 PASS verdict 링크 시에만 🟢 verified (hexa atlas parity).
- **`harness upstream {list|fix <name|repo>}`** — 다운스트림 작업 중 업스트림(hexa-lang 등) 결함은 inbox 메모 말고 그 세션에서 root-cause 수정→verify→PR+merge (config.upstreams, 기본 hexa-lang).
- docs.allow 에 ATLAS.md/CLAIMS.md 추가.

## feat: ing (in-progress board + POD tracking)

- **`harness ing {show|add <text>|done <match>|next <text>|pod ...}`** — repo-root `ING.md` 단일 진행중 보드: `## 작업(in-progress)` · `## POD(running)` 표 · `## 다음(next)`. 완료분은 CHANGELOG, 최종설계는 ARCHITECTURE 로 졸업.
- `ing pod {add <id> <provider> <gpu> <purpose> [cost]|rm <id>|list}` — 실행중 GPU pod 추적.
- ING.md 는 docs.allow 기본 포함(quickref 내장). keywords `in-progress-board` 트리거(진행중/pod 관리/지금 뭐).

## feat: pool (host roster + remote exec)

- **`harness pool {list|add|rm|on|status}`** — 머신 단위 호스트 roster(`~/.harness/pool.json`, 글로벌) + ssh 원격 실행 (sidecar pool parity). add `<name> [target]` · on `<name> <cmd>` · status(도달성 🟢/🔴).

## feat: pod · dojo · demi

- **`harness pod`** — GPU cloud pod dispatch runbook (preflight→fire→poll→harvest→down · 회수 우선 · wall-time first · 비용 발생은 명시 go) — sidecar pod/cloud parity.
- **`harness dojo [<slug>] [--lang]`** — cloud training-job scaffolder: runbook + `exports/dojo/<slug>/{job,train,run.sh}` 생성 (sidecar dojo parity).
- **`harness demi`** — design-architecture program runbook (7-verb spine 명세→구조→설계→해석⟲→합성→검증→인계; ARCHITECTURE.md=합성 SSOT) — sidecar demiurge parity.

## feat: update · fleet · pr-cycle + lint severity-gate

- **`harness update [--hooks]`** — bump `.harness-engine` submodule to its tracked-branch tip → adopt new engine features (answers "기능 추가 어떻게 반영"). Reports old→new + changelog, then `git add .harness-engine` + commit.
- **`harness fleet [name:goal,…|go|stop|status]`** — perpetual multi-lane orchestrator (sidecar fleet parity): roster `.harness/fleet/active` + fire-on-arrival runbook (`templates/fleet.md`).
- **`harness pr-cycle [gh flags]`** — push branch → `gh pr create --fill` → self-merge (squash·admin·delete-branch); refuses on main/master (sidecar pr-cycle parity).
- **lint severity-gate** — `lint` now exits 1 only on BLOCK-severity violations; warn-severity (e.g. L0-LOCKDOWN) is reported but no longer hard-blocks a deliberate commit.

## feat: docs.scopeDirs

- `docs.scopeDirs` (optional) — scatter/quickref 검사를 지정 top-level dir(""=root)로 한정. 연구 repo(anima: 문서 5963건)의 corpus 폭주 방지. CLAUDE-MD 검사는 영향 없음(항상 동작).

## fix: hook guards (submodule 미초기화 내성)

- `init` 이 생성하는 `.claude/settings.json` hook 들을 `[ -x .harness-engine/bin/harness ] && … || true` 로 guard — submodule 미초기화(`git submodule update --init` 전) clone 에서 `No such file` 에러 대신 조용히 통과.
- git pre-commit/pre-push hook 도 wrapper 부재 시 `exit 0` 으로 skip.
- 적용된 repo 에서 매 프롬프트마다 뜨던 `bash: .harness-engine/bin/harness: No such file or directory` 비차단 에러 제거.

## self-dogfood

- 하네스가 **자기 자신에게** 적용됨 (harness.config.json profile:default · 엔진=repo 루트, submodule 없음). `.claude/settings.json` self hooks(pre/post/prompt + prefs/easy/recommend inject) + git pre-commit(`bin/harness lint`). hardcore 자기모순(protectedBranches·no-verify 차단)은 제외해 자기 개발 흐름 보존. CHANGELOG 강제(.ts 변경 시) + 번들 enforcement(root-cause/secret/force-push) self 적용.

## 0.5.0

- **다국어 1급 지원** — 웹/JS 편향 제거. Python·Rust·C/C++·Go·Swift·hexa 로컬/모바일 앱에서 즉시 동작.
  - `harness init` 스택 자동감지: 마커 파일(Cargo.toml·pyproject·go.mod·Package.swift·CMakeLists·*.hexa…)로 `verify.checks`(cargo/pytest/swift build/…)와 CHANGELOG `triggerPattern` 자동 생성, 혼합 스택 병합.
  - `G-ROOT-CAUSE` 우회패턴 다국어화: `# type: ignore`·`# noqa`·`except: pass`(Py) · `#[allow(...)]`(Rust) · `//nolint`(Go) · `swiftlint:disable`(Swift) · `#pragma ... diagnostic ignored`·`NOLINT`(C/C++) 추가.
  - L0 파서·folderGuides·secret·root-cause 대상 확장자에 c/h/cpp/cc/cxx/hpp/m/mm/rs/go/kt/scala/php/dart/hexa 기본 포함.
  - [docs/languages.md](docs/languages.md) 추가 — 언어별 프리셋 + Node(tsx) 런타임 요구 명시(타깃 빌드와 무관).

## 0.4.0

- **CHANGELOG 갱신 강제** — `lint` 에 `CHANGELOG-MISSING`(block) 체크 추가: 소스 코드가 staged 인데 `CHANGELOG.md` 가 함께 staged 되지 않으면 차단. `lint.changelog`(file/triggerPattern/ignore) config 로 조정, docs/test/엔진 경로는 ignore.
- **`harness init` 이 git pre-commit hook 설치** — 커밋 시 `harness lint` 자동 실행으로 위 규칙이 실제 강제됨. `--no-verify` 로 우회 가능(의도된 탈출구).
- **경로 정규화** — REPO_ROOT/HARNESS_ROOT 를 realpath 로 canonical 화(macOS `/var`↔`/private/var` 심볼릭 대응) → 생성되는 wrapper/hook 경로가 항상 정확.
- `scripts/harness` wrapper 를 repo-root 기준(`$ROOT/<engine>/bin/harness`)으로 견고화.

## 0.3.0

- **`harness folders` 추가** — 서브폴더별 `CLAUDE.md` 작성 유도. `scan`(누락 폴더 목록) · `scaffold <dir>`(5칸 템플릿 생성). `post edit` hook 이 가이드 없는 소스 폴더의 파일 편집 시 그 폴더당 1회 넛지(dedupe). `folderGuides`(roots/depth/minFiles/ignore/ext) config 로 조정, 기본 enabled.
- 번들 `keywords.json` 에 `folder-guides` 트리거(폴더 구조/서브폴더/코드 탐색) 추가.

## 0.2.0

- **`harness init` 추가** (`install` alias) — 한 방 스캐폴딩: `harness.config.json`(프로젝트명 자동감지) + `.harness/{enforcement,keywords,severity-map}.json`(번들 기본 복사) + `.gitignore` 로그 무시 + `scripts/harness` 래퍼 + `.claude/settings.json` hook(`--hooks`). 기존 파일은 보존(`--force` 만 예외), `--dry-run` 으로 미리보기. 멱등(재실행 시 skip).

## 0.1.0

최초 공개 — 프로젝트-무관 AI 코딩 하네스 엔진.

- **코어 12 모듈**: `pre` · `post` · `prompt` · `lint` · `verify` · `errors` · `ledger` · `bitter-gate` · `audit` · `gc` · `handoff` · `convergence` · `sync`
- **config 주도**: 모든 프로젝트 색채를 `harness.config.json` + `.harness/*.json` 로 분리. 엔진 코드는 도메인 하드코딩 0.
- **repo-root 자동탐색**: submodule / vendor / 심볼릭링크 어느 배치든 동작 (`HARNESS_REPO_ROOT` override).
- **번들 기본 규칙**: 도메인-무관 enforcement(force-push · curl|sh · rm -rf · 비밀키 리터럴 · 우회패턴 · 인라인 hook 금지).
- **문서 3종**: 전수 설계(architecture) · 설치(install) · 확장(extending).
- 출처: 운영 중인 두 하네스(애플리케이션 본체 + 매니저)를 전수조사해 일반형으로 추출. 도메인 전용 모듈(배포/DB/SSH 등)은 제외하고 확장 패턴만 문서화.
