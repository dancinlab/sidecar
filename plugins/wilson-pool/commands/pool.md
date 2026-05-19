---
description: Show or set the wilson-pool host roster. Heavy Bash commands route via ssh to a roster host — macOS-only / Linux-only commands go to a host of that platform, otherwise round-robined. workdir may be `auto` (mirror the current project path) or an explicit path, with an optional per-host override and a `fallback`. `autosync on` rsyncs the local project to the target host before each routed command (so a continuously-changing tree stays fresh and the workdir is created if absent); `autosync mirror` adds rsync --delete; `autosync off` just pre-flight-checks the workdir exists and skips routing to hosts that lack it. A host tagged `sudo` (on `add`, or via `sudo <host> on`) auto-prefixes root-needing commands (apt, dpkg, yum, dnf, pacman, systemctl, ldconfig, setcap) with `sudo` when they route there — and those commands route on their own even outside the heavy `patterns`.
argument-hint: "[show | add <ssh-target> [linux|macos] [workdir] [sudo] | rm <ssh-target> | sudo <ssh-target> on|off | workdir <remote-path|auto> | fallback <remote-path> | autosync on|off|mirror | patterns <regex> | off]"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/pool.sh" $ARGUMENTS`
