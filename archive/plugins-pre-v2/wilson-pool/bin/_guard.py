#!/usr/bin/env python3
# wilson-pool :: PreToolUse guard. Denies a direct Write / Edit / MultiEdit
# to pool.json — the routing roster state file.
#
# WHY: the roster is sticky user intent (which remote hosts heavy Bash
# routes to). A "helpful" agent that edits the JSON by hand silently
# wipes or corrupts it — the exact failure the user kept hitting. The
# ONLY sanctioned way to mutate the roster is the /wilson-pool:pool
# command (add / rm / workdir / autosync / off): it writes the file
# through _pool.py's save(), never the Write tool, so the command path
# is unaffected by this guard.
#
# SCOPE (design.md Decisions 44 / 45 / 48 / 49):
#   - exact pool.json path only — .preflight.json (derived ssh cache) and
#     the rest of the data dir are NOT guarded;
#   - the Write / Edit / MultiEdit tools only — a Bash redirect that
#     writes pool.json is deliberately out of scope (not an idiomatic
#     edit path; catching it would need leaky command-string parsing).
#
# Opt out: SIDECAR_NO_POOL=1, or /sidecar disabling the plugin.
import json
import os
import sys


def allow():
    sys.exit(0)


# sidecar control — no-op when /sidecar disabled this plugin
try:
    if "pool" in json.load(open(os.path.join(
            os.path.expanduser("~"), ".claude", "sidecar",
            "disabled.json"), encoding="utf-8")):
        allow()
except SystemExit:
    raise
except Exception:
    pass

if os.environ.get("SIDECAR_NO_POOL") == "1":
    allow()

try:
    payload = json.load(sys.stdin)
except Exception:
    allow()

if payload.get("tool_name") not in ("Write", "Edit", "MultiEdit"):
    allow()
ti = payload.get("tool_input") or {}
if not isinstance(ti, dict):
    allow()
target = (ti.get("file_path") or "").strip()
if not target:
    allow()

# resolve pool.json the same way _pool.py's data_dir() does, so the
# guarded path always tracks wherever the roster actually lives.
dd = os.environ.get("CLAUDE_PLUGIN_DATA") or os.path.join(
    os.path.expanduser("~"), ".claude", "plugin-data", "wilson-pool")
state = os.path.join(dd, "pool.json")

try:
    same = (os.path.realpath(os.path.expanduser(target))
            == os.path.realpath(state))
except Exception:
    same = False
if not same:
    allow()

reason = (
    "wilson-pool: pool.json is the routing roster — a protected state "
    "file. A direct Write/Edit corrupts or silently wipes the host "
    "roster (sticky user intent). Mutate it through the "
    "/wilson-pool:pool command instead:\n"
    "  /wilson-pool:pool add <ssh-target> [linux|macos] [workdir]\n"
    "  /wilson-pool:pool rm <ssh-target>\n"
    "  /wilson-pool:pool workdir <path|auto>\n"
    "  /wilson-pool:pool autosync on|off|mirror\n"
    "  /wilson-pool:pool off            (clear the roster)\n"
    "Those write pool.json through the plugin, not the Write tool, so "
    "they are never blocked. (Hard override: SIDECAR_NO_POOL=1.)")

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": reason,
    }
}))
