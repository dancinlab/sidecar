#!/usr/bin/env python3
# wilson-checkpoint core — keep an always-fresh, non-destructive snapshot
# of work-in-progress so a usage limit / rate-limit / crash / closed
# terminal never loses it.
#
# A Claude Code hook CANNOT observe the "you hit your limit" event (it is
# a client control-plane signal, not delivered to hooks). So instead of
# reacting to the limit, this snapshots every turn:
#
#   Stop / PreCompact / SessionEnd
#       → `git stash create` (a dangling commit built from the working
#         tree + index — it does NOT touch the working tree, the index,
#         the stash list, or any branch), pinned under
#         refs/wilson-checkpoint/<key>/<ts> so git GC won't drop it, plus
#         a human resume note + a JSONL journal entry.
#   SessionStart
#       → if an un-consumed snapshot with WIP exists for this repo, inject
#         a short recovery note so the next session can continue.
#
# Nothing is ever auto-applied (applying a stash onto a dirty tree can
# conflict) — restoring is always an explicit, printed command.
#
# Opt out per session: SIDECAR_NO_CHECKPOINT=1
import hashlib
import json
import os
import subprocess
import sys
import time

KEEP = 20  # newest checkpoint refs retained per repo


def out(obj):
    sys.stdout.write(json.dumps(obj))


def data_dir():
    d = os.environ.get("CLAUDE_PLUGIN_DATA") or os.path.join(
        os.path.expanduser("~"), ".claude", "plugin-data",
        "wilson-checkpoint")
    os.makedirs(d, exist_ok=True)
    return d


def git(cwd, *args):
    try:
        p = subprocess.run(["git", "-C", cwd, *args],
                            capture_output=True, text=True, timeout=30)
        return p.returncode, p.stdout.strip(), p.stderr.strip()
    except Exception:
        return 1, "", "git-invoke-failed"


def repo_root(cwd):
    rc, root, _ = git(cwd, "rev-parse", "--show-toplevel")
    return root if rc == 0 and root else None


def dirty(repo):
    """(raw, files) of the working tree. NUL-delimited and UNstripped —
    a leading-space porcelain status (` M path`) must keep its column."""
    try:
        p = subprocess.run(
            ["git", "-C", repo, "status", "--porcelain", "-z"],
            capture_output=True, text=True, timeout=30)
    except Exception:
        return "", []
    if p.returncode != 0:
        return "", []
    raw = p.stdout
    files = []
    for chunk in raw.split("\0"):
        if not chunk:
            continue
        files.append(chunk[3:] if len(chunk) > 3 and chunk[2] == " "
                     else chunk)
    return raw, files


def key(repo):
    return hashlib.sha1(repo.encode("utf-8", "replace")).hexdigest()[:12]


def paths(repo):
    d, k = data_dir(), key(repo)
    return {
        "journal": os.path.join(d, "journal-%s.jsonl" % k),
        "resume": os.path.join(d, "resume-%s.md" % k),
        "consumed": os.path.join(d, "consumed-%s" % k),
        "laststate": os.path.join(d, "laststate-%s" % k),
        "key": k,
    }


def last_user_prompt(transcript):
    """Best-effort: pull the most recent user message text from the
    transcript JSONL. Never raises."""
    try:
        if not transcript or not os.path.isfile(transcript):
            return ""
        with open(transcript, encoding="utf-8", errors="replace") as f:
            lines = f.readlines()[-400:]
        for ln in reversed(lines):
            try:
                e = json.loads(ln)
            except Exception:
                continue
            msg = e.get("message") or e
            if (e.get("type") == "user" or msg.get("role") == "user"):
                c = msg.get("content")
                if isinstance(c, str):
                    txt = c
                elif isinstance(c, list):
                    txt = " ".join(b.get("text", "") for b in c
                                   if isinstance(b, dict))
                else:
                    txt = ""
                txt = " ".join(txt.split())
                if txt:
                    return txt[:240]
    except Exception:
        pass
    return ""


