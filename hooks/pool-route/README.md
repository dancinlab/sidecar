# pool-route

PreToolUse(Bash) pool **auto-router**. When the pool roster has hosts and a Bash command is heavy, the command is transparently rewritten — via the hook `updatedInput` field — to run on a pool host over ssh. Not a suggestion: the command is dispatched.

## When it routes

The roster is the `pool` CLI's `~/.pool/pool.json`. Routing is **armed** whenever it lists at least one enabled host. When armed, a command routes if it matches:

- **heavy classifier** — `make` · `cargo` · `npm` · `pnpm` · `yarn` · `gradle` · `mvn` · `bazel` · `cmake` · `ctest` · `tox` · `pytest` · `jest` · `vitest` · `webpack` · `go build`/`test` · `swift build`/`test` · `xcodebuild` · `xcrun` · `swiftc` · `docker build` · `gcc`/`g++`/`clang`/`clang++`/`cc`/`c++` · `nvidia-smi` · `train` · `hexa kick`/`drill`/`loop`/`cc` (hexa-native heavy subverbs — kick-storm 2026-05-23 Mac kill: `/kick` = `hexa kick --seed`, multi-agent local fire drove load 80+) · `find $HOME/core/anima` big-tree scan
- **root-needing** — `apt` · `dpkg` · `systemctl` · `yum` · … — always routable, and `sudo`-prefixed on a host with `sudo: true`

> **0.6.0 — load-escalation removed.** A prior gate (`0.5.7`) promoted any non-trivial cmd to heavy when the non-claude CPU sum exceeded 150%. On a multi-core Mac that threshold trips constantly (WindowServer + browser + build daemons), so nearly every `git` / `hexa run /Users/...` / smoke got shipped to a Linux pool host where the Mac-local path doesn't exist — and broke. "system busy" ≠ "this command should move"; that conflation was the bug. Storm protection still holds — the real meltdown patterns (`hexa kick`/`drill`/`loop`/`cc`, `find ~/core/anima`) are in the explicit classifier above.

## Never routes (local-bound guard)

- `git` / `gh` commands — operate on the local working tree + remotes
- any command containing a `/Users/` or `/home/` absolute-path literal — host-specific
- any command containing a `~/.` or `$HOME/.` **home-dotstate** reference (0.6.9) — `~/.zsh_history` · `~/.hexa-cache` · `~/.pool` · `~/.sidecar` · `~/.config` · … are per-host hidden state that is **not** user-synced, so routing them to a pool host reads the wrong host's history / cache. Synced workdirs (`~/core/...`) are deliberately excluded and keep routing — the `find ~/core/anima` big-tree pattern still dispatches.
- any command containing `$CLAUDE_PLUGIN_ROOT` or `$CLAUDE_PLUGIN_DATA` literals — resolve via the dispatching bash to the workstation's plugin cache, which only exists on the local Mac (sidecar slash commands like `/quota:quota`, `/pool:pool`, … all match)
- `hexa cloud *` commands (0.6.10) — `hexa cloud` is **itself** a Mac-local-only remote-dispatch tool (it needs the local hexa build + `stdlib/cloud`). Its post-`--` remote argv routinely carries heavy words (`nvidia-smi` · `train.log` · `make`) that tripped the classifier, non-deterministically shipping the whole `hexa cloud exec <pod> -- …` to a Linux pool host with no `cloud` subcommand. Double-routing a dispatcher is incoherent — cloud already reaches the remote pod itself.

These run local unconditionally; they're version-control / local-fs / trusted-plugin / remote-dispatcher ops, never the heavy compute the pool exists for.

## Worktree → canonical-root fallback (0.6.10)

A heavy command launched from a **git linked worktree** outside `$HOME` (e.g. `/tmp/wt-x` — the standard isolation pattern for stdlib / SSCHA agents) used to be **denied** with `cwd outside $HOME`, because the worktree path can't be mirrored to a pool host. The router now resolves the worktree's **main checkout** via `git worktree list --porcelain` (the main worktree is listed first) and, when that root is under `$HOME` (a synced `~/core/…` workdir the pool already routes), mirrors that root instead. The remote runs against the canonical checkout — for `hexa kick`/`drill`/`loop`/`cc` (which already get `HEXA_LANG=$HOME/core/hexa-lang`) that is the intended target; the route-log `why` records `worktree→canonical-root`. This runs **only** in the branch that previously denied, so it can never regress a routing command — it strictly rescues worktree dispatch.

## Local-bound sign gate (0.6.4)

The absolute-path exemption above turned out to be the canonical mac fork-storm trigger: when multiple sessions race `hexa.real run /Users/…/x.hexa` (or any heavy interpreter on an absolute host path), each invocation hash-misses the dispatch cache and re-forks a fresh compiler binary on the workstation Mac. Bare reads stay free; the gate narrows to **heavy invocations only**:

