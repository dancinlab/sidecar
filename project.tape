@V := "tape" :: spec [active]
  version = "1.4"

@I := "sidecar" :: identity [active]
  kind     = "Claude Code marketplace plugin pack — concept-separated guardrails · commands · skills"
  brief    = "Side-mounts onto Claude Code · carries the cross-project do/dont layer in hooks/commons/"
  parent   = "dancinlab"
  ssot     = "github.com/dancinlab/sidecar (`hx install sidecar`)"
  siblings = "hexa-lang · pool · secret"

@D s1 := "concept separation" :: governance [required active]
  do   = "1 plugin = exactly 1 of {hook · command · skill} · top-level dir matches the concept"
  dont = "mix concepts in one plugin (skill+command ok when the command IS the skill's mechanism)"

@D s2 := "structured carriers over prose" :: governance [required active]
  do   = "use structured carriers: `.tape` · `plugin.json` · `hooks.json` · `marketplace.json` · `.lsp.json`"

@D s3 := "portable plugin scripts" :: governance [required active]
  dont = "absolute paths in plugin scripts — use ${CLAUDE_PLUGIN_ROOT} · $HOME · $CLAUDE_PLUGIN_DATA · PATH"

@D s4 := "commons carries cross-project rules" :: governance [active]
  do   = "`commons` hook carries cross-project do/dont · re-injects SessionStart + PreCompact + PostCompact"

@D s5 := "project.tape carries project-level rules" :: governance [active]
  do   = "project.tape (= CLAUDE.md) carries sidecar identity + governance · re-injected on compact"

@D s6 := "skill SKILL.md — minimal tape-style do/dont body" :: governance [required active]
  do   = "SKILL.md body = one `@D <name> :: skill` block · do/dont only · project.tape lint standard"
  dont = "prose · tables · examples in a SKILL.md body · keys beyond do/dont · per-skill README.md"

@D s7 := "ship governance + its enforcement together" :: governance [required active]
  do   = "new governance rule / plugin → ship its lint or guard hook in the same cycle"
  dont = "land a rule with no enforcement · defer the lint to later · rely on model self-discipline only"

@D ship := "ship cycle — atomic commit + push + sync (install + enable)" :: governance [required active]
  do   = "commit (explicit paths · g28 cred-scan) → push → `sidecar sync` (cache · install · enable)"
  dont = "`ship` as cross-repo batch · sync without enable · `git add -A`/`-u` · unshipped diffs at pauses"

@D s8 := "pi5-akida is anima-only — exclude from general pool dispatch" :: governance [required active]
  do   = "use pi5-akida ONLY for anima work · explicit `pool on pi5-akida <cmd>` only"
  dont = "include pi5-akida in `pool route` / load-balancing / round-robin / auto-dispatch candidates"

@D s9 := "claude sessions exempt from local load assessment" :: governance [required active]
  do   = "exclude `claude` PIDs from CPU/load attribution · attribute load to non-claude consumers only"
  dont = "count `claude` toward 'Mac overloaded → pool' · suggest killing claude as load remedy unasked"

@D s10 := "pool-route routes on explicit classifier only — never on load" :: governance [required active]
  do   = "route to pool only on explicit heavy classifier · git/gh/abs-path/local-fs cmds stay local"
  dont = "route on high system load — 'busy' ≠ 'portable'; local-bound cmds break on the wrong host"

@D s11 := "no opt-out / escape-hatch variables in guards or auto-hooks" :: governance [required active]
  do   = "guards + auto-hooks unconditional · gate only on real preconditions (binary · dirty-tree skip)"
  dont = "env var/config/exception that DISABLES a guard — gets auto-flipped to silence, defeats purpose"

@D s12 := "zero macOS offload by default · `pool mini-equal on` opts mini in" :: governance [required active]
  do   = "general-heavy→Linux pool (default) · macOS-only→mac host · mini joins via `pool mini-equal on`"
  dont = "Linux-only work→mac host · route general-heavy to mini while mini-equal OFF (Mac=workstation)"

@D s13 := "governance SSOT files are sign-gated — user sign-off before agent edits" :: governance [required active]
  do   = "edit commons.tape · project.tape ONLY after the USER runs `sidecar sign <key>` · obey the deny"
  dont = "self-mint the sign · edit a sign-gated file without a fresh user token · add an opt-out"
