#!/usr/bin/env python3
# wilson-resume core — resume continuity across an abrupt session end.
#
# Why this plugin: a usage limit / rate-limit / crash / closed terminal
# ends a session mid-task. wilson-checkpoint already rescues the *files*
# (a non-destructive git stash). What it does NOT rescue is the *work
# narrative* — how far along the task was and what came next. After the
# transcript is gone the next session has the files but no thread.
#
# wilson-resume restores that thread. It owns the narrative layer only;
# file-state stays wilson-checkpoint's job (no stash duplication), and
# the goal line stays wilson-goal's job (no goal-text duplication) — the
# `## Resume` block sits next to wilson-goal's `## Goal` block.
#
# Capture is deterministic — no model cooperation, no slash command to
# remember. CC persists the model's own TodoWrite checklist to disk at
#   ~/.claude/todos/<session-id>-agent-<session-id>.json
# (a JSON array of {content, status, activeForm}). That IS the progress
# signal: count completed vs total, read the in-progress / next-pending
# item. The file survives a crash; CC just never re-surfaces it.
#
# Hooks:
#   Stop        → snapshot progress to <DATA>/<sha1(cwd)>.json (every turn
#                 — a crash never fires SessionEnd, so only a per-turn
#                 capture preserves the last completed turn).
#   SessionEnd  → flip clean_exit=true on the snapshot, so the next
#                 session can tell a clean stop from an abrupt kill.
#   SessionStart→ source in {startup,resume,clear}: re-inject a short
#                 `## Resume` briefing. source=compact is skipped
#                 (compaction is same-session — todos stay in-context).
#
# Storage is per-project (resume state is project-scoped, unlike
# wilson-goal's single global goal).
#
# Opt out per session: SIDECAR_NO_RESUME=1
import hashlib
import json
import os
import subprocess
import sys
import time

# Tail-only cap for the transcript read — the most recent user message
# is near the end, and this hook fires on every Stop. Bound the read at
# O(1) regardless of session size (per wilson-checkpoint / design D15).
TAIL_BYTES = 2 * 1024 * 1024


def disabled():
    try:
        if "resume" in json.load(open(os.path.join(
                os.path.expanduser("~"), ".claude", "sidecar",
                "disabled.json"), encoding="utf-8")):
            return True
    except Exception:
        pass
    return os.environ.get("SIDECAR_NO_RESUME") == "1"


def data_dir():
    d = os.environ.get("CLAUDE_PLUGIN_DATA") or os.path.join(
        os.path.expanduser("~"), ".claude", "plugin-data", "wilson-resume")
    os.makedirs(d, exist_ok=True)
    return d


def git(cwd, *args):
    try:
        p = subprocess.run(["git", "-C", cwd, *args],
                           capture_output=True, text=True, timeout=15)
        return p.returncode, p.stdout.strip(), p.stderr.strip()
    except Exception:
        return 1, "", "git-invoke-failed"


def project_key(cwd):
    """Per-project storage key — repo root if inside a git repo (stable
    across subdirs), else the cwd itself."""
    rc, root, _ = git(cwd, "rev-parse", "--show-toplevel")
    base = root if rc == 0 and root else (cwd or os.getcwd())
    return base, hashlib.sha1(
        base.encode("utf-8", "replace")).hexdigest()[:12]


def state_path(cwd):
    _, k = project_key(cwd)
    return os.path.join(data_dir(), "%s.json" % k)


def load_state(cwd):
    try:
        return json.load(open(state_path(cwd), encoding="utf-8"))
    except Exception:
        return {}


def save_state(cwd, d):
    p = state_path(cwd)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, p)


# --- signal collection -----------------------------------------------

def read_todos(session_id):
    """The model's own TodoWrite checklist for the main thread. CC keys
    it <session-id>-agent-<agent-id>.json; the main thread's agent-id
    equals the session-id. Never raises."""
    if not session_id:
        return []
    p = os.path.join(os.path.expanduser("~"), ".claude", "todos",
                     "%s-agent-%s.json" % (session_id, session_id))
    try:
        d = json.load(open(p, encoding="utf-8"))
        return d if isinstance(d, list) else []
    except Exception:
        return []


