---
description: Show or set the wilson-pool host roster. Heavy Bash commands route via ssh to a roster host — macOS-only / Linux-only commands go to a host of that platform, otherwise the load is round-robined. workdir may be `auto` (mirror the current project — local ~/<rel> runs at ~/<rel> on each host) with an optional `fallback` path for when auto cannot mirror. Routing is OFF until the roster has >=1 host AND workdir is set — and YOU must keep the remote workdir in sync on every host (this plugin does not sync filesystems).
argument-hint: "[show | add <ssh-target> [linux|macos] | rm <ssh-target> | workdir <remote-path|auto> | fallback <remote-path> | patterns <regex> | off]"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/pool.sh" $ARGUMENTS`
