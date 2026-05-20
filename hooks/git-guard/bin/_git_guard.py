#!/usr/bin/env python3
# git-guard — PreToolUse(Bash) deny for force / hook-bypass git operations.
#
# Patterns blocked:
#   git push --force      / git push -f
#   git push --force-with-lease
#   git push <remote> +<refspec>   (refspec-level force)
#   git commit --no-verify
#   git merge  --no-verify
#   git rebase --no-verify
#
# Opt out: SIDECAR_NO_GIT_GUARD=1 (logged in the deny payload so opt-out
# is visible, not silent). Sidecar /sidecar disable surface also honored.
import json, os, re, sys

EVENT = "PreToolUse"

PATTERNS = [
    (re.compile(r"\bgit\s+push\b[^\n]*\s(-f|--force)(\s|$)"),
     "git push --force / -f"),
    (re.compile(r"\bgit\s+push\b[^\n]*\s--force-with-lease(\s|=|$)"),
     "git push --force-with-lease"),
    (re.compile(r"\bgit\s+push\b\s+\S+\s+\+\S+"),
     "git push <remote> +<refspec> (refspec-level force)"),
    (re.compile(r"\bgit\s+commit\b[^\n]*\s--no-verify(\s|$)"),
     "git commit --no-verify (hook bypass)"),
    (re.compile(r"\bgit\s+merge\b[^\n]*\s--no-verify(\s|$)"),
     "git merge --no-verify (hook bypass)"),
    (re.compile(r"\bgit\s+rebase\b[^\n]*\s--no-verify(\s|$)"),
     "git rebase --no-verify (hook bypass)"),
]


def allow():
    sys.exit(0)


def deny(reason):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": EVENT, "permissionDecision": "deny",
        "permissionDecisionReason": reason}}))
    sys.exit(0)


def main():
    # sidecar control — no-op when disabled
    try:
        if "git-guard" in json.load(open(os.path.join(
                os.path.expanduser("~"), ".claude", "sidecar",
                "disabled.json"), encoding="utf-8")):
            allow()
    except SystemExit:
        raise
    except Exception:
        pass

    if os.environ.get("SIDECAR_NO_GIT_GUARD") == "1":
        allow()

    try:
        payload = json.load(sys.stdin)
    except Exception:
        allow()
    if payload.get("tool_name") != "Bash":
        allow()
    ti = payload.get("tool_input") or {}
    cmd = ti.get("command") if isinstance(ti, dict) else ""
    if not cmd:
        allow()

    for pat, label in PATTERNS:
        if pat.search(cmd):
            snippet = cmd if len(cmd) <= 180 else cmd[:177] + "..."
            deny("GIT_GUARD_BLOCK { pattern: %s, command: %s, action: this "
                 "operation rewrites or bypasses safety. To override, set "
                 "SIDECAR_NO_GIT_GUARD=1 }" % (label, snippet))
    allow()


if __name__ == "__main__":
    main()
