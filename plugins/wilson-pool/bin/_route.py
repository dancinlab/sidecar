#!/usr/bin/env python3
# wilson-pool :: PreToolUse hook. When routing is ARMED (host+workdir set)
# and a Bash command matches the heavy-pattern, rewrite it via
# `updatedInput` to run on the pool host over ssh:
#     ssh <host> 'cd <workdir> && <cmd>'
# ssh's exit status is the remote command's (255 = ssh transport failure).
#
# SAFETY: only the Bash tool is routed (Read/Write/Edit/Grep operate on the
# LOCAL fs — routing them would be wrong; wilson can only because it mounts
# the fs, which a hook cannot). Disabled unless BOTH host and workdir set.
# Skips heredoc / background / already-ssh / already-routed.
# Opt out: SIDECAR_NO_POOL=1
import json
import os
import re
import shlex
import sys

MARK = "__SIDECAR_POOL__"
DEFAULT_PATTERNS = (
    r"\b(make|cargo|npm|pnpm|yarn|gradle|mvn|bazel|cmake|ctest|tox|"
    r"pytest|jest|vitest|webpack|go +(test|build)|docker +build|"
    r"nvidia-smi|train)\b"
)


def allow():
    sys.exit(0)


if os.environ.get("SIDECAR_NO_POOL") == "1":
    allow()
try:
    payload = json.load(sys.stdin)
except Exception:
    allow()
if payload.get("tool_name") != "Bash":
    allow()
ti = payload.get("tool_input") or {}
if not isinstance(ti, dict):
    allow()
cmd = (ti.get("command") or "").strip()
if not cmd:
    allow()

dd = os.environ.get("CLAUDE_PLUGIN_DATA") or os.path.join(
    os.path.expanduser("~"), ".claude", "plugin-data", "wilson-pool")
try:
    with open(os.path.join(dd, "pool.json"), encoding="utf-8") as f:
        cfg = json.load(f)
except Exception:
    allow()
host = (cfg.get("host") or "").strip()
workdir = (cfg.get("workdir") or "").strip()
if not host or not workdir:        # not armed → never route (safety)
    allow()

if MARK in cmd or "<<" in cmd or cmd.endswith("&") or cmd.startswith("ssh "):
    allow()

pat = cfg.get("patterns") or DEFAULT_PATTERNS
try:
    if not re.search(pat, cmd):
        allow()
except re.error:
    if not re.search(DEFAULT_PATTERNS, cmd):
        allow()

remote = "cd %s && %s" % (shlex.quote(workdir), cmd)
new_cmd = "ssh %s %s  # %s" % (shlex.quote(host), shlex.quote(remote), MARK)

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "updatedInput": dict(ti, command=new_cmd),
        "additionalContext": (
            "wilson-pool: routed this heavy command to %s:%s via ssh "
            "(remote workdir is user-synced)." % (host, workdir)
        ),
    }
}))