def todo_progress(todos):
    """(done, total, next_label) from a TodoWrite array."""
    total = len(todos)
    done = sum(1 for t in todos
               if isinstance(t, dict) and t.get("status") == "completed")
    nxt = ""
    for t in todos:  # in-progress wins as "next up"
        if isinstance(t, dict) and t.get("status") == "in_progress":
            nxt = t.get("activeForm") or t.get("content") or ""
            break
    if not nxt:
        for t in todos:  # else first pending
            if isinstance(t, dict) and t.get("status") == "pending":
                nxt = t.get("content") or ""
                break
    return done, total, " ".join(nxt.split())


def last_user_prompt(transcript):
    """Most recent user message text from the transcript JSONL. Reads
    only the file tail (<= TAIL_BYTES). Never raises."""
    try:
        if not transcript or not os.path.isfile(transcript):
            return ""
        size = os.path.getsize(transcript)
        with open(transcript, "rb") as fb:
            start = max(0, size - TAIL_BYTES)
            if start:
                fb.seek(start)
            blob = fb.read()
        if start:
            nl = blob.find(b"\n")
            blob = blob[nl + 1:] if nl != -1 else b""
        lines = blob.decode("utf-8", errors="replace").splitlines()[-400:]
        for ln in reversed(lines):
            try:
                e = json.loads(ln)
            except Exception:
                continue
            msg = e.get("message") or e
            if e.get("type") == "user" or msg.get("role") == "user":
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


def git_state(cwd):
    rc, branch, _ = git(cwd, "rev-parse", "--abbrev-ref", "HEAD")
    if rc != 0:
        return None, 0
    rc, raw, _ = git(cwd, "status", "--porcelain")
    dirty = len([x for x in raw.splitlines() if x.strip()]) if rc == 0 else 0
    return (branch or None), dirty


# --- hook handlers ----------------------------------------------------

def capture(payload, cwd):
    """Stop hook — snapshot the progress narrative for this project."""
    sid = payload.get("session_id") or payload.get("sessionId") or ""
    todos = read_todos(sid)
    done, total, nxt = todo_progress(todos)
    prompt = last_user_prompt(payload.get("transcript_path")
                              or payload.get("transcriptPath"))
    branch, dirty = git_state(cwd)
    if not total and not prompt and branch is None:
        return  # no signal worth a snapshot
    base, _ = project_key(cwd)
    save_state(cwd, {
        "cwd": cwd,
        "project": base,
        "session_id": sid,
        "ts": int(time.time()),
        "iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "clean_exit": False,
        "last_user_prompt": prompt,
        "todo_done": done,
        "todo_total": total,
        "next_up": nxt,
        "todos": [{"content": t.get("content", ""),
                   "status": t.get("status", "")}
                  for t in todos if isinstance(t, dict)][:30],
        "git_branch": branch,
        "git_dirty": dirty,
    })


def mark_clean(payload, cwd):
    """SessionEnd hook — flip the clean-exit flag for this session's
    snapshot so the next session knows the stop was not abrupt."""
    s = load_state(cwd)
    if not s:
        return
    sid = payload.get("session_id") or payload.get("sessionId") or ""
    # only mark our own snapshot — a newer session may have overwritten it
    if sid and s.get("session_id") and s["session_id"] != sid:
        return
    s["clean_exit"] = True
    try:
        save_state(cwd, s)
    except Exception:
        pass


