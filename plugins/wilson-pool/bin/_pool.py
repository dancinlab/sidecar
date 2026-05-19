#!/usr/bin/env python3
# wilson-pool core — /wilson-pool:pool config handler. Spirit-port of
# wilson's pool roster: a list of remote hosts heavy Bash routes to.
#
# State: <DATA>/pool.json
#   {"hosts":   [{"host": "<ssh-target>", "platform": "linux"|"macos",
#                 "sudo": true}, ...],
#    "workdir": "<remote-path>",
#    "patterns": "<regex>"}
#
# A host tagged "sudo": true gets root-needing routed commands (apt,
# systemctl, …) auto-prefixed with `sudo` — see _route.py SUDO_RE.
#
# A legacy single-host config ({"host": "<t>"}) is migrated to a one-entry
# roster on read.
#
# SAFETY: routing is armed only when the roster has >=1 host AND workdir is
# set. This plugin does NOT sync filesystems — wilson's pool mounts the
# caller fs over 9P/sshfs; a Claude Code hook cannot. You are responsible
# for keeping <workdir> a synced copy of this project on EVERY roster host.
import json
import os
import shutil
import subprocess
import sys

PLATFORMS = ("linux", "macos")
DEFAULT_PATTERNS = (
    r"\b(make|cargo|npm|pnpm|yarn|gradle|mvn|bazel|cmake|ctest|tox|"
    r"pytest|jest|vitest|webpack|xcodebuild|xcrun|swiftc|"
    r"go +(test|build)|swift +(build|test)|docker +build|"
    r"nvidia-smi|train)\b"
)


def data_dir():
    d = os.environ.get("CLAUDE_PLUGIN_DATA") or os.path.join(
        os.path.expanduser("~"), ".claude", "plugin-data", "wilson-pool")
    os.makedirs(d, exist_ok=True)
    return d


STATE = os.path.join(data_dir(), "pool.json")


def load():
    try:
        with open(STATE, encoding="utf-8") as f:
            d = json.load(f)
        if not isinstance(d, dict):
            return {}
    except Exception:
        return {}
    # migrate a legacy single-host config to a one-entry roster
    if not d.get("hosts") and d.get("host"):
        d["hosts"] = [{"host": str(d["host"]).strip(), "platform": "linux"}]
    d.pop("host", None)
    return d


def save(d):
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


def roster(d):
    """Normalised host list. Optional keys (workdir, sudo) are kept only
    when set, so a rebuilt `hosts` list saves back clean — no `workdir:
    ""` / `sudo: false` noise."""
    out = []
    for h in (d.get("hosts") or []):
        if isinstance(h, dict) and str(h.get("host") or "").strip():
            e = {"host": str(h["host"]).strip(),
                 "platform": (h.get("platform") or "linux")}
            wd = str(h.get("workdir") or "").strip()
            if wd:
                e["workdir"] = wd
            tp = str(h.get("transport") or "").strip().lower()
            if tp in ("tailscale", "ssh"):
                e["transport"] = tp
            if h.get("sudo"):
                e["sudo"] = True
            out.append(e)
    return out


def armed(d):
    return bool(roster(d)) and bool(str(d.get("workdir") or "").strip())


# ── tailscale helpers (design.md D2/D3) ─────────────────────────────
def ts_status():
    """Parsed `tailscale status --json`, or None when unavailable."""
    if not shutil.which("tailscale"):
        return None
    try:
        r = subprocess.run(["tailscale", "status", "--json"],
                            capture_output=True, text=True, timeout=6)
        return json.loads(r.stdout) if r.returncode == 0 else None
    except Exception:
        return None


def ts_nodes(st):
    """[(short_name, os, online)] from Self + Peers of a parsed status."""
    out = []

    def add(n):
        if not isinstance(n, dict):
            return
        dns = (n.get("DNSName") or "").strip().rstrip(".")
        short = dns.split(".")[0] if dns else (n.get("HostName") or "").strip()
        if short:
            out.append((short, n.get("OS") or "?", bool(n.get("Online"))))

    add((st or {}).get("Self"))
    for p in ((st or {}).get("Peer") or {}).values():
        add(p)
    return out


def os_to_platform(o):
    o = (o or "").lower()
    if "mac" in o or o == "darwin":
        return "macos"
    if "linux" in o:
        return "linux"
    return ""


def transport_of(d, h):
    """Per-host > global `transport` > auto. auto → tailscale when a
    local tailscale binary exists, else ssh. Mirrors _route.py."""
    t = (str(h.get("transport") or "").strip().lower()
         or str(d.get("transport") or "").strip().lower() or "auto")
    if t in ("tailscale", "ssh"):
        return t
    return "tailscale" if shutil.which("tailscale") else "ssh"


def reachable(host, transport):
    if transport == "tailscale":
        argv = ["tailscale", "ssh", host, "true"]
    else:
        argv = ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=5",
                host, "true"]
    try:
        return subprocess.run(argv, capture_output=True,
                              timeout=10).returncode == 0
    except Exception:
        return False


