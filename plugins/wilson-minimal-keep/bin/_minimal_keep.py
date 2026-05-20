#!/usr/bin/env python3
# wilson-minimal-keep core — keep agent-context files (AGENTS.tape /
# AGENTS.md / CLAUDE.md) lean. Invoked by minimal-keep.sh so sys.stdin is
# the Claude Code PreToolUse payload. No wilson binary dependency.
#
# Four bloat signals. S1/S2/S3 are file-level (data-driven — calibrated
# against 164 unique-content master AGENTS.* under ~/core on 2026-05-20,
# with /.claude/worktrees/ duplicates excluded). The three file-level caps
# target the SAME top-decile bloat tail so fire rates stay roughly aligned
# (~10%/6%/10%). S4 is per-entry — applies only when the content carries
# tape `@<TYPE>` headers (declarative tape entries).
#   S1 total-lines  file > MAX_LINES        (Write only — needs the full file)
#                   280 ≈ p90 of measured master files → ~10% fire
#   S2 long-line    any line > MAX_LINE_LEN (the dominant "verbose" signal)
#                   500 sits between p90 (375) and p95 (565); 0.3.0 dropped
#                   from 800 (which fired only on p99 outliers, 3%) so the
#                   three signals share the same top-decile sensitivity
#   S3 history      a Log/History/Changelog heading, or >=3 dated bullets —
#                   history belongs in REGISTRY.md / GROWTH.md, not here
#                   ~10% fire (binary signal — no threshold)
#   S4 tape-entry   per `@<TYPE>` block: > MAX_ENTRY_CHARS · heredoc in a
#                   field · > MAX_FIELDS fields. Enforces the `.tape` v1.2
#                   Compactness invariants (~/core/tape/spec/tape.md
#                   2026-05-20 amendment). Fires only on files whose
#                   content contains tape headers — AGENTS.tape and any
#                   CLAUDE.md symlinked to one.
#
# Two modes via SIDECAR_MINIMAL_KEEP_MODE (WILSON_ accepted):
#   block (default)  the write is DENIED at PreToolUse
#   warn             one-line advisory via additionalContext, write proceeds
# Any value other than `warn` resolves to `block` — block is the default
# because 0.1.0's warn-only default split detect from enforcement: the
# bloat was always flagged but never refused, so the same Write would
# pile on more bloat on the next cycle. Soft mode is opt-in.
#
# Opt out: SIDECAR_NO_MINIMAL_KEEP=1 (also honors WILSON_NO_MINIMAL_KEEP=1).
# Audit / cleanup verb (no stdin): `_minimal_keep.py scan [dir]`.
import json, os, re, sys

EVENT = "PreToolUse"
MAX_LINES = 280
MAX_LINE_LEN = 500
MAX_ENTRY_CHARS = 500    # S4 — per `@<TYPE>` entry total (header + body)
MAX_FIELDS = 5           # S4 — `key = ...` payload lines per entry
TAPE_HEADER = re.compile(r"^@[A-Z?]\S*\s")
FIELD_LINE = re.compile(r"^\s{2}[a-z_][a-z0-9_-]*\s*(?:=|<<)")
BASENAMES = ("AGENTS.tape", "AGENTS.md", "CLAUDE.md")
EXCLUDE = ("/archive", "/old/", "/vendor/", "/third_party/",
           "/node_modules/", "/.venv/", "/scratch/", "/templates/",
           "/examples/", "/.git/",
           # isolated-agent worktrees (anima, Claude Code Agent isolation
           # etc.) carry duplicate AGENTS.* copies of the master file —
           # flag the master, not each of N copies. Added 0.3.0.
           "/.claude/worktrees/",
           # archive snapshot directories — anima's _clm_NN_ workflow
           # captures repeatedly-named branches as sibling root dirs
           # (anima_clm_10_h100_sweep_laws_77_78 etc.); they are
           # snapshots, not active masters. Added 0.5.0.
           "_clm_")
