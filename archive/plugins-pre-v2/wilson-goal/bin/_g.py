#!/usr/bin/env python3
# wilson-goal core — keep the session's high-level objective alive
# across long sessions and context compaction.
#
# Why this plugin: in a long Claude Code session the original goal
# drifts — compaction summarises the transcript and the north-star
# gets diluted. wilson solves this with its `loop` plugin by storing
# the goal on disk (outside the transcript) and re-injecting it. This
# plugin ports the persistence + re-injection halves; the autonomous
# `loop_tick` continuation cannot be done from CC hooks (no
# `continue without user input` mechanism — honest gap).
#
# Storage (single global file — survives CC session-id changes):
#   <DATA>/goal.json   — {goal, set_at, set_by, source}
#   <cwd>/GOAL.md      — project-local default, used when goal.json is empty
#
# A single shared file avoids the CC-vs-slash mismatch (slash commands
# have no session_id, hooks do — per-sid storage would split state).
# A goal is per-user / per-project, not per CC session id.
#
# Hooks:
#   SessionStart      → inject the full goal block (THE compaction-recovery
#                       moment: a fresh session_start fires after a /compact
#                       reload, so the goal is restored verbatim).
#   UserPromptSubmit  → re-assert as a one-line reminder (≤ 240 B — light,
#                       per the wilson-prefs lesson).
#
# Opt out per session: SIDECAR_NO_GOAL=1
import json
import os
import sys
import time


def disabled():
    try:
        if "goal" in json.load(open(os.path.join(
                os.path.expanduser("~"), ".claude", "sidecar",
                "disabled.json"), encoding="utf-8")):
            return True
    except Exception:
        pass
    return os.environ.get("SIDECAR_NO_GOAL") == "1"


def data_dir():
    d = os.environ.get("CLAUDE_PLUGIN_DATA") or os.path.join(
        os.path.expanduser("~"), ".claude", "plugin-data", "wilson-goal")
    os.makedirs(d, exist_ok=True)
    return d


def state_path():
    return os.path.join(data_dir(), "goal.json")


def load_state():
    try:
        return json.load(open(state_path(), encoding="utf-8"))
    except Exception:
        return {}


def save_state(d):
    p = state_path()
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


def project_goal(cwd):
    """A project-local `GOAL.md` is the default when no per-session goal."""
    p = os.path.join(cwd or os.getcwd(), "GOAL.md")
    if not os.path.isfile(p):
        return None
    try:
        body = open(p, encoding="utf-8").read().strip()
    except Exception:
        return None
    return {"goal": body, "source": "GOAL.md", "path": p}


def effective_goal(cwd):
    s = load_state()
    if s.get("goal"):
        return {"goal": s["goal"],
                "source": s.get("source", "user"),
                "set_at": s.get("set_at"),
                "set_by": s.get("set_by")}
    return project_goal(cwd)


def truncate(s, n):
    s = s.strip().replace("\r", "").replace("\n", " ")
    s = " ".join(s.split())
    return s[:n] + ("…" if len(s) > n else "")


def inject_full(g):
    src = g.get("source") or "user"
    when = ""
    if g.get("set_at"):
        when = " · set %s" % time.strftime(
            "%Y-%m-%dT%H:%M:%SZ", time.gmtime(g["set_at"]))
    elif g.get("path"):
        when = " · loaded from `%s`" % g["path"]
    lines = ["## Goal", "",
             "Current goal for this session (restored from disk — survives "
             "compaction):", "",
             "> %s" % g["goal"].replace("\n", "\n> "), "",
             "Source: **%s**%s. Update with `/wilson-goal set \"<new>\"`, "
             "clear with `/wilson-goal clear`. "
             "State: `%s`." % (src, when, state_path())]
    return "\n".join(lines) + "\n"


def inject_short(g):
    g_txt = truncate(g["goal"], 180)
    return "[wilson-goal] current goal: %s\n" % g_txt


def hook():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    event = payload.get("hook_event_name") or payload.get(
        "hookEventName") or ""
    cwd = payload.get("cwd") or os.getcwd()
    g = effective_goal(cwd)
    if not g or not g.get("goal"):
        sys.exit(0)
    # update last_seen on the global record (best-effort)
    s = load_state()
    if s.get("goal"):
        s["last_seen"] = int(time.time())
        try:
            save_state(s)
        except Exception:
            pass
    # SessionStart (also fires post-compact with source="compact"),
    # PostCompact (clean post-summary moment) → full goal block.
    # UserPromptSubmit → one-line compact reminder.
    text = (inject_full(g) if event in ("SessionStart", "PostCompact")
            else inject_short(g))
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": event, "additionalContext": text}}))
    sys.exit(0)


def p(*a):
    print("wilson-goal:", *a)


def cmd(args):
    sub = (args[0] if args else "status").strip().lower()
    cwd = os.getcwd()

    if sub in ("", "status", "show"):
        g = effective_goal(cwd)
        s = load_state()
        if not g or not g.get("goal"):
            print("wilson-goal — no goal set (no record at %s, "
                  "no project `GOAL.md` at %s)."
                  % (state_path(), os.path.join(cwd, "GOAL.md")))
            print("  set: /wilson-goal set \"<goal>\"   (or drop a "
                  "`GOAL.md` in the project root)")
            return
        print("wilson-goal — current goal (%s):" % (g.get("source") or "user"))
        print()
        print(g["goal"])
        print()
        if g.get("path"):
            print("Source file: %s" % g["path"])
        if g.get("set_at"):
            print("Set at: %s"
                  % time.strftime("%Y-%m-%dT%H:%M:%SZ",
                                   time.gmtime(g["set_at"])))
        if s.get("last_seen"):
            print("Last re-injected: %s"
                  % time.strftime("%Y-%m-%dT%H:%M:%SZ",
                                   time.gmtime(s["last_seen"])))
        print("State: %s" % state_path())
        return

    if sub == "set":
        if len(args) < 2 or not args[1].strip():
            p('usage: /wilson-goal set "<goal text>"')
            return
        goal = " ".join(args[1:]).strip().strip('"').strip("'")
        if not goal:
            p("empty goal — refusing to set.")
            return
        save_state({"goal": goal, "set_at": int(time.time()),
                     "set_by": "user", "source": "user"})
        p("goal set (%d chars). Will be injected at every SessionStart and "
          "re-asserted on every UserPromptSubmit." % len(goal))
        return

    if sub == "clear":
        sp = state_path()
        try:
            os.remove(sp)
            p("cleared user goal (project `GOAL.md` still wins as default "
              "if present).")
        except FileNotFoundError:
            p("no user goal to clear.")
        return

    if sub == "path":
        sp = state_path()
        gm = os.path.join(cwd, "GOAL.md")
        print("wilson-goal — paths:")
        print("  user goal: %s  (%s)"
              % (sp, "exists" if os.path.isfile(sp) else "absent"))
        print("  project default: %s  (%s)"
              % (gm, "exists" if os.path.isfile(gm) else "absent"))
        return

    p("unknown subcommand %r. Use: status | set \"<goal>\" | clear | "
      "path | show" % sub)


def main():
    if disabled():
        sys.exit(0)
    if len(sys.argv) > 1 and sys.argv[1] == "cmd":
        cmd(sys.argv[2:])
    else:
        hook()


if __name__ == "__main__":
    main()
