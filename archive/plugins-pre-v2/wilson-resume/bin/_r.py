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
#                  Also scan the latest assistant turn: if it declares
#                  the goal over-scoped (an honest "exceeds single-
#                  session scope" decline), flag the record `stuck` so
#                  the next session does NOT re-arm it verbatim — that
#                  cross-session deadlock loop is what this prevents.
#                  If the turn declares a `잔여 =` / `remaining =` /
#                  `outstanding =` leading-marker handoff list, capture
#                  the extract (≤2KB) so the next session sees the
#                  specific pending items, not just the meta "stuck"
#                  flag. Residual fires independently of stuck — a
#                  turn-limit handoff without a single-session decline
#                  still surfaces.
#   SessionStart → on a fresh `startup` or after `/clear`, if a
#                  persisted, un-cleared goal exists, inject a short
#                  briefing. A normal goal → `## Goal — interrupted`
#                  with the exact `/goal <condition>` line to re-arm it.
#                  A `stuck` goal → `## Goal — over-scoped (handoff)`:
#                  do NOT re-arm; slice it smaller or resume from a
#                  checkpoint. Either briefing appends a
#                  `### 잔여 — 검토 필요` section when a residual
#                  extract was captured, so the next session sees the
#                  specific pending items. `resume` carries the native
#                  goal over already, and `compact` is same-session —
#                  both skip.
#
# What this does NOT do: the within-session native /goal loop ("Goal
# not yet met… continuing") cannot be stopped from a hook — the native
# evaluator is an LLM call above the hook layer. That loop is already
# bounded by native CC's CLAUDE_CODE_STOP_HOOK_BLOCK_CAP (≤9 turns);
# wilson-resume only kills the UNBOUNDED cross-session re-arm loop.
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

# An over-scoped /goal: the agent, working honestly toward a native
# /goal, declares in its turn that the condition exceeds what a single
# session can do. That declaration is a false-positive-free immediate
# signal — a healthy in-progress goal never emits it — so one match is
# enough, no repeat counter needed. Matched case-insensitively against
# the latest assistant turn ONLY (a stale earlier match must not fire).
DECLINE_MARKERS = (
    # English — session-scope decline
    "exceeds single-session scope",
    "exceeds the scope of a single session",
    "single dialogue session",
    "cannot complete in this session",
    "cannot be completed in a single session",
    "multi-week",
    "multi-session",
    "declines to fraudulently",
    # English — turn-scope / safety-limit / cycle-split decline
    # (added in 0.3.1 — Decision 4. The 0.3.0 list only covered
    # session-scope phrasing; a 2026-05-20 transcript declared the goal
    # over-scoped at the *turn* level — "본 single turn 의 안전 한도
    # 초과 · 5 cycle 분할 필요" — and slipped through. These cover the
    # turn / safety-limit / multi-cycle self-decline shape.)
    "exceeds single-turn scope",
    "exceeds the scope of a single turn",
    "cannot be completed in a single turn",
    "multi-cycle",
    # Korean — session-scope decline
    "단일 세션 범위",
    "single-session 범위 초과",
    "별도 세션",
    "한 세션에 완성",
    "한 세션으로 완성 불가",
    "세션 범위를 초과",
    "다음 세션으로 미",
    # Korean — turn-scope / safety-limit / cycle-split decline (0.3.1)
    "안전 한도 초과",
    "안전 한도 도달",
    "turn 안전 한도",
    "cycle 분할 필요",
    "세션 분할 필요",
)

# A leading residual marker: the agent's explicit, structured handoff
# list ("잔여 = a + b + c") in the latest assistant turn. Independent
# of DECLINE_MARKERS — a turn can declare residual work without also
# declaring the goal over-scoped (e.g. a turn-limit handoff with the
# goal still meetable in the next session). Leading markers only —
# `잔여 =` style — so healthy in-progress reports that merely *mention*
# the word `잔여` (without a leading marker) don't trip. Matched case-
# insensitively; one match is enough (no repeat counter, same as
# DECLINE_MARKERS).
RESIDUAL_MARKERS = (
    "잔여 =",
    "잔여 :",
    "잔여:",
    "remaining =",
    "remaining:",
    "outstanding =",
    "outstanding:",
)

