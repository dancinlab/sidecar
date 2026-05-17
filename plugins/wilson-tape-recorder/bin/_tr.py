#!/usr/bin/env python3
# wilson-tape-recorder core — record a Claude Code session as a `.tape`
# v1.2 execution trace (the dancinlab tape format —
# github.com/dancinlab/tape).
#
# What gets recorded (honest subset of the 17-type alphabet — only what
# CC hooks actually deliver):
#
#   SessionStart      → `@S start s001 :: session`
#   UserPromptSubmit  → `@U uNNN = "<prompt>" :: harness` (T++)
#   PreToolUse        → `@T tNNN <name> <param>=<val> :: tool` (<- last @U)
#   PostToolUse       → `@R rNNN <name> ok|err :: tool` (<- last @T)
#   SessionEnd        → `@S end s001 :: session`
#
# NOT recorded (CC hooks expose no signal — honest gaps):
#   @A assistant text · @K cost · @D decision · @P provider · @H hook ·
#   @? anomaly · the declarative types (@I @X @F @N @C @L @V).
#
# Output: <DATA>/sessions/<session_id>.tape, one file per CC session.
# State: <DATA>/sessions/<session_id>.state (tiny counters json).
# Default ON. Opt out: SIDECAR_NO_TAPE_RECORDER=1.
import json
import os
import sys
import time


def disabled():
    try:
        if "tape-recorder" in json.load(open(os.path.join(
                os.path.expanduser("~"), ".claude", "sidecar",
                "disabled.json"), encoding="utf-8")):
            return True
    except Exception:
        pass
    if os.environ.get("SIDECAR_NO_TAPE_RECORDER") == "1":
        return True
    try:
        return bool(json.load(open(os.path.join(data_dir(), "state.json"),
                                    encoding="utf-8")).get("off"))
    except Exception:
        return False


def data_dir():
    d = os.environ.get("CLAUDE_PLUGIN_DATA") or os.path.join(
        os.path.expanduser("~"), ".claude", "plugin-data",
        "wilson-tape-recorder")
    os.makedirs(os.path.join(d, "sessions"), exist_ok=True)
    return d


GLOBAL = lambda: os.path.join(data_dir(), "state.json")


def gstate():
    try:
        return json.load(open(GLOBAL(), encoding="utf-8"))
    except Exception:
        return {}