def show():
    d = load()
    hs = roster(d)
    if not hs and not d:
        print("sidecar/wilson-pool: not configured. Routing OFF.")
        print("Set: /wilson-pool:pool add <ssh-target> [linux|macos]  "
              "then  workdir <remote-path|auto>")
        return
    print("sidecar/wilson-pool — roster:")
    if hs:
        for h in hs:
            hw = ("  workdir=" + h["workdir"]) if h.get("workdir") else ""
            su = "  sudo" if h.get("sudo") else ""
            tp = ("  transport=" + h["transport"]) if h.get("transport") \
                else ""
            print("  %-20s %-6s%s%s%s" % (
                h["host"], h["platform"], tp, su, hw))
    else:
        print("  (no hosts — add one: /wilson-pool:pool add <ssh-target>)")
    wd = (d.get("workdir") or "").strip()
    fb = (d.get("workdir_fallback") or "").strip()
    if wd.lower() == "auto":
        print("  workdir:  auto (mirrors the current project — a local "
              "~/<rel> path runs at ~/<rel> on each host)")
        print("  fallback: %s" % (fb or "(none — cwd outside home → "
                                  "runs local)"))
    else:
        print("  workdir:  %s" % (wd or "(unset)"))
    print("  patterns: %s" % (d.get("patterns") or "(default)"))
    asy = d.get("autosync")
    print("  autosync: %s" % (
        "ON — additive rsync before each route" if asy is True else
        "ON (mirror — rsync --delete)" if asy == "mirror" else
        "OFF — pre-flight `test -d` check; route skipped if workdir absent"))
    print("  routing:  %s" % (
        "ARMED — heavy Bash -> ssh (round-robin; macOS-only -> macos host)"
        if armed(d) else "OFF (need >=1 host AND workdir)"))
    if not asy:
        print("  WARN: autosync OFF — keep workdir synced on EVERY host "
              "yourself, or `/wilson-pool:pool autosync on`.")
    print("State: %s" % STATE)


def status_probe():
    """show() + a LIVE per-host reachability probe via the resolved
    transport. Slower than `show` (one probe per host) — that is why it
    is a separate verb, not the default."""
    show()
    d = load()
    hs = roster(d)
    if not hs:
        return
    print("\nreachability (live probe):")
    for h in hs:
        tx = transport_of(d, h)
        ok = reachable(h["host"], tx)
        print("  %-20s %-10s %s" % (
            h["host"], tx, "OK" if ok else "UNREACHABLE"))


def tailnet_list():
    """List nodes visible on the local tailnet (Self + Peers) and mark
    which are already in the pool roster — the discovery verb."""
    st = ts_status()
    if st is None:
        print("sidecar/wilson-pool: tailscale unavailable (no `tailscale` "
              "binary or daemon down). `tailnet` needs tailscale.")
        return
    in_pool = {h["host"] for h in roster(load())}
    nodes = ts_nodes(st)
    if not nodes:
        print("sidecar/wilson-pool: no tailnet nodes visible.")
        return
    print("sidecar/wilson-pool — tailnet nodes:")
    print("  %-20s %-8s %-7s %s" % ("NODE", "OS", "ONLINE", "IN-POOL"))
    for n, o, on in sorted(nodes):
        mark = "yes" if n in in_pool else "no"
        hint = "" if n in in_pool else \
            "   <- /wilson-pool:pool add %s" % n
        print("  %-20s %-8s %-7s %s%s" % (
            n, o, "up" if on else "down", mark, hint))


