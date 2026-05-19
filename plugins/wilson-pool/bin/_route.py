#!/usr/bin/env python3
# wilson-pool :: PreToolUse hook. When routing is ARMED (>=1 roster host
# AND workdir set) and a Bash command matches the heavy-pattern, rewrite
# it via `updatedInput` to run on a pool host over ssh:
#     ssh <host> 'cd <workdir> && <cmd>'
# ssh's exit status is the remote command's (255 = ssh transport failure).
#
# HOST SELECTION:
#   - a command that needs a specific OS (macOS-only: xcodebuild, codesign,
#     lipo, Mach-O, …  /  linux-only: apt, dpkg, systemctl, .deb, …) is
#     restricted to hosts tagged with that platform;
#   - among the eligible hosts, a round-robin counter spreads the load;
#   - no eligible host (e.g. a macOS-only command but no macos host) → not
#     routed, runs locally.
#
# SAFETY: only the Bash tool is routed (Read/Write/Edit/Grep operate on the
# LOCAL fs — routing them would be wrong; wilson can only because it mounts
# the fs, which a hook cannot). Disabled unless armed.
# Skips heredoc / background / already-ssh / already-routed.
# Opt out: SIDECAR_NO_POOL=1
import json
import os
import re
import shlex
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

MARK = "__SIDECAR_POOL__"
DEFAULT_PATTERNS = (
    r"\b(make|cargo|npm|pnpm|yarn|gradle|mvn|bazel|cmake|ctest|tox|"
    r"pytest|jest|vitest|webpack|xcodebuild|xcrun|swiftc|"
    r"go +(test|build)|swift +(build|test)|docker +build|"
    r"nvidia-smi|train)\b"
)
# high-confidence OS-only command fingerprints
MACOS_RE = re.compile(
    r"\b(xcodebuild|xcrun|xcode-select|codesign|notarytool|stapler|"
    r"pkgbuild|productbuild|hdiutil|lipo|otool|install_name_tool|vtool|"
    r"swiftc|sw_vers|osascript|launchctl|diskutil|caffeinate|sips|plutil)\b"
    r"|\bswift +(build|test|run|package)\b"
    r"|apple-darwin|apple-macos|apple-ios|Mach-O|\.dylib\b|\.dmg\b")
LINUX_RE = re.compile(
    r"\b(apt|apt-get|dpkg|dpkg-deb|add-apt-repository|yum|dnf|rpm|pacman|"
    r"systemctl|journalctl|ldconfig|setcap|update-alternatives)\b"
    r"|linux-gnu|linux-musl|\.deb\b|\.rpm\b")
# root-needing commands. Two roles: (1) they are always routable — a
# match here routes even when the heavy `patterns` did not; (2) on a
# host tagged sudo:true they are auto-prefixed with `sudo` (which
# asserts that host has passwordless sudo).
# Front-prefix only: a compound command (`apt update && apt install`)
# has just its first segment elevated — keep such commands single.
SUDO_RE = re.compile(
    r"\b(apt|apt-get|dpkg|dpkg-deb|add-apt-repository|yum|dnf|rpm|pacman|"
    r"systemctl|ldconfig|setcap|update-alternatives)\b")


def allow():
    sys.exit(0)


def roster(cfg):
    out = []
    for h in (cfg.get("hosts") or []):
        if isinstance(h, dict) and str(h.get("host") or "").strip():
            out.append({"host": str(h["host"]).strip(),
                        "platform": (h.get("platform") or "linux"),
                        "workdir": str(h.get("workdir") or "").strip(),
                        "transport": str(h.get("transport")
                                         or "").strip().lower(),
                        "sudo": bool(h.get("sudo"))})
    # migrate a legacy single-host config
    if not out and cfg.get("host"):
        out.append({"host": str(cfg["host"]).strip(),
                    "platform": "linux", "workdir": "", "sudo": False})
    return out


_TS_LIVE = {}


def tailscale_live():
    """True if a local tailscale daemon is up so `tailscale ssh` works.
    Cached per process (the router runs once per Bash call)."""
    if "v" in _TS_LIVE:
        return _TS_LIVE["v"]
    import shutil
    import subprocess
    v = False
    if shutil.which("tailscale"):
        try:
            v = subprocess.run(
                ["tailscale", "status", "--peers=false"],
                capture_output=True, timeout=5).returncode == 0
        except Exception:
            v = False
    _TS_LIVE["v"] = v
    return v


def transport_of(cfg, pick):
    """Resolve the connection transport for the chosen host.
    Precedence: per-host `transport` > global `transport` > auto.
    auto → `tailscale` when a local tailscale daemon is up, else `ssh`.
    Returns 'tailscale' or 'ssh'."""
    t = (str(pick.get("transport") or "").strip().lower()
         or str(cfg.get("transport") or "").strip().lower()
         or "auto")
    if t == "tailscale":
        return "tailscale"
    if t == "ssh":
        return "ssh"
    return "tailscale" if tailscale_live() else "ssh"