def gsave(d):
    with open(GLOBAL(), "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


def session_paths(sid):
    base = os.path.join(data_dir(), "sessions", sid)
    return base + ".tape", base + ".state"


def sst_load(sid):
    _, sp = session_paths(sid)
    try:
        return json.load(open(sp, encoding="utf-8"))
    except Exception:
        return {"T": 0, "N": 0, "cU": 0, "cT": 0, "cR": 0,
                "last_u": None, "last_t": None, "started": False}


def sst_save(sid, st):
    _, sp = session_paths(sid)
    with open(sp, "w", encoding="utf-8") as f:
        json.dump(st, f, ensure_ascii=False)


def q(s, lim=200):
    """Quote a string for a .tape value: escape `"` and newlines; cap."""
    s = str(s) if s is not None else ""
    s = s.replace("\\", "\\\\").replace('"', '\\"')
    s = s.replace("\n", " ").replace("\r", " ").replace("\t", " ")
    s = " ".join(s.split())
    return s[:lim] + ("…" if len(s) > lim else "")


def tag(st, grade="ok"):
    return "[T%d N%d %s]" % (st["T"], st["N"], grade)


def append(tape_path, line):
    with open(tape_path, "a", encoding="utf-8") as f:
        f.write(line if line.endswith("\n") else line + "\n")


def headline_param(tool_name, ti):
    """Pick the most useful headline parameter for `@T <name> <k>=<v>`."""
    if not isinstance(ti, dict):
        return ""
    for k in ("file_path", "path", "command", "pattern", "url",
              "notebook_path", "query"):
        v = ti.get(k)
        if v:
            return "%s=%s" % (k, q(v, 100))
    keys = sorted(ti.keys())
    if keys:
        return "%s=%s" % (keys[0], q(ti.get(keys[0]), 60))
    return ""


def hook():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    event = payload.get("hook_event_name") or payload.get(
        "hookEventName") or ""
    sid = str(payload.get("session_id") or "unknown-%d" % os.getpid())
    tape, _ = session_paths(sid)
    st = sst_load(sid)

    if event == "SessionStart":
        st["started"] = True
        st["T"] = 0
        st["N"] = 0
        cwd = payload.get("cwd") or os.getcwd()
        if not os.path.isfile(tape):
            header = (
                "#!/usr/bin/env tape\n"
                "# ══════════════════════════════════════════════════"
                "════════════════════\n"
                "# Claude Code session — recorded by wilson-tape-"
                "recorder (.tape v1.2)\n"
                "# session_id = %s\n"
                "# started    = %s\n"
                "# cwd        = %s\n"
                "# Append-only — `wilson-guards/tape-append-only` "
                "enforces it.\n"
                "# ══════════════════════════════════════════════════"
                "════════════════════\n\n"
                % (sid, time.strftime("%Y-%m-%dT%H:%M:%SZ",
                                       time.gmtime()), cwd))
            append(tape, header)
        st["N"] += 1
        append(tape, "@S start s001 :: session %s" % tag(st))
        append(tape, '  => "claude-code · session=%s · cwd=%s"\n'
               % (sid[:12], q(cwd, 120)))
        sst_save(sid, st)
        sys.exit(0)

    if event == "UserPromptSubmit":
        prompt = payload.get("prompt") or ""
        st["T"] += 1
        st["N"] += 1
        st["cU"] += 1
        uid = "u%03d" % st["cU"]
        st["last_u"] = uid
        append(tape, '@U %s = "%s" :: harness %s'
               % (uid, q(prompt, 200), tag(st)))
        sst_save(sid, st)
        sys.exit(0)

    if event == "PreToolUse":
        name = payload.get("tool_name") or "?"
        ti = payload.get("tool_input") or {}
        st["N"] += 1
        st["cT"] += 1
        tid = "t%03d" % st["cT"]
        st["last_t"] = tid
        param = headline_param(name, ti)
        line = "@T %s %s%s :: tool %s" % (
            tid, name, (" " + param) if param else "", tag(st))
        append(tape, line)
        if st.get("last_u"):
            append(tape, "  <- %s" % st["last_u"])
        sst_save(sid, st)
        sys.exit(0)

    if event == "PostToolUse":
        name = payload.get("tool_name") or "?"
        tr = payload.get("tool_response") or {}
        # CC PostToolUse: success when the call returned without error.
        # `tool_response` shape varies; treat a string or dict as ok by
        # default, fall back to err only on an explicit error indicator.
        err = False
        if isinstance(tr, dict):
            if tr.get("error") or tr.get("is_error"):
                err = True
        st["N"] += 1
        st["cR"] += 1
        rid = "r%03d" % st["cR"]
        # rough summary: a short size/text fingerprint, never the full body
        summary = ""
        if isinstance(tr, dict):
            for k in ("filePath", "file_path", "stdout", "content",
                      "result", "output"):
                v = tr.get(k)
                if isinstance(v, str) and v.strip():
                    summary = "%d chars" % len(v)
                    break
        elif isinstance(tr, str):
            summary = "%d chars" % len(tr)
        append(tape, "@R %s %s %s :: tool %s"
               % (rid, name, "err" if err else "ok",
                  tag(st, "err" if err else "ok")))
        if st.get("last_t"):
            append(tape, "  <- %s" % st["last_t"])
        if summary:
            append(tape, '  => "%s"' % q(summary, 80))
        sst_save(sid, st)
        sys.exit(0)

    if event == "SessionEnd":
        st["N"] += 1
        append(tape, "@S end s001 :: session %s" % tag(st))
        append(tape, '  => "T=%d turns · N=%d entries · U=%d T=%d R=%d"\n'
               % (st["T"], st["N"], st["cU"], st["cT"], st["cR"]))
        sst_save(sid, st)
        sys.exit(0)
    sys.exit(0)


def p(*a):
    print("wilson-tape-recorder:", *a)


def list_sessions():
    sd = os.path.join(data_dir(), "sessions")
    files = []
    for fn in os.listdir(sd) if os.path.isdir(sd) else []:
        if fn.endswith(".tape"):
            fp = os.path.join(sd, fn)
            files.append((os.path.getmtime(fp), fn[:-5], fp))
    files.sort(reverse=True)
    return files


def cmd(args):
    sub = (args[0] if args else "status").strip().lower()
    gs = gstate()

    if sub in ("", "status"):
        ses = list_sessions()
        print("wilson-tape-recorder — %s"
              % ("OFF" if gs.get("off") else "ON (recording every "
                 "session as .tape)"))
        print("  data dir: %s/sessions" % data_dir())
        print("  sessions: %d" % len(ses))
        if ses:
            ts, sid, fp = ses[0]
            try:
                lines = sum(1 for _ in open(fp, encoding="utf-8"))
            except Exception:
                lines = "?"
            print("  latest:   %s · %s · %s lines"
                  % (time.strftime("%Y-%m-%dT%H:%M:%SZ",
                                    time.gmtime(ts)),
                     sid[:24], lines))
        return

    if sub in ("on", "off"):
        gs["off"] = (sub == "off")
        gsave(gs)
        p("%s." % sub.upper())
        return

    if sub == "ls":
        ses = list_sessions()[:20]
        if not ses:
            print("(no sessions recorded yet)")
            return
        print("wilson-tape-recorder — recent sessions:")
        for ts, sid, fp in ses:
            try:
                lines = sum(1 for _ in open(fp, encoding="utf-8"))
            except Exception:
                lines = "?"
            print("  %s  %s  %s lines  %s"
                  % (time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(ts)),
                     sid[:24], lines, fp))
        return

    if sub == "cat":
        ses = list_sessions()
        if not ses:
            print("(no sessions)")
            return
        if len(args) > 1:
            arg = args[1].strip()
            match = [(t, s, f) for (t, s, f) in ses
                     if s.startswith(arg) or arg in s]
            if not match:
                p("no session matches %r" % arg)
                return
            fp = match[0][2]
        else:
            fp = ses[0][2]
        try:
            print(open(fp, encoding="utf-8").read())
        except Exception as e:
            p("read failed: %s" % e)
        return

    if sub == "tail":
        n = int(args[1]) if len(args) > 1 and args[1].isdigit() else 20
        ses = list_sessions()
        if not ses:
            print("(no sessions)")
            return
        try:
            lines = open(ses[0][2], encoding="utf-8").read().splitlines()
        except Exception:
            return
        for ln in lines[-n:]:
            print(ln)
        return

    if sub == "path":
        print("wilson-tape-recorder: tapes are written to "
              "<DATA>/sessions/<session_id>.tape (one file per CC "
              "session — not configurable in v0.1).")
        print("  data dir: %s" % data_dir())
        return

    p("unknown subcommand %r. Use: status | on | off | ls | tail [N] | "
      "cat [session_id] | path" % sub)


def main():
    if disabled():
        # honor sidecar/global off — but for SessionEnd still allow a
        # closing line? No: if disabled, fully silent.
        sys.exit(0)
    if len(sys.argv) > 1 and sys.argv[1] == "cmd":
        cmd(sys.argv[2:])
    else:
        hook()


if __name__ == "__main__":
    main()
