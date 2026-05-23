# pool-route

PreToolUse(Bash) pool **auto-router**. When the pool roster has hosts and a Bash command is heavy, the command is transparently rewritten — via the hook `updatedInput` field — to run on a pool host over ssh. Not a suggestion: the command is dispatched.

## When it routes

The roster is the `pool` CLI's `~/.pool/pool.json`. Routing is **armed** whenever it lists at least one enabled host. When armed, a command routes if it matches:

- **heavy classifier** — `make` · `cargo` · `npm` · `pnpm` · `yarn` · `gradle` · `mvn` · `bazel` · `cmake` · `ctest` · `tox` · `pytest` · `jest` · `vitest` · `webpack` · `go build`/`test` · `swift build`/`test` · `xcodebuild` · `xcrun` · `swiftc` · `docker build` · `nvidia-smi` · `train` · `hexa kick`/`drill`/`loop`/`cc` (hexa-native heavy subverbs — kick-storm 2026-05-23 Mac kill: `/kick` = `hexa kick --seed`, multi-agent local fire drove load 80+)
- **load-aware escalation** — when the non-claude CPU sum (`ps -Ao pcpu,comm`, `claude` PIDs excluded per project.tape `@D s9`) exceeds 150% (≈1.5 cores) AND the cmd is non-trivial (length > 20, or contains `|` / `>` / `&&`), a cmd missed by the classifier is still promoted to heavy and routed. The AND-gate avoids penalising cheap `ls` / `cat` where ssh latency would dominate; the 150% threshold is high enough that one busy terminal alone does not trip routing.
- **root-needing** — `apt` · `dpkg` · `systemctl` · `yum` · … — always routable, and `sudo`-prefixed on a host with `sudo: true`

## How it routes

1. **Capability filter** — a macOS-only command (`xcodebuild`, `codesign`, `swift build`, `.dylib`, …) is restricted to `os: macos` hosts; a Linux-only command (`apt`, `dpkg`, `.deb`, …) to `os: linux`. No eligible host → runs local.
2. **Round-robin** — picks one eligible host, spreading load across calls.
3. **Workdir** — the local path under `$HOME` is mirrored to the remote `~/`. A cwd outside `$HOME` runs local.
4. **Sync** — `autosync` rsyncs the project to the host before the command, so the remote workdir need not pre-exist.
5. **Rewrite** — the command becomes `ssh <host> 'cd <workdir> && <cmd>'` — `tailscale ssh` when a local tailscale daemon is up.

A command that is already routed (carries the `__SIDECAR_POOL__` marker), a heredoc, a background command, or an explicit `ssh …` passes through untouched.

## No opt-out

There is none — no env var, no config file, no exception list. A guard you can switch off is a guard you will switch off. Routing is inert until `~/.pool/pool.json` has an enabled host; if `pool-route` is wrong for your workflow, clear the roster (via the `pool` CLI) or uninstall the plugin rather than routing around it.
