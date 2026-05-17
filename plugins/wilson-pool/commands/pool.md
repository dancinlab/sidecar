---
description: Show or set the wilson-pool remote host. Heavy Bash commands route to it via ssh. Routing is OFF until BOTH host and workdir are set — and YOU must keep the remote workdir in sync (this plugin does not sync filesystems).
argument-hint: "[show | host <ssh-target> | workdir <remote-path> | patterns <regex> | off]"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/pool.sh" $ARGUMENTS`
