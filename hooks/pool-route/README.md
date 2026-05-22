# pool-route

PreToolUse(Bash) pool **auto-router**. When pool routing is armed and a Bash command is heavy, the command is transparently rewritten — via the hook `updatedInput` field — to run on a pool host over ssh. Not a suggestion: the command is dispatched.

## When it routes

Routing is **armed** only when `pool.json` (the host roster, written by the `pool` plugin) has at least one host and a `workdir`. When armed, a command routes if it matches:

- **heavy classifier** — `make` · `cargo` · `npm` · `pnpm` · `yarn` · `gradle` · `mvn` · `bazel` · `cmake` · `ctest` · `tox` · `pytest` · `jest` · `vitest` · `webpack` · `go build`/`test` · `swift build`/`test` · `xcodebuild` · `xcrun` · `swiftc` · `docker build` · `nvidia-smi` · `train`
- **root-needing** — `apt` · `dpkg` · `systemctl` · `yum` · … — always routable, and `sudo`-prefixed on a host tagged `sudo: true`

## How it routes

1. **Capability filter** — a macOS-only command (`xcodebuild`, `codesign`, `swift build`, `.dylib`, …) is restricted to `platform: macos` hosts; a Linux-only command (`apt`, `dpkg`, `.deb`, …) to `platform: linux`. No eligible host → runs local.
2. **Round-robin** — picks one eligible host, spreading load across calls.
3. **Workdir** — per-host `workdir` › global `workdir` › `auto` (mirrors the local path under `$HOME` to the remote `~/`).
4. **Sync** — `autosync` rsyncs the project to the host before the command; otherwise a preflight `ssh test -d` confirms the remote workdir exists (a transient ssh failure never benches the host).
5. **Rewrite** — the command becomes `ssh <host> 'cd <workdir> && <cmd>'` — `tailscale ssh` when a local tailscale daemon is up.

A command that is already routed (carries the `__SIDECAR_POOL__` marker), a heredoc, a background command, or an explicit `ssh …` passes through untouched.

## No opt-out

There is none — no env var, no config file, no exception list. A guard you can switch off is a guard you will switch off. Routing is inert until `pool.json` has a roster + workdir; if `pool-route` is wrong for your workflow, clear the roster or uninstall the plugin rather than routing around it.
