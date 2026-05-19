#!/usr/bin/env python3
# wilson-inbox core — standalone port of wilson's inbox plugin.
#
# Cross-project handoff inbox: when a gap or request affects another SSOT
# repo, file it there as a structured `inbox/<kind>/<slug>.md` entry rather
# than silently patching around it downstream. This is the scaffolder +
# lifecycle tool for that convention.
#
#   inbox.sh            — SessionStart hook: surface the current repo's
#                          inbox entries so a handoff is never forgotten
#                          (inert unless the repo has an inbox/).
#   inbox.sh cmd <args> — /wilson-inbox:inbox slash command — 8 verbs:
#                          add / list / show / path / verify / apply /
#                          archive / rm.
#
# kind whitelist (locked at 4): notes / patches / poc / rfc_drafts.
# Light-mode is just the folder + entries; heavy-mode adds an
# inbox/PATCHES.yaml status lifecycle that apply/archive transition.
#
# Default ON when installed; turn off with `/sidecar off inbox` or
# SIDECAR_NO_INBOX=1.

import json
import os
import re
import subprocess
import sys
import time

KINDS = ("notes", "patches", "poc", "rfc_drafts")
SLUG_RE = re.compile(r"^[a-z0-9-]+$")
DATE_PREFIX_RE = re.compile(r"^\d{4}-\d{2}-\d{2}-")
PENDING_STATUSES = ("pending", "pending_external")


def disabled():
    try:
        if "inbox" in json.load(open(os.path.join(
                os.path.expanduser("~"), ".claude", "sidecar",
                "disabled.json"), encoding="utf-8")):
            return True
    except Exception:
        pass
    return os.environ.get("SIDECAR_NO_INBOX") == "1"


def today():
    return time.strftime("%Y-%m-%d", time.gmtime())