| Pattern | Gated? |
|---|---|
| `hexa` (any verb · including `hexa.real`) | ✅ sign required |
| `python` / `python3` / `py` | ✅ sign required |
| `gcc` / `g++` / `clang` / `clang++` / `cc` / `c++` (0.6.12) | ✅ sign required |
| `bash <script>` / `sh <script>` (positional script arg) | ✅ sign required |
| `bash -c "…"` / `sh -c "…"` (shell wrapper) | ❌ free |
| `ls` / `cat` / `grep` / `find` / `head` / `tail` / … | ❌ free |
| `git` / `gh` (already exempt above) | ❌ free |

Within the absolute-path exemption, a gated invocation demands a fresh **`local` sign-off token**:

```
! sidecar sign local
```

The `!` bang mints from the TUI prompt (user-only — agents cannot self-mint, by sign-guard's tool-boundary enforcement). The token lasts **5 minutes** and writes `~/.sidecar/signs/local.sign`. Without a fresh token the hook emits `permissionDecision: deny` with the mint instruction inline. Mint once, fire many; the token covers every gated invocation in the window.

### 0.6.6 — macOS pool-host enable (compile work routes off the workstation)

0.6.1 set a blanket "Zero-macOS-offload" policy — macOS pool hosts were never auto-dispatch candidates, even for `swift build` / `xcodebuild` that **must** run on macOS. The result: a `swift-frontend` compile drove 85% CPU on the workstation Mac for minutes at a time, even when an enabled `mini` (also `os: macos`) sat idle in the pool roster. The user request: *"compile work should run on the pool, not the workstation"*.

0.6.6 supersedes that policy:

| Command type | 0.6.1 | 0.6.6 |
|---|---|---|
| macOS-only (`swift build`, `xcodebuild`, `codesign`, …) | always local | → macOS pool hosts (e.g. `mini`) |
| Linux-only (`apt`, `dpkg`, `.deb`, …) | → Linux hosts | → Linux hosts (unchanged) |
| general-heavy (`make`, `cargo`, `hexa run/build`, `pytest`, …) | round-robin **all** hosts | round-robin **Linux** hosts only (Mac protected) |
| explicit `pool on <macos-host>` | always works | always works (unchanged) |

The workstation Mac is reached only when a macOS-capability marker explicitly demands it; generic build/test fan-out stays on Linux pool hosts.

### Hotfix 0.6.5 — false-positive + false-negative paths closed

0.6.4 had two bugs that 0.6.5 patches together:

**False-positive (bare reads gated).** `_local_heavy_interp` used `_has_word(cmd, "hexa")` to detect hexa invocations, but `_has_word` treats `-` as a word boundary — so `cat /Users/…/hexa-lang/foo.txt` matched (the `hexa` inside the path was scored as a verb). That made `cat`/`ls`/`grep` on the hexa-lang tree demand a sign token. 0.6.5 matches by **first-token basename** (`toks[0]` → `hexa`/`hexa.real`/`hexac`/`hexadrv`/`hxv2`/`python*`/`bash`/`sh`) — the first token is the invoked verb; matching there is sound. Bare reads on any path stay free.

**False-negative (`hexa run`/`build` ran local instead of routing).** The 0.6.x heavy classifier listed `hexa kick/drill/loop/cc` but **not** `hexa run` or `hexa build` — yet those are exactly the verbs that hit the dispatch-cache → re-fork loop on every invocation (canonical mac fork-storm, load 130+ measured with multiple sessions). 0.6.5 adds `hexa run`/`hexa build` to the heavy pairs so they route through the pool by default. The sign gate above remains as the local-bound exemption's narrow guard.

## C/C++ compiler routing (0.6.11)

The C/C++ compiler drivers — `gcc` · `g++` · `clang` · `clang++` · `cc` · `c++` — join the heavy classifier. A C/C++ compile is heavy local compute, the same workstation-protection rationale as `make` / `cmake` / `cargo`. They carry **no** macOS-capability marker, so they fall into the general-heavy bucket → **Linux pool hosts only**, round-robin (the workstation Mac stays protected, per project `@D s12`).

Detection is **word-match** (not first-token), so a `zsh`-snapshot-wrapped invocation is still caught — the same robustness `make`/`cargo` already have. `cc` is the only 2-char driver; `git`/`gh` and any `/Users/`·`/home/` absolute-path command already return local **above** the classifier, so a coincidental bare `cc` token in an unrelated command does not reach the classifier.

> A C/C++ compile routed to a Linux host produces a **Linux** artifact in the synced workdir — identical to `make`/`cargo`/`cmake` today. For a macOS-native build, reach for an explicit macOS-capability path (`swiftc`, Xcode) or run it under `pool on <macos-host>`.

## Toolchain preflight + akida exclusion (0.6.13)

**pi5-akida is anima-only (@D s8).** It is excluded from the auto-dispatch candidate set entirely — never in `route` / load-balance / round-robin. It is reached **only** via an explicit `pool on pi5-akida <cmd>` (the `pool` CLI, not this hook).

**Toolchain preflight.** Before routing, each candidate host is probed for the command's *actual* toolchain, not just the workdir — so a host with a broken/missing toolchain (e.g. a non-functional `hexa` on one box) is **skipped** rather than routed-to-then-failed:

| Command | Preflight probe |
|---|---|
| any `hexa <verb>` | `command -v hexa` + `test -x ~/core/hexa-lang/build/hexa_interp` + `hexa <verb> --help` |
| `gcc` / `g++` / `clang` / `clang++` / `cc` / `c++` | `command -v <compiler>` |
| everything else | `test -d <workdir>` |

A failing host is skipped and the round-robin moves to the next eligible host; if **all** fail, the hook denies with a per-host failure breakdown (never a silent local fallback). **Known limit:** a binary that passes `--help` but segfaults at *runtime* is not caught — that needs a full exec probe (heavier, deferred).

## How it routes

1. **Capability filter** — a macOS-only command (`xcodebuild`, `codesign`, `swift build`, `.dylib`, …) is restricted to `os: macos` hosts (e.g. `mini`); a Linux-only command (`apt`, `dpkg`, `.deb`, …) to `os: linux` hosts. A general-heavy command (make/cargo/hexa run/…) round-robins across `os: linux` hosts only (**never `pi5-akida` — anima-only, @D s8**) — the workstation Mac is reached **only** when a macOS-capability marker explicitly demands it. No eligible host → runs local.
2. **Round-robin** — picks one eligible host, spreading load across calls.
3. **Preflight** — probes the picked host for the command's toolchain (table above); a host that fails is skipped, and the next eligible host is tried.
4. **Workdir** — the local path under `$HOME` is mirrored to the remote `~/`. A cwd outside `$HOME` runs local (with a worktree→canonical-root rescue).
5. **Rewrite** — the command becomes `ssh <host> 'cd <workdir> && <cmd>'` — `tailscale ssh` when a local tailscale daemon is up.

A command that is already routed (carries the `__SIDECAR_POOL__` marker), a heredoc, a background command, or an explicit `ssh …` passes through untouched.

## No opt-out

There is none — no env var, no config file, no exception list. A guard you can switch off is a guard you will switch off. Routing is inert until `~/.pool/pool.json` has an enabled host; if `pool-route` is wrong for your workflow, clear the roster (via the `pool` CLI) or uninstall the plugin rather than routing around it.

### 자주 시도되지만 작동하지 않는 우회 (0.7.3 기준)

다음은 모두 **no-op** — pool-route 의 `_local_heavy_interp` 가 POSIX env-var prefix(`IDENT=value`) + leading wrapper (`env`/`exec`/`nice`/`timeout`/`command`/`sudo`/`nohup`/`stdbuf`/`ionice`) + 백슬래시 escape(`\hexa`) 를 모두 stripping 후 **진짜 verb** 로 분류한다.

| 시도 | 결과 | 이유 |
|---|---|---|
| `SIDECAR_NO_POOL=1 hexa run x.hexa` | ❌ 라우팅 그대로 | env prefix stripped → `hexa run` 감지 |
| `SIDECAR_NO_POOL_ROUTE=1 hexa run x.hexa` | ❌ 라우팅 그대로 | 동일 |
| `POOL_DISABLE=1 hexa run x.hexa` | ❌ 라우팅 그대로 | 동일 |
| `FOO=bar hexa run x.hexa` | ❌ 라우팅 그대로 | 동일 (어떤 IDENT=val 도 stripped) |
| `env hexa run x.hexa` | ❌ 라우팅 그대로 | wrapper stripped |
| `nice -n 10 hexa run x.hexa` | ❌ 라우팅 그대로 | wrapper + per-flag arg awareness |
| `\hexa run x.hexa` | ❌ 라우팅 그대로 | leading backslash stripped |

### 유일한 정식 로컬 강제 경로 — `! sidecar sign local`

위 우회들은 의도적 차단(s11 — 게이트는 끌 수 없음). 실제로 로컬 강제가 필요할 때는:

```bash
! sidecar sign local      # TUI bang prompt — 사용자만 발급 가능, 5분 토큰
```

발급 후 5분 동안 **모든** Bash 명령이 로컬 실행 (라우팅 완전 suppress). `~/.sidecar/signs/local.sign` 의 mint epoch 가 토큰. 토큰 만료/소진 시 자연 재게이트.

> 에이전트는 이 토큰을 자가 발급할 수 없다(sign-guard 의 tool-boundary 강제). 사용자가 직접 TUI 의 `!` bang 으로만 mint 가능 — 다중 세션 fork-storm 방지의 마지막 단단한 line.
