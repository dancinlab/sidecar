#!/usr/bin/env python3
# wilson-pool core — /wilson-pool:pool config handler. Spirit-port of
# wilson's pool roster. State: <DATA>/pool.json {host, workdir, patterns}.
#
# SAFETY: routing is armed only when BOTH host AND workdir are set. This
# plugin does NOT sync filesystems — wilson's pool mounts the caller fs
# over 9P/sshfs; a Claude Code hook cannot. You are responsible for
# keeping <workdir> on <host> a synced copy of this project.
import json
import os
import sys

DEFAULT_PATTERNS = (
    r"\b(make|cargo|npm|pnpm|yarn|gradle|mvn|bazel|cmake|ctest|tox|"
    r"pytest|jest|vitest|webpack|go +(test|build)|docker +build|"
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
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def save(d):
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


def armed(d):
    return bool(d.get("host")) and bool(d.get("workdir"))


def show():
    d = load()
    if not d:
        print("sidecar/wilson-pool: not configured. Routing OFF.")
        print("Set: /wilson-pool:pool host <ssh-target>  then  workdir <remote-path>")
        return
    print("sidecar/wilson-pool — config:")
    print("  host:     %s" % (d.get("host") or "(unset)"))
    print("  workdir:  %s" % (d.get("workdir") or "(unset)"))
    print("  patterns: %s" % (d.get("patterns") or "(default)"))
    print("  routing:  %s" % ("ARMED — heavy Bash → ssh" if armed(d)
                               else "OFF (need host AND workdir)"))
    print("  ⚠ you must keep workdir on host synced with this project; "
          "this plugin does not sync filesystems.")
    print("State: %s" % STATE)


def main():
    args = sys.argv[1:]
    cmd = (args[0] if args else "show").strip().lower()
    if cmd in ("", "show", "status"):
        show()
        return
    if cmd == "off":
        d = load()
        d.pop("host", None)
        save(d)
        print("sidecar/wilson-pool: routing OFF (host cleared).")
        return
    keymap = {"host": "host", "workdir": "workdir", "patterns": "patterns"}
    if cmd not in keymap:
        print("sidecar/wilson-pool: unknown subcommand %r. "
              "Use: show | host <t> | workdir <p> | patterns <re> | off" % cmd)
        return
    if len(args) < 2 or not args[1].strip():
        print("sidecar/wilson-pool: `%s` needs a value." % cmd)
        return
    val = " ".join(args[1:]).strip() if cmd == "patterns" else args[1].strip()
    d = load()
    d[keymap[cmd]] = val
    save(d)
    state = "ARMED" if armed(d) else "still OFF (need host AND workdir)"
    print("sidecar/wilson-pool: %s = %s — saved. Routing %s." %
          (cmd, val, state))


if __name__ == "__main__":
    main()