def snapshot(cwd, transcript, event):
    repo = repo_root(cwd)
    if not repo:
        return  # git-stash strategy → nothing to do outside a git repo
    raw, files = dirty(repo)
    if not raw:
        return  # clean tree → nothing to lose
    P = paths(repo)
    state_h = hashlib.sha1(raw.encode("utf-8", "replace")).hexdigest()
    try:
        if open(P["laststate"], encoding="utf-8").read().strip() == state_h:
            return  # unchanged since last checkpoint → debounce (no spam)
    except Exception:
        pass

    rc, sha, _ = git(repo, "stash", "create",
                      "wilson-checkpoint %s" % event)
    if rc != 0 or not sha:
        return
    ts = int(time.time())
    ref = "refs/wilson-checkpoint/%s/%d" % (P["key"], ts)
    git(repo, "update-ref", ref, sha)  # pin so GC keeps the dangling commit

    _, branch, _ = git(repo, "rev-parse", "--abbrev-ref", "HEAD")
    _, head, _ = git(repo, "rev-parse", "--short", "HEAD")
    prompt = last_user_prompt(transcript)

    rec = {"ts": ts, "iso": time.strftime("%Y-%m-%dT%H:%M:%SZ",
           time.gmtime(ts)), "event": event, "repo": repo,
           "branch": branch, "head": head, "stash": sha,
           "n": len(files), "files": files[:50], "prompt": prompt}
    try:
        with open(P["journal"], "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    except Exception:
        pass

    note = (
        "## Recovered checkpoint\n\n"
        "wilson-checkpoint saved work-in-progress that was **not yet "
        "committed** when the previous session ended (a usage limit, "
        "rate-limit, crash or closed terminal does not lose it):\n\n"
        "- when: `%s`  ·  branch: `%s`  ·  HEAD `%s`\n"
        "- %d changed file(s): %s\n"
        "- WIP stash commit: `%s`\n\n"
        "Restore the changes into the working tree with:\n\n"
        "```\ngit -C %s stash apply %s\n```\n\n"
        "(inspect first: `git -C %s stash show -p %s`). Run "
        "`/wilson-checkpoint:checkpoint done` once handled to stop this "
        "notice.\n"
        % (rec["iso"], branch, head, len(files),
           ", ".join(files[:8]) + (" …" if len(files) > 8 else ""),
           sha, repo, sha, repo, sha))
    try:
        with open(P["resume"], "w", encoding="utf-8") as f:
            f.write(note)
        with open(P["laststate"], "w", encoding="utf-8") as f:
            f.write(state_h)
    except Exception:
        pass

    # prune: keep only the newest KEEP refs for this repo
    rc, refs, _ = git(repo, "for-each-ref", "--format=%(refname)",
                       "refs/wilson-checkpoint/%s" % P["key"])
    if rc == 0 and refs:
        rl = sorted(refs.splitlines(),
                    key=lambda r: int(r.rsplit("/", 1)[-1]))
        for r in rl[:-KEEP]:
            git(repo, "update-ref", "-d", r)


def session_start(cwd):
    repo = repo_root(cwd)
    if not repo:
        sys.exit(0)
    P = paths(repo)
    if not os.path.isfile(P["resume"]):
        sys.exit(0)
    try:
        last = None
        with open(P["journal"], encoding="utf-8") as f:
            for ln in f:
                last = ln
        ts = json.loads(last)["ts"] if last else 0
    except Exception:
        ts = 0
    try:
        consumed = float(open(P["consumed"], encoding="utf-8").read().strip())
    except Exception:
        consumed = -1
    if ts <= consumed:
        sys.exit(0)  # already handled — stay quiet
    try:
        note = open(P["resume"], encoding="utf-8").read()
    except Exception:
        sys.exit(0)
    out({"hookSpecificOutput": {
        "hookEventName": "SessionStart", "additionalContext": note}})
    sys.exit(0)


def hook():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    event = payload.get("hook_event_name") or payload.get(
        "hookEventName") or ""
    cwd = payload.get("cwd") or os.getcwd()
    if event == "SessionStart":
        session_start(cwd)
    elif event in ("Stop", "PreCompact", "SessionEnd"):
        snapshot(cwd, payload.get("transcript_path"), event)
    sys.exit(0)


def cmd(args):
    cwd = os.getcwd()
    repo = repo_root(cwd)
    if not repo:
        print("wilson-checkpoint: not a git repository — the git-stash "
              "checkpoint strategy needs one.")
        return
    P = paths(repo)
    sub = (args[0] if args else "status").strip().lower()
    entries = []
    try:
        with open(P["journal"], encoding="utf-8") as f:
            entries = [json.loads(x) for x in f if x.strip()]
    except Exception:
        pass

    if sub in ("", "status", "list"):
        if not entries:
            print("wilson-checkpoint: no snapshots for this repo yet "
                  "(clean tree, or nothing has been edited).")
            return
        last = entries[-1]
        print("wilson-checkpoint — %s" % repo)
        print("  latest: %s · branch %s · HEAD %s · %d file(s) · stash %s"
              % (last["iso"], last["branch"], last["head"], last["n"],
                 last["stash"][:12]))
        if last.get("prompt"):
            print("  last prompt: %s" % last["prompt"])
        print("  restore:  git -C %s stash apply %s"
              % (repo, last["stash"]))
        print("  recent (%d kept):" % KEEP)
        for e in entries[-8:][::-1]:
            print("    %s  %-10s %s  %2d file(s)  %s"
                  % (e["iso"], e["event"], e["head"], e["n"],
                     e["stash"][:12]))
        print("  journal: %s" % P["journal"])
        return
    if sub == "restore":
        sha = args[1] if len(args) > 1 else (
            entries[-1]["stash"] if entries else "")
        if not sha:
            print("wilson-checkpoint: nothing to restore.")
            return
        print("wilson-checkpoint: run this to restore (NOT auto-applied "
              "— may conflict with current changes):\n")
        print("    git -C %s stash apply %s" % (repo, sha))
        print("\ninspect first:  git -C %s stash show -p %s" % (repo, sha))
        return
    if sub == "done":
        ts = entries[-1]["ts"] if entries else int(time.time())
        with open(P["consumed"], "w", encoding="utf-8") as f:
            f.write(str(ts))
        print("wilson-checkpoint: marked handled — SessionStart will stay "
              "quiet until the next snapshot.")
        return
    if sub == "clear":
        rc, refs, _ = git(repo, "for-each-ref", "--format=%(refname)",
                          "refs/wilson-checkpoint/%s" % P["key"])
        n = 0
        if rc == 0 and refs:
            for r in refs.splitlines():
                git(repo, "update-ref", "-d", r)
                n += 1
        for p in (P["journal"], P["resume"], P["consumed"],
                  P["laststate"]):
            try:
                os.remove(p)
            except OSError:
                pass
        print("wilson-checkpoint: cleared — %d ref(s) + journal/resume "
              "removed for this repo." % n)
        return
    print("wilson-checkpoint: unknown subcommand %r. Use: status | "
          "restore [sha] | done | clear" % sub)


def disabled():
    # sidecar control — no-op when /sidecar disabled this plugin
    try:
        return "checkpoint" in json.load(open(os.path.join(
            os.path.expanduser("~"), ".claude", "sidecar",
            "disabled.json"), encoding="utf-8"))
    except Exception:
        return False


def main():
    if disabled() or os.environ.get("SIDECAR_NO_CHECKPOINT") == "1":
        sys.exit(0)
    mode = sys.argv[1] if len(sys.argv) > 1 else "hook"
    if mode == "cmd":
        cmd(sys.argv[2:])
    else:
        hook()


if __name__ == "__main__":
    main()
