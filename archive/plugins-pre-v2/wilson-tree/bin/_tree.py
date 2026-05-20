#!/usr/bin/env python3
# wilson-tree core — junk-drawer guard for AI agents.
#
# Why this plugin: a research repo that has fired N experiments tends to
# scatter them across a flat `state/<§N_...>/` tree plus an ever-growing
# inline progress log. An agent that re-enters the repo has to re-grep
# the whole world to figure out where a result lives — burning tokens,
# time, and credits on every fresh session. wilson-tree teaches three
# habits at the hook layer:
#
#   P1 inject   SessionStart / PostCompact / UserPromptSubmit reads the
#               repo's REGISTRY.md (one line per §N: id · topic · status
#               · path · verdict-slug) and the nearest AGENTS.md walk-up
#               and injects a compact summary into the agent's context.
#
#   P2 register PostToolUse(Write) on state/**/result.json auto-detects
#               a new §N landing, classifies it by directory-name keyword
#               into one of the configured topics (ambiguous goes to
#               UNCLASSIFIED so the slash command can fix it), and
#               appends a REGISTRY.md row.
#
#   P3 guard    PreToolUse(Write|Edit|MultiEdit) on state/** outside the
#               configured <tree_root>/<topic>/state/ prefix emits a
#               one-line warning by default; SIDECAR_TREE_GUARD_STRICT=1
#               upgrades it to a deny.
#
# Inertness: the plugin does nothing in a repo that has neither a
# REGISTRY.md nor a .wilson-tree.json. A fresh repo or one that opts
# out via SIDECAR_NO_TREE=1 sees zero hook side effects.
#
# Config (project-local, optional): <repo-root>/.wilson-tree.json
#   {
#     "tree_root":   "HEXAD",        // default
#     "state_subdir": "state",       // default
#     "topics":      ["LEGO", "NEUROMORPHIC", "EEG", ...],
#     "strict":      false,          // P3 deny instead of warn
#     "inject_short_max": 800        // UserPromptSubmit reminder cap
#   }
#
# Storage: REGISTRY.md is the SSOT — written at <repo-root>/REGISTRY.md.
# No separate plugin-data state needed (the registry is the state).
import json
import os
import re
import sys
import time


# ─────────────────────────────────────────────────────────────────────
# disabled / config
# ─────────────────────────────────────────────────────────────────────

def disabled():
    try:
        if "tree" in json.load(open(os.path.join(
                os.path.expanduser("~"), ".claude", "sidecar",
                "disabled.json"), encoding="utf-8")):
            return True
    except Exception:
        pass
    return os.environ.get("SIDECAR_NO_TREE") == "1"


DEFAULT_CONFIG = {
    "tree_root": "HEXAD",
    "state_subdir": "state",
    "topics": [],
    "strict": False,
    "inject_short_max": 800,
}


def repo_root(cwd):
    """Walk up from cwd looking for a .git dir; fall back to cwd."""
    p = os.path.abspath(cwd or os.getcwd())
    for _ in range(20):
        if os.path.isdir(os.path.join(p, ".git")):
            return p
        parent = os.path.dirname(p)
        if parent == p:
            return os.path.abspath(cwd or os.getcwd())
        p = parent
    return os.path.abspath(cwd or os.getcwd())


def load_config(root):
    cfg = dict(DEFAULT_CONFIG)
    p = os.path.join(root, ".wilson-tree.json")
    if os.path.isfile(p):
        try:
            user = json.load(open(p, encoding="utf-8"))
            if isinstance(user, dict):
                for k, v in user.items():
                    if k in DEFAULT_CONFIG:
                        cfg[k] = v
        except Exception:
            pass
    if os.environ.get("SIDECAR_TREE_GUARD_STRICT") == "1":
        cfg["strict"] = True
    return cfg


def registry_path(root):
    return os.path.join(root, "REGISTRY.md")


def is_armed(root):
    """Plugin is inert until either REGISTRY.md or .wilson-tree.json exists."""
    return (os.path.isfile(registry_path(root)) or
            os.path.isfile(os.path.join(root, ".wilson-tree.json")))


