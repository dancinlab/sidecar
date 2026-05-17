#!/usr/bin/env python3
# wilson-pool :: SessionStart / UserPromptSubmit hook. Injects a compact
# "## Pool" block ONLY when routing is armed, so the model knows heavy
# Bash commands run remotely (and that the remote workdir is user-synced).
# Nothing injected when unconfigured (no noise).
import json
import os
import sys

# sidecar control — no-op when /sidecar disabled this plugin
try:
    if "pool" in json.load(open(os.path.join(
            os.path.expanduser("~"), ".claude", "sidecar",
            "disabled.json"), encoding="utf-8")):
        sys.exit(0)
except SystemExit:
    raise
except Exception:
    pass

try:
    payload = json.load(sys.stdin)
except Exception:
    payload = {}
event = payload.get("hook_event_name") or payload.get("hookEventName") \
    or "SessionStart"

dd = os.environ.get("CLAUDE_PLUGIN_DATA") or os.path.join(
    os.path.expanduser("~"), ".claude", "plugin-data", "wilson-pool")
try:
    with open(os.path.join(dd, "pool.json"), encoding="utf-8") as f:
        cfg = json.load(f)
except Exception:
    sys.exit(0)

host = (cfg.get("host") or "").strip()
workdir = (cfg.get("workdir") or "").strip()
if not host or not workdir:
    sys.exit(0)

ctx = (
    "## Pool\n\n"
    "- Heavy Bash commands (build/test/compile/GPU) are auto-routed to "
    "**%s:%s** over ssh by the wilson-pool plugin.\n"
    "- The remote workdir is assumed to be a user-synced copy of this "
    "project — this plugin does NOT sync filesystems. Do not assume local "
    "file edits are visible remotely until the user has synced them.\n"
    "- Read/Write/Edit/Grep stay LOCAL (only Bash is routed).\n"
    % (host, workdir)
)
print(json.dumps({
    "hookSpecificOutput": {"hookEventName": event, "additionalContext": ctx}
}))