def login_wrap(remote):
    """`tailscale ssh` opens a NON-login shell, so a remote's
    .bash_profile (Homebrew PATH etc.) is not sourced and `make`/`cargo`
    can be "command not found". Force a login shell. Applied for plain
    ssh too — harmless, keeps both transports behaving identically."""
    return "bash -lc " + shlex.quote(remote)


def cd_target(wd):
    """Quote a workdir for a remote `cd`, but keep a leading ~ UNquoted so
    the remote shell still expands it to that host's own home — essential
    when roster hosts have different usernames."""
    if wd == "~":
        return "~"
    if wd.startswith("~/"):
        return "~/" + shlex.quote(wd[2:])
    return shlex.quote(wd)


def resolve_workdir(pick, cfg, payload):
    """Resolve the remote workdir for the chosen host.
      - a per-host `workdir` on the roster entry wins (lets each host
        point at wherever its copy actually lives — a different path, a
        symlink target, a mount point);
      - else the global `workdir`; an explicit path is used verbatim;
      - `auto` mirrors the current project — local <home>/<rel> maps to
        the remote `~/<rel>` (so `~` expands per host);
      - when `auto` cannot mirror (cwd outside the local home), the
        designated `workdir_fallback` is used if set, else None (local).
    """
    workdir = (str(pick.get("workdir") or "").strip()
               or str(cfg.get("workdir") or "").strip())
    fallback = (cfg.get("workdir_fallback") or "").strip()
    if workdir.lower() != "auto":
        return workdir or None
    cwd = payload.get("cwd") or os.getcwd()
    try:
        rel = os.path.relpath(os.path.abspath(cwd), os.path.expanduser("~"))
    except Exception:
        rel = os.pardir
    if rel == os.curdir:
        return "~"
    if not rel.startswith(".."):
        return "~/" + rel
    return fallback or None        # auto could not mirror → designated path


def preflight_ok(host, wd_sh, dd, transport="ssh"):
    """autosync-OFF safety net: confirm the workdir exists on the host
    before routing — else the routed `cd` just fails with
    `no such file or directory`.

    A connection failure must NEVER bench a roster host. The probe
    `ssh … test -d <wd>` has three outcomes, and only the two
    DEFINITIVE ones are cached per (host, workdir) for the session:

      rc 0   → workdir present              → cache "ok"
      rc 1   → ssh connected, workdir absent → cache "missing"
      rc 255 / timeout / ssh error → CONNECTION FAILURE → NOT cached:
               skip routing for THIS command only, and re-probe on the
               next one. A transient network blip / a sleeping host is
               not a missing workdir — conflating them would silently
               drop the host from routing for the rest of the session.
               (The host always stays in pool.json; this is purely
               about not de-facto benching it on a transient failure.)"""
    import subprocess
    cache_p = os.path.join(dd, ".preflight.json")
    key = host + "\x00" + wd_sh
    try:
        cache = json.load(open(cache_p, encoding="utf-8"))
        if not isinstance(cache, dict):
            cache = {}
    except Exception:
        cache = {}
    if key in cache:
        return cache[key] == "ok"
    if transport == "tailscale":
        # tailscale ssh owns auth + connectivity; no -o opts. The
        # subprocess timeout below still bounds a stalled probe.
        argv = ["tailscale", "ssh", host, "test -d " + wd_sh]
    else:
        argv = ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=6",
                host, "test -d " + wd_sh]
    try:
        rc = subprocess.run(
            argv, capture_output=True, timeout=12).returncode
    except Exception:
        rc = 255                       # timeout / transport down → connection failure
    if rc == 255:
        # ssh transport failure — host unreachable, NOT a missing workdir.
        # Do not cache; skip this once, the next heavy command re-probes.
        return False
    ok = (rc == 0)
    cache[key] = "ok" if ok else "missing"
    try:
        with open(cache_p, "w", encoding="utf-8") as f:
            json.dump(cache, f)
    except Exception:
        pass
    return ok


if os.environ.get("SIDECAR_NO_POOL") == "1":
    allow()
try:
    payload = json.load(sys.stdin)
except Exception:
    allow()
if payload.get("tool_name") != "Bash":
    allow()
ti = payload.get("tool_input") or {}
if not isinstance(ti, dict):
    allow()
cmd = (ti.get("command") or "").strip()
if not cmd:
    allow()

dd = os.environ.get("CLAUDE_PLUGIN_DATA") or os.path.join(
    os.path.expanduser("~"), ".claude", "plugin-data", "wilson-pool")
try:
    with open(os.path.join(dd, "pool.json"), encoding="utf-8") as f:
        cfg = json.load(f)
except Exception:
    allow()

hosts = roster(cfg)
workdir = (cfg.get("workdir") or "").strip()
if not hosts or not workdir:       # not armed → never route (safety)
    allow()

