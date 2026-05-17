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

hosts = []
for h in (cfg.get("hosts") or []):
    if isinstance(h, dict) and str(h.get("host") or "").strip():
        hosts.append({"host": str(h["host"]).strip(),
                      "platform": (h.get("platform") or "linux")})
if not hosts and cfg.get("host"):          # legacy single-host config
    hosts.append({"host": str(cfg["host"]).strip(), "platform": "linux"})
workdir = (cfg.get("workdir") or "").strip()
if not hosts or not workdir:
    sys.exit(0)

roster = ", ".join("%s (%s)" % (h["host"], h["platform"]) for h in hosts)
if workdir.lower() == "auto":
    wd_desc = ("mirrored — the current project's path under your home "
               "(`~/<rel>`) on each host")
else:
    wd_desc = "`%s`" % workdir
ctx = (
    "## Pool\n\n"
    "- Heavy Bash commands (build/test/compile/GPU) are auto-routed over "
    "ssh by the wilson-pool plugin to one of: **%s**.\n"
    "- Host selection: a macOS-only or Linux-only command goes to a host "
    "of that platform; otherwise the load is round-robined across the "
    "roster. Remote workdir: %s.\n"
    "- The remote workdir is assumed to be a user-synced copy of this "
    "project on EVERY roster host — this plugin does NOT sync filesystems. "
    "Do not assume local file edits are visible remotely until the user "
    "has synced them.\n"
    "- Read/Write/Edit/Grep stay LOCAL (only Bash is routed).\n"
    % (roster, wd_desc)
)
print(json.dumps({
    "hookSpecificOutput": {"hookEventName": event, "additionalContext": ctx}
}))
