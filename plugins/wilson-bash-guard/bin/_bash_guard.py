#!/usr/bin/env python3
# wilson-bash-guard core — deny catastrophic Bash commands at PreToolUse.
#
# Covers the destructive shell patterns that wilson-git-guard (force-push)
# and wilson-dangerous-path (protected-path writes) do NOT:
#
#   1. pipe-to-shell  — a network downloader piped into an interpreter
#                       (`curl ... | sh`, `bash <(curl ...)`, `sh -c
#                       "$(curl ...)"`) — the #1 supply-chain vector.
#   2. rm -rf root    — a recursive `rm` whose target is `/`, `~`, `$HOME`,
#                       `*`, `.`, or a top-level system dir.
#   3. fork bomb      — `:(){ :|:& };:` and spelling variants.
#   4. disk destroyer — `dd of=/dev/disk*`, `mkfs*`, `> /dev/sd*`.
#   5. recursive chmod/chown on `/`, `~`, or `.`.
#
# High-confidence patterns ONLY — near-zero false positives by design.
# SQL injection is deliberately NOT matched: a `psql -c "...$x..."` is not
# distinguishable from a legitimate parametrised query without semantic
# analysis, so flagging it would be guesswork. Use a real SQL linter.
#
# Opt out per session: SIDECAR_NO_BASH_GUARD=1
import json
import os
import re
import shlex
import sys

# sidecar control — no-op when /sidecar disabled this plugin
try:
    if "bash-guard" in json.load(open(os.path.join(
            os.path.expanduser("~"), ".claude", "sidecar",
            "disabled.json"), encoding="utf-8")):
        sys.exit(0)
except SystemExit:
    raise
except Exception:
    pass

if os.environ.get("SIDECAR_NO_BASH_GUARD") == "1":
    sys.exit(0)

# --- catastrophic filesystem targets (normalised, no trailing slash) ----
_SYS_TOPS = ("usr", "etc", "bin", "sbin", "var", "lib", "lib64", "opt",
             "boot", "dev", "proc", "sys", "root", "home",
             "System", "Library", "Applications", "Users")
CATASTROPHIC = {"/", "/*", "~", "~/*", "*", ".", "..", "./*", "../*"}
for _t in _SYS_TOPS:
    CATASTROPHIC.add("/" + _t)
    CATASTROPHIC.add("/" + _t + "/*")

# downloader piped / substituted into an interpreter
_DL = r"(?:curl|wget|fetch|http|https)\b"
_INTERP = r"(?:sudo\s+)?(?:sh|bash|zsh|dash|ksh|fish|python3?|perl|ruby|node)\b"
PIPE_TO_SHELL = re.compile(
    _DL + r"[^\n]*\|\s*" + _INTERP +              # curl ... | sh
    r"|" + _INTERP + r"[^\n]*<\(\s*" + _DL +      # bash <(curl ...)
    r"|(?:eval|" + _INTERP + r"[^\n]*-c)\s+[\"']?\$\(\s*" + _DL,  # sh -c "$(curl
)
FORK_BOMB = re.compile(r":\s*\(\s*\)\s*\{[^}]*\|[^}]*&[^}]*\}\s*;?\s*:"
                       r"|\.?\w*\(\)\s*\{\s*\w*\s*\|\s*\w*\s*&\s*\}\s*;")
DISK_DESTROYER = re.compile(
    r"\bdd\b[^\n]*\bof=/dev/(?:disk|rdisk|sd|hd|nvme|mmcblk|vd)"
    r"|\bmkfs(?:\.\w+)?\b"
    r"|>\s*/dev/(?:disk|rdisk|sd|hd|nvme|mmcblk|vd)\w*")


def _blank_inert_quotes(s):
    """Blank the *inside* of quoted runs that carry no command
    substitution, so a literal like `echo "curl | sh"` is not mistaken
    for a real pipeline. Single quotes are always inert; a double-quoted
    run is kept verbatim only if it contains `$(` or a backtick (live
    substitution). Used for whole-command pattern scans only."""
    out = []
    i, n = [], len(s)
    i = 0
    while i < n:
        c = s[i]
        if c in "'\"":
            j = i + 1
            while j < n and s[j] != c:
                j += 1
            inner = s[i + 1:j]
            live = c == '"' and ("$(" in inner or "`" in inner)
            if live:
                out.append(s[i:j + 1])
            else:
                out.append(" " * (j - i + 1))
            i = j + 1
        else:
            out.append(c)
            i += 1
    return "".join(out)


