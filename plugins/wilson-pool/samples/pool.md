# wilson-pool — canonical reference

> Long-form sample for the sidecar plugin **`wilson-pool`** — a PreToolUse
> Bash router that ships heavy commands to a remote host roster over ssh.
> This file is the canonical *how-it-works* reference, inlined into the
> `## Pool` context block on SessionStart / PreCompact / PostCompact / and
> every Nth UserPromptSubmit. Off-turn injects a 1-line safety guard only.
>
> Activation: `/wilson-pool` (slash command) or edit
> `~/.claude/plugin-data/wilson-pool/pool.json` directly.
> Kill switches: `SIDECAR_NO_POOL=1` (env, always wins) ·
> `/sidecar off pool` · `/wilson-pool off`.

## When routing is armed

Routing fires only when **both** are true:

- `pool.json` lists ≥1 roster host (each with `host: ssh-target` and
  `platform: linux|macos`);
- `workdir` is set (an explicit remote path, or the literal string `auto`
  to mirror the current local project at `~/<rel>` on each host).

Unarmed → the hook exits silently and **no Bash command is rewritten**. A
fresh `claude` invocation with neither configured behaves as if the plugin
were not installed.

## Routing mechanism

PreToolUse fires on every Bash invocation; the router rewrites the
matching command via `updatedInput` to:

```
ssh <picked-host> 'cd <workdir> && <cmd>  # __SIDECAR_POOL__'
```

ssh's exit status is the remote command's (255 = ssh transport failure).
The `# __SIDECAR_POOL__` marker is the idempotency token — a re-fire on
the rewritten command short-circuits and is left alone. The Bash tool
itself then runs the rewritten string; the model sees the remote stdout/
stderr unchanged.

## In-scope — what counts as "heavy" (routed)

The classifier matches the command against a default pattern set:

```
make · cargo · npm · pnpm · yarn · gradle · mvn · bazel · cmake · ctest ·
tox · pytest · jest · vitest · webpack · xcodebuild · xcrun · swiftc ·
go (test|build) · swift (build|test) · docker build · nvidia-smi · train
```

Override with `/wilson-pool patterns <regex>` — a custom pattern
*replaces* the default, so be explicit (re-include the entries you still
want). Anything matching, and not skipped by the shell-fragile rules
below, gets routed.

## Out-of-scope — never routed

- **The Read / Write / Edit / Grep tools.** They operate on the LOCAL fs;
  routing them would silently target a different working copy. wilson can
  route fs ops because it mounts the remote fs — a plain hook cannot.
- **Commands that don't match the heavy classifier** (sub-second shell
  primitives: `ls`, `cat`, `echo`, `grep`, `head`, `tail`, …). They stay
  local — round-tripping them over ssh would be slower than running them.
- **Commands already routed or shell-fragile**:
  contains `__SIDECAR_POOL__` (already wrapped) ·
  contains `<<` (heredoc — the remote shell would parse it wrong) ·
  ends with `&` (backgrounded — ssh-wrapping changes the foreground/
  background relationship) ·
  starts with `ssh ` (already a remote command).

## Host selection

The picked host is **filtered first, balanced second**:

1. **Platform filter**: a command matching `MACOS_RE` is restricted to
   hosts with `platform=macos`; `LINUX_RE` to `platform=linux`; otherwise
   any host is eligible. High-confidence OS fingerprints:
   - macOS-only: `xcodebuild`, `xcrun`, `codesign`, `notarytool`, `lipo`,
     `otool`, `install_name_tool`, `hdiutil`, `pkgbuild`, `osascript`,
     `launchctl`, `diskutil`, `sips`, `plutil`, `apple-darwin`, `Mach-O`,
     `.dylib`, `.dmg`.
   - Linux-only: `apt`, `apt-get`, `dpkg`, `yum`, `dnf`, `rpm`, `pacman`,
     `systemctl`, `journalctl`, `ldconfig`, `setcap`, `linux-gnu`,
     `linux-musl`, `.deb`, `.rpm`.
2. **Round-robin**: among the eligible hosts, a counter spreads the load.
3. **Empty eligible set** (e.g. a macOS-only command but no macOS host)
   → routing is skipped and the command **runs locally** (with a note).
   This is the right failure mode: better local-and-correct than
   remote-and-wrong-platform.

## Workdir modes

Three workdir behaviours, picked in this resolution order:

1. **Per-host override**: a roster entry's own `workdir` field wins (lets
   each host pin a different remote checkout if needed).
2. **Global `workdir`**: from `pool.json` top-level. If set to a literal
   remote path (`/srv/builds/proj`) it's used verbatim.
3. **`workdir: "auto"`**: mirrors the current local project — local
   `~/core/sidecar` becomes remote `~/core/sidecar` on each host. If the
   local cwd is outside `$HOME`, a `workdir_fallback` is used if set; else
   routing for that command is skipped.

The `autosync` knob controls how the workdir stays in sync:

- `off` (default): pre-flight `ssh <host> test -d <workdir>` runs before
  every routed command, cached per (host, workdir). A missing directory
  skips routing to that host instead of failing with `cd: no such file`.
  **Assumes the user keeps the remote in sync themselves.**
- `on`: `rsync -az` (additive) runs from local project → remote workdir
  before each command. Build caches survive; a continuously-changing tree
  stays fresh; the workdir is created if absent.
- `mirror`: as `on` but adds `--delete` — the remote mirrors the local
  exactly. Use when stale files on the remote would mislead the build.

## The sync caveat — a correctness guard, not info

With `autosync off` (the default), **the remote workdir is whatever the
user last synced there**. Local edits made after that sync are invisible
to the remote until the user syncs again. A heavy build that "works"
locally can quietly run against stale source on the remote and produce a
green CI signal that doesn't reflect the code in front of you.

This is why the `## Pool` block keeps a 1-line sync caveat on every turn
(even when the rest of this body has rolled off the cadence): the caveat
is a **correctness invariant**, not informational copy. Forgetting it is
the failure mode the plugin is most exposed to.

If you find yourself doing `git status` on the remote to figure out what
got built — switch `autosync` to `on` (or `mirror`). The cost is one
incremental rsync per command; the gain is the failure mode disappears.

## Counter-example — when routing does NOT fire

- **Not armed**: no hosts or no workdir set in `pool.json`. The plugin is
  installed but inert.
- **Kill-switched**: `SIDECAR_NO_POOL=1` is set in the shell env (highest
  precedence) · `/sidecar off pool` toggled the plugin off · the plugin
  was disabled per-session via `/wilson-pool off`.
- **Command not heavy**: the classifier didn't match (`ls`, `cat`, sub-
  second primitives, anything outside the default + custom patterns).
- **Shell-fragile**: heredocs (`<<`), backgrounded commands (`& ` at end),
  already-ssh commands, or commands already carrying the
  `__SIDECAR_POOL__` marker.
- **No eligible host**: platform-only command with no matching host on
  the roster — runs locally, never routes to a wrong-platform host.

In all of these cases the Bash command runs **on the local machine
unchanged**. The router is fail-open: if anything is uncertain, it
declines to rewrite.
