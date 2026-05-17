#!/usr/bin/env python3
# sidecar control — /sidecar status|on|off <name>. Writes the shared
# disabled set that every sidecar plugin's hook checks.
#
# Shared state lives at a FIXED absolute path (NOT $CLAUDE_PLUGIN_DATA —
# that is per-plugin and isolated; the CC plugin cache forbids ../ escapes,
# so cross-plugin coordination needs one well-known absolute file):
#     ~/.claude/sidecar/disabled.json   →  ["pool", "output-trim", ...]
import json
import os
import sys

PLUGINS = ["ssot", "readme-format", "hexa-verify", "dangerous-path",
           "git-guard", "secret-guard", "bash-guard", "prefs",
           "output-trim", "pool", "checkpoint", "gpu", "decision-gate",
           "tape-recorder", "guards"]

STATE_DIR = os.path.join(os.path.expanduser("~"), ".claude", "sidecar")
STATE = os.path.join(STATE_DIR, "disabled.json")


def load():
    try:
        with open(STATE, encoding="utf-8") as f:
            d = json.load(f)
        return [x for x in d if x in PLUGINS] if isinstance(d, list) else []
    except Exception:
        return []


def save(disabled):
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(sorted(set(disabled)), f)
        f.write("\n")


def status():
    dis = set(load())
    print("sidecar — plugin state (shared: %s):" % STATE)
    for p in PLUGINS:
        print("  %-14s %s" % (p, "OFF (disabled)" if p in dis else "on"))
    print("Toggle: /sidecar off <name> | /sidecar on <name> "
          "(or `all`). Persists across sessions.")


def main():
    args = [a.strip() for a in sys.argv[1:] if a.strip()]
    cmd = (args[0] if args else "status").lower()

    if cmd in ("", "status"):
        status()
        return
    if cmd not in ("on", "off"):
        print("sidecar: unknown subcommand %r. Use: status | on <name> | "
              "off <name>" % cmd)
        return
    if len(args) < 2:
        print("sidecar: `%s` needs a name — one of: %s, or `all`."
              % (cmd, " ".join(PLUGINS)))
        return

    target = args[1].lower()
    if target == "all":
        names = list(PLUGINS)
    elif target in PLUGINS:
        names = [target]
    else:
        print("sidecar: unknown plugin %r. Known: %s, or `all`."
              % (target, " ".join(PLUGINS)))
        return

    dis = set(load())
    if cmd == "off":
        dis |= set(names)
    else:
        dis -= set(names)
    save(dis)
    print("sidecar: %s %s → applied (effective on the next hook fire; "
          "persists across sessions)." % (cmd, ", ".join(names)))
    status()


if __name__ == "__main__":
    main()
