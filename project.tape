@V := "tape" :: spec [active]
  version = "1.4"

@I := "sidecar" :: identity [active]
  kind   = "Claude Code marketplace plugin pack (concept-separated guardrails · commands · skills)"
  brief  = "Side-mounts onto Claude Code. Carries the cross-project do/dont layer in hooks/commons/commons.tape."
  parent = "dancinlab"
  ssot   = "github.com/dancinlab/sidecar (`hx install sidecar`)"

@D s1 := "concept separation" :: governance [required active]
  do   = "1 plugin = exactly 1 of {hook · command · skill} · top-level dir matches the concept"
  dont = "mix concepts in one plugin (skill+command relax allowed when the command is the literal mechanism the skill orchestrates)"

@D s2 := "structured carriers over prose" :: governance [required active]
  do   = "use structured carriers: `.tape` · `plugin.json` · `hooks.json` · `marketplace.json` · `lsp.json`"

@D s3 := "portable plugin scripts" :: governance [required active]
  dont = "hardcoded absolute paths in plugin scripts (use `${CLAUDE_PLUGIN_ROOT}` · `$HOME` · `$CLAUDE_PLUGIN_DATA` · PATH-resolved binaries)"

@D s4 := "commons carries cross-project rules" :: governance [active]
  do   = "the `commons` hook plugin carries cross-project hexa-native do/dont rules across all sessions (SessionStart + PreCompact + PostCompact re-inject)"

@D s5 := "project.tape carries project-level rules" :: governance [active]
  do   = "this file (`<project-root>/project.tape`, linked as CLAUDE.md) carries sidecar-specific identity + governance; project-tape hook re-injects on PreCompact + PostCompact"

@D ship := "ship cycle — sidecar plugin atomic commit + push + install-sync" :: governance [required active]
  do    = "atomic op: commit (explicit paths · credential scan per commons g28) → push origin/<branch> → marketplace clone pull → cache copy to `~/.claude/plugins/cache/sidecar/<name>/<ver>/` → patch `installed_plugins.json` (version · installPath · lastUpdated · gitCommitSha) — equivalent to `sidecar sync` after the push"
  dont  = "interpret `ship` as cross-repo git push batch (those are other repos' own ship cycles) · defer install sync to `/plugin` after push · `git add -A` / `-u` instead of explicit paths · unshipped diffs between user-facing pauses"
  tool  = "git + gh + sidecar sync (= marketplace pull + cache copy + installed_plugins.json patch)"