# Heading-level history signal. 0.5.0 tightened from `^#+\s.*\b(log|history|
# changelog)\b` (matched any heading mentioning the word anywhere — caught
# `## Log Sources`, narration like `# (...## Log)`, body sentences) to
# require the keyword to sit at the tail of a short heading body — so
# `## Changelog` / `## Audit log` / `# ─── migration history ────` still
# match, but `## Log Sources` / `# actions · session log lives in …` do not.
HISTORY_HEADING = re.compile(
    r"^#{1,4}\s+[^#\n]{0,60}\b(?:log|history|changelog)\b[^#\w\n]*$",
    re.IGNORECASE)
DATED_BULLET = re.compile(r"^\s*[-*]\s.*20\d\d-[01]?\d")


# -- detection (shared by the hook and the scan verb) ----------------
def find_bloat(content, is_write):
    lines = content.split("\n")
    out = []
    if is_write and len(lines) > MAX_LINES:
        out.append("S1 total-lines: %d lines > %d cap"
                   % (len(lines), MAX_LINES))
    longest = max((len(x) for x in lines), default=0)
    if longest > MAX_LINE_LEN:
        n = sum(1 for x in lines if len(x) > MAX_LINE_LEN)
        out.append("S2 long-line: %d line(s) > %d chars (longest %d) — "
                   "split jammed prose" % (n, MAX_LINE_LEN, longest))
    hist = next((i + 1 for i, x in enumerate(lines)
                 if HISTORY_HEADING.match(x.strip())), 0)
    dated = sum(1 for x in lines if DATED_BULLET.match(x))
    if hist:
        out.append("S3 history: log/history heading on line %d" % hist)
    elif dated >= 3:
        out.append("S3 history: %d dated bullets" % dated)
    out.extend(find_tape_bloat(lines))
    return out


# -- S4 — per-tape-entry Compactness invariants (~/core/tape/spec/tape.md
# 2026-05-20 amendment). Walks `@<TYPE>` blocks. A block runs from a
# column-0 header line through its 2-space-indented continuation lines,
# stopping at the next blank line or column-0 line. Heredoc body counts
# toward the block but its presence is itself a violation.
def find_tape_bloat(lines):
    if not any(TAPE_HEADER.match(x) for x in lines):
        return []
    out, i = [], 0
    while i < len(lines):
        if not TAPE_HEADER.match(lines[i]):
            i += 1
            continue
        start, block, heredoc = i, [lines[i]], None
        i += 1
        while i < len(lines):
            ln = lines[i]
            if heredoc is not None:
                block.append(ln)
                if ln.strip() == heredoc:
                    heredoc = None
                i += 1
                continue
            if ln == "" or not ln.startswith("  "):
                break
            block.append(ln)
            m = re.search(r"<<~?(\w+)\s*$", ln)
            if m:
                heredoc = m.group(1)
            i += 1
        chars = len("\n".join(block))
        m = re.match(r"^@\S+\s+(\S+)", block[0])
        eid = m.group(1) if m else "<unknown>"
        fields = [b for b in block[1:] if FIELD_LINE.match(b)]
        has_heredoc = any("<<" in b for b in fields)
        if chars > MAX_ENTRY_CHARS:
            out.append("S4 entry-too-big: @%s on line %d is %d chars > %d "
                       "cap (split / shorten — see tape.md v1.2 amendment)"
                       % (eid, start + 1, chars, MAX_ENTRY_CHARS))
        if has_heredoc:
            out.append("S4 entry-multiline: @%s on line %d uses heredoc — "
                       "field values must be 1 line in declarative tapes"
                       % (eid, start + 1))
        if len(fields) > MAX_FIELDS:
            out.append("S4 too-many-fields: @%s on line %d has %d fields > "
                       "%d cap (split entry)"
                       % (eid, start + 1, len(fields), MAX_FIELDS))
    return out


