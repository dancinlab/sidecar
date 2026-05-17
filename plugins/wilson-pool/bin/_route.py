#!/usr/bin/env python3
# wilson-pool :: PreToolUse hook. When routing is ARMED (>=1 roster host
# AND workdir set) and a Bash command matches the heavy-pattern, rewrite
# it via `updatedInput` to run on a pool host over ssh:
#     ssh <host> 'cd <workdir> && <cmd>'
# ssh's exit status is the remote command's (255 = ssh transport failure).
#
# HOST SELECTION:
#   - a command that needs a specific OS (macOS-only: xcodebuild, codesign,
#     lipo, Mach-O, …  /  linux-only: apt, dpkg, systemctl, .deb, …) is
#     restricted to hosts tagged with that platform;
#   - among the eligible hosts, a round-robin counter spreads the load;
#   - no eligible host (e.g. a macOS-only command but no macos host) → not
#     routed, runs locally.
#
# SAFETY: only the Bash tool is routed (Read/Write/Edit/Grep operate on the
# LOCAL fs — routing them would be wrong; wilson can only because it mounts
# the fs, which a hook cannot). Disabled unless armed.
# Skips heredoc / background / already-ssh / already-routed.
# Opt out: SIDECAR_NO_POOL=1
import json
import os
import re
import shlex
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

MARK = "__SIDECAR_POOL__"
DEFAULT_PATTERNS = (
    r"\b(make|cargo|npm|pnpm|yarn|gradle|mvn|bazel|cmake|ctest|tox|"
    r"pytest|jest|vitest|webpack|xcodebuild|xcrun|swiftc|"
    r"go +(test|build)|swift +(build|test)|docker +build|"
    r"nvidia-smi|train)\b"
)
# high-confidence OS-only command fingerprints
MACOS_RE = re.compile(
    r"\b(xcodebuild|xcrun|xcode-select|codesign|notarytool|stapler|"
    r"pkgbuild|productbuild|hdiutil|lipo|otool|install_name_tool|vtool|"
    r"sw_vers|osascript|launchctl|diskutil|caffeinate|sips|plutil)\b"
    r"|apple-darwin|apple-macos|apple-ios|Mach-O|\.dylib\b|\.dmg\b")
LINUX_RE = re.compile(
    r"\b(apt|apt-get|dpkg|dpkg-deb|add-apt-repository|yum|dnf|rpm|pacman|"
    r"systemctl|journalctl|ldconfig|setcap|update-alternatives)\b"
    r"|linux-gnu|linux-musl|\.deb\b|\.rpm\b")


def allow():
    sys.exit(0)


def roster(cfg):
    out = []
    for h in (cfg.get("hosts") or []):
        if isinstance(h, dict) and str(h.get("host") or "").strip():
            out.append({"host": str(h["host"]).strip(),
                        "platform": (h.get("platform") or "linux")})
    # migrate a legacy single-host config
    if not out and cfg.get("host"):
        out.append({"host": str(cfg["host"]).strip(), "platform": "linux"})
    return out


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

hosts = roster(cfg)
workdir = (cfg.get("workdir") or "").strip()
if not hosts or not workdir:       # not armed → never route (safety)
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

# capability filter — restrict to a platform when the command demands one
why = "load-balanced"
if MACOS_RE.search(cmd):
    eligible = [h for h in hosts if h["platform"] == "macos"]
    why = "macOS-only command"
elif LINUX_RE.search(cmd):
    eligible = [h for h in hosts if h["platform"] == "linux"]
    why = "Linux-only command"
else:
    eligible = hosts
if not eligible:                   # nothing in the roster can run it → local
    allow()

# round-robin across the eligible hosts (minimal load balance)
rr_path = os.path.join(dd, ".rr")
try:
    n = int((open(rr_path, encoding="utf-8").read().strip() or "0"))
except Exception:
    n = 0
pick = eligible[n % len(eligible)]
try:
    with open(rr_path, "w", encoding="utf-8") as f:
        f.write(str((n + 1) % 1000000))
except Exception:
    pass
host = pick["host"]

remote = "cd %s && %s" % (shlex.quote(workdir), cmd)
new_cmd = "ssh %s %s  # %s" % (shlex.quote(host), shlex.quote(remote), MARK)

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "updatedInput": dict(ti, command=new_cmd),
        "additionalContext": (
            "wilson-pool: routed this heavy command to %s:%s via ssh "
            "(%s; %d-host roster; remote workdir is user-synced)."
            % (host, workdir, why, len(hosts))
        ),
    }
}))
