#!/usr/bin/env python3
# wilson-schedule core — a global "daily routine" task list whose `run`
# action fans every pending task out to a background subagent.
#
# Model (sidecar design.md Decisions 35/36/37):
#   - 35: a daily-task tracker, NOT a sequential cursor — `run`
#     ("스케쥴 진행") dispatches ALL pending tasks at once.
#   - 36: storage is one global JSON file — a day is a per-user unit,
#     not per-repo.
#   - 37: `run` = immediate full fan-out — one background subagent per
#     pending task, no pre-flight confirm, auto-`done` on completion.
#
# A CC hook / bin script cannot itself call the Agent tool, so `run`
# (and the "스케쥴 진행" phrase, caught by the UserPromptSubmit hook)
# only EMIT a dispatch directive — the model reads it and launches the
# background agents. The bin owns state; the model owns the fan-out.
#
# Storage (single global file at the home root — Decision 5):
#   ~/SCHEDULE.json — {version, next_id, tasks:[...]}
#   task = {id, text, status, added, started, done, result}
#   status in: pending | running | done
#   Override the path with WILSON_SCHEDULE_FILE (used by the selftest).
#
# Opt out per session: SIDECAR_NO_SCHEDULE=1
import json
import os
import sys
import time

TRIGGERS = ("스케쥴진행", "스케줄진행", "schedulerun")


def disabled():
    try:
        if "schedule" in json.load(open(os.path.join(
                os.path.expanduser("~"), ".claude", "sidecar",
                "disabled.json"), encoding="utf-8")):
            return True
    except Exception:
        pass
    return os.environ.get("SIDECAR_NO_SCHEDULE") == "1"


def state_path():
    # global file at the home root — ~/SCHEDULE.json (Decision 5).
    return (os.environ.get("WILSON_SCHEDULE_FILE")
            or os.path.join(os.path.expanduser("~"), "SCHEDULE.json"))


def load_state():
    try:
        s = json.load(open(state_path(), encoding="utf-8"))
    except Exception:
        s = {}
    s.setdefault("version", 1)
    s.setdefault("next_id", 1)
    s.setdefault("tasks", [])
    return s


def save_state(s):
    with open(state_path(), "w", encoding="utf-8") as f:
        json.dump(s, f, ensure_ascii=False, indent=2)
        f.write("\n")


def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def pending(s):
    return [t for t in s["tasks"] if t["status"] == "pending"]


def find(s, tid):
    try:
        tid = int(tid)
    except (TypeError, ValueError):
        return None
    for t in s["tasks"]:
        if t["id"] == tid:
            return t
    return None


# ── dispatch directive (shared by `run` and the phrase hook) ──────────

def dispatch_directive(pend):
    """The block the model acts on — launch one background agent per task."""
    lines = [
        "## wilson-schedule — 스케쥴 진행 (dispatch)",
        "",
        "The user invoked **스케쥴 진행**. %d pending task(s) below. Per "
        "wilson-schedule Decision 37 (immediate full fan-out): dispatch ALL "
        "of them now as **background** subagents — one `Agent` call per "
        "task, every call in a SINGLE message, `run_in_background: true`, "
        "no pre-flight confirm." % len(pend),
        "",
    ]
    for t in pend:
        lines.append("- `#%d` — %s" % (t["id"], t["text"]))
    lines += [
        "",
        "Procedure:",
        "1. mark them all running first — "
        "`/wilson-schedule:schedule running all`;",
        "2. in one message, launch one background `Agent` per task — "
        "`subagent_type` = `Explore` for read-only investigation, "
        "`general-purpose` for multi-step work or edits — the task text is "
        "the agent prompt;",
        "3. when an agent reports back, close its task — "
        "`/wilson-schedule:schedule done <id> \"<one-line result>\"`.",
        "",
        "After launching, print one line: `N background agents dispatched`.",
    ]
    return "\n".join(lines) + "\n"


# ── hook (SessionStart / UserPromptSubmit) ────────────────────────────

def emit(event, text):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": event, "additionalContext": text}}))


def hook():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    event = payload.get("hook_event_name") or payload.get(
        "hookEventName") or ""
    s = load_state()
    pend = pending(s)

    if event == "UserPromptSubmit":
        norm = "".join((payload.get("prompt") or "").split()).lower()
        if not any(t in norm for t in TRIGGERS):
            sys.exit(0)
        if not pend:
            emit(event, "[wilson-schedule] '스케쥴 진행' invoked, but no "
                        "pending tasks. Add one with "
                        "`/wilson-schedule:schedule add \"<task>\"`.\n")
        else:
            emit(event, dispatch_directive(pend))
        sys.exit(0)

    if event in ("SessionStart", "PostCompact") and pend:
        emit(event, "[wilson-schedule] %d pending task(s). Type "
                    "`스케쥴 진행` to fan them out to background agents, or "
                    "`/wilson-schedule:schedule list` to view.\n" % len(pend))
    sys.exit(0)