# -- scan verb — walk a tree, report bloated AGENTS.* files ----------
def scan(root):
    root = os.path.abspath(os.path.expanduser(root))
    hits = []
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns
                  if d not in (".git", "node_modules", ".venv")]
        for fn in fns:
            if fn in BASENAMES:
                fp = os.path.join(dp, fn)
                # Apply the same EXCLUDE filter the hook uses — without
                # this, scan reports N duplicate copies under isolated-
                # agent worktrees as N hits, drowning the master signal.
                if any(s in fp for s in EXCLUDE):
                    continue
                try:
                    c = open(fp, encoding="utf-8", errors="replace").read()
                except Exception:
                    continue
                f = find_bloat(c, True)
                if f:
                    hits.append((fp, f))
    for fp, f in sorted(hits):
        print("%s\n  %s" % (fp, "\n  ".join(f)))
    print("\n%d bloated AGENTS.* file(s) under %s" % (len(hits), root))


def allow():
    sys.exit(0)  # no output = allow


def deny(reason):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": EVENT, "permissionDecision": "deny",
        "permissionDecisionReason": reason}}))
    sys.exit(0)


def warn(ctx):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": EVENT, "additionalContext": ctx}}))
    sys.exit(0)


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "scan":
        scan(sys.argv[2] if len(sys.argv) > 2 else ".")
        return

    # sidecar control — no-op when /sidecar disabled this plugin
    try:
        if "minimal-keep" in json.load(open(os.path.join(
                os.path.expanduser("~"), ".claude", "sidecar",
                "disabled.json"), encoding="utf-8")):
            allow()
    except SystemExit:
        raise
    except Exception:
        pass

    if os.environ.get("SIDECAR_NO_MINIMAL_KEEP") == "1" \
            or os.environ.get("WILSON_NO_MINIMAL_KEEP") == "1":
        allow()

    try:
        payload = json.load(sys.stdin)
    except Exception:
        allow()
    tool = payload.get("tool_name") or ""
    ti = payload.get("tool_input") or {}
    if not isinstance(ti, dict):
        allow()
    path = ti.get("file_path") or ti.get("path") or ""
    if not path or os.path.basename(path) not in BASENAMES:
        allow()
    if any(s in path for s in EXCLUDE):
        allow()

    # content slice — Write = full file (all signals); Edit/MultiEdit =
    # inserted text only (S1 total-lines needs the full file, so skip it)
    is_write = tool == "Write"
    if is_write:
        content = ti.get("content") or ""
    elif tool == "MultiEdit":
        content = "\n".join(str(e.get("new_string", ""))
                            for e in (ti.get("edits") or [])
                            if isinstance(e, dict))
    else:  # Edit
        content = ti.get("new_string") or ""
    if not content:
        allow()

    findings = find_bloat(content, is_write)
    if not findings:
        allow()

    # history eviction target — REGISTRY.md (wilson-tree's artifact) if it
    # sits next to the AGENTS file, else the generic GROWTH.md roadmap
    home = "REGISTRY.md / GROWTH.md"
    if os.path.exists(os.path.join(os.path.dirname(path) or ".",
                                   "REGISTRY.md")):
        home = "REGISTRY.md (wilson-tree)"
    msg = "; ".join(findings)

    mode = (os.environ.get("SIDECAR_MINIMAL_KEEP_MODE")
            or os.environ.get("WILSON_MINIMAL_KEEP_MODE") or "block")
    if mode != "warn":
        deny("MINIMAL_KEEP_BLOCK { target: %s, bloat: %s, action: trim "
             "before write — keep only non-obvious rules, history -> %s; "
             "or SIDECAR_MINIMAL_KEEP_MODE=warn to downgrade }"
             % (path, msg, home))
    warn("MINIMAL_KEEP { target: %s, bloat: %s, action: keep AGENTS.* lean "
         "— only non-obvious rules an agent must not re-derive; history -> "
         "%s, optout: SIDECAR_NO_MINIMAL_KEEP=1 }" % (path, msg, home))


if __name__ == "__main__":
    main()
