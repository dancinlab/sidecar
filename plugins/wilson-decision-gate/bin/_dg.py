#!/usr/bin/env python3
# wilson-decision-gate core — standalone port of wilson's
# principle-step-by-step-decision-gate.
#
# wilson enforces this as TEXT ONLY (a governance principle folded into
# the system prompt — no code guard, because a hook cannot detect that N
# decisions were silently batched). This port is faithful to that:
#
#   SessionStart      → inject the principle once (the session's rule).
#   UserPromptSubmit  → a SHORT reminder ONLY when the prompt looks like
#                        branch-point / multi-decision work — NOT every
#                        prompt (default ON, but quiet).
#   /wilson-decision-gate → maintain the `design.md` decision ledger
#                        (`Decision N: <picked> · <rationale>`), the
#                        audit trail that "ships with the work".
#
# Default ON when installed; turn off with `/wilson-decision-gate off`,
# `/sidecar off decision-gate`, or SIDECAR_NO_DECISION_GATE=1.
import json
import os
import re
import sys
import time

TOKENS = ("Decision", "결정", "決定", "决定", "Решение")
DEC_RE = re.compile(r"^#{0,6}\s*(%s)\s+(\d+)\s*[—:-]" % "|".join(TOKENS),
                    re.M)
# branch-point signal — keep conservative so it does NOT fire every turn
BRANCH_RE = re.compile(
    r"\b(design|spec|architect\w*|refactor\w*|migrat\w*|trade-?offs?|"
    r"options?|choose|choice|decide|decision|approach|strateg\w*|"
    r"schema|API design|rewrite|redesign)\b"
    r"|설계|스펙|아키텍|리팩|마이그레|선택|결정|전략|방식|"
    r"어떻게.{0,6}(할까|하지|해야)|골라|trade-?off",
    re.I)


def disabled():
    try:
        if "decision-gate" in json.load(open(os.path.join(
                os.path.expanduser("~"), ".claude", "sidecar",
                "disabled.json"), encoding="utf-8")):
            return True
    except Exception:
        pass
    return os.environ.get("SIDECAR_NO_DECISION_GATE") == "1"


def data_dir():
    d = os.environ.get("CLAUDE_PLUGIN_DATA") or os.path.join(
        os.path.expanduser("~"), ".claude", "plugin-data",
        "wilson-decision-gate")
    os.makedirs(d, exist_ok=True)
    return d


STATE = os.path.join(data_dir(), "dg.json")


def load():
    try:
        with open(STATE, encoding="utf-8") as f:
            d = json.load(f)
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def save(d):
    try:
        with open(STATE, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=2)
            f.write("\n")
    except Exception:
        pass


def design_path(st, cwd):
    rel = st.get("path") or "design.md"
    return rel if os.path.isabs(rel) else os.path.join(cwd, rel)


def split_rationale(why):
    """Split a rationale string into bullets.

    Top-level `;`, `·` and newlines are bullet separators (NOT comma —
    commas are common inside one reason). A separator inside a balanced
    `(...)` / `[...]` / `{...}` group does NOT split, so a parenthetical
    like `(secret-guard;dangerous-path 등)` stays in one bullet. A
    backslash-escaped `\\;` / `\\·` is a literal (the backslash is
    dropped); `\\n` is left untouched (only a real newline splits).
    """
    bullets = []
    buf = []
    depth = 0
    pairs = {")": "(", "]": "[", "}": "{"}
    opens = set(pairs.values())
    i = 0
    n = len(why)
    while i < n:
        ch = why[i]
        if ch == "\\" and i + 1 < n and why[i + 1] in (";", "·"):
            buf.append(why[i + 1])  # escaped separator → literal
            i += 2
            continue
        if ch in opens:
            depth += 1
            buf.append(ch)
        elif ch in pairs:
            depth = max(0, depth - 1)
            buf.append(ch)
        elif ch == "\n" or (depth == 0 and ch in (";", "·")):
            bullets.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
        i += 1
    bullets.append("".join(buf))
    return [b.strip(" -·") for b in bullets if b.strip(" -·")]


def prefs_data_dir():
    # wilson-prefs persists to its OWN $CLAUDE_PLUGIN_DATA (per-plugin,
    # isolated — we cannot read another plugin's env), falling back to a
    # well-known absolute path. That fallback is the only stable
    # cross-plugin coordination point, mirroring how sidecar's own shared
    # state works. No file / unreadable → graceful: we just don't know the
    # style and the static convention text still codifies "inherit it".
    return os.path.join(os.path.expanduser("~"), ".claude", "plugin-data",
                        "wilson-prefs")


def active_style():
    """Return the active wilson-prefs response style, or None.

    Best-effort, never raises: if wilson-prefs is absent / unset /
    unreadable we return None and callers fall back to the static
    "inherit the active prefs style" convention text.
    """
    try:
        with open(os.path.join(prefs_data_dir(), "prefs.json"),
                  encoding="utf-8") as f:
            d = json.load(f)
        if isinstance(d, dict):
            s = d.get("response_style")
            if isinstance(s, str) and s.strip():
                return s.strip()
    except Exception:
        pass
    return None