# Cap on the residual extract written to state and inlined into the
# SessionStart briefing. Two reasons it must be bounded: (a) the
# briefing is auto-injected into every fresh session and competes with
# the other always-on context blocks (Pool · Prefs · SSOT) for the
# session's prompt budget; (b) state.json is read on every Stop, and
# an unbounded extract bloats the read.
RESIDUAL_CAP_BYTES = 2048


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


def latest_assistant_text(transcript):
    """Text of the most recent assistant turn in the transcript — the
    surface scanned for an over-scoped-goal declaration. Streams the
    file, JSON-parsing only assistant lines. Never raises."""
    if not transcript or not os.path.isfile(transcript):
        return ""
    text = ""
    try:
        with open(transcript, encoding="utf-8", errors="replace") as f:
            for ln in f:
                if '"assistant"' not in ln:
                    continue
                try:
                    d = json.loads(ln)
                except Exception:
                    continue
                msg = d.get("message") or d
                if (msg.get("role") or d.get("type")) != "assistant":
                    continue
                c = msg.get("content")
                if isinstance(c, list):
                    c = " ".join(
                        b.get("text", "") for b in c
                        if isinstance(b, dict) and b.get("type") == "text")
                if isinstance(c, str) and c.strip():
                    text = c
    except Exception:
        pass
    return text


def _scan_substring(text, markers):
    """(matched, marker) — True + the matched phrase when any marker
    appears as a substring of `text` (case-insensitive); else
    (False, ""). The single-match primitive shared by DECLINE_MARKERS
    (over-scoped detection) and any future substring marker set."""
    if not text:
        return False, ""
    low = text.lower()
    for m in markers:
        if m.lower() in low:
            return True, m
    return False, ""


def _extract_leading(text, markers, cap):
    """(extract, marker) — when any leading marker (e.g. `잔여 =`) is
    present in `text`, return the text from the *start of the marker's
    line* through the end of `text` (or `cap` bytes, whichever is
    smaller), with trailing whitespace trimmed; else ("", ""). The
    earliest marker hit in the text wins so the extract covers what
    follows the agent's first handoff declaration in the turn."""
    if not text:
        return "", ""
    low = text.lower()
    best_pos = -1
    best_marker = ""
    for m in markers:
        p = low.find(m.lower())
        if p >= 0 and (best_pos < 0 or p < best_pos):
            best_pos = p
            best_marker = m
    if best_pos < 0:
        return "", ""
    line_start = text.rfind("\n", 0, best_pos) + 1
    return text[line_start:line_start + cap].rstrip(), best_marker


def over_scoped(text):
    """(stuck, marker) — True + the matched phrase when the latest
    assistant turn declares the active /goal exceeds single-session
    scope; (False, "") otherwise. One match is decisive (see
    DECLINE_MARKERS) — no repeat counter. Takes pre-fetched assistant
    text so a single transcript read serves both this and
    extract_residual()."""
    return _scan_substring(text, DECLINE_MARKERS)


def extract_residual(text):
    """(extract, marker) — captures the agent's structured handoff
    list from the latest assistant turn when introduced by a leading
    `잔여 =` / `remaining =` / `outstanding =` marker (see
    RESIDUAL_MARKERS). Returns ("", "") when no leading marker is
    present. Capped at RESIDUAL_CAP_BYTES."""
    return _extract_leading(text, RESIDUAL_MARKERS, RESIDUAL_CAP_BYTES)


