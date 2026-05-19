#!/usr/bin/env python3
# wilson-fire-gate core — instrument-first decision gate (measure over
# predict). Companion to wilson-decision-gate: that one gates ANY
# branch point, this one gates the narrower measure-vs-predict fork.
#
# A *fire* = running one real measurement (benchmark / profile / probe)
# instead of predicting its outcome. Like wilson-decision-gate this is
# TEXT ONLY — a hook cannot judge whether a fire is warranted, so the
# plugin injects the principle and maintains the ledger:
#
#   SessionStart / PostCompact → inject the instrument-first principle.
#   UserPromptSubmit           → a SHORT reminder ONLY when the prompt
#                                looks like a measure-vs-predict fork —
#                                NOT every prompt.
#   /wilson-fire-gate          → maintain the design.md `Fire-decision N`
#                                ledger.
#
# Default ON when installed; turn off with `/wilson-fire-gate off`,
# `/sidecar off fire-gate`, or SIDECAR_NO_FIRE_GATE=1.
import json
import os
import re
import sys

FIRE_DEC_RE = re.compile(r"^#{0,6}\s*Fire-decision\s+(\d+)\s*[—:-]", re.M)
# measure-vs-predict signal — conservative so it does NOT fire every turn
FORK_RE = re.compile(
    r"\b(benchmark\w*|measur\w*|profil\w*|instrument\w*|performance|"
    r"latenc\w*|throughput|roofline|speedup|regress\w*|optimi[sz]\w*|"
    r"faster|slower)\b"
    r"|측정|벤치|실측|프로파일|성능|벤치마크|최적화|빠를|느릴",
    re.I)


def disabled():
    try:
        if "fire-gate" in json.load(open(os.path.join(
                os.path.expanduser("~"), ".claude", "sidecar",
                "disabled.json"), encoding="utf-8")):
            return True
    except Exception:
        pass
    return os.environ.get("SIDECAR_NO_FIRE_GATE") == "1"


def data_dir():
    d = os.environ.get("CLAUDE_PLUGIN_DATA") or os.path.join(
        os.path.expanduser("~"), ".claude", "plugin-data",
        "wilson-fire-gate")
    os.makedirs(d, exist_ok=True)
    return d


STATE = os.path.join(data_dir(), "fg.json")


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
    """Split a rationale string into bullets on top-level `;`, `·` and
    newlines (NOT comma — common inside one reason). A separator inside a
    balanced (...) / [...] / {...} group does not split; `\\;` / `\\·` is
    a literal."""
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
            buf.append(why[i + 1])
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
    return os.path.join(os.path.expanduser("~"), ".claude", "plugin-data",
                        "wilson-prefs")


def active_style():
    """The active wilson-prefs response style, or None. Best-effort."""
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
    "## Fire-gate — measure over predict (instrument-first)\n\n"
    "A *fire* = running one real measurement (benchmark / profile / "
    "probe) instead of predicting its outcome. At a measure-vs-predict "
    "fork, follow the instrument-first discipline:\n\n"
    "1. **Predict first** with the most faithful model you have — prior "
    "measurements, roofline limits, documented walls.\n"
    "2. **Fire only when genuinely uncertain** — a confident, "
    "well-grounded prediction does not need a fire.\n"
    "3. **Never re-fire a settled result** — if a prior measurement "
    "already determines the outcome (a measured wall, an earlier KILL), "
    "resolve analytically ($0).\n"
    "4. **cost-no-object ≠ fire-always** — it means do not block a "
    "*needed* fire on its cost; it does NOT license firing when the "
    "answer is already known.\n\n"
    "Gate each fork — **A: fire (measure)** / **B: resolve analytically "
    "($0)** — with a recommendation + **3+ rationale bullets**, wait for "
    "the user's pick, and record it as a `### Fire-decision N` block via "
    "`/wilson-fire-gate decide \"<picked>\" \"<b1>;<b2>;<b3>\"`. "
    "`/wilson-fire-gate sample` prints the full convention.\n\n"
    "**Active `/goal` = autonomy mode.** When Claude Code's native "
    "`/goal` is in effect, do NOT stop at a fire fork to wait — apply "
    "the four tenets yourself, adopt the resulting call (fire when "
    "genuinely uncertain, resolve when settled), record it with "
    "`/wilson-fire-gate decide`, note it in one line, and continue. A "
    "`/goal` is standing authorization for the cost-bearing fires its "
    "closure needs (cost-no-object) — but never licenses re-firing a "
    "result already settled. Without an active `/goal`, gate normally "
    "and wait for the pick.\n")

PREFS_INHERIT_GENERIC = (
    "\nFork presentation **inherits the active `wilson-prefs` response "
    "style automatically** — never make the user re-ask. Render the "
    "options + recommendation + rationale in whatever style "
    "`wilson-prefs` declares; if it declares **friendly**, use the full "
    "friendly 7-element pattern (emoji icon · alias · plain one-liner · "
    "everyday analogy · fenced ASCII diagram · comparison-to-nearest-"
    "tool). If `wilson-prefs` is absent/unset, fall back to the host "
    "default.\n")


def _prefs_inherit_clause():
    s = active_style()
    if not s:
        return PREFS_INHERIT_GENERIC
    extra = ("" if s.lower() != "friendly" else
             " Friendly = the full 7-element pattern (emoji icon · alias "
             "· plain one-liner · everyday analogy · fenced ASCII diagram "
             "· comparison-to-nearest-tool) per option + recommendation.")
    return (
        "\nFork presentation **inherits the active `wilson-prefs` "
        "response style automatically** — the active style is **%s**; "
        "present every fire-gate fork's options + recommendation + "
        "rationale in that style **without the user re-asking**.%s\n"
        % (s, extra))