def briefing(s):
    done = s.get("todo_done", 0)
    total = s.get("todo_total", 0)
    lines = ["## Resume", "",
             "Picking up where the previous session in this project left "
             "off (restored from disk — survives a usage-limit / "
             "rate-limit / crash):", ""]
    if s.get("clean_exit"):
        lines.append("- Previous session ended **cleanly**.")
    else:
        lines.append("- Previous session ended **abruptly** — no clean "
                     "exit (usage limit / rate-limit / crash likely). "
                     "Uncommitted work, if any, is recoverable via "
                     "wilson-checkpoint.")
    if total:
        lines.append("- Progress: **%d / %d** todos completed."
                     % (done, total))
        if s.get("next_up"):
            lines.append("- Next up: **%s**" % s["next_up"])
    else:
        lines.append("- No TodoWrite checklist was used last session — "
                     "progress below is coarse (git + last request only).")
    if s.get("last_user_prompt"):
        lines.append("- Last request: \"%s\"" % s["last_user_prompt"])
    if s.get("git_branch"):
        d = s.get("git_dirty", 0)
        lines.append("- Working tree: branch `%s` · %s"
                     % (s["git_branch"],
                        "%d file(s) with uncommitted changes" % d if d
                        else "clean"))
    todos = s.get("todos") or []
    if todos:
        mark = {"completed": "✅", "in_progress": "🔸", "pending": "◻"}
        lines.append("")
        for t in todos[:12]:
            lines.append("  %s %s" % (mark.get(t.get("status"), "·"),
                                      t.get("content", "")))
        if len(todos) > 12:
            lines.append("  … +%d more" % (len(todos) - 12))
    when = s.get("iso") or ""
    lines += ["",
              "Snapshot from %s. Dismiss with `/wilson-resume clear`."
              % when]
    return "\n".join(lines) + "\n"


def session_start(payload, cwd):
    source = (payload.get("source") or payload.get("hookSource")
              or "startup")
    # compaction is same-session (todos stay in-context) — PostCompact
    # territory; only fresh starts / resumes / clears need the briefing.
    if source not in ("startup", "resume", "clear"):
        sys.exit(0)
    s = load_state(cwd)
    if not s:
        sys.exit(0)
    total = s.get("todo_total", 0)
    done = s.get("todo_done", 0)
    incomplete = total > 0 and done < total
    # Worth a briefing only if there is something to resume: an abrupt
    # exit (the note itself is the value) OR unfinished todos. A clean
    # exit with nothing unfinished → stay quiet, don't nag.
    if s.get("clean_exit") and not incomplete:
        sys.exit(0)
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": briefing(s)}}))
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
        session_start(payload, cwd)
    elif event == "Stop":
        capture(payload, cwd)
    elif event == "SessionEnd":
        mark_clean(payload, cwd)
    sys.exit(0)


# --- slash command ----------------------------------------------------

def p(*a):
    print("wilson-resume:", *a)


def cmd(args):
    cwd = os.getcwd()
    sub = (args[0] if args else "status").strip().lower()

    if sub in ("", "status", "show"):
        s = load_state(cwd)
        if not s:
            print("wilson-resume — no snapshot for this project yet "
                  "(%s)." % state_path(cwd))
            print("  A snapshot is written automatically on every turn "
                  "(Stop hook). Nothing to set by hand.")
            return
        print("wilson-resume — last snapshot for %s:"
              % s.get("project", cwd))
        print()
        print("  when:        %s" % s.get("iso", "?"))
        print("  ended:       %s" % ("cleanly" if s.get("clean_exit")
                                     else "abruptly (no clean exit)"))
        if s.get("todo_total"):
            print("  progress:    %d / %d todos done"
                  % (s.get("todo_done", 0), s["todo_total"]))
            if s.get("next_up"):
                print("  next up:     %s" % s["next_up"])
        else:
            print("  progress:    no TodoWrite checklist last session")
        if s.get("last_user_prompt"):
            print("  last request: %s" % s["last_user_prompt"])
        if s.get("git_branch"):
            print("  working tree: branch %s · %d dirty file(s)"
                  % (s["git_branch"], s.get("git_dirty", 0)))
        print("  state:       %s" % state_path(cwd))
        return

    if sub == "clear":
        sp = state_path(cwd)
        try:
            os.remove(sp)
            p("snapshot cleared for this project.")
        except FileNotFoundError:
            p("no snapshot to clear for this project.")
        return

    if sub == "path":
        sp = state_path(cwd)
        print("wilson-resume — paths:")
        print("  snapshot: %s  (%s)"
              % (sp, "exists" if os.path.isfile(sp) else "absent"))
        print("  data dir: %s" % data_dir())
        return

    p("unknown subcommand %r. Use: status | show | clear | path" % sub)


def main():
    if disabled():
        sys.exit(0)
    if len(sys.argv) > 1 and sys.argv[1] == "cmd":
        cmd(sys.argv[2:])
    else:
        hook()


if __name__ == "__main__":
    main()
