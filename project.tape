@V := "tape" :: spec [active]
  version = "1.4"

@I := "sidecar" :: identity [active]
  kind   = "Claude Code marketplace plugin pack (concept-separated guardrails · commands · skills)"
  brief  = "Side-mounts onto Claude Code without modifying it. Carries the cross-project do/dont layer in hooks/commons/commons.tape."
  parent = "dancinlab"
  ssot   = "github.com/dancinlab/sidecar (`hx install sidecar`)"

@D := "sidecar" :: governance [active]
  do   = "concept separation (1 plugin = 1 of {hook · command · skill}) · structured carriers (.tape · plugin.json · hooks.json) · stacked PRs (<200 lines, --base previous) · commons carries cross-project hexa-native rules"
  dont = "mix concepts · large multi-purpose PRs · long-lived feature branches · re-encode structured carriers as prose · hardcode absolute paths in plugin scripts"

@D ship := "ship cycle — atomic commit + push + install-sync (no unshipped diffs)" :: governance [required active]
  do    = "ship as one atomic op: commit (stage explicit paths · credential scan first) → push origin/<branch> → marketplace clone pull → cache copy to ~/.claude/plugins/cache/sidecar/<name>/<ver>/ → patch installed_plugins.json (version · installPath · lastUpdated · gitCommitSha)"
  dont  = "unshipped diffs between user-facing pauses · `git add -A` / `-u` instead of explicit paths · defer install sync to `/plugin` after push · skip the credential scan (rpa_ · sk-[A-Za-z0-9]{20} · hf_[A-Za-z0-9]{30} · AKIA)"
  tool  = "git + gh + ~/.claude/plugins/{marketplaces,cache,installed_plugins.json}"
