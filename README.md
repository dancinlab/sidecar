<h1 align="center">🏍️ sidecar</h1>

<p align="center"><strong>Claude Code plugin pack — concept-separated guardrails, commands, and skills.</strong></p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Marketplace" src="https://img.shields.io/badge/claude--code-plugin_marketplace-informational">
</p>

---

## What is sidecar

A **Claude Code marketplace repo** that side-mounts guardrails, slash commands, and skills onto the host harness without modifying it. Strict concept separation: one plugin = one of `{hook, command, skill}`, no mixing. Project-level identity + governance lives in a single `project.tape` at the repo root (symlinked as `CLAUDE.md`); the cross-project `do` / `dont` layer rides inside the `commons` hook plugin.

## Install

```
hx install sidecar
```

Then in any project root:

```
sidecar init
```

`sidecar init` drops two files into the current directory:

- **`project.tape`** — the project's identity + governance carrier (`.tape` v1.2). Open it and fill in the placeholders:
  - `kind` — one line describing what the project is.
  - `brief` — 2–4 sentences on purpose · scope · why it exists.
  - `parent` — org / parent project (e.g. `dancinlab`).
  - `ssot` — canonical location (repo URL or `hx install <name>`).
  - `do` / `dont` — project-level governance bullets, `·` separated.
- **`CLAUDE.md → project.tape`** — symlink so the harness auto-loads project identity on SessionStart.

The [`project-tape`](hooks/project-tape/) hook re-injects `project.tape` on PreCompact + PostCompact so identity + governance survive auto-compaction.

## Layout

```
sidecar/
├── bin/sidecar               # CLI — `sidecar init` scaffolds project.tape + CLAUDE.md symlink
├── hooks/                    # PreToolUse · SessionStart · PreCompact · PostCompact · LSP plugins
├── commands/                 # /slash-command invoked plugins
├── skills/                   # Skill tool invocable plugins
├── project.tape              # sidecar's identity + governance (also linked as CLAUDE.md)
├── design.md                 # current design rules pointer (live spec)
├── design.log.md             # decision audit trail (one decision per gate)
├── CHANGELOG.md              # chronological ship log
└── .claude-plugin/marketplace.json
```

## Plugins