def main():
    args = sys.argv[1:]
    cmd = (args[0] if args else "show").strip().lower()

    if cmd in ("", "show"):
        show()
        return

    if cmd == "status":
        status_probe()
        return

    if cmd in ("tailnet", "tailscale"):
        tailnet_list()
        return

    if cmd == "off":
        d = load()
        d["hosts"] = []
        save(d)
        print("sidecar/wilson-pool: routing OFF (roster cleared).")
        return

    if cmd == "add":
        if len(args) < 2 or not args[1].strip():
            print("sidecar/wilson-pool: `add` needs an ssh target, e.g. "
                  "`/wilson-pool:pool add ubu-1 linux` (optional: a "
                  "per-host workdir override, and `sudo` to auto-prefix "
                  "root-needing commands on that host)")
            return
        target = args[1].strip()
        # args after the target are positional (platform, workdir) plus an
        # optional `sudo`/`nosudo` keyword recognised anywhere among them.
        sudo, transport, pos = False, "", []
        for a in (x.strip() for x in args[2:] if x.strip()):
            al = a.lower()
            if al == "sudo":
                sudo = True
            elif al == "nosudo":
                sudo = False
            elif al in ("tailscale", "ssh"):
                transport = al
            else:
                pos.append(a)
        # platform: explicit positional wins; else auto-detect from the
        # tailnet (the node's OS); else default linux.
        auto_note = ""
        if pos:
            platform = pos[0].lower()
        else:
            platform = "linux"
            for n, o, _ in ts_nodes(ts_status()):
                if n == target:
                    p = os_to_platform(o)
                    if p:
                        platform, auto_note = p, " (auto from tailnet)"
                    break
        if platform not in PLATFORMS:
            print("sidecar/wilson-pool: platform must be one of %s "
                  "(got %r)." % ("/".join(PLATFORMS), platform))
            return
        host_wd = pos[1] if len(pos) > 1 else ""
        d = load()
        hs = [h for h in roster(d) if h["host"] != target]
        entry = {"host": target, "platform": platform}
        if host_wd:
            entry["workdir"] = host_wd
        if transport:
            entry["transport"] = transport
        if sudo:
            entry["sudo"] = True
        hs.append(entry)
        d["hosts"] = hs
        save(d)
        # one-time reachability probe via the resolved transport
        tx = transport_of(d, entry)
        probe = "reachable" if reachable(target, tx) else \
            "NOT reachable yet (probe failed — check tailscale/ssh)"
        print("sidecar/wilson-pool: host %s (%s%s%s%s) added — roster has "
              "%d host(s). Routing %s. Probe via %s: %s." % (
                  target, platform, auto_note,
                  ", transport=" + transport if transport else "",
                  ", sudo" if sudo else "", len(hs),
                  "ARMED" if armed(d) else "still OFF (need workdir)",
                  tx, probe))
        return

    if cmd == "sudo":
        target = (args[1].strip() if len(args) > 1 else "")
        val = (args[2].strip().lower() if len(args) > 2 else "")
        if not target or val not in ("on", "off"):
            print("sidecar/wilson-pool: `sudo <host> on|off` — `on` lets "
                  "root-needing routed commands (apt, systemctl, …) "
                  "auto-prefix `sudo` on that host (assumes passwordless "
                  "sudo there).")
            return
        d = load()
        hs = roster(d)
        if not any(h["host"] == target for h in hs):
            print("sidecar/wilson-pool: no host %r in the roster — "
                  "`add` it first." % target)
            return
        for h in hs:
            if h["host"] == target:
                if val == "on":
                    h["sudo"] = True
                else:
                    h.pop("sudo", None)
        d["hosts"] = hs
        save(d)
        print("sidecar/wilson-pool: host %s sudo %s.%s" % (
            target, val,
            "  Root-needing routed commands now auto-prefix `sudo` there."
            if val == "on" else ""))
        return

    if cmd == "autosync":
        val = (args[1].strip().lower() if len(args) > 1 else "")
        if val not in ("on", "off", "mirror"):
            cur = load().get("autosync")
            cur = ("mirror" if cur == "mirror" else
                   "on" if cur else "off")
            print("sidecar/wilson-pool: autosync = %s. Set: "
                  "/wilson-pool:pool autosync on|off|mirror — `on` rsyncs "
                  "the local project to the target host before each route "
                  "(additive: remote build caches survive); `mirror` adds "
                  "rsync --delete (exact mirror, colder builds); `off` "
                  "just pre-flight-checks the workdir exists." % cur)
            return
        d = load()
        if val == "off":
            d.pop("autosync", None)
        else:
            d["autosync"] = True if val == "on" else "mirror"
        save(d)
        print("sidecar/wilson-pool: autosync %s.%s" % (
            val, "" if val == "off" else
            "  Each routed heavy command now rsyncs the project to the "
            "host first (creates the workdir if absent)."))
        return

    if cmd in ("rm", "remove"):
        if len(args) < 2 or not args[1].strip():
            print("sidecar/wilson-pool: `rm` needs an ssh target.")
            return
        target = args[1].strip()
        d = load()
        hs = [h for h in roster(d) if h["host"] != target]
        d["hosts"] = hs
        save(d)
        print("sidecar/wilson-pool: host %s removed — roster has %d "
              "host(s)." % (target, len(hs)))
        return

    keymap = {"workdir": "workdir", "fallback": "workdir_fallback",
              "patterns": "patterns"}
    if cmd not in keymap:
        print("sidecar/wilson-pool: unknown subcommand %r. Use: show | "
              "status | tailnet | add <target> [linux|macos] [workdir] "
              "[tailscale|ssh] [sudo] | rm <target> | sudo <target> "
              "on|off | workdir <path|auto> | fallback <path> | autosync "
              "on|off|mirror | patterns <re> | off"
              % cmd)
        return
    if len(args) < 2 or not args[1].strip():
        print("sidecar/wilson-pool: `%s` needs a value." % cmd)
        return
    val = " ".join(args[1:]).strip() if cmd == "patterns" else args[1].strip()
    d = load()
    d[keymap[cmd]] = val
    save(d)
    state = "ARMED" if armed(d) else "still OFF (need >=1 host AND workdir)"
    print("sidecar/wilson-pool: %s = %s — saved. Routing %s." %
          (cmd, val, state))


if __name__ == "__main__":
    main()
