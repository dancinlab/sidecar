# pool-route

PreToolUse(Bash) pool **auto-router**. When the pool roster has hosts and a Bash command is heavy, the command is transparently rewritten — via the hook `updatedInput` field — to run on a pool host over ssh. Not a suggestion: the command is dispatched.

## When it routes

The roster is the `pool` CLI's `~/.pool/pool.json`. Routing is **armed** whenever it lists at least one enabled host. When armed, a command routes if it matches:

- **heavy classifier** — `make` · `cargo` · `npm` · `pnpm` · `yarn` · `gradle` · `mvn` · `bazel` · `cmake` · `ctest` · `tox` · `pytest` · `jest` · `vitest` · `webpack` · `go build`/`test` · `swift build`/`test` · `xcodebuild` · `xcrun` · `swiftc` · `docker build` · `nvidia-smi` · `train` · `hexa kick`/`drill`/`loop`/`cc` (hexa-native heavy subverbs — kick-storm 2026-05-23 Mac kill: `/kick` = `hexa kick --seed`, multi-agent local fire drove load 80+) · `find $HOME/core/anima` big-tree scan
- **root-needing** — `apt` · `dpkg` · `systemctl` · `yum` · … — always routable, and `sudo`-prefixed on a host with `sudo: true`

> **0.6.0 — load-escalation removed.** A prior gate (`0.5.7`) promoted any non-trivial cmd to heavy when the non-claude CPU sum exceeded 150%. On a multi-core Mac that threshold trips constantly (WindowServer + browser + build daemons), so nearly every `git` / `hexa run /Users/...` / smoke got shipped to a Linux pool host where the Mac-local path doesn't exist — and broke. "system busy" ≠ "this command should move"; that conflation was the bug. Storm protection still holds — the real meltdown patterns (`hexa kick`/`drill`/`loop`/`cc`, `find ~/core/anima`) are in the explicit classifier above.

## Never routes (local-bound guard, 0.6.0)

- `git` / `gh` commands — operate on the local working tree + remotes
- any command containing a `/Users/` or `/home/` absolute-path literal — host-specific

These run local unconditionally; they're version-control / local-fs ops, never the heavy compute the pool exists for.

## Local-bound sign gate (0.6.4)

The absolute-path exemption above turned out to be the canonical mac fork-storm trigger: when multiple sessions race `hexa.real run /Users/…/x.hexa` (or any heavy interpreter on an absolute host path), each invocation hash-misses the dispatch cache and re-forks a fresh compiler binary on the workstation Mac. Bare reads stay free; the gate narrows to **heavy invocations only**:

| Pattern | Gated? |
|---|---|
| `hexa` (any verb · including `hexa.real`) | ✅ sign required |
| `python` / `python3` / `py` | ✅ sign required |
| `bash <script>` / `sh <script>` (positional script arg) | ✅ sign required |
| `bash -c "…"` / `sh -c "…"` (shell wrapper) | ❌ free |
| `ls` / `cat` / `grep` / `find` / `head` / `tail` / … | ❌ free |
| `git` / `gh` (already exempt above) | ❌ free |

Within the absolute-path exemption, a gated invocation demands a fresh **`local` sign-off token**:

```
! sidecar sign local
```

The `!` bang mints from the TUI prompt (user-only — agents cannot self-mint, by sign-guard's tool-boundary enforcement). The token lasts **5 minutes** and writes `~/.sidecar/signs/local.sign`. Without a fresh token the hook emits `permissionDecision: deny` with the mint instruction inline. Mint once, fire many; the token covers every gated invocation in the window.

### Hotfix 0.6.5 — false-positive + false-negative paths closed

0.6.4 had two bugs that 0.6.5 patches together:

**False-positive (bare reads gated).** `_local_heavy_interp` used `_has_word(cmd, "hexa")` to detect hexa invocations, but `_has_word` treats `-` as a word boundary — so `cat /Users/…/hexa-lang/foo.txt` matched (the `hexa` inside the path was scored as a verb). That made `cat`/`ls`/`grep` on the hexa-lang tree demand a sign token. 0.6.5 matches by **first-token basename** (`toks[0]` → `hexa`/`hexa.real`/`hexac`/`hexadrv`/`hxv2`/`python*`/`bash`/`sh`) — the first token is the invoked verb; matching there is sound. Bare reads on any path stay free.

**False-negative (`hexa run`/`build` ran local instead of routing).** The 0.6.x heavy classifier listed `hexa kick/drill/loop/cc` but **not** `hexa run` or `hexa build` — yet those are exactly the verbs that hit the dispatch-cache → re-fork loop on every invocation (canonical mac fork-storm, load 130+ measured with multiple sessions). 0.6.5 adds `hexa run`/`hexa build` to the heavy pairs so they route through the pool by default. The sign gate above remains as the local-bound exemption's narrow guard.

## How it routes

1. **Capability filter** — a macOS-only command (`xcodebuild`, `codesign`, `swift build`, `.dylib`, …) is restricted to `os: macos` hosts; a Linux-only command (`apt`, `dpkg`, `.deb`, …) to `os: linux`. No eligible host → runs local.
2. **Round-robin** — picks one eligible host, spreading load across calls.
3. **Workdir** — the local path under `$HOME` is mirrored to the remote `~/`. A cwd outside `$HOME` runs local.
4. **Sync** — `autosync` rsyncs the project to the host before the command, so the remote workdir need not pre-exist.
5. **Rewrite** — the command becomes `ssh <host> 'cd <workdir> && <cmd>'` — `tailscale ssh` when a local tailscale daemon is up.

A command that is already routed (carries the `__SIDECAR_POOL__` marker), a heredoc, a background command, or an explicit `ssh …` passes through untouched.

## No opt-out

There is none — no env var, no config file, no exception list. A guard you can switch off is a guard you will switch off. Routing is inert until `~/.pool/pool.json` has an enabled host; if `pool-route` is wrong for your workflow, clear the roster (via the `pool` CLI) or uninstall the plugin rather than routing around it.
