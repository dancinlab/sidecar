@V := "tape" :: spec [active]
  version = "1.2"

@I := "sidecar" :: identity [active]
  kind   = "Claude Code marketplace plugin pack (concept-separated guardrails · commands · skills)"
  brief  = "Side-mounts onto Claude Code without modifying it. Carries the cross-project do/dont layer in hooks/commons/commons.tape."
  parent = "dancinlab"
  ssot   = "github.com/dancinlab/sidecar (`hx install sidecar`)"

@D := "sidecar" :: governance [active]
  do   = "concept separation (1 plugin = 1 of {hook · command · skill}) · structured carriers (.tape · plugin.json · hooks.json) · stacked PRs (<200 lines, --base previous) · ship = commit + push + install-sync · commons carries cross-project hexa-native rules"
  dont = "mix concepts · large multi-purpose PRs · long-lived feature branches · unshipped diffs · re-encode structured carriers as prose · hardcode absolute paths in plugin scripts"
