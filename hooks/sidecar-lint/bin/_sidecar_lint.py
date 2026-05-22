#!/usr/bin/env python3
# sidecar-lint — PreToolUse(Bash) auto-check on `git commit` for Claude Code
# marketplace plugin packs. Non-blocking — emits additionalContext findings.
#
# Fires only when:
#   * tool_name == Bash
#   * tool_input.command contains `git commit` (as a verb, not in a quoted arg)
#   * the cwd's git repo root has .claude-plugin/marketplace.json
#
# Checks:
#   1. Staged diff added lines for stale-history patterns        (commons @D g15)
#   2. Staged diff added lines for hardcoded /Users//home/ paths (commons @D g13 / sidecar @D s3)
#   3. marketplace.json plugin entry vs each plugin.json: version drift
#      (description drift intentionally NOT checked — too noisy)         (commons @D g22)
#   4. hooks/*/bin/*.sh missing user-exec bit (PreToolUse fires die otherwise)
#
# Self-exclusion: lines under hooks/sidecar-lint/ and CHANGELOG.md are skipped
# in staged-diff checks so the plugin's own pattern documentation + the
# legitimate history surface don't trip the lint.
#
# Opt out:
#   * SIDECAR_NO_LINT=1
#   * ~/.claude/sidecar/disabled.json  ->  {"disabled": ["sidecar-lint", ...]}

import json
import os
import re
import subprocess
import sys

EVENT = "PreToolUse"
SELF_EXCLUDE = ("hooks/sidecar-lint/", "CHANGELOG.md")

STALE_HIST = re.compile(
    r"(?i)("
    r"removed in \d+\.\d+(?:\.\d+)?"
    r"|replaces [@a-z0-9_/-]+"
    r"|migrated from [a-z]"
    r"|archived 20\d\d-\d\d-\d\d"
    r"|deprecated as of [a-z0-9]"
    r"|formerly known as [a-z0-9]"
    r"|previously named [a-z0-9]"
    r")"
)
HARDPATH = re.compile(r"(?:/Users|/home)/[a-zA-Z0-9._-]+/")


def allow():
    sys.exit(0)


def emit(text):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": EVENT,
        "additionalContext": text,
    }}))
    sys.exit(0)


def disabled():
    try:
        path = os.path.join(os.path.expanduser("~"),
                            ".claude", "sidecar", "disabled.json")
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        return "sidecar-lint" in d.get("disabled", [])
    except Exception:
        return False


def repo_root():
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, timeout=2)
        if out.returncode == 0:
            return out.stdout.strip()
    except Exception:
        pass
    return None


def staged_added_lines(root):
    try:
        out = subprocess.run(
            ["git", "diff", "--cached", "--no-color", "-U0"],
            capture_output=True, text=True, cwd=root, timeout=5)
        if out.returncode != 0:
            return []
    except Exception:
        return []
    rows = []
    current = ""
    for line in out.stdout.splitlines():
        if line.startswith("+++ b/"):
            current = line[6:]
        elif line.startswith("+") and not line.startswith("+++"):
            rows.append((current, line[1:]))
    return rows


def check_staged(root):
    hist, paths = [], []
    for p, body in staged_added_lines(root):
        if p.startswith(SELF_EXCLUDE) or p == "CHANGELOG.md":
            continue
        if STALE_HIST.search(body):
            hist.append(f"  {p}: {body.strip()[:140]}")
        if HARDPATH.search(body):
            stripped = body.lstrip()
            if not stripped.startswith(("#", "//", "--", "*")):
                paths.append(f"  {p}: {body.strip()[:140]}")
    return hist[:5], paths[:5]


def check_marketplace(root):
    manifest = os.path.join(root, ".claude-plugin", "marketplace.json")
    if not os.path.exists(manifest):
        return []
    try:
        with open(manifest, encoding="utf-8") as f:
            m = json.load(f)
    except Exception:
        return []
    findings = []
    for p in m.get("plugins", []):
        src = p.get("source", "").lstrip("./")
        if not src:
            continue
        pjson = os.path.join(root, src, ".claude-plugin", "plugin.json")
        if not os.path.exists(pjson):
            continue
        try:
            with open(pjson, encoding="utf-8") as f:
                pj = json.load(f)
        except Exception:
            continue
        name = p.get("name") or src
        mv, pv = p.get("version"), pj.get("version")
        if mv and pv and mv != pv:
            findings.append(
                f"  {name}: marketplace.json={mv} vs plugin.json={pv} "
                f"(version drift)")
    return findings[:8]


def check_exec_bits(root):
    findings = []
    hooks_dir = os.path.join(root, "hooks")
    if not os.path.isdir(hooks_dir):
        return findings
    for dirpath, _, filenames in os.walk(hooks_dir):
        if os.path.sep + "bin" not in dirpath:
            continue
        for fn in filenames:
            if not fn.endswith(".sh"):
                continue
            full = os.path.join(dirpath, fn)
            try:
                if not (os.stat(full).st_mode & 0o100):
                    findings.append(
                        f"  {os.path.relpath(full, root)}: "
                        f"missing user-exec bit (chmod +x)")
            except Exception:
                continue
    return findings[:5]


def is_git_commit(cmd):
    return bool(re.search(r"(?:^|[\s;&|`(])git\s+commit\b", cmd))


def main():
    if disabled():
        allow()
    if os.environ.get("SIDECAR_NO_LINT") == "1":
        allow()

    try:
        payload = json.load(sys.stdin)
    except Exception:
        allow()
    if payload.get("tool_name") != "Bash":
        allow()
    cmd = (payload.get("tool_input") or {}).get("command", "")
    if not cmd or not is_git_commit(cmd):
        allow()

    root = repo_root()
    if not root:
        allow()
    if not os.path.exists(os.path.join(root, ".claude-plugin",
                                       "marketplace.json")):
        allow()

    hist, paths = check_staged(root)
    drift = check_marketplace(root)
    noexec = check_exec_bits(root)

    sections = []
    if hist:
        sections.append(
            "stale-history patterns in staged diff "
            "(commons @D g15 — write current-state only):\n"
            + "\n".join(hist))
    if paths:
        sections.append(
            "hardcoded absolute paths in staged diff "
            "(commons @D g13 / sidecar @D s3 — "
            "use $HOME / ${CLAUDE_PLUGIN_ROOT} / $CLAUDE_PLUGIN_DATA):\n"
            + "\n".join(paths))
    if drift:
        sections.append(
            "marketplace.json ↔ plugin.json version drift "
            "(commons @D g22 — lockstep version surfaces):\n"
            + "\n".join(drift))
    if noexec:
        sections.append(
            "hook .sh missing user-exec bit "
            "(PreToolUse / SessionStart fires die with Permission denied):\n"
            + "\n".join(noexec))

    if not sections:
        allow()

    emit("sidecar-lint findings (non-blocking — opt out: SIDECAR_NO_LINT=1):"
         "\n\n" + "\n\n".join(sections))


if __name__ == "__main__":
    main()
