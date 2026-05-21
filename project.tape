@V := "tape" :: spec [active]
  version = "1.4"

@I := "sidecar" :: identity [active]
  kind   = "Claude Code marketplace plugin pack (concept-separated guardrails · commands · skills)"
  brief  = "Side-mounts onto Claude Code without modifying it. Carries the cross-project do/dont layer in hooks/commons/commons.tape."
  parent = "dancinlab"
  ssot   = "github.com/dancinlab/sidecar (`hx install sidecar`)"

@D s1 := "concept separation" :: governance [required active]
  do   = "1 plugin = exactly 1 of {hook · command · skill} · top-level dir matches the concept"
  dont = "mix concepts in one plugin (skill+command relax allowed when the command is the literal mechanism the skill orchestrates — e.g. inbox, all-bg-go, easy, brainstorm, domain, research)"

@D s2 := "structured carriers over prose" :: governance [required active]
  do   = "use structured carriers: `.tape` · `plugin.json` · `hooks.json` · `marketplace.json` · `lsp.json`"

@D s3 := "portable plugin scripts" :: governance [required active]
  dont = "hardcoded absolute paths in plugin scripts (use `${CLAUDE_PLUGIN_ROOT}` · `$HOME` · `$CLAUDE_PLUGIN_DATA` · PATH-resolved binaries)"

@D s4 := "commons carries cross-project rules" :: governance [active]
  do   = "the `commons` hook plugin carries cross-project hexa-native do/dont rules across all sessions (SessionStart + PreCompact + PostCompact re-inject)"

@D s5 := "project.tape carries project-level rules" :: governance [active]
  do   = "this file (`<project-root>/project.tape`, linked as CLAUDE.md) carries sidecar-specific identity + governance; project-tape hook re-injects on PreCompact + PostCompact"

@D ship := "ship cycle — atomic commit + push + install-sync (no unshipped diffs)" :: governance [required active]
  do    = "ship as one atomic op: commit (stage explicit paths · credential scan first) → push origin/<branch> → marketplace clone pull → cache copy to ~/.claude/plugins/cache/sidecar/<name>/<ver>/ → patch installed_plugins.json (version · installPath · lastUpdated · gitCommitSha)"
  dont  = "unshipped diffs between user-facing pauses · `git add -A` / `-u` instead of explicit paths · defer install sync to `/plugin` after push · skip credential scan (rpa_ · sk-[A-Za-z0-9]{20} · hf_[A-Za-z0-9]{30} · AKIA)"
  tool  = "git + gh + ~/.claude/plugins/{marketplaces,cache,installed_plugins.json}"
