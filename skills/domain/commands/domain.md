---
description: UPPERCASE <DOMAIN>.md (snapshot = `@goal:` final goal + `- [ ]` progress milestones) + <DOMAIN>.log.md (append-only step log). NAME accepts `+` for meta-domain (e.g. `RTSC+HTS`). Subcommands — init `<NAME>` = scaffold files · set `<NAME>` (or bare `<NAME>`) = SELECT session active · goal `<text>` = declare FINAL goal (sets `@goal:`) · milestone `<text>` (alias `ms`) = add `- [ ]` milestone · done `<match>` = flip a milestone, else a log task · bare = show active + @goal + progress bar `▓▓▓░░ NN% · done/total` + lint warnings (no @goal / no milestones) · todo `<text>` / `<text>` / new `<header>` = log.
argument-hint: "init <NAME> | set <NAME> | goal <text> | milestone <text> | done <match>"
allowed-tools: Bash
---

!`H="$CLAUDE_PLUGIN_ROOT/bin/_domain.hexa"
if [ ! -f "$H" ]; then
    V="$(ls -1t "$HOME/.claude/plugins/cache/sidecar/domain" 2>/dev/null | head -1)"
    [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/domain/$V/bin/_domain.hexa"
fi
[ -f "$H" ] || { echo "✗ _domain.hexa not found — run /reload-plugins or hx install sidecar"; exit 1; }
hexa run "$H" $ARGUMENTS`