# ─────────────────────────────────────────────────────────────────────
# registry parsing / writing
# ─────────────────────────────────────────────────────────────────────
# REGISTRY.md format (one line per §N below a header):
#   # REGISTRY
#
#   | §N    | topic         | status     | path                                 | verdict |
#   | ---   | ---           | ---        | ---                                  | ---     |
#   | §107  | DATA-REGIME   | landed     | HEXAD/DATA-REGIME/state/s107_…       | THRESHOLD-NOT-CROSSED |
#
# A row is parsed by splitting on `|` and trimming; the first cell is
# the §N id (must match /§?\d+[a-zA-Z]?/), so a plain markdown file with
# this table format is the SSOT.

ROW_ID_RE = re.compile(r"^(§|s|S)?\s*(\d+)([a-zA-Z]?)$")


def canonicalise_id(raw):
    """Normalise a §N id to the `§<digits><opt-letter>` canonical form.
    Accepts `§107`, `107`, `s107`, `S107a` etc.; returns `§107`, `§107a`."""
    m = ROW_ID_RE.match(raw.strip())
    if not m:
        return raw.strip()
    _, digits, suffix = m.groups()
    return "§%s%s" % (digits, suffix or "")


def parse_registry(text):
    """Yield (id, topic, status, path, verdict) tuples in document order.

    A data row is any pipe-delimited line whose first cell is non-empty
    and is NOT the header (`§N`) or a markdown separator (`---`). The id
    cell may be a canonical `§N` OR a free-form basename — pre-§N era
    entries use the directory basename as their id, and dropping them
    (an earlier `§N`-only regex did) silently truncates the registry."""
    rows = []
    for line in text.splitlines():
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 2:
            continue
        first = cells[0]
        if not first:
            continue                       # empty first cell
        if first == "§N" or first.lower() == "id":
            continue                       # header row
        if set(first) <= set("-: "):
            continue                       # markdown separator row
        # pad to 5 cells
        while len(cells) < 5:
            cells.append("")
        rows.append((canonicalise_id(first),) + tuple(cells[1:5]))
    return rows


def render_registry(rows):
    out = ["# REGISTRY", "",
           "One row per §N. SSOT for `/wilson-tree status` and the "
           "wilson-tree plugin's session-start context injection.", "",
           "| §N | topic | status | path | verdict |",
           "| --- | --- | --- | --- | --- |"]
    for r in rows:
        out.append("| %s | %s | %s | %s | %s |" % r)
    return "\n".join(out) + "\n"


def read_registry(root):
    p = registry_path(root)
    if not os.path.isfile(p):
        return []
    try:
        return parse_registry(open(p, encoding="utf-8").read())
    except Exception:
        return []


def write_registry(root, rows):
    p = registry_path(root)
    with open(p, "w", encoding="utf-8") as f:
        f.write(render_registry(rows))


# ─────────────────────────────────────────────────────────────────────
# nearest AGENTS.md walk-up (mirror wilson-ssot)
# ─────────────────────────────────────────────────────────────────────

def nearest_agents_md(start, repo):
    """Walk from `start` toward `repo` collecting AGENTS.md files."""
    found = []
    p = os.path.abspath(start)
    repo = os.path.abspath(repo)
    for _ in range(20):
        candidate = os.path.join(p, "AGENTS.md")
        if os.path.isfile(candidate):
            found.append(candidate)
        if p == repo:
            break
        parent = os.path.dirname(p)
        if parent == p:
            break
        p = parent
    return found


def short_body(path, max_lines=20):
    try:
        text = open(path, encoding="utf-8").read()
    except Exception:
        return ""
    lines = text.splitlines()
    return "\n".join(lines[:max_lines])


# ─────────────────────────────────────────────────────────────────────
# topic classification
# ─────────────────────────────────────────────────────────────────────

def classify(dir_basename, topics):
    """Return the first topic whose lowercase slug appears in dir_basename,
    else 'UNCLASSIFIED'. Exact-substring match — no fuzziness — so a
    misclassification is always recoverable by renaming the dir or
    editing REGISTRY.md by hand."""
    if not topics:
        return "UNCLASSIFIED"
    low = dir_basename.lower()
    for t in topics:
        slug = re.sub(r"[^a-z0-9]+", "", t.lower())
        if slug and slug in low.replace("_", "").replace("-", ""):
            return t
    return "UNCLASSIFIED"


