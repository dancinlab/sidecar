#!/usr/bin/env python3
# wilson-prefs core — /wilson-prefs:prefs subcommand handler.
# Reads/writes <DATA>/prefs.json. Standalone port of wilson's prefs plugin
# (3 settings: response language / code language / response style).
#
# Subcommands:
#   (none) | show          → print current effective prefs
#   lang  <code>           → set reply language   (e.g. ko, en, ja)
#   code  <code>           → set code language    (identifiers/comments/docs)
#   style <name>           → set response style   (resolves to a styles/<name>.md)
#   styles                 → list available style files
#   reset                  → delete prefs.json (back to "unset → no injection")
import json, os, sys

KEYS = ("response_lang", "code_lang", "response_style", "refresh_every")
# `refresh_every` is the per-session cadence (UserPromptSubmit every Nth
# turn re-injects the full style body). Default lives in _inject.py
# (see DEFAULT_REFRESH_EVERY below) — keep the two in sync.
DEFAULT_REFRESH_EVERY = 10


def data_dir():
    d = os.environ.get("CLAUDE_PLUGIN_DATA") \
        or os.path.join(os.path.expanduser("~"), ".claude",
                        "plugin-data", "wilson-prefs")
    os.makedirs(d, exist_ok=True)
    return d


def plugin_root():
    # bin/ -> plugin root
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


STATE = os.path.join(data_dir(), "prefs.json")


def load():
    try:
        with open(STATE, "r", encoding="utf-8") as f:
            d = json.load(f)
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def save(d):
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


STYLE_LANGS = ("en", "zh", "ru", "ja", "ko")


def _parse_style_fn(fn):
    # "<base>.md" -> (base, None) ; "<base>.<lang>.md" -> (base, lang)
    if not fn.endswith(".md"):
        return None, None
    stem = fn[:-3]
    if "." in stem:
        b, last = stem.rsplit(".", 1)
        if last in STYLE_LANGS and b:
            return b, last
    return stem, None


def style_files():
    # collapse <base>.md + <base>.<lang>.md into one row per base.
    # first dir seen (custom) wins the tag; langs are unioned.
    rows = {}
    for root, tag in ((data_dir(), "custom"),
                      (os.path.join(plugin_root(), "styles"), "shipped")):
        sd = root if root.endswith("styles") else os.path.join(root, "styles")
        if not os.path.isdir(sd):
            continue
        for fn in sorted(os.listdir(sd)):
            base, lang = _parse_style_fn(fn)
            if base is None:
                continue
            r = rows.setdefault(base, {"tag": tag, "langs": set()})
            if lang:
                r["langs"].add(lang)
    return [(b, rows[b]["tag"], sorted(rows[b]["langs"]))
            for b in sorted(rows)]


def show():
    d = load()
    if not d:
        print("sidecar/wilson-prefs: no preferences set "
              "(nothing is injected — the host's defaults apply).")
        print("Set with: /wilson-prefs:prefs lang ko | code en | style concise")
        print("`lang` / `code` also accept `auto` — mirror the user's "
              "language.")
        return
    print("sidecar/wilson-prefs — current preferences:")
    for k in KEYS:
        if k in d:
            print("  %-15s %s" % (k, d[k]))
        elif k == "refresh_every":
            # Always surface the cadence so the user can see the live
            # value even when it falls through to the default.
            print("  %-15s %s (default — set to override)"
                  % (k, DEFAULT_REFRESH_EVERY))
    print("State: %s" % STATE)


def main():
    args = sys.argv[1:]
    cmd = (args[0] if args else "show").strip().lower()

    if cmd in ("", "show"):
        show()
        return
    if cmd == "reset":
        try:
            os.remove(STATE)
            print("sidecar/wilson-prefs: reset — prefs.json removed. "
                  "Nothing will be injected.")
        except FileNotFoundError:
            print("sidecar/wilson-prefs: already unset (no prefs.json).")
        return
    if cmd == "styles":
        sf = style_files()
        if not sf:
            print("sidecar/wilson-prefs: no style files found.")
            return
        print("sidecar/wilson-prefs — available styles:")
        for name, tag, langs in sf:
            lg = (" · langs: " + ",".join(langs)) if langs else ""
            print("  %-12s (%s)%s" % (name, tag, lg))
        return

    if cmd in ("refresh-every", "refresh_every"):
        if len(args) < 2 or not args[1].strip():
            cur = load().get("refresh_every", DEFAULT_REFRESH_EVERY)
            print("sidecar/wilson-prefs: refresh-every = %s (full style "
                  "body re-injected on UserPromptSubmit every Nth turn — "
                  "0 disables). Set: /wilson-prefs:prefs refresh-every <N>"
                  % cur)
            return
        try:
            n = int(args[1].strip())
        except ValueError:
            print("sidecar/wilson-prefs: refresh-every needs an integer "
                  "(0 disables periodic refresh).")
            return
        d = load()
        d["refresh_every"] = n
        save(d)
        print("sidecar/wilson-prefs: refresh_every = %d — %s." % (
            n, "periodic refresh disabled (SessionStart + PreCompact "
            "only)" if n <= 0 else
            "full style body re-injected every %d UserPromptSubmit turns "
            "(SessionStart + PreCompact still get it unconditionally)" % n))
        return

    keymap = {"lang": "response_lang", "code": "code_lang",
              "style": "response_style"}
    if cmd not in keymap:
        print("sidecar/wilson-prefs: unknown subcommand %r. "
              "Use: show | lang <code> | code <code> | style <name> | "
              "styles | refresh-every <N> | reset" % cmd)
        sys.exit(0)
    if len(args) < 2 or not args[1].strip():
        print("sidecar/wilson-prefs: `%s` needs a value, e.g. "
              "`/wilson-prefs:prefs %s %s`"
              % (cmd, cmd, {"lang": "ko", "code": "en",
                            "style": "concise"}[cmd]))
        sys.exit(0)

    val = args[1].strip()
    d = load()
    d[keymap[cmd]] = val
    save(d)
    note = ""
    if cmd == "style":
        names = {b for b, _, _ in style_files()}
        if val not in names:
            note = ("  (no styles/%s.md yet — language directives only "
                    "until you add one)" % val)
    print("sidecar/wilson-prefs: %s = %s — applied (takes effect on the "
          "next prompt).%s" % (keymap[cmd], val, note))


if __name__ == "__main__":
    main()