# --- repo resolution ----------------------------------------------------
# --to <name> -> ~/core/<name> (must exist); else walk up from the cwd to
# the nearest directory holding a .git. Never scaffold an inbox in a stray
# directory — refuse when neither resolves.
def resolve_repo(to, cwd):
    home = os.path.expanduser("~")
    if to:
        p = os.path.join(home, "core", to)
        return p if os.path.isdir(p) else ""
    d = os.path.abspath(cwd or os.getcwd())
    for _ in range(40):
        if os.path.exists(os.path.join(d, ".git")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return ""
        d = parent
    return ""


def no_repo_err(to):
    if to:
        return "no such SSOT repo: %s" % os.path.join(
            os.path.expanduser("~"), "core", to)
    return ("the cwd is not inside an SSOT repo (no .git found walking "
            "up) — pass --to <name>")


# --- templates ----------------------------------------------------------
def template(kind, slug):
    d = today()
    if kind == "notes":
        return ("# %s\n\n_kind: note · added: %s_\n\n"
                "## Context\n\n## Observation\n\n## Next\n" % (slug, d))
    if kind == "patches":
        return ("# patch: %s\n\n_status: pending_external · added: %s_\n\n"
                "## Problem\n\n## Proposal\n\n## Files affected\n\n"
                "## Downstream consumers\n\n## Verification\n" % (slug, d))
    if kind == "poc":
        return ("# poc: %s\n\n_added: %s_\n\n"
                "## What\n\n## How\n\n## Findings\n" % (slug, d))
    if kind == "rfc_drafts":
        return ("# RFC draft: %s\n\n_status: draft · added: %s_\n\n"
                "## Motivation\n\n## Proposal\n\n## Alternatives\n\n"
                "## Open questions\n" % (slug, d))
    return "# %s\n" % slug


# --- entry enumeration --------------------------------------------------
def list_kind(kdir):
    """[(file, slug)] for every *.md directly under kdir."""
    out = []
    try:
        names = sorted(os.listdir(kdir))
    except OSError:
        return out
    for f in names:
        if f.endswith(".md") and os.path.isfile(os.path.join(kdir, f)):
            out.append((f, f[:-3]))
    return out


def find_by_slug(repo_root, slug):
    """Entries whose slug matches `slug` exactly, or — for a date-prefixed
    note — whose slug-without-the-YYYY-MM-DD- prefix matches."""
    hits = []
    inbox = os.path.join(repo_root, "inbox")
    for k in KINDS:
        kdir = os.path.join(inbox, k)
        for f, s in list_kind(kdir):
            bare = s[11:] if (k == "notes" and DATE_PREFIX_RE.match(f)) else s
            if s == slug or bare == slug:
                hits.append({"kind": k, "file": f, "slug": s,
                             "path": os.path.join(kdir, f)})
    return hits


def first_heading(path):
    try:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                t = line.strip()
                if t.startswith("# "):
                    return t[2:]
    except OSError:
        return "(unreadable)"
    return "(no heading)"


# --- PATCHES.yaml line-based editing ------------------------------------
def yaml_is_id_line(t, slug):
    if not t.startswith("- id:"):
        return False
    rest = t[5:].strip()
    h = rest.find(" #")
    if h > -1:
        rest = rest[:h].strip()
    if len(rest) > 1 and rest[0] in "\"'" and rest[-1] == rest[0]:
        rest = rest[1:-1]
    return rest == slug


def leading_ws(line):
    return line[:len(line) - len(line.lstrip(" \t"))]


def yaml_set_status(body, slug, new_status):
    """Locate `- id: <slug>`, set the first `status:` line in that block.
    Returns (new_body, found, has_status, prev_status)."""
    lines = body.split("\n")
    out, state, prev, has_status = [], "before", "", False
    for line in lines:
        t = line.strip()
        if state == "before":
            if yaml_is_id_line(t, slug):
                state = "in_entry"
            out.append(line)
        elif state == "in_entry":
            if t.startswith("- id:"):
                state = "done"
                out.append(line)
            elif t.startswith("status:"):
                has_status = True
                prev = t[7:].strip()
                out.append(leading_ws(line) + "status: " + new_status)
                state = "done"
            else:
                out.append(line)
        else:
            out.append(line)
    return ("\n".join(out), state != "before", has_status, prev)


def yaml_remove_entry(body, slug):
    """Drop the `- id: <slug>` line and every deeper-indented child line.
    Returns (new_body, removed)."""
    lines = body.split("\n")
    out, state, marker = [], "before", 0
    for line in lines:
        t = line.strip()
        if state == "before":
            if yaml_is_id_line(t, slug):
                marker = len(leading_ws(line))
                state = "dropping"
            else:
                out.append(line)
        elif state == "dropping":
            if t == "":
                continue
            if len(leading_ws(line)) > marker:
                continue
            state = "after"
            out.append(line)
        else:
            out.append(line)
    return ("\n".join(out), state != "before")


def count_yaml_entries(body):
    return sum(1 for line in body.split("\n")
               if line.strip().startswith("- id:"))


def count_yaml_pending(body):
    n = 0
    for line in body.split("\n"):
        t = line.strip()
        if t.startswith("status:") and t[7:].strip() in PENDING_STATUSES:
            n += 1
    return n


def jstr(s):
    return json.dumps(s, ensure_ascii=False)


def log_row(log_path, fields):
    fields = dict(fields, ts=int(time.time()))
    with open(log_path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(fields, ensure_ascii=False) + "\n")


# --- verbs --------------------------------------------------------------
def v_add(kind, slug, to, cwd):
    if kind not in KINDS:
        return "unknown kind `%s` — must be one of {%s}" % (
            kind, ", ".join(KINDS))
    if not slug or not SLUG_RE.match(slug):
        return ("invalid slug `%s` — use [a-z0-9-]+ only (no spaces, no "
                "caps, no path separators)" % slug)
    repo = resolve_repo(to, cwd)
    if not repo:
        return no_repo_err(to)
    folder = os.path.join(repo, "inbox", kind)
    try:
        os.makedirs(folder, exist_ok=True)
    except OSError as e:
        return "could not create folder %s: %s" % (folder, e)
    fname = ("%s-%s.md" % (today(), slug)) if kind == "notes" else slug + ".md"
    path = os.path.join(folder, fname)
    if os.path.exists(path):
        return "already exists: " + path
    try:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(template(kind, slug))
    except OSError as e:
        return "failed to write %s: %s" % (path, e)
    return "ok|✓ scaffolded " + path


def v_list(kind_filter, to, cwd):
    if kind_filter and kind_filter not in KINDS:
        return "unknown kind `%s` — must be one of {%s}" % (
            kind_filter, ", ".join(KINDS))
    repo = resolve_repo(to, cwd)
    if not repo:
        return no_repo_err(to)
    inbox = os.path.join(repo, "inbox")
    if not os.path.isdir(inbox):
        return "ok|(no inbox at %s yet)" % inbox
    kinds = [kind_filter] if kind_filter else list(KINDS)
    out = ["# inbox · %s/inbox/" % repo]
    total = 0
    for k in kinds:
        entries = list_kind(os.path.join(inbox, k))
        if not entries:
            continue
        out.append("\n# %s (%d)" % (k, len(entries)))
        for f, s in entries:
            title = first_heading(os.path.join(inbox, k, f))
            out.append("  - %-36s %s" % (s, title))
            total += 1
    if total == 0:
        out.append("\n(empty)")
    return "ok|" + "\n".join(out)


def v_show(slug, to, cwd):
    if not slug:
        return "show: slug required"
    repo = resolve_repo(to, cwd)
    if not repo:
        return no_repo_err(to)
    hits = find_by_slug(repo, slug)
    if not hits:
        return "no entry matches slug `%s` under %s/inbox/" % (slug, repo)
    if len(hits) > 1:
        return "ambiguous slug `%s` — %d matches:%s" % (
            slug, len(hits),
            "".join("\n  - %s/%s" % (h["kind"], h["file"]) for h in hits))
    try:
        with open(hits[0]["path"], encoding="utf-8") as fh:
            return "ok|" + fh.read()
    except OSError as e:
        return "could not read %s: %s" % (hits[0]["path"], e)


def v_path(slug, to, cwd):
    if not slug:
        return "path: slug required"
    repo = resolve_repo(to, cwd)
    if not repo:
        return no_repo_err(to)
    hits = find_by_slug(repo, slug)
    if not hits:
        return "no entry matches slug `%s` under %s/inbox/" % (slug, repo)
    if len(hits) > 1:
        return "ambiguous slug `%s` — %d matches:%s" % (
            slug, len(hits),
            "".join("\n  - %s/%s" % (h["kind"], h["file"]) for h in hits))
    return "ok|" + hits[0]["path"]


def v_verify(to, cwd):
    repo = resolve_repo(to, cwd)
    if not repo:
        return no_repo_err(to)
    inbox = os.path.join(repo, "inbox")
    if not os.path.isdir(inbox):
        return ("no inbox at %s (light-mode minimum: the folder + entries)"
                % inbox)
    yaml_path = os.path.join(inbox, "PATCHES.yaml")
    heavy = os.path.isfile(yaml_path)
    out = ["# inbox verify · %s/inbox/ · mode: %s"
           % (repo, "heavy" if heavy else "light")]
    issues = 0
    for k in KINDS:
        entries = list_kind(os.path.join(inbox, k))
        bad = 0
        if k == "notes":
            bad = sum(1 for f, _ in entries if not DATE_PREFIX_RE.match(f))
        tag = "  (%d missing YYYY-MM-DD- prefix)" % bad if bad else ""
        out.append("  %-11s %d%s" % (k + ":", len(entries), tag))
        issues += bad
    if heavy:
        try:
            body = open(yaml_path, encoding="utf-8").read()
        except OSError:
            body = ""
        out.append("\nheavy-mode: PATCHES.yaml — %d entries (%d pending)"
                   % (count_yaml_entries(body), count_yaml_pending(body)))
    out.append("\nverify: ok" if issues == 0
               else "\nverify: %d issue(s)" % issues)
    return ("ok|" if issues == 0 else "") + "\n".join(out)


def v_apply(slug, new_status, to, cwd):
    if not slug:
        return "apply: slug required"
    new_status = new_status or "applied"
    repo = resolve_repo(to, cwd)
    if not repo:
        return no_repo_err(to)
    inbox = os.path.join(repo, "inbox")
    yaml_path = os.path.join(inbox, "PATCHES.yaml")
    if not os.path.isfile(yaml_path):
        return ("apply is heavy-mode only — create %s first (single-tree "
                "repos stay in light-mode: no status lifecycle)" % yaml_path)
    body = open(yaml_path, encoding="utf-8").read()
    new_body, found, has_status, prev = yaml_set_status(
        body, slug, new_status)
    if not found:
        return "no entry with id `%s` in %s" % (slug, yaml_path)
    if not has_status:
        return "entry `%s` has no `status:` field to update" % slug
    if prev == new_status:
        return "ok|`%s` already status=%s (unchanged)" % (slug, new_status)
    try:
        with open(yaml_path, "w", encoding="utf-8") as fh:
            fh.write(new_body)
    except OSError as e:
        return "failed to write %s: %s" % (yaml_path, e)
    log = os.path.join(inbox, "manifest_log.jsonl")
    log_row(log, {"slug": slug, "action": "apply",
                  "from": prev, "to": new_status})
    return "ok|`%s`: %s → %s  (log: %s)" % (slug, prev, new_status, log)


def v_archive(slug, to, cwd):
    if not slug:
        return "archive: slug required"
    repo = resolve_repo(to, cwd)
    if not repo:
        return no_repo_err(to)
    inbox = os.path.join(repo, "inbox")
    if not os.path.isfile(os.path.join(inbox, "PATCHES.yaml")):
        return ("archive is heavy-mode only — create %s/PATCHES.yaml first "
                "(light-mode repos need no archive)" % inbox)
    hits = find_by_slug(repo, slug)
    if not hits:
        return "no entry matches slug `%s` to archive" % slug
    if len(hits) > 1:
        return ("ambiguous slug `%s` — refusing to archive multiple "
                "entries at once" % slug)
    h = hits[0]
    log = os.path.join(inbox, "manifest_log.jsonl")
    log_row(log, {"slug": slug, "kind": h["kind"],
                  "action": "archive", "path": h["path"]})
    return "ok|archived `%s` (%s) — log: %s" % (slug, h["kind"], log)


def v_rm(slug, to, cwd):
    if not slug:
        return "rm: slug required"
    repo = resolve_repo(to, cwd)
    if not repo:
        return no_repo_err(to)
    hits = find_by_slug(repo, slug)
    if not hits:
        return "no entry matches slug `%s` under %s/inbox/" % (slug, repo)
    if len(hits) > 1:
        return "ambiguous slug `%s` — refusing to rm multiple entries:%s" % (
            slug,
            "".join("\n  - %s/%s" % (h["kind"], h["file"]) for h in hits))
    h = hits[0]
    inbox = os.path.join(repo, "inbox")
    try:
        os.remove(h["path"])
    except OSError as e:
        return "rm failed for %s: %s" % (h["path"], e)
    yaml_removed = False
    yaml_path = os.path.join(inbox, "PATCHES.yaml")
    if os.path.isfile(yaml_path):
        body = open(yaml_path, encoding="utf-8").read()
        new_body, removed = yaml_remove_entry(body, slug)
        if removed:
            if new_body and not new_body.endswith("\n"):
                new_body += "\n"   # dropping the entry can eat the EOF NL
            with open(yaml_path, "w", encoding="utf-8") as fh:
                fh.write(new_body)
            yaml_removed = True
    log = os.path.join(inbox, "manifest_log.jsonl")
    log_row(log, {"slug": slug, "kind": h["kind"], "action": "rm",
                  "path": h["path"], "yaml_removed": yaml_removed})
    suffix = "  (+ PATCHES.yaml entry stripped)" if yaml_removed else ""
    return "ok|rm `%s` (%s)%s  (log: %s)" % (slug, h["kind"], suffix, log)


def v_pr(slug, to, cwd):
    """Open an upstream PR for a scaffolded inbox/<kind>/<slug>.md entry.

    Idempotent steps in the target repo: checkout or create the
    `inbox/<kind>/<slug>` branch, stage + commit the entry if uncommitted,
    push -u, then `gh pr create` with the file's first H1 as the title
    and the file body as the PR body. Logs `action: pr` to manifest_log.
    Requires `gh` on PATH; returns a clear error otherwise (the user can
    still push the branch and open a PR manually).
    """
    if not slug:
        return "pr: slug required"
    repo = resolve_repo(to, cwd)
    if not repo:
        return no_repo_err(to)
    hits = find_by_slug(repo, slug)
    if not hits:
        return "no entry matches slug `%s` under %s/inbox/" % (slug, repo)
    if len(hits) > 1:
        return "ambiguous slug `%s` — refusing to PR multiple entries:%s" % (
            slug,
            "".join("\n  - %s/%s" % (h["kind"], h["file"]) for h in hits))
    h = hits[0]
    if not os.path.isdir(os.path.join(repo, ".git")):
        return "pr: %s is not a git repo (no .git/)" % repo
    if subprocess.run(["which", "gh"], stdout=subprocess.PIPE,
                      stderr=subprocess.PIPE).returncode != 0:
        return ("pr: `gh` CLI not on PATH — install GitHub CLI to "
                "open a PR (or push the branch manually).")
    rel = os.path.relpath(h["path"], repo)
    branch = "inbox/%s/%s" % (h["kind"], slug)
    title = first_heading(h["path"]) or "inbox: %s/%s" % (h["kind"], slug)

    def _run(cmd):
        return subprocess.run(cmd, cwd=repo, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE, text=True)

    cur = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"]).stdout.strip()
    if cur != branch:
        exists = _run(["git", "rev-parse", "--verify", "--quiet",
                       "refs/heads/" + branch]).returncode == 0
        sub = ["git", "checkout", branch] if exists \
            else ["git", "checkout", "-b", branch]
        r = _run(sub)
        if r.returncode != 0:
            return "pr: git checkout failed — %s" % (
                r.stderr.strip() or r.stdout.strip())
    _run(["git", "add", "--", rel])
    staged = _run(["git", "diff", "--cached", "--quiet"])
    if staged.returncode != 0:
        r = _run(["git", "commit", "-m", title])
        if r.returncode != 0:
            return "pr: git commit failed — %s" % (
                r.stderr.strip() or r.stdout.strip())
    r = _run(["git", "push", "-u", "origin", branch])
    if r.returncode != 0:
        return "pr: git push failed — %s" % (
            r.stderr.strip() or r.stdout.strip())
    r = _run(["gh", "pr", "create", "--title", title,
              "--body-file", rel, "--head", branch])
    if r.returncode != 0:
        return "pr: gh pr create failed — %s" % (
            r.stderr.strip() or r.stdout.strip())
    url = r.stdout.strip()
    log = os.path.join(repo, "inbox", "manifest_log.jsonl")
    log_row(log, {"slug": slug, "kind": h["kind"], "action": "pr",
                  "branch": branch, "url": url})
    return "ok|pr `%s` (%s) → %s" % (slug, h["kind"], url)


USAGE = (
    "wilson-inbox — cross-project handoff inbox. Usage:\n"
    "  /wilson-inbox:inbox add <kind> <slug> [--to <repo>]\n"
    "  /wilson-inbox:inbox list [<kind>] [--to <repo>]\n"
    "  /wilson-inbox:inbox show <slug> [--to <repo>]\n"
    "  /wilson-inbox:inbox path <slug> [--to <repo>]\n"
    "  /wilson-inbox:inbox verify [--to <repo>]\n"
    "  /wilson-inbox:inbox apply <slug> [--status <new>] [--to <repo>]\n"
    "  /wilson-inbox:inbox archive <slug> [--to <repo>]\n"
    "  /wilson-inbox:inbox rm <slug> [--to <repo>]\n"
    "  /wilson-inbox:inbox pr <slug> [--to <repo>]\n"
    "kind ∈ {notes, patches, poc, rfc_drafts}.  slug = [a-z0-9-]+.\n"
    "Target repo: --to <name> (~/core/<name>) or the nearest .git "
    "from the cwd.")


def extract_flag(args, flag):
    """Return (value, args-without-the-flag-and-its-value)."""
    if flag in args:
        i = args.index(flag)
        if i + 1 < len(args):
            return args[i + 1], args[:i] + args[i + 2:]
    return "", args


# --- slash command ------------------------------------------------------
def run_cmd(args):
    if disabled():
        print("wilson-inbox: disabled (`/sidecar on inbox` to re-enable).")
        return
    if not args:
        print(USAGE)
        return
    verb = args[0]
    to, args = extract_flag(args, "--to")
    status, args = extract_flag(args, "--status")
    rest = args[1:]
    cwd = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()

    if verb == "add":
        kind = rest[0] if len(rest) > 0 else ""
        slug = rest[1] if len(rest) > 1 else ""
        r = v_add(kind, slug, to, cwd)
    elif verb in ("list", "ls"):
        r = v_list(rest[0] if rest else "", to, cwd)
    elif verb in ("show", "cat"):
        r = v_show(rest[0] if rest else "", to, cwd)
    elif verb == "path":
        r = v_path(rest[0] if rest else "", to, cwd)
    elif verb == "verify":
        r = v_verify(to, cwd)
    elif verb == "apply":
        r = v_apply(rest[0] if rest else "", status, to, cwd)
    elif verb == "archive":
        r = v_archive(rest[0] if rest else "", to, cwd)
    elif verb in ("rm", "remove"):
        r = v_rm(rest[0] if rest else "", to, cwd)
    elif verb == "pr":
        r = v_pr(rest[0] if rest else "", to, cwd)
    else:
        print("wilson-inbox: unknown verb `%s`.\n\n%s" % (verb, USAGE))
        return

    if r.startswith("ok|"):
        print(r[3:])
    else:
        print("wilson-inbox: " + r)


# --- SessionStart hook --------------------------------------------------
# Surface the current repo's inbox entries so a cross-project handoff is
# never forgotten. Inert unless the repo actually has an inbox/.
def run_hook():
    if disabled():
        sys.exit(0)
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except Exception:
        payload = {}
    cwd = payload.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") \
        or os.getcwd()
    repo = resolve_repo("", cwd)
    if not repo:
        sys.exit(0)
    inbox = os.path.join(repo, "inbox")
    if not os.path.isdir(inbox):
        sys.exit(0)
    counts = [(k, len(list_kind(os.path.join(inbox, k)))) for k in KINDS]
    total = sum(n for _, n in counts)
    yaml_path = os.path.join(inbox, "PATCHES.yaml")
    heavy = os.path.isfile(yaml_path)
    pending = 0
    if heavy:
        try:
            pending = count_yaml_pending(
                open(yaml_path, encoding="utf-8").read())
        except OSError:
            pending = 0
    if total == 0 and not heavy:
        sys.exit(0)
    per = " · ".join("%s: %d" % (k, n) for k, n in counts if n)
    lines = ["## Inbox — %d cross-project handoff entry(ies)" % total, "",
             "`%s/inbox/` holds open entries. When a gap or request affects "
             "another SSOT repo, file it here as an `inbox/<kind>/<slug>.md` "
             "entry — don't patch around it downstream." % repo, ""]
    if per:
        lines.append("- " + per)
    if heavy:
        lines.append("- heavy-mode: `PATCHES.yaml` — %d pending" % pending)
    lines += ["",
              "Review: `/wilson-inbox:inbox list` · check structure: "
              "`/wilson-inbox:inbox verify`."]
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": payload.get("hook_event_name")
        or payload.get("hookEventName") or "SessionStart",
        "additionalContext": "\n".join(lines) + "\n"}}))
    sys.exit(0)


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "cmd":
        run_cmd(sys.argv[2:])
    else:
        run_hook()


if __name__ == "__main__":
    main()
