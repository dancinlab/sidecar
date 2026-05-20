#!/usr/bin/env python3
# wilson-pool :: SessionStart / UserPromptSubmit / PostCompact hook.
# Injects a "## Pool" block ONLY when routing is armed, so the model knows
# heavy Bash commands run remotely (and that the remote workdir is user-
# synced). Nothing is injected when unconfigured (no noise).
#
# Cadence — mirror of wilson-prefs (design.md Decisions 16 / 17 / 20):
#
#   SessionStart / PostCompact         → full block (baseline + survives
#                                        compaction; PostCompact lands in
#                                        the clean post-summary context).
#                                        Decision 20 dropped the PreCompact
#                                        full body — it was strictly weaker
#                                        than PostCompact at the same cost.
#   UserPromptSubmit, every Nth turn   → full block (refresh so the roster
#                                        details don't fade across long
#                                        sessions)
#   UserPromptSubmit, off-turn         → 1-line safety guard (routing +
#                                        sync caveat)
#
# Why off-turns are NOT silent: the "remote workdir is a user-synced copy"
# caveat is a CORRECTNESS guard, not info — forgetting it causes silent
# stale-source remote builds. The roster / host-selection / round-robin
# explanation IS info, so only that gets cadence-gated.
import json
import os
import sys

# sidecar control — no-op when /sidecar disabled this plugin
try:
    if "pool" in json.load(open(os.path.join(
            os.path.expanduser("~"), ".claude", "sidecar",
            "disabled.json"), encoding="utf-8")):
        sys.exit(0)
except SystemExit:
    raise
except Exception:
    pass

try:
    payload = json.load(sys.stdin)
except Exception:
    payload = {}
event = payload.get("hook_event_name") or payload.get("hookEventName") \
    or "SessionStart"

# SessionStart fires with source ∈ {startup, resume, clear, compact};
# the compact path overlaps PostCompact for the same compaction event.
# Skip it here so PostCompact (strictly cleaner post-summary moment) owns
# the full-body reload alone. Decision 21, design.md.
if event == "SessionStart" and payload.get("source") == "compact":
    sys.exit(0)

dd = os.environ.get("CLAUDE_PLUGIN_DATA") or os.path.join(
    os.path.expanduser("~"), ".claude", "plugin-data", "wilson-pool")
try:
    with open(os.path.join(dd, "pool.json"), encoding="utf-8") as f:
        cfg = json.load(f)
except Exception:
    sys.exit(0)

hosts = []
for h in (cfg.get("hosts") or []):
    if isinstance(h, dict) and str(h.get("host") or "").strip():
        hosts.append({"host": str(h["host"]).strip(),
                      "platform": (h.get("platform") or "linux")})
if not hosts and cfg.get("host"):          # legacy single-host config
    hosts.append({"host": str(cfg["host"]).strip(), "platform": "linux"})
workdir = (cfg.get("workdir") or "").strip()
if not hosts or not workdir:
    sys.exit(0)

roster = ", ".join("%s (%s)" % (h["host"], h["platform"]) for h in hosts)
if workdir.lower() == "auto":
    wd_desc = ("mirrored — the current project's path under your home "
               "(`~/<rel>`) on each host")
else:
    wd_desc = "`%s`" % workdir


def _should_full(event, cfg, payload, dd):
    """Mirror of wilson-prefs._should_full(): always full on session /
    post-compact boundaries; periodic refresh on UserPromptSubmit.
    PreCompact is intentionally not full — see header comment.
    SessionStart source=compact is also skipped (PostCompact owns it,
    Decision 21) — guarded both here and at the script's top-level
    early-exit for defense in depth."""
    if event == "SessionStart" and payload.get("source") == "compact":
        return False
    if event in ("SessionStart", "PostCompact"):
        return True
    if event != "UserPromptSubmit":
        return False
    try:
        n_every = int(cfg.get("refresh_every", 25))
    except Exception:
        n_every = 25
    if n_every <= 0:
        return False
    sid = str(payload.get("session_id") or "")
    if not sid:
        return False
    turns_dir = os.path.join(dd, "turns")
    try:
        os.makedirs(turns_dir, exist_ok=True)
    except Exception:
        return False
    tp = os.path.join(turns_dir, sid + ".json")
    try:
        ts = json.load(open(tp, encoding="utf-8"))
    except Exception:
        ts = {"n": 0}
    ts["n"] = ts.get("n", 0) + 1
    try:
        with open(tp, "w", encoding="utf-8") as f:
            json.dump(ts, f)
    except Exception:
        pass
    return ts["n"] > 0 and ts["n"] % n_every == 0


def _plugin_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _read_sample():
    """Resolve the canonical pool.md sample. User-customised DATA copy
    wins over the shipped ROOT copy, matching the wilson-prefs precedent.
    Returns "" if neither exists (caller falls back to the inline summary).
    """
    cands = [os.path.join(dd, "samples", "pool.md"),
             os.path.join(_plugin_root(), "samples", "pool.md")]
    for cand in cands:
        if os.path.isfile(cand):
            try:
                return open(cand, "r", encoding="utf-8",
                            errors="replace").read().strip()
            except OSError:
                return ""
    return ""


def full_block():
    # Always lead with the concrete roster + workdir resolved from this
    # session's pool.json — the canonical reference (pool.md) is static
    # and can't carry per-install hostnames or the active workdir mode.
    header = (
        "## Pool\n\n"
        "- Heavy Bash commands (build/test/compile/GPU) are auto-routed "
        "over ssh by the wilson-pool plugin to one of: **%s**.\n"
        "- Remote workdir: %s.\n"
        "- Read/Write/Edit/Grep stay LOCAL (only Bash is routed).\n"
        % (roster, wd_desc)
    )
    body = _read_sample()
    if body:
        # The sample's own H1 is dropped (header already labels the block);
        # everything below the first blank line after the front-matter
        # is the canonical reference body.
        return header + "\n" + body + "\n"
    # Fallback: the 0.5.0 4-bullet form, used when samples/pool.md is
    # absent (e.g. a partial install). Keeps the safety properties even
    # without the long-form body.
    return (
        header
        + "- Host selection: a macOS-only or Linux-only command goes to "
        "a host of that platform; otherwise the load is round-robined "
        "across the roster.\n"
        + "- The remote workdir is assumed to be a user-synced copy of "
        "this project on EVERY roster host — this plugin does NOT sync "
        "filesystems. Do not assume local file edits are visible "
        "remotely until the user has synced them.\n"
    )


def short_guard():
    # One-line correctness guard for off-turns: keeps the sync caveat
    # alive every turn so the model never forgets that local edits are
    # invisible to the remote until synced. Drops the roster details
    # (those are info, refreshed on cadence).
    return (
        "## Pool\n\n"
        "- wilson-pool routes heavy Bash to a remote roster; the remote "
        "workdir is a user-synced mirror — local edits are NOT visible "
        "remotely until you sync. Read/Write/Edit/Grep stay LOCAL.\n"
    )


ctx = full_block() if _should_full(event, cfg, payload, dd) else short_guard()
print(json.dumps({
    "hookSpecificOutput": {"hookEventName": event, "additionalContext": ctx}
}))