def capture(payload, cwd):
    """Stop hook — persist the active native /goal condition, if any,
    flag it `stuck` when the latest turn declares it over-scoped, and
    capture an explicit residual handoff extract when the turn carries
    one. Stuck and residual are independent axes — a turn can declare
    either, both, or neither."""
    transcript = (payload.get("transcript_path")
                  or payload.get("transcriptPath"))
    g = find_latest_goal(transcript)
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
    # One transcript read drives both stuck and residual detection.
    latest = latest_assistant_text(transcript)
    stuck, stuck_marker = over_scoped(latest)
    residual, residual_marker = extract_residual(latest)
    same_cond = cur.get("condition") == g
    same_stuck = bool(cur.get("stuck")) == stuck
    same_res = cur.get("residual", "") == residual
    if same_cond and same_stuck and same_res:
        return  # nothing changed
    now = int(time.time())
    nowiso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    rec = {
        "condition": g,
        "project": base,
        "cwd": cwd,
        "session_id": payload.get("session_id")
        or payload.get("sessionId") or "",
        "set_at": cur.get("set_at") if same_cond else now,
        "iso": cur.get("iso") if same_cond else nowiso,
    }
    if stuck:
        # Immediate handoff record — written on the FIRST over-scoped
        # turn, so even after the bounded within-session loop burns out
        # the next session resumes from this instead of re-arming.
        rec["stuck"] = True
        rec["stuck_marker"] = stuck_marker
        rec["stuck_at"] = now
        rec["stuck_iso"] = nowiso
    if residual:
        # Specific pending items declared by the agent in the last
        # turn — surfaced to the next session as a separate section in
        # the briefing.
        rec["residual"] = residual
        rec["residual_marker"] = residual_marker
        rec["residual_at"] = now
        rec["residual_iso"] = nowiso
    save_state(cwd, rec)


def _residual_section(s):
    """The `### 잔여 — 검토 필요` block, inlined into the main briefing
    when a residual extract was captured. Empty string if no residual
    is on record — the briefing then degrades to its previous shape."""
    res = s.get("residual", "")
    if not res:
        return ""
    return (
        "\n\n### 잔여 — 검토 필요\n\n"
        "이전 세션이 마지막 턴에서 명시한 핸드오프 항목 "
        "(matched `%s` · %s):\n\n"
        "```\n%s\n```\n\n"
        "다음 작업을 시작하기 전에 위 항목들을 검토해서 ① 본 세션에서 "
        "이어 처리 · ② 별도 이슈 / PR 로 떼어내기 · ③ 이미 처리됨으로 "
        "정리 — 중 하나로 정리하세요."
        % (s.get("residual_marker", "residual marker"),
           s.get("residual_iso", "?"),
           res))


def briefing(s):
    cond = s.get("condition", "")
    res_section = _residual_section(s)
    if s.get("stuck"):
        return (
            "## Goal — over-scoped (handoff)\n\n"
            "A native `/goal` was active in this project, but the "
            "previous session worked toward it and honestly declared "
            "it **exceeds single-session scope** — it ended without "
            "meeting the condition:\n\n"
            "> %s\n\n"
            "Do **not** re-arm it verbatim with `/goal` — that re-"
            "enters the same deadlock (the native goal loop cannot be "
            "met, so every turn re-blocks). Instead:\n\n"
            "- break it into one session-sized slice and set a fresh "
            "`/goal` for just that slice, **or**\n"
            "- resume from the last committed checkpoint in a separate "
            "session, no `/goal` armed.\n\n"
            "(Flagged over-scoped %s · matched `%s`. Already handled? "
            "Dismiss with `/wilson-resume clear`.)"
            % (cond, s.get("stuck_iso", "?"),
               s.get("stuck_marker", "decline marker"))
            + res_section
            + "\n")
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
        "(Already finished? Dismiss with `/wilson-resume clear`.)"
        % (cond, cond)
        + res_section
        + "\n")


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
        if s.get("stuck"):
            print("  status:    OVER-SCOPED — flagged %s (matched `%s`)"
                  % (s.get("stuck_iso", "?"),
                     s.get("stuck_marker", "decline marker")))
            print("  next:      do NOT re-arm — slice it smaller, or "
                  "resume from a checkpoint")
        else:
            print("  re-arm:    /goal %s" % s["condition"])
        if s.get("residual"):
            print("  residual:  %d bytes captured %s (matched `%s`)"
                  % (len(s["residual"]),
                     s.get("residual_iso", "?"),
                     s.get("residual_marker", "residual marker")))
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