if MARK in cmd or "<<" in cmd or cmd.endswith("&") or cmd.startswith("ssh "):
    allow()

pat = cfg.get("patterns") or DEFAULT_PATTERNS
try:
    matched = bool(re.search(pat, cmd))
except re.error:
    matched = bool(re.search(DEFAULT_PATTERNS, cmd))
# root-needing commands are routable too, regardless of the heavy
# `patterns` — the whole point of tagging a host sudo:true is to run
# (and `sudo`) package/system commands on it. The Linux-only capability
# filter below still keeps them on a linux host (or local if none).
if not matched and not SUDO_RE.search(cmd):
    allow()

# capability filter — restrict to a platform when the command demands one
why = "load-balanced"
if MACOS_RE.search(cmd):
    eligible = [h for h in hosts if h["platform"] == "macos"]
    why = "macOS-only command"
elif LINUX_RE.search(cmd):
    eligible = [h for h in hosts if h["platform"] == "linux"]
    why = "Linux-only command"
else:
    eligible = hosts
if not eligible:                   # nothing in the roster can run it → local
    allow()

# round-robin across the eligible hosts (minimal load balance)
rr_path = os.path.join(dd, ".rr")
try:
    n = int((open(rr_path, encoding="utf-8").read().strip() or "0"))
except Exception:
    n = 0
pick = eligible[n % len(eligible)]
try:
    with open(rr_path, "w", encoding="utf-8") as f:
        f.write(str((n + 1) % 1000000))
except Exception:
    pass
host = pick["host"]

# auto sudo — a host tagged sudo:true gets a root-needing command
# prefixed with `sudo` (skip if the command already starts with sudo).
sudo_note = ""
if (pick.get("sudo") and SUDO_RE.search(cmd)
        and not re.match(r"sudo\b", cmd)):
    cmd = "sudo " + cmd
    sudo_note = ", sudo-prefixed"

wd_remote = resolve_workdir(pick, cfg, payload)
if not wd_remote:                  # auto mode + cwd outside home, no fallback
    allow()
wd_sh = cd_target(wd_remote)       # tilde-safe remote-shell form
remote = "cd %s && %s" % (wd_sh, cmd)

tx = transport_of(cfg, pick)           # 'tailscale' | 'ssh'

if cfg.get("autosync"):
    # incremental rsync of the local project → the remote workdir, run
    # right before the heavy command (as part of the routed command, so
    # the hook never blocks). Makes routing safe on a host that never had
    # the workdir (rsync creates it) and keeps a continuously-changing
    # tree fresh with zero manual sync. Additive by default — remote
    # build caches survive; `autosync mirror` adds rsync --delete.
    #
    # `--force` is always on: it lets rsync replace a non-empty remote
    # directory when the local tree now has a symlink (or file) at that
    # path — a dir<->symlink type-change collision that otherwise aborts
    # the whole sync with "could not make way for new symlink" /
    # "cannot delete non-empty directory" (e.g. after a symlink-
    # reclassifying mv upstream). Without it one stale remote dir wedges
    # every routed command on that host.
    #
    # v1 scope (design.md D4): the autosync path stays on plain `ssh` +
    # `rsync host:` UNCHANGED — rsync-over-`tailscale ssh` is untested,
    # so it is not enabled here. A tailscale-only host should run
    # `autosync off`; autosync on/mirror needs a plain-ssh-reachable host.
    local = (payload.get("cwd") or os.getcwd()).rstrip("/") or "."
    delete = " --delete" if str(cfg.get("autosync")) == "mirror" else ""
    new_cmd = (
        "ssh %s %s && rsync -az --force%s %s/ %s:%s/ && ssh %s %s  # %s" % (
            shlex.quote(host), shlex.quote("mkdir -p " + wd_sh), delete,
            shlex.quote(local), shlex.quote(host), wd_sh,
            shlex.quote(host), shlex.quote(remote), MARK))
    sync_caveat = ("; NOTE autosync uses plain ssh — tailscale-only host "
                   "needs `autosync off`") if tx == "tailscale" else ""
    note = "auto-synced (rsync%s) → %s:%s%s" % (
        delete or " additive", host, wd_remote, sync_caveat)
else:
    # autosync off → pre-flight: never route to a host missing the
    # workdir (that just yields `cd: no such file`). Run local instead.
    if not preflight_ok(host, wd_sh, dd, tx):
        allow()
    sshc = "tailscale ssh" if tx == "tailscale" else "ssh"
    new_cmd = "%s %s %s  # %s" % (
        sshc, shlex.quote(host), shlex.quote(login_wrap(remote)), MARK)
    note = "%s:%s via %s (workdir is user-synced)" % (
        host, wd_remote, tx)

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "updatedInput": dict(ti, command=new_cmd),
        "additionalContext": (
            "wilson-pool: routed this heavy command — %s (%s%s; %d-host "
            "roster)." % (note, why, sudo_note, len(hosts))
        ),
    }
}))
