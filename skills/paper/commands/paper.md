---
description: /paper <args> — arxiv-style LaTeX paper scaffolder (v0.8 — 4 samples). Verbs — new <slug> · sample [<name>] [<dest>] · fig <size> <prompt> <out.png> · compile [dir] · lint [dir] · list · help · companion init · outline [dir] · pipeline <stage1> <stage2> ... · atoms <domain> · verify-block <fn> <args...> <expected> · bib add <doi-or-arxiv> · pr-roll <repo> <since-ref> · arxiv-prep [<dir>]. v0.8 bundles FOUR samples — sample-nb-bcs-absorbed · sample-fusion-7gate · sample-cost-routing · sample-blue-max. `/paper list` enumerates them; `/paper sample <name> [<dest>]` copies.
argument-hint: "<new <slug> | sample [<name>] [<dest>] | fig <size> <prompt> <out.png> | compile [dir] | lint [dir] | list | help | companion init | outline [dir] | pipeline <stage1> ... | atoms <domain> | verify-block <fn> <args...> <expected> | bib add <id> | pr-roll <repo> <since> | arxiv-prep [<dir>]>"
allowed-tools: Bash
---

!`R="$CLAUDE_PLUGIN_ROOT"; H="$R/bin/_paper.hexa"; [ -f "$H" ] || { V="$(ls -1 "$HOME/.claude/plugins/cache/sidecar/paper" 2>/dev/null | sort -V | tail -1)"; [ -n "$V" ] && { R="$HOME/.claude/plugins/cache/sidecar/paper/$V"; H="$R/bin/_paper.hexa"; }; }; hexa run "$H" --root "$R" $ARGUMENTS`
