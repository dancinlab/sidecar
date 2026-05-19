#!/usr/bin/env python3
# wilson-resume core — persistence + re-arm companion for Claude Code's
# NATIVE /goal command.
#
# CC's native /goal (v2.1.139+) sets a completion condition and keeps
# Claude working turn-to-turn until an evaluator decides the condition
# is met. But that condition is SESSION-SCOPED — it lives in session
# memory and the transcript, with NO disk persistence. A hard
# interruption (usage limit / rate-limit / crash / a closed terminal
# you never cleanly `--resume`) loses it: the next session has no idea
# a goal was ever active, and you must remember and re-type it.
#
# wilson-resume is the small cog that closes exactly that gap. It does
# NOT re-implement /goal — it only persists what /goal cannot:
#
#   Stop         → scan the transcript for the most recent /goal command
#                  (a user message carrying
#                     <command-name>/goal</command-name>
#                     <command-args>CONDITION</command-args> ).
#                  Non-empty args → persist the condition to
#                  <DATA>/<sha1(project)>.json. A bare `/goal` (empty
#                  args = the native clear) → drop the persisted state.
#   SessionStart → on a fresh `startup` or after `/clear`, if a
#                  persisted, un-cleared goal exists, inject a short
#                  `## Goal — interrupted` block naming the condition
#                  and the exact `/goal <condition>` line to re-arm it.
#                  `resume` carries the native goal over already, and
#                  `compact` is same-session — both are skipped.
#
# Inert unless a /goal was actually used — no goal, nothing persisted,
# nothing injected.
#
# Opt out per session: SIDECAR_NO_RESUME=1
import hashlib
import json
import os
import re
import subprocess
import sys
import time

GOAL_CMD = "<command-name>/goal</command-name>"
ARGS_RE = re.compile(r"<command-args>(.*?)</command-args>", re.DOTALL)


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


def project_key(cwd):
    """Per-project storage key — repo root if inside a git repo (stable
    across subdirs), else the cwd itself."""
    base = cwd or os.getcwd()
    try:
        p = subprocess.run(["git", "-C", base, "rev-parse",
                            "--show-toplevel"],
                           capture_output=True, text=True, timeout=10)
        if p.returncode == 0 and p.stdout.strip():
            base = p.stdout.strip()
    except Exception:
        pass
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


def find_latest_goal(transcript):
    """The most recent native /goal condition in the transcript:
       - a non-empty string → the active completion condition
       - ""  → the last /goal was a bare clear
       - None → /goal was never used in this transcript
    Streams the whole file but JSON-parses only the few lines that carry
    the literal '/goal' substring. Never raises."""
    if not transcript or not os.path.isfile(transcript):
        return None
    latest = None
    try:
        with open(transcript, encoding="utf-8", errors="replace") as f:
            for ln in f:
                if "/goal" not in ln:
                    continue
                try:
                    d = json.loads(ln)
                except Exception:
                    continue
                msg = d.get("message") or d
                if (msg.get("role") or d.get("type")) != "user":
                    continue
                c = msg.get("content")
                if isinstance(c, list):
                    c = " ".join(b.get("text", "") for b in c
                                 if isinstance(b, dict))
                if not isinstance(c, str) or GOAL_CMD not in c:
                    continue
                m = ARGS_RE.search(c)
                latest = m.group(1).strip() if m else ""
    except Exception:
        pass
    return latest


def capture(payload, cwd):
    """Stop hook — persist the active native /goal condition, if any."""
    g = find_latest_goal(payload.get("transcript_path")
                         or payload.get("transcriptPath"))
    if g is None:
        return  # /goal never used → stay inert, touch nothing
    if g == "":
        # the last /goal was a bare clear → drop any persisted goal
        try:
            os.remove(state_path(cwd))
        except OSError:
            pass
        return
    base, _ = project_key(cwd)
    cur = load_state(cwd)
    if cur.get("condition") == g:
        return  # unchanged → no rewrite
    save_state(cwd, {
        "condition": g,
        "project": base,
        "cwd": cwd,
        "session_id": payload.get("session_id")
        or payload.get("sessionId") or "",
        "set_at": int(time.time()),
        "iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    })


def briefing(s):
    cond = s.get("condition", "")
    return (
        "## Goal — interrupted\n\n"
        "A native `/goal` was active in this project and was never "
        "cleared before the previous session ended. Claude Code's "
        "`/goal` is session-scoped (no disk persistence), so it did "
        "**not** carry into this session:\n\n"
        "> %s\n\n"
        "To resume working toward it, re-arm the goal — the evaluator "
        "and turn-to-turn continuation only restart once `/goal` is run "
        "again:\n\n"
        "    /goal %s\n\n"
        "(Already finished? Dismiss with `/wilson-resume clear`.)\n"
        % (cond, cond))


def session_start(payload, cwd):
    source = (payload.get("source") or payload.get("hookSource")
              or "startup")
    # `resume` already carries the native /goal over; `compact` is
    # same-session — re-arm is only needed on a fresh start or /clear.
    if source not in ("startup", "clear"):
        sys.exit(0)
    s = load_state(cwd)
    if not s or not s.get("condition"):
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
    sys.exit(0)


def p(*a):
    print("wilson-resume:", *a)


def cmd(args):
    cwd = os.getcwd()
    sub = (args[0] if args else "status").strip().lower()

    if sub in ("", "status", "show"):
        s = load_state(cwd)
        if not s or not s.get("condition"):
            print("wilson-resume — no interrupted /goal saved for this "
                  "project (%s)." % state_path(cwd))
            print("  Inert until you run a native `/goal <condition>`; "
                  "the condition is then captured automatically.")
            return
        print("wilson-resume — saved /goal for %s:"
              % s.get("project", cwd))
        print()
        print("  condition: %s" % s["condition"])
        print("  captured:  %s" % s.get("iso", "?"))
        print("  re-arm:    /goal %s" % s["condition"])
        print("  state:     %s" % state_path(cwd))
        return

    if sub == "clear":
        sp = state_path(cwd)
        try:
            os.remove(sp)
            p("cleared the saved /goal for this project.")
        except FileNotFoundError:
            p("no saved /goal to clear for this project.")
        return

    if sub == "path":
        sp = state_path(cwd)
        print("wilson-resume — paths:")
        print("  saved goal: %s  (%s)"
              % (sp, "exists" if os.path.isfile(sp) else "absent"))
        print("  data dir:   %s" % data_dir())
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
