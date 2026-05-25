---
description: UPPERCASE <DOMAIN>.md (snapshot = `@goal:` final goal + `- [ ]` progress milestones) + <DOMAIN>.log.md (append-only step log). NAME = UPPERCASE-start + UPPERCASE/digits/`-`/`+` (e.g. `TTR-LM`, `RTSC+HTS`); `_` rejected (use `-`); `+` enables meta-domain composition. Subcommands — init `<NAME> [<dir>]` = scaffold files + register a `DOMAINS.tape` roster row (optional `<dir>` places the pair anywhere, e.g. `domains/`) · set `<NAME>` (or bare `<NAME>`) = SELECT session active · list (alias `ls`) = repo-wide index: a `DOMAINS.tape` roster (NAME→path) is AUTHORITATIVE so domains live at any path; progress/@goal stay DERIVED (checked-in roster never churns); flags ghosts + unregistered (★ = active · @goal · progress · location) · list `--sync` = reconcile roster with disk (bootstraps it) · goal `<text>` = declare FINAL goal (sets `@goal:`) · milestone `<text>` (alias `ms`) = add `- [ ]` milestone · title `<text>` (alias `subtitle`) = set optional `@title:` display header (icon · name · alias, e.g. `🧠 IIT4 — 의식 측정자(尺)`) · done `<match>` = flip a milestone, else a log task · bare = show active (title or name) + @goal + progress bar `▓▓▓░░ NN% · done/total` + lint warnings (no @goal / no milestones; `@title:` optional) · todo `<text>` / `<text>` / new `<header>` = log.
argument-hint: "init <NAME> [<dir>] | set <NAME> | list [--sync] | goal <text> | milestone <text> | title <text> | done <match>"
allowed-tools: Bash
---

!`H="$CLAUDE_PLUGIN_ROOT/bin/_domain.hexa"
if [ ! -f "$H" ]; then
    V="$(ls -1 "$HOME/.claude/plugins/cache/sidecar/domain" 2>/dev/null | sort -V | tail -1)"
    [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/domain/$V/bin/_domain.hexa"
fi
[ -f "$H" ] || { echo "✗ _domain.hexa not found — run /reload-plugins or hx install sidecar"; exit 1; }
hexa run "$H" $ARGUMENTS`