def extract_section_id(dir_basename):
    """Pull a §N id from a directory name like 'foo_s107_2026_05_19'
    or 's115_lego_…'. Returns 'sNN' (lowercase) or '' if none."""
    m = re.search(r"(?:^|[_-])(s\d+[a-zA-Z]?)(?:[_-]|$)", dir_basename)
    if m:
        return m.group(1).lower()
    m = re.search(r"^(s\d+[a-zA-Z]?)", dir_basename)
    if m:
        return m.group(1).lower()
    return ""


# ─────────────────────────────────────────────────────────────────────
# inject (P1)
# ─────────────────────────────────────────────────────────────────────

def inject_full(root, cfg):
    rows = read_registry(root)
    agents = nearest_agents_md(os.getcwd(), root)
    lines = ["## Tree (wilson-tree)", "",
             "Project layout map injected from `%s` (SSOT for AI-agent "
             "navigation — saves re-grep on every session). "
             "Conventions: tree_root=`%s/`, topics=%s."
             % (os.path.relpath(registry_path(root), root),
                cfg["tree_root"],
                ("[" + ", ".join(cfg["topics"]) + "]") if cfg["topics"]
                else "(none configured)")]
    if rows:
        lines += ["",
                  "REGISTRY (%d row%s) — latest 8:" % (
                      len(rows), "" if len(rows) == 1 else "s"),
                  ""]
        # take last 8 in document order so the most recent landings show
        for r in rows[-8:]:
            lines.append("- **%s** · %s · %s · `%s` · %s" % r)
        if len(rows) > 8:
            lines.append("- … (%d earlier rows in REGISTRY.md)"
                         % (len(rows) - 8))
    else:
        lines += ["",
                  "REGISTRY.md is empty — drop a `| §1 | TOPIC | landed | "
                  "path/ | verdict-slug |` row and the next session will "
                  "render it here."]
    if agents:
        lines += ["",
                  "Nearest AGENTS.md walk-up (%d file%s):" % (
                      len(agents), "" if len(agents) == 1 else "s")]
        for a in agents:
            lines.append("- `%s`" % os.path.relpath(a, root))
    lines += ["",
              "Slash: `/wilson-tree status` (full table) · `audit` "
              "(scan state/ for unregistered §N) · `register §N TOPIC` · "
              "`topics` · `off`."]
    return "\n".join(lines) + "\n"


def inject_short(root, cfg):
    rows = read_registry(root)
    cap = int(cfg.get("inject_short_max") or 800)
    if not rows:
        return ""
    # one-line reminder: count + most recent §N
    last = rows[-1]
    msg = ("[wilson-tree] REGISTRY: %d row · latest %s/%s → %s"
           % (len(rows), last[0], last[1], last[2]))
    return (msg if len(msg) <= cap else msg[:cap - 1] + "…") + "\n"


def hook_inject():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    event = (payload.get("hook_event_name")
             or payload.get("hookEventName") or "")
    cwd = payload.get("cwd") or os.getcwd()
    root = repo_root(cwd)
    if not is_armed(root):
        sys.exit(0)
    cfg = load_config(root)
    text = (inject_full(root, cfg) if event in
            ("SessionStart", "PostCompact") else inject_short(root, cfg))
    if not text.strip():
        sys.exit(0)
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": event, "additionalContext": text}}))
    sys.exit(0)


# ─────────────────────────────────────────────────────────────────────
# guard (P3) — PreToolUse Write|Edit|MultiEdit
# ─────────────────────────────────────────────────────────────────────