PRINCIPLE_BASE = (
    "## Step-by-step decision gate\n\n"
    "Multi-decision work is **one user-confirmation gate per decision, "
    "never batched**. For each branch point (spec design / refactor "
    "scope / API choice / migration step / …): present the options + "
    "your recommendation + rationale (**3+ bullets**), then **wait for "
    "the user's pick before moving to the next**. Record each in "
    "`design.md` as a `### Decision N — <picked>` block with a "
    "`**picked**:` line and a `**rationale**:` list of 3+ bullets "
    "(`/wilson-decision-gate decide \"<picked>\" \"<b1>;<b2>;<b3>\"` "
    "appends exactly that; `/wilson-decision-gate sample` is the full "
    "convention) as you go — the audit trail ships with the work. "
    "Batching N picks into one yes/no collapses most decisions into "
    "undeliberated assents and defeats the gate.\n\n"
    "**Active `/goal` = autonomy mode.** When Claude Code's native "
    "`/goal` is in effect the user has pre-authorized autonomous "
    "progress toward it — do NOT halt at each gate to wait for a pick. "
    "Still present the options + recommendation + rationale, then "
    "**adopt your own recommendation**, record it with "
    "`/wilson-decision-gate decide`, note the auto-pick in one line, and "
    "continue. The gate becomes record-and-proceed, not stop-and-wait. "
    "Autonomy mode removes only the deliberation pause, not the safety "
    "floor — PreToolUse safety guards still fire, and a genuinely "
    "irreversible or ambiguous call still warrants a stop. With no "
    "`/goal` active, gate normally and wait for the pick.\n")

# How a gate is *presented* is orthogonal to *that* it is gated: the
# gate inherits the active wilson-prefs response style automatically —
# the user never has to re-ask for it. If wilson-prefs is unset/absent
# this still holds (no style → host default), so there is no hard
# runtime coupling.
PREFS_INHERIT_GENERIC = (
    "\nGate presentation **inherits the active `wilson-prefs` response "
    "style automatically** — never make the user re-ask for it. Render "
    "the options + recommendation + rationale in whatever style "
    "`wilson-prefs` declares (its `## Prefs` block names the active "
    "style); if it declares **friendly**, use the full friendly "
    "7-element pattern (emoji icon · alias · plain one-liner · everyday "
    "analogy · fenced ASCII diagram · comparison-to-nearest-tool) for "
    "each option and the recommendation — not a bare terse table. "
    "If `wilson-prefs` is absent/unset, fall back to the host default. "
    "This inheritance is the rule whether or not a reminder is given.\n")


def _prefs_inherit_clause():
    s = active_style()
    if not s:
        return PREFS_INHERIT_GENERIC
    extra = ("" if s.lower() != "friendly" else
             " Friendly = the full 7-element pattern (emoji icon · alias "
             "· plain one-liner · everyday analogy · fenced ASCII diagram "
             "· comparison-to-nearest-tool) per option + recommendation, "
             "not a bare terse table.")
    return (
        "\nGate presentation **inherits the active `wilson-prefs` "
        "response style automatically** — the active style is **%s** "
        "(from `wilson-prefs`); present every gate's options + "
        "recommendation + rationale in that style **without the user "
        "re-asking**.%s This holds even if no reminder is given.\n"
        % (s, extra))


def principle():
    return PRINCIPLE_BASE + _prefs_inherit_clause()

NUDGE = (
    "[step-by-step-decision-gate] This looks like multi-decision work — "
    "gate each decision separately (options + recommendation + 3+ "
    "rationale bullets, then wait for the pick), and log each as "
    "`Decision N:` to design.md via `/wilson-decision-gate decide`. "
    "Do not batch several picks into one confirmation. Present the gate "
    "in the active `wilson-prefs` style automatically (no need for the "
    "user to ask). If a native `/goal` is active, do not stop — adopt "
    "your recommendation, log it, and continue (autonomy mode).\n")


def inject(event, text):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": event, "additionalContext": text}}))
    sys.exit(0)


def hook():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    event = payload.get("hook_event_name") or payload.get(
        "hookEventName") or ""
    if load().get("off"):
        sys.exit(0)
    # SessionStart (fires on startup/resume/clear/compact) and PostCompact
    # (clean post-summary moment) → full principle inject. SessionStart's
    # source="compact" path is intentionally skipped: PostCompact fires
    # alongside it for the same compaction event and is the strictly
    # cleaner post-summary moment. Letting both fire would duplicate the
    # full principle on every compaction (Decision 21, design.md).
    if event == "SessionStart" and payload.get("source") == "compact":
        sys.exit(0)
    if event in ("SessionStart", "PostCompact"):
        inject(event, principle())
    if event == "UserPromptSubmit":
        prompt = payload.get("prompt") or ""
        if BRANCH_RE.search(prompt):
            inject("UserPromptSubmit", NUDGE)
    sys.exit(0)