def principle():
    return PRINCIPLE_BASE + _prefs_inherit_clause()


NUDGE = (
    "[fire-gate] This looks like a measure-vs-predict fork. Before "
    "firing a measurement: predict first with a faithful model, fire "
    "only when genuinely uncertain, and never re-fire a result a prior "
    "measurement already settled (resolve analytically instead). Gate "
    "the fire-vs-resolve call (options + recommendation + 3+ rationale "
    "→ wait for the pick) and record it as `### Fire-decision N` via "
    "`/wilson-fire-gate decide`. If a native `/goal` is active, do not "
    "stop — adopt the instrument-first call, log it, and continue "
    "(autonomy mode).\n")


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
    # SessionStart's source="compact" is skipped — PostCompact fires for
    # the same compaction event and is the cleaner post-summary moment
    # (Decision 21, design.md).
    if event == "SessionStart" and payload.get("source") == "compact":
        sys.exit(0)
    if event in ("SessionStart", "PostCompact"):
        inject(event, principle())
    if event == "UserPromptSubmit":
        prompt = payload.get("prompt") or ""
        if FORK_RE.search(prompt):
            inject("UserPromptSubmit", NUDGE)
    sys.exit(0)


def p(*a):
    print("wilson-fire-gate:", *a)


def read_ledger(path):
    try:
        with open(path, encoding="utf-8") as f:
            txt = f.read()
    except Exception:
        return None, []
    return txt, FIRE_DEC_RE.findall(txt)


def cmd(args):
    cwd = os.getcwd()
    st = load()
    sub = (args[0] if args else "status").strip().lower()
    path = design_path(st, cwd)

    if sub in ("", "status"):
        txt, decs = read_ledger(path)
        print("wilson-fire-gate — %s"
              % ("OFF" if st.get("off") else "ON (SessionStart principle "
                 "+ measure-fork reminder)"))
        print("  design.md: %s%s" % (path,
              "" if txt is not None else "  (not created yet)"))
        if decs:
            print("  fire-decisions logged: %d" % len(decs))
        bundled = os.path.join(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__))), "samples")
        print("  sample: %s/instrument-first.md" % bundled)
        print("  state: %s" % STATE)
        return

    if sub in ("on", "off"):
        st["off"] = (sub == "off")
        save(st)
        p("%s — %s." % (sub.upper(), "principle no longer injected"
          if sub == "off" else "principle injected at SessionStart + "
          "measure-fork reminder on prompts"))
        return

    if sub == "path":
        if len(args) < 2:
            p("design.md path is `%s`. set: /wilson-fire-gate path "
              "<file>" % (st.get("path") or "design.md"))
            return
        st["path"] = args[1].strip()
        save(st)
        p("design.md path = %s" % st["path"])
        return

    if sub == "sample":
        base = os.path.join(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__))), "samples")
        fp = os.path.join(base, "instrument-first.md")
        if not os.path.isfile(fp):
            p("bundled sample missing at %s" % fp)
            return
        print(open(fp, encoding="utf-8").read())
        return

    if sub == "log":
        txt, decs = read_ledger(path)
        if not txt:
            p("no design.md at %s yet." % path)
            return
        blocks = list(re.finditer(
            r"^#{0,6}\s*Fire-decision\s+\d+\b.*?(?=^#{1,6}\s|\Z)",
            txt, re.M | re.S))
        if not blocks:
            p("no Fire-decision entries in %s yet." % path)
            return
        print("\n\n".join(b.group(0).rstrip() for b in blocks))
        return

    if sub == "decide":
        rest = [a for a in args[1:] if a.strip()]
        if len(rest) < 1:
            p('usage: /wilson-fire-gate decide "<picked>" "<rationale>"')
            return
        picked = rest[0].strip()
        why = " ".join(rest[1:]).strip()
        bullets = split_rationale(why)
        if not bullets:
            bullets = ["(rationale not given — add 3+ before shipping)"]
        txt, decs = read_ledger(path)
        nextn = (max(int(n) for n in decs) + 1) if decs else 1
        block = ("### Fire-decision %d — %s\n- **picked**: %s\n"
                 "- **rationale**:\n%s"
                 % (nextn, picked, picked,
                    "\n".join("  - %s" % b for b in bullets)))
        warn = ("" if len(bullets) >= 3 else
                "  (only %d rationale bullet(s) — the gate wants 3+)"
                % len(bullets))
        if txt is None:
            os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
            body = ("# Design\n\n> Fire-gate audit trail — instrument-"
                    "first measure-vs-predict decisions. See "
                    "`/wilson-fire-gate sample` for the convention.\n\n"
                    "---\n\n## Fire-decisions\n\n%s\n" % block)
            with open(path, "w", encoding="utf-8") as f:
                f.write(body)
            p("created %s + logged Fire-decision %d: %s%s"
              % (path, nextn, picked, warn))
            return
        sep = "" if txt.endswith("\n") else "\n"
        with open(path, "a", encoding="utf-8") as f:
            f.write("%s\n%s\n" % (sep, block))
        p("logged Fire-decision %d: %s  (→ %s)%s"
          % (nextn, picked, path, warn))
        return

    p("unknown subcommand %r. Use: status | on | off | decide "
      '"<picked>" "<why>" | log | path <file> | sample' % sub)


def main():
    if disabled():
        sys.exit(0)
    if len(sys.argv) > 1 and sys.argv[1] == "cmd":
        cmd(sys.argv[2:])
    else:
        hook()


if __name__ == "__main__":
    main()
