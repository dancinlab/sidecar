#!/usr/bin/env python3
# wilson-pool core — /wilson-pool:pool config handler. Spirit-port of
# wilson's pool roster: a list of remote hosts heavy Bash routes to.
#
# State: <DATA>/pool.json
#   {"hosts":   [{"host": "<ssh-target>", "platform": "linux"|"macos"}, ...],
#    "workdir": "<remote-path>",
#    "patterns": "<regex>"}
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
    out = []
    for h in (d.get("hosts") or []):
        if isinstance(h, dict) and str(h.get("host") or "").strip():
            out.append({"host": str(h["host"]).strip(),
                        "platform": (h.get("platform") or "linux")})
    return out


def armed(d):
    return bool(roster(d)) and bool(str(d.get("workdir") or "").strip())


def show():
    d = load()
    hs = roster(d)
    if not hs and not d:
        print("sidecar/wilson-pool: not configured. Routing OFF.")
        print("Set: /wilson-pool:pool add <ssh-target> [linux|macos]  "
              "then  workdir <remote-path>")
        return
    print("sidecar/wilson-pool — roster:")
    if hs:
        for h in hs:
            print("  %-20s %s" % (h["host"], h["platform"]))
    else:
        print("  (no hosts — add one: /wilson-pool:pool add <ssh-target>)")
    print("  workdir:  %s" % (d.get("workdir") or "(unset)"))
    print("  patterns: %s" % (d.get("patterns") or "(default)"))
    print("  routing:  %s" % (
        "ARMED — heavy Bash -> ssh (round-robin; macOS-only -> macos host)"
        if armed(d) else "OFF (need >=1 host AND workdir)"))
    print("  WARN: keep workdir synced on EVERY host above; this plugin "
          "does not sync filesystems.")
    print("State: %s" % STATE)


def main():
    args = sys.argv[1:]
    cmd = (args[0] if args else "show").strip().lower()

    if cmd in ("", "show", "status"):
        show()
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
                  "`/wilson-pool:pool add ubu-1 linux`")
            return
        target = args[1].strip()
        platform = (args[2].strip().lower() if len(args) > 2 else "linux")
        if platform not in PLATFORMS:
            print("sidecar/wilson-pool: platform must be one of %s "
                  "(got %r)." % ("/".join(PLATFORMS), platform))
            return
        d = load()
        hs = [h for h in roster(d) if h["host"] != target]
        hs.append({"host": target, "platform": platform})
        d["hosts"] = hs
        save(d)
        print("sidecar/wilson-pool: host %s (%s) added — roster has %d "
              "host(s). Routing %s." % (
                  target, platform, len(hs),
                  "ARMED" if armed(d) else "still OFF (need workdir)"))
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

    keymap = {"workdir": "workdir", "patterns": "patterns"}
    if cmd not in keymap:
        print("sidecar/wilson-pool: unknown subcommand %r. Use: show | "
              "add <target> [linux|macos] | rm <target> | workdir <path> "
              "| patterns <re> | off" % cmd)
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