def hook_guard():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    cwd = payload.get("cwd") or os.getcwd()
    root = repo_root(cwd)
    if not is_armed(root):
        sys.exit(0)
    cfg = load_config(root)
    tin = payload.get("tool_input") or {}
    # collect candidate write paths from Write / Edit / MultiEdit shapes
    paths = []
    for k in ("file_path", "path", "filePath"):
        v = tin.get(k)
        if isinstance(v, str):
            paths.append(v)
    edits = tin.get("edits")
    if isinstance(edits, list):
        for e in edits:
            if isinstance(e, dict):
                v = e.get("file_path") or e.get("path")
                if isinstance(v, str):
                    paths.append(v)
    if not paths:
        sys.exit(0)
    bad = []
    state = "/%s/" % cfg["state_subdir"].strip("/")
    tree_root = cfg["tree_root"].strip("/")
    for p in paths:
        norm = os.path.normpath(p)
        rel = os.path.relpath(norm, root) if os.path.isabs(norm) else norm
        # only fire when the write touches the project's state_subdir
        if state not in ("/" + rel.replace("\\", "/") + "/"):
            continue
        # accept only writes under <tree_root>/<topic>/<state_subdir>/
        ok = rel.replace("\\", "/").startswith(tree_root + "/")
        if not ok:
            bad.append(rel)
    if not bad:
        sys.exit(0)
    msg = ("[wilson-tree] state/ write outside `%s/<topic>/%s/` — "
           "consider moving under `%s/<topic>/%s/`. Paths: %s. "
           "(Warning only; set SIDECAR_TREE_GUARD_STRICT=1 to block.)"
           % (tree_root, cfg["state_subdir"], tree_root,
              cfg["state_subdir"], ", ".join(bad[:4])
              + ("…" if len(bad) > 4 else "")))
    if cfg.get("strict"):
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": msg}}))
        sys.exit(0)
    # warn — surface via additionalContext, do not block
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "additionalContext": msg}}))
    sys.exit(0)


# ─────────────────────────────────────────────────────────────────────
# register (P2) — PostToolUse Write
# ─────────────────────────────────────────────────────────────────────

def hook_register():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    cwd = payload.get("cwd") or os.getcwd()
    root = repo_root(cwd)
    if not is_armed(root):
        sys.exit(0)
    cfg = load_config(root)
    tin = payload.get("tool_input") or {}
    fpath = tin.get("file_path") or tin.get("path")
    if not isinstance(fpath, str):
        sys.exit(0)
    norm = os.path.normpath(fpath)
    rel = os.path.relpath(norm, root) if os.path.isabs(norm) else norm
    rel = rel.replace("\\", "/")
    # only react when the Write created a state/.../result.json
    if not (("/state/" in rel or rel.startswith("state/") or
             ("/" + cfg["state_subdir"] + "/") in rel)
            and rel.endswith("/result.json")):
        sys.exit(0)
    parts = rel.split("/")
    # the state dir basename is the parent of result.json
    if len(parts) < 2:
        sys.exit(0)
    dir_basename = parts[-2]
    sid = canonicalise_id(extract_section_id(dir_basename) or "?")
    topic = classify(dir_basename, cfg["topics"])
    state_path = "/".join(parts[:-1])
    rows = read_registry(root)
    # de-dup by canonical §N id
    if any(canonicalise_id(r[0]) == sid for r in rows):
        sys.exit(0)
    rows.append((sid, topic, "landed", state_path, "TBD"))
    try:
        write_registry(root, rows)
    except Exception:
        sys.exit(0)
    msg = ("[wilson-tree] REGISTRY append: %s · %s · %s"
           % (sid, topic, state_path))
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PostToolUse", "additionalContext": msg}}))
    sys.exit(0)


# ─────────────────────────────────────────────────────────────────────
# /wilson-tree slash command
# ─────────────────────────────────────────────────────────────────────

def p(*a):
    print("wilson-tree:", *a)