# ── slash command (/wilson-schedule:schedule) ─────────────────────────

def p(*a):
    print("wilson-schedule:", *a)


def show_list(s):
    if not s["tasks"]:
        print("wilson-schedule — no tasks. Add one: "
              "/wilson-schedule:schedule add \"<task>\"")
        return
    order = {"pending": 0, "running": 1, "done": 2}
    icon = {"pending": "□", "running": "▶", "done": "☑"}
    print("wilson-schedule — %d task(s)  [%s]"
          % (len(s["tasks"]), state_path()))
    for t in sorted(s["tasks"], key=lambda x: (order.get(x["status"], 9),
                                               x["id"])):
        line = "  %s #%-3d %s" % (icon.get(t["status"], "?"), t["id"],
                                  t["text"])
        if t["status"] == "done" and t.get("result"):
            line += "  → %s" % t["result"]
        print(line)


def cmd(args):
    sub = (args[0] if args else "status").strip().lower()
    s = load_state()

    if sub in ("", "status"):
        n_p = len(pending(s))
        n_r = len([t for t in s["tasks"] if t["status"] == "running"])
        n_d = len([t for t in s["tasks"] if t["status"] == "done"])
        print("wilson-schedule — %d pending · %d running · %d done"
              % (n_p, n_r, n_d))
        print("  state: %s" % state_path())
        if n_p:
            print("  run all pending: `스케쥴 진행`  (or "
                  "/wilson-schedule:schedule run)")
        return

    if sub == "add":
        text = " ".join(args[1:]).strip().strip('"').strip("'").strip()
        if not text:
            p('usage: /wilson-schedule:schedule add "<task text>"')
            return
        tid = s["next_id"]
        s["next_id"] = tid + 1
        s["tasks"].append({"id": tid, "text": text, "status": "pending",
                            "added": now_iso(), "started": None,
                            "done": None, "result": None})
        save_state(s)
        p("added task #%d (%d pending). Run all with `스케쥴 진행`." % (
            tid, len(pending(s))))
        return

    if sub in ("list", "ls"):
        show_list(s)
        return

    if sub in ("run", "진행"):
        pend = pending(s)
        if not pend:
            print("wilson-schedule — no pending tasks to run.")
            return
        print(dispatch_directive(pend))
        return

    if sub == "running":
        if len(args) < 2:
            p("usage: /wilson-schedule:schedule running <id|all>")
            return
        if args[1].strip().lower() == "all":
            n = 0
            for t in s["tasks"]:
                if t["status"] == "pending":
                    t["status"] = "running"
                    t["started"] = now_iso()
                    n += 1
            save_state(s)
            p("marked %d task(s) running." % n)
            return
        t = find(s, args[1])
        if not t:
            p("no task #%s." % args[1])
            return
        t["status"] = "running"
        t["started"] = now_iso()
        save_state(s)
        p("task #%d running." % t["id"])
        return

    if sub == "done":
        if len(args) < 2:
            p('usage: /wilson-schedule:schedule done <id> ["<result>"]')
            return
        t = find(s, args[1])
        if not t:
            p("no task #%s." % args[1])
            return
        result = " ".join(args[2:]).strip().strip('"').strip("'").strip()
        t["status"] = "done"
        t["done"] = now_iso()
        if result:
            t["result"] = result
        save_state(s)
        p("task #%d done.%s" % (t["id"],
                                " result recorded." if result else ""))
        return

    if sub in ("rm", "remove"):
        if len(args) < 2:
            p("usage: /wilson-schedule:schedule rm <id>")
            return
        t = find(s, args[1])
        if not t:
            p("no task #%s." % args[1])
            return
        s["tasks"].remove(t)
        save_state(s)
        p("removed task #%d." % t["id"])
        return

    if sub == "clear":
        what = (args[1].strip().lower() if len(args) > 1 else "done")
        before = len(s["tasks"])
        if what == "all":
            s["tasks"] = []
        else:
            s["tasks"] = [t for t in s["tasks"] if t["status"] != "done"]
        save_state(s)
        p("cleared %d task(s) (%s)." % (before - len(s["tasks"]), what))
        return

    p("unknown subcommand %r. Use: status | add \"<task>\" | list | run | "
      "running <id|all> | done <id> [\"<result>\"] | rm <id> | "
      "clear [done|all]" % sub)


def main():
    if disabled():
        sys.exit(0)
    if len(sys.argv) > 1 and sys.argv[1] == "cmd":
        cmd(sys.argv[2:])
    else:
        hook()


if __name__ == "__main__":
    main()