def _norm_target(tok):
    """Lower-risk normalisation of an rm/chmod argument to compare to
    CATASTROPHIC. Strips a trailing slash; maps $HOME/${HOME} to ~."""
    t = tok.strip()
    t = re.sub(r"^\$\{?HOME\}?", "~", t)
    if len(t) > 1 and t.endswith("/"):
        t = t[:-1]
    return t


def _strip_sudo_env(toks):
    """Drop a leading `sudo`/`env`/`command` (+ their options) so the real
    command word is toks[0]."""
    i = 0
    while i < len(toks) and toks[i] in ("sudo", "env", "command", "nice",
                                        "nohup", "time", "exec", "builtin"):
        i += 1
        while i < len(toks) and toks[i].startswith("-"):
            i += 1
        if toks[i - 1:i] and toks[i - 1] == "env":
            while i < len(toks) and "=" in toks[i] and not \
                    toks[i].startswith("-"):
                i += 1
    return toks[i:]


def check_segment(seg):
    """Inspect one simple command for rm / chmod / chown abuse."""
    try:
        toks = shlex.split(seg)
    except ValueError:
        toks = seg.split()
    toks = _strip_sudo_env(toks)
    if not toks:
        return None
    cmd = os.path.basename(toks[0])
    args = toks[1:]

    if cmd == "rm":
        recursive = "--no-preserve-root" in args
        targets = []
        for a in args:
            if a == "--no-preserve-root":
                recursive = True
            elif a in ("-r", "-R", "--recursive"):
                recursive = True
            elif a.startswith("-") and not a.startswith("--") and \
                    ("r" in a or "R" in a):
                recursive = True
            elif not a.startswith("-"):
                targets.append(a)
        if recursive:
            for t in targets:
                if _norm_target(t) in CATASTROPHIC:
                    return ("`rm` would recursively delete `%s` — a "
                            "root, home, or system path. This is almost "
                            "never intentional." % t)
        return None

    if cmd in ("chmod", "chown", "chgrp"):
        recursive = any(a in ("-R", "--recursive") or
                        (a.startswith("-") and not a.startswith("--")
                         and "R" in a) for a in args)
        if recursive:
            for a in args:
                if not a.startswith("-") and _norm_target(a) in CATASTROPHIC:
                    return ("`%s -R` would recurse over `%s` — a root, "
                            "home, or system path, breaking ownership / "
                            "permissions tree-wide." % (cmd, a))
        return None
    return None


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    if payload.get("tool_name") != "Bash":
        sys.exit(0)
    ti = payload.get("tool_input") or {}
    cmd = (ti.get("command") or "") if isinstance(ti, dict) else ""
    if not cmd.strip():
        sys.exit(0)

    def deny(reason):
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                "wilson-bash-guard: %s Blocked at PreToolUse — if you "
                "truly intend this, run it by hand. Opt out: "
                "SIDECAR_NO_BASH_GUARD=1." % reason)}}))
        sys.exit(0)

    # whole-command patterns — scanned with inert quoted literals blanked
    # so a string like `echo "curl | sh"` is not a false positive.
    scan = _blank_inert_quotes(cmd)
    if PIPE_TO_SHELL.search(scan):
        deny("this pipes a network download straight into a shell / "
             "interpreter (`curl … | sh`). Download the script to a "
             "file, read it, then run it.")
    if FORK_BOMB.search(scan):
        deny("this looks like a fork bomb — it self-replicates until the "
             "machine is unusable.")
    if DISK_DESTROYER.search(scan):
        deny("this writes directly to a raw disk device / formats a "
             "filesystem — it can irrecoverably destroy data.")

    # per-simple-command patterns
    for seg in re.split(r"&&|\|\||[;|\n]", cmd):
        if seg.strip():
            hit = check_segment(seg)
            if hit:
                deny(hit)
    sys.exit(0)


if __name__ == "__main__":
    main()