def cmd(args):
    sub = (args[0] if args else "status").strip().lower()
    cwd = os.getcwd()
    root = repo_root(cwd)
    cfg = load_config(root)
    if not is_armed(root) and sub not in ("init", "off", "status", "path"):
        p("not armed in this repo (no REGISTRY.md, no .wilson-tree.json). "
          "Run `/wilson-tree init` to scaffold an empty REGISTRY.md.")
        return

    if sub in ("", "status", "show"):
        rows = read_registry(root)
        print("wilson-tree — repo: %s" % root)
        print("  REGISTRY: %s (%s)" % (registry_path(root),
              "exists, %d rows" % len(rows) if rows else "empty"))
        print("  tree_root: %s/   state_subdir: %s/   strict: %s"
              % (cfg["tree_root"], cfg["state_subdir"], cfg["strict"]))
        print("  topics: %s" % (cfg["topics"] or "(none)"))
        if rows:
            print()
            print("  latest %d row%s:" % (min(len(rows), 8),
                  "" if len(rows) == 1 else "s"))
            for r in rows[-8:]:
                print("    %s · %s · %s · %s · %s" % r)
        return

    if sub == "init":
        if os.path.isfile(registry_path(root)):
            p("REGISTRY.md already exists at %s" % registry_path(root))
            return
        write_registry(root, [])
        p("REGISTRY.md scaffolded at %s. Edit `.wilson-tree.json` to "
          "declare topics + tree_root, then re-run `/wilson-tree audit`."
          % registry_path(root))
        return

    if sub == "audit":
        # walk state_subdir, find result.json files, surface unregistered §N
        seen = set(canonicalise_id(r[0]) for r in read_registry(root))
        state_dir = os.path.join(root, cfg["state_subdir"])
        if not os.path.isdir(state_dir):
            p("no `%s/` under repo root — nothing to audit." % cfg["state_subdir"])
            return
        found = []
        for entry in sorted(os.listdir(state_dir)):
            sub_path = os.path.join(state_dir, entry)
            if not os.path.isdir(sub_path):
                continue
            if not os.path.isfile(os.path.join(sub_path, "result.json")):
                continue
            sid = canonicalise_id(extract_section_id(entry) or "?")
            if sid in seen:
                continue
            topic = classify(entry, cfg["topics"])
            found.append((sid, topic, entry))
        if not found:
            p("no unregistered §N under `%s/` (%d already in REGISTRY)."
              % (cfg["state_subdir"], len(seen)))
            return
        print("wilson-tree audit — %d unregistered §N under `%s/`:"
              % (len(found), cfg["state_subdir"]))
        for sid, topic, entry in found:
            print("  %s · %s · %s/%s" % (sid, topic, cfg["state_subdir"], entry))
        print()
        print("To bulk-register: re-run with `audit --apply` (TODO), or "
              "register one at a time: `/wilson-tree register <§N> <TOPIC>`.")
        return

    if sub == "topics":
        print("wilson-tree — configured topics:")
        if cfg["topics"]:
            for t in cfg["topics"]:
                print("  %s" % t)
        else:
            print("  (none — set in `.wilson-tree.json`)")
        return

    if sub == "register":
        if len(args) < 2:
            p('usage: /wilson-tree register <§N> [TOPIC] [STATUS] [PATH] [VERDICT]')
            return
        sid = canonicalise_id(args[1].strip())
        topic = args[2].strip() if len(args) > 2 else "UNCLASSIFIED"
        status = args[3].strip() if len(args) > 3 else "landed"
        path = args[4].strip() if len(args) > 4 else ""
        verdict = args[5].strip() if len(args) > 5 else "TBD"
        rows = read_registry(root)
        rows = [r for r in rows if canonicalise_id(r[0]) != sid]
        rows.append((sid, topic, status, path, verdict))
        write_registry(root, rows)
        p("registered: %s · %s · %s · %s · %s"
          % (sid, topic, status, path, verdict))
        return

    if sub == "off":
        # advisory — actual opt-out is the env var
        p("set SIDECAR_NO_TREE=1 in this shell to disable the plugin for "
          "the session, or drop a `tree` entry into "
          "~/.claude/sidecar/disabled.json for a per-user persistent off.")
        return

    if sub == "path":
        print("wilson-tree — paths:")
        print("  repo root: %s" % root)
        print("  REGISTRY:  %s  (%s)" % (registry_path(root),
              "exists" if os.path.isfile(registry_path(root)) else "absent"))
        cfgp = os.path.join(root, ".wilson-tree.json")
        print("  config:    %s  (%s)"
              % (cfgp, "exists" if os.path.isfile(cfgp) else "absent"))
        return

    p("unknown subcommand %r. Use: status | init | audit | topics | "
      "register | path | off" % sub)


# ─────────────────────────────────────────────────────────────────────
# main dispatch
# ─────────────────────────────────────────────────────────────────────

def main():
    if disabled():
        sys.exit(0)
    if len(sys.argv) > 1:
        mode = sys.argv[1]
        if mode == "inject":
            return hook_inject()
        if mode == "guard":
            return hook_guard()
        if mode == "register":
            return hook_register()
        if mode == "cmd":
            return cmd(sys.argv[2:])
    # no mode given — default to inject (matches wilson-goal convention)
    return hook_inject()


if __name__ == "__main__":
    main()