def p(*a):
    print("wilson-decision-gate:", *a)


def read_ledger(path):
    try:
        with open(path, encoding="utf-8") as f:
            txt = f.read()
    except Exception:
        return None, []
    return txt, DEC_RE.findall(txt)


def cmd(args):
    cwd = os.getcwd()
    st = load()
    sub = (args[0] if args else "status").strip().lower()
    path = design_path(st, cwd)

    if sub in ("", "status"):
        txt, decs = read_ledger(path)
        print("wilson-decision-gate — %s"
              % ("OFF" if st.get("off") else "ON (SessionStart principle "
                 "+ branch-point reminder)"))
        print("  design.md: %s%s" % (path,
              "" if txt is not None else "  (not created yet)"))
        if decs:
            print("  decisions logged: %d (token `%s`)"
                  % (len(decs), decs[-1][0]))
        bundled = os.path.join(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__))), "samples")
        print("  sample: %s/step-by-step-decision-gate.md "
              "(+ .ko/.ja/.zh/.ru)" % bundled)
        print("  state: %s" % STATE)
        return

    if sub in ("on", "off"):
        st["off"] = (sub == "off")
        save(st)
        p("%s — %s." % (sub.upper(), "principle no longer injected"
          if sub == "off" else "principle injected at SessionStart + "
          "branch-point reminder on prompts"))
        return

    if sub == "path":
        if len(args) < 2:
            p("design.md path is `%s`. set: /wilson-decision-gate path "
              "<file>" % (st.get("path") or "design.md"))
            return
        st["path"] = args[1].strip()
        save(st)
        p("design.md path = %s" % st["path"])
        return

    if sub == "sample":
        lang = (args[1].strip().lower() if len(args) > 1 else "")
        base = os.path.join(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__))), "samples")
        stem = "step-by-step-decision-gate"
        fn = "%s.md" % stem if lang in ("", "en") else "%s.%s.md" % (
            stem, lang)
        fp = os.path.join(base, fn)
        if not os.path.isfile(fp):
            p("no sample %r — have: en ko ja zh ru" % lang)
            return
        print(open(fp, encoding="utf-8").read())
        return

    if sub == "log":
        txt, decs = read_ledger(path)
        if not txt:
            p("no design.md at %s yet." % path)
            return
        m = re.search(r"^#{1,6}\s*(Decisions|결정|決定|决定|Решения)\b",
                       txt, re.M)
        print(txt[m.start():].rstrip() if m else
              "\n".join("%s %s:" % (t, n) for t, n in decs)
              or "(no Decision entries yet)")
        return

    if sub == "decide":
        rest = [a for a in args[1:] if a.strip()]
        if len(rest) < 1:
            p('usage: /wilson-decision-gate decide "<picked>" '
              '"<rationale>"')
            return
        picked = rest[0].strip()
        why = " ".join(rest[1:]).strip()
        # split rationale into bullets on top-level newline / ; / ·
        # (NOT comma, and NOT a ; / · inside a (...) / [...] / {...}
        # group; \; / \· is a literal) — see split_rationale().
        bullets = split_rationale(why)
        if not bullets:
            bullets = ["(rationale not given — add 3+ before shipping)"]
        txt, decs = read_ledger(path)
        token = decs[-1][0] if decs else "Decision"
        nextn = (max(int(n) for _, n in decs) + 1) if decs else 1
        block = ("### %s %d — %s\n- **picked**: %s\n- **rationale**:\n%s"
                 % (token, nextn, picked, picked,
                    "\n".join("  - %s" % b for b in bullets)))
        warn = ("" if len(bullets) >= 3 else
                "  (only %d rationale bullet(s) — the gate wants 3+)"
                % len(bullets))
        if txt is None:
            os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
            body = ("# Design\n\n> Step-by-step decision gate audit "
                    "trail. One decision per gate, never batched. See "
                    "`/wilson-decision-gate sample` for the full "
                    "convention.\n\n---\n\n## Decisions\n\n%s\n" % block)
            with open(path, "w", encoding="utf-8") as f:
                f.write(body)
            p("created %s + logged %s %d: %s%s"
              % (path, token, nextn, picked, warn))
            return
        sep = "" if txt.endswith("\n") else "\n"
        with open(path, "a", encoding="utf-8") as f:
            f.write("%s\n%s\n" % (sep, block))
        p("logged %s %d: %s  (→ %s)%s"
          % (token, nextn, picked, path, warn))
        return

    p("unknown subcommand %r. Use: status | on | off | decide "
      '"<picked>" "<why>" | log | path <file> | sample [en|ko|ja|zh|ru]'
      % sub)


def main():
    if disabled():
        sys.exit(0)
    if len(sys.argv) > 1 and sys.argv[1] == "cmd":
        cmd(sys.argv[2:])
    else:
        hook()


if __name__ == "__main__":
    main()
