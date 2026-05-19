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
#   6. cwd-suicide    — `git worktree remove`, `rm -rf`, or `rmdir` whose
#                       target IS (or contains) the session's current
#                       cwd. After the call, every subsequent hook spawn
#                       posix_spawn-ENOENTs on the dead cwd until the
#                       session is restarted. realpath-compared (so
#                       /var ↔ /private/var symlink mismatches don't
#                       confuse it). Skipped when the same chain has a
#                       prior `cd` — the user is consciously moving out.
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


def _resolve(target, cwd):
    """Realpath a Bash-style target against `cwd`. Expands `~` and
    `$HOME`/`${HOME}`; resolves relative paths against `cwd`. Returns
    "" on any error — caller treats that as "can't decide, skip"."""
    if not target:
        return ""
    t = re.sub(r"^\$\{?HOME\}?", os.path.expanduser("~"), target)
    t = os.path.expanduser(t)
    if not os.path.isabs(t):
        if not cwd:
            return ""
        t = os.path.join(cwd, t)
    try:
        return os.path.realpath(t)
    except Exception:
        return ""


def _is_cwd_suicide(target, cwd):
    """True iff deleting `target` would wipe `cwd` itself or an ancestor
    of it — making the session's cwd vanish."""
    if not cwd:
        return False
    try:
        cr = os.path.realpath(cwd)
    except Exception:
        return False
    tr = _resolve(target, cwd)
    if not tr:
        return False
    return cr == tr or cr.startswith(tr + os.sep)


def _segment_targets_for_suicide(seg):
    """Return (cmd, [targets]) iff `seg` is one of the cwd-deletion shapes
    — `git [-C …] worktree remove [flags] <path>…`, `rm -r[f] <path>…`,
    or `rmdir <path>…`. None otherwise."""
    try:
        toks = shlex.split(seg)
    except ValueError:
        toks = seg.split()
    toks = _strip_sudo_env(toks)
    if not toks:
        return None
    cmd0 = os.path.basename(toks[0])
    targets = []

    if cmd0 == "git":
        # Skip git-level options like `-C <path>`, `--git-dir <path>`,
        # `--work-tree <path>`, etc., so `git -C foo worktree remove X`
        # is parsed correctly.
        i = 1
        while i < len(toks) and toks[i].startswith("-"):
            if toks[i] in ("-C", "--git-dir", "--work-tree",
                           "--namespace") and i + 1 < len(toks):
                i += 2
            else:
                i += 1
        if i + 1 >= len(toks) or toks[i] != "worktree" \
                or toks[i + 1] != "remove":
            return None
        for a in toks[i + 2:]:
            if not a.startswith("-"):
                targets.append(a)
        return ("git worktree remove", targets) if targets else None

    if cmd0 == "rm":
        recursive = False
        for a in toks[1:]:
            if a in ("-r", "-R", "--recursive", "--no-preserve-root"):
                recursive = True
            elif a.startswith("-") and not a.startswith("--") \
                    and ("r" in a or "R" in a):
                recursive = True
            elif not a.startswith("-"):
                targets.append(a)
        return ("rm -r", targets) if recursive and targets else None

    if cmd0 == "rmdir":
        for a in toks[1:]:
            if not a.startswith("-"):
                targets.append(a)
        return ("rmdir", targets) if targets else None

    return None


def _chain_has_prior_cd(segments, idx):
    """True iff any segment BEFORE `idx` is a `cd <somewhere>` — the user
    is moving the shell out before the deletion, so the suicide check
    should defer to that intent and not block."""
    for s in segments[:idx]:
        try:
            toks = shlex.split(s)
        except ValueError:
            toks = s.split()
        toks = _strip_sudo_env(toks)
        if toks and os.path.basename(toks[0]) == "cd":
            return True
    return False


def check_cwd_suicide(cmd_full, cwd):
    """Return a deny reason iff the full Bash command would delete `cwd`
    or an ancestor of it. Returns None for any uncertain case (e.g.
    unparseable command, target outside cwd, prior `cd` in the chain)."""
    if not cwd:
        return None
    segments = re.split(r"&&|\|\||[;\n]", cmd_full)
    for i, seg in enumerate(segments):
        if not seg.strip():
            continue
        parsed = _segment_targets_for_suicide(seg)
        if not parsed:
            continue
        if _chain_has_prior_cd(segments, i):
            continue  # user explicitly cd'd out earlier in the chain
        cmd_label, targets = parsed
        for t in targets:
            if _is_cwd_suicide(t, cwd):
                return ("`%s %s` would delete `%s` — the realpath of "
                        "that target IS (or contains) the session's "
                        "current cwd `%s`. After the call every "
                        "subsequent hook would posix_spawn-ENOENT on a "
                        "dead cwd. `cd` out of the worktree first (or "
                        "use `git -C <other> worktree remove ...` "
                        "AFTER `cd`-ing somewhere else)."
                        % (cmd_label, t, t, cwd))
    return None


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

    # cwd-suicide — looks at the chain as a whole so a prior `cd` can
    # waive the check (the user is moving the shell out first).
    cwd = payload.get("cwd") or os.environ.get("PWD") or ""
    hit = check_cwd_suicide(cmd, cwd)
    if hit:
        deny(hit)

    sys.exit(0)


if __name__ == "__main__":
    main()