| Name | Kind | Version | Summary |
|---|---|---|---|
| [`commons`](hooks/commons/) | hook | 0.9.13 | SessionStart + PreCompact + PostCompact hook — injects a cross-project `do` / `dont` layer (from `commons.tape`, granular `@D g1..g28`) above the per-project context. PostCompact re-injects after the `※ recap` so the layer survives auto-compaction. Carries [`LATTICE_POLICY.md`](hooks/commons/LATTICE_POLICY.md) (real-limits-first SSOT). |
| [`prefs`](hooks/prefs/) | hook + command | 0.1.0 | User language preferences — 3 axes (`code` authoring · `docs` authoring · `response` to user). SessionStart + PreCompact + PostCompact hook auto-injects. `/prefs show` · `/prefs code <lang>` · `/prefs docs <lang>` · `/prefs response <lang>`. Defaults: code=english, docs=english, response=korean. SSOT for language preferences. |
| [`project-tape`](hooks/project-tape/) | hook | 0.1.0 | PreCompact + PostCompact hook — re-injects `<project-root>/project.tape` as `additionalContext` so the project's identity + governance survive auto-compaction. No-op when `project.tape` is absent. |
| [`git-guard`](hooks/git-guard/) | hook | 0.2.0 | PreToolUse(Bash) deny — blocks force-type git push only: `git push --force` / `-f` · `--force-with-lease` · refspec-level force `+<ref>`. Hook-bypass (`--no-verify`) NOT blocked (left to user discipline). Opt out via `SIDECAR_NO_GIT_GUARD=1`. |
| [`sidecar-lint`](hooks/sidecar-lint/) | hook | 0.1.0 | PreToolUse(Bash) auto-lint that fires on `git commit` in any Claude Code marketplace plugin pack. Non-blocking findings: stale-history patterns in staged diff (commons `@D g15`) · hardcoded `/Users/` / `/home/` paths in staged diff (commons `@D g13` · sidecar `@D s3`) · `marketplace.json` ↔ each `plugin.json` version drift (commons `@D g22`) · `hooks/*/bin/*.sh` missing user-exec bit. Opt out via `SIDECAR_NO_LINT=1`. |
| [`tape-lint`](hooks/tape-lint/) | hook | 0.2.0 | PreToolUse(Edit\|Write) deny for `.tape` edits. Three diff-aware checks: **(1) fields** — `@D` blocks accept only `do` / `dont`; new `why` · `tool` · `note` · `ref` · `ex` · ... refused (any `*.tape`). **(2) length cap** — `do` / `dont` value > 100 chars refused (`commons.tape` + `project.tape`). **(3) authoring-language** — when `sidecar prefs` `code` axis is `english`, newly-introduced non-Latin lines (Hangul · CJK · 仮名) refused (`commons.tape` + `project.tape`). Pre-existing violations grandfathered. Opt out via `SIDECAR_NO_TAPE_LINT=1`. |
| [`hexa-native`](hooks/hexa-native/) | hook | 0.1.1 | **PreToolUse(Write\|Edit\|NotebookEdit) hard block** — `.py` / `.sh` writes are **denied** inside any project rooted at a directory containing a `project.tape` marker (sidecar's canonical project identity file). Reason message redirects the operator to `.hexa` (since `.py` / `.sh` are already supported as ai-native English elsewhere). Targets only `.py` / `.sh`; other extensions pass through. Projects without `project.tape` unaffected. **NO opt-out** by design — no env var, no config file, no exception list, no self-exclusion; uninstall the plugin if you need a way out. |
| [`pool-route`](hooks/pool-route/) | hook | 0.1.0 | PreToolUse(Bash) suggestion — when a command is macOS-only (`swift` · `xcodebuild` · `xcrun` · `pod install`) or GPU-bound (`nvidia-smi` · `nvcc`), inject an `additionalContext` proposing `pool on <host> -- <cmd>`. Non-blocking. Opt out via `SIDECAR_NO_POOL_ROUTE=1`. |
| [`hexa-lsp`](hooks/hexa-lsp/) | hook | 0.1.1 | Wire the hexa-lang LSP server (`hexa lsp`) for `.hexa` files via plugin-root `.lsp.json` (canonical Claude Code LSP filename, dot-prefixed). |
| [`tape-lsp`](hooks/tape-lsp/) | hook | 0.1.1 | Wire the `tape-lsp` server (canonical `.tape` v1.2 LSP — diagnostics + hover) for `.tape` files via plugin-root `.lsp.json` (dot-prefixed). Requires `tape-lsp` on PATH (`hx install tape`). |
| [`inbox`](skills/inbox/) | skill + command | 0.1.0 | Cross-project handoff inbox. Natural-language trigger + `/inbox list` · `/inbox new <kind> <slug>`. |
| [`all-bg-go`](skills/all-bg-go/) | skill + command | 0.4.0 | Parallel fan-out trigger — "all bg go" → plan table + one background Agent per branch in the same message. **Reactive single fan-out** of what the prior turn offered. For a self-generating repeatable loop, use [`cycle`](skills/cycle/). Also `/all-bg-go`. |
| [`cycle`](skills/cycle/) | skill + command | 0.1.0 | **Autonomous work-loop driver** — `/cycle` runs next-list (self-enumerate next viable work from current context) → parallel-plan table → fan-out (one bg Agent per item, same message) → loop. Repeat `/cycle` to march through a goal in parallel batches. Distinct from `all-bg-go` (reactive fan-out of prior-turn branches; `/cycle` self-generates each round). NL: *"사이클"* · *"계속 진행"* · *"다음 라운드"* · *"keep cycling"*. |
| [`kick`](skills/kick/) | skill + command | 0.1.0 | `/kick <natural-language seed>` — wraps `hexa kick --seed "<seed>"` (hexa-lang gap-breakthrough / discovery engine). All args join into the seed. NL trigger (*"돌파해줘"*, *"kick this"*, *"discover for"*). Pairs with `commons g6`. |
| [`verify`](skills/verify/) | skill + command | 0.1.0 | `/verify <args>` — wraps `hexa verify "$@"` (TECS-L tier rubric — 🔵🟢🟡🟠🔴⚪). Forms: atlas-id · `--expr <fn> <n> <v>` · `--fence "<claim>"` · `rubric` · `list`. NL trigger (*"확인해"*, *"검증해"*, *"맞아?"*). Pairs with `commons g5`. |
| [`pool`](skills/pool/) | skill + command | 0.1.0 | `/pool <args>` — wraps the `pool` CLI (host roster + remote exec). Verbs: `list` · `add <host>` · `on <host> <cmd>` · `status` · `install tailscale` · `rm <host>`. NL trigger (*"pool 호스트"*, *"다른 호스트에서 돌려"*). Pairs with `commons g9` + `pool-route` hook. |
| [`cloud`](skills/cloud/) | skill + command | 0.1.0 | `/cloud <args>` — wraps `hexa cloud` (runpod dispatch · canonical subcommand form, structured argv — never raw ssh/scp). Subverbs: `run` · `nohup` · `poll` · `copy-to` · `copy-from`. Upstream gap (subcommand not yet registered — currently a separate `hexa-cloud` binary) tracked at `hexa-lang/inbox/patches/hexa-cloud-subcommand.md`. NL trigger (*"GPU pod 에 돌려"*, *"runpod dispatch"*). Pairs with `commons g8` + `g12`. |
| [`hexa-help`](skills/hexa-help/) | skill + command | 0.1.0 | `/hexa-help [verb]` — wraps `hexa --help` (no arg, top-level catalog) or `hexa <verb> --help` (verb-specific). Per `commons g7`. NL trigger (*"hexa 뭐있어"*, *"hexa 사용법"*). |
| [`secret`](skills/secret/) | skill + command | 0.3.0 | `/secret <args>` — wraps the [`secret`](https://github.com/dancinlab/secret) CLI (macOS Keychain-backed credentials, 0.4.0, dual-channel sync). Verbs: `get` · `set` · `rotate` · `check` · `delete` · `list` · `service` · **`init [icloud\|github <url>]`** · **`backup [enable <url>\|disable\|status]`** · **`sync`** · `migrate`. Two independent sync channels (iCloud Drive primary + optional private GitHub mirror) push the same encrypted blob — master password is the only decryption secret. Auto-push ON by default once `backup enable` runs (opt out via `SECRET_BACKUP_AUTO=0`). High-value protection on `set` (BIP39 wordlist-validated · xprv/WIF/64-hex → refuse without `--allow-mnemonic` + stdin/tty). `rotate` emits sentinel only. ⚠ `/secret get` exposes value in conversation context — prefer inline `$(secret get <k>)`. NL trigger (*"키체인"*, *"토큰 저장"*, *"credential 가져와"*, *"백업 push"*). |
| [`gap`](commands/gap/) | command | 0.2.0 | `/gap` — multi-axis gap exploration. **42** breakthrough-strategy lenses · 8 families (F4 + F6 each have 6; `occams-razor` lives in both — hypothesis side and design side). Bare `/gap` = inline-triage all 42 + deep-dive only hot families (subagents). `/gap full` = exhaustive 8-subagent fan-out. `/gap <scope>` targets the sweep. `/gap list` prints the catalogue. Surfaces + prioritises gaps; never fixes. |
| [`inject`](skills/inject/) | skill + command | 0.1.0 | `/inject` — runs `sidecar sync` (marketplace pull + cache copy + `installed_plugins.json` patch) AND prints the latest `commons.tape` + (cwd's) `project.tape` so the model picks them up THIS turn. For mid-session sidecar refresh without restarting Claude Code. |
| [`ship`](skills/ship/) | skill + command | 0.1.0 | `/ship -m "<msg>" <path>…` — atomic ship tail: stage explicit paths (never `-A`/`-u`) → credential-scan staged diff (`rpa_`·`sk-`·`hf_`·`AKIA`) → commit → push `origin/<branch>` → `sidecar sync`. Mechanical tail of `@D ship` / `commons g27`; the agent owns version bump + surface lockstep + message FIRST (per `g22`). NL trigger (*"ship"*, *"배포"*, *"출시"*). |
| [`domain`](skills/domain/) | skill + command | 0.3.0 | UPPERCASE `<NAME>.md` (current snapshot) + sister `<NAME>.log.md` (append-only **checkbox-task** log) at project root. **Auto-scaffolds** both; defaults NAME to uppercase basename of git root. Verbs: `/domain` (show) · `/domain <task>` (append `- [x]`) · `/domain todo <task>` (`- [ ]`) · `/domain done <match>` (flip `[ ]`→`[x]`) · `/domain new <header>`. Records progress as work proceeds. |
| [`bypass`](skills/bypass/) | skill | 0.2.0 | **Default-on anti-punt** — universal self-check before any move that hands control back to the user (interactive input · unauthorized destructive · external visible · explicit user-review request); if all NO, just execute. Extensible catalog of patterns: `next user action:` blocks · `Should I proceed?` · `Want me to check?` · option-trees w/ obvious default · over-clarification · defer-by-waiting · excessive recap. Cross-project always-on guard in `commons.tape` ≥ 0.7.3. |
| [`brainstorm`](skills/brainstorm/) | skill + command | 0.1.0 | Iterative brainstorming — given a seed, generates ideas in rounds and keeps going until depletion (no new distinct ideas vs prior rounds; hard cap 8 rounds). For breadth over selection. Natural language or `/brainstorm <seed>`. |
| [`easy`](skills/easy/) | skill + command | 0.1.0 | Friendly response style — 7-element pattern (icon · name · alias · plain-line · analogy · ASCII diagram · compare). Triggered by natural language ("친근하게" · "easy mode" · multilingual equivalents) or `/easy`. 5 language samples (en · ko · ja · zh · ru). |
| [`research`](skills/research/) | skill + commands | 0.1.0 | Research-fetch tools — `/research:arxiv <query\|id>` searches the official arXiv API (title · authors · abstract · pdf), `/research:yt <url-or-id>` extracts YouTube caption transcript via the InnerTube ANDROID client. Pure Python stdlib — no pip deps, no API keys, no binaries. |
| [`gh-stack`](skills/gh-stack/) | skill | 0.1.0 | Stacked-PR workflow — proposes `gh stack` (enabled repos) or the manual `gh pr create --base previous-layer` fallback. Encodes sidecar's <200-lines-per-layer · 1-concern governance. Status in [`gh-stack.md`](gh-stack.md). |
| [`paper`](skills/paper/) | skill + command | 0.2.0 | `/paper <args>` — arxiv-style LaTeX paper scaffolder. Verbs: `new <slug>` (scaffold the minimal `template/` skeleton at `./<slug>/`), `sample <slug>` (copy the bundled demiurge `sample-nb-bcs-absorbed/` verbatim — ~14-page Nb BCS universal-gap-ratio attestation reference exhibit), `fig <size> <prompt> <out>` (delegates to sister [`imagine`](skills/imagine/) → fal.ai `openai/gpt-image-2`), `compile [dir]` (pdflatex × 3 + bibtex), `list`, `help`. |
| [`imagine`](skills/imagine/) | skill + command | 0.1.0 | `/imagine <prompt-file> <out.png> [-s size] [-b backend] [-m model]` — generic AI image generator. Two backends out of the box: `fal` (queue+poll fal.ai, default · `secret get fal.api_key` · model = `openai/gpt-image-2` firm-pinned) and `openai` (sync `/v1/images/generations` · `secret get openai.api_key` · `gpt-image-1`). Canonical fal-style sizes (`square_hd`/`landscape_16_9`/`portrait_16_9`/`square`) translate per-backend. Prompt always read from a file (provenance); payload JSON via mktemp (no argv leak). Plug in a new backend by dropping `_backends/<name>.sh`. |

## Governance

Sidecar's own identity + governance lives in [`project.tape`](project.tape) (also reachable via `CLAUDE.md`). Cross-project `do` / `dont` rules ride inside the `commons` hook plugin and auto-inject at SessionStart + PreCompact + PostCompact. Local sidecar decisions (concept separation, ship cycle, evidence-before-ship, cross-project carrier) are recorded in [`design.log.md`](design.log.md) as numbered decisions; [`design.md`](design.md) is the live-rules pointer.

## Reference

- [`project.tape`](project.tape) — sidecar's identity + governance (linked as `CLAUDE.md`).
- [`design.md`](design.md) / [`design.log.md`](design.log.md) — live design-rules pointer + decision audit trail.
- [`CHANGELOG.md`](CHANGELOG.md) — chronological log of notable changes (one entry per ship batch).
- [`gh-stack.md`](gh-stack.md) / [`gh-stack.log.md`](gh-stack.log.md) — stacked PR workflow reference + enablement history.

## License

MIT.
