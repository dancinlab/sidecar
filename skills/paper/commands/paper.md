---
description: /paper <args> — arxiv-style LaTeX paper scaffolder (v0.7). Verbs — new <slug> · sample <slug> · fig <size> <prompt> <out.png> · compile [dir] · lint [dir] · list · help · companion init · outline [dir] · pipeline <stage1> <stage2> ... · atoms <domain> · verify-block <fn> <args...> <expected> · bib add <doi-or-arxiv> · pr-roll <repo> <since-ref> · arxiv-prep [<dir>]. `new` scaffolds the rich template (9-section spine + companion/ + 3 figures). `compile` runs xelatex × 3 + bibtex. `lint` enforces extended commons @D g51.
argument-hint: "<new <slug> | sample <slug> | fig <size> <prompt> <out.png> | compile [dir] | lint [dir] | list | help | companion init | outline [dir] | pipeline <stage1> ... | atoms <domain> | verify-block <fn> <args...> <expected> | bib add <id> | pr-roll <repo> <since> | arxiv-prep [<dir>]>"
allowed-tools: Bash
---

!`R="$CLAUDE_PLUGIN_ROOT"; H="$R/bin/_paper.hexa"; [ -f "$H" ] || { V="$(ls -1 "$HOME/.claude/plugins/cache/sidecar/paper" 2>/dev/null | sort -V | tail -1)"; [ -n "$V" ] && { R="$HOME/.claude/plugins/cache/sidecar/paper/$V"; H="$R/bin/_paper.hexa"; }; }; hexa run "$H" --root "$R" $ARGUMENTS`
