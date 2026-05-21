@V := "tape" :: spec [active]
  version = "1.2"

@D g1 := "ai-native + canonical first" :: governance [required active]
  do   = "ai-native · hexa-native first · native + canonical patterns first when implementing (per language / framework)"

@D g3 := "minimal authoring + tables + ASCII" :: governance [required active]
  do   = "write & implement minimally · use markdown tables actively · use ASCII structure diagrams (tree · box · arrow) when shape/flow matters"
  dont = "prose-only · verbose · over-engineered"

@D g4 := "stacked PRs" :: governance [required active]
  do   = "stacked PRs (<200 lines · 1 logical thing · gh pr create --base previous-layer)"
  dont = "large multi-purpose PRs · long-lived feature branches"

@D g5 := "verify via hexa CLI only" :: governance [required active]
  do   = "use `hexa verify` for correctness · purity · grade · identity claims (paste the verdict VERBATIM)"
  dont = "LLM self-judge correctness without `hexa verify` · cite sympy / PyPhi / Wolfram / Mathematica as primary evidence"

@D g6 := "hexa kick for gap discovery" :: governance [active]
  do   = "use `hexa kick --seed \"<expr>\" [--rounds N]` for gap breakthroughs · discovery"

@D g7 := "consult hexa --help for unfamiliar verbs" :: governance [active]
  do   = "consult `hexa --help` for unfamiliar hexa CLI verbs"

@D g8 := "runpod dispatch via hexa-cloud (separate binary, NOT `hexa cloud`)" :: governance [required active]
  do   = "for runpod dispatch use `hexa-cloud {run|nohup|poll|copy-to|copy-from}` — SEPARATE BINARY at `hexa-lang/bin/hexa-cloud`, structured argv"
  dont = "raw `ssh` / `scp` for runpod dispatch · `hexa cloud` invocation (no such subcommand; commons-pre-0.9.2 had this wrong)"

@D g9 := "pool + /inbox CLIs available" :: governance [active]
  do   = "know that `pool` (host roster + remote exec — pool list / add / on / status / install tailscale) and `/inbox` (cross-project handoff — list · new <kind> <slug>) are available CLIs"

@D g10 := "Monitor tool for streaming" :: governance [active]
  do   = "use Claude Code's `Monitor` tool for streaming events from a background process (per-line stdout = notification)"
  dont = "`tail -f` / `sleep`-poll loops for background-event streaming"

@D g11 := "no gap workarounds — fix at source" :: governance [required active]
  do   = "file hexa-lang upstream gaps as `<hexa-lang-repo>/inbox/patches/<slug>.md` immediately on discovery"
  dont = "implement workarounds for known gaps (file an upstream inbox patch instead — fix at source, never paper over)"

@D g12 := "fan out parallel pods" :: governance [active]
  do   = "fan out up to 8 parallel pods when total wall time shrinks (compute / variants disjoint)"

@D g13 := "portable paths only" :: governance [required active]
  dont = "hardcoded absolute paths (use `$HOME` · `${HOME}` · relative paths · `<repo-name>/<relpath>` notation)"

@D g14 := "5-count emoji for major events" :: governance [active]
  do   = "mark major events with 5-count emoji (🛸*5 transcend / ⭐️*5 win / 🔥*5 breakthrough) — never on routine OK"

@D g15 := "current-state docs · history in dedicated surfaces" :: governance [required active]
  do   = "write docs in completed-form (describe current state) — history goes in `CHANGELOG.md` (chronological) / `git log` (full audit trail)"
  dont = "mix migration history into living docs (no inline `replaces X` / `migrated from Y` / `archived YYYY-MM-DD`)"

@D g16 := "AGENTS.tape dormant · don't touch" :: governance [required active]
  dont = "touch AGENTS.tape (kept dormant carry — user-request override only)"

@D g17 := "project.tape user-request only" :: governance [required active]
  dont = "touch project.tape unprompted (active project SSOT — read freely, but modify only on explicit user request)"

@D g18 := "bypass — auto-execute, don't punt" :: governance [required active]
  dont = "punt to user on clearly-OK agent-executable work (catalog: `next user action:` blocks · `Should I proceed?` · `Want me to check?` deferrals · option-trees with obvious default · over-clarification · defer-by-waiting · excessive recap) — self-check: interactive human input · unauthorized destructive · external visible · explicit user-review request → if all NO, just execute"

@D g19 := "project.tape — granular B form" :: governance [required active]
  do   = "when editing any `<project-root>/project.tape` (or commons-style multi-rule `.tape` carrier), use granular @D blocks — one rule per entry · single concept · do/dont only · no `tool` / `usage` keys on multi-rule carriers (the v4 Sonnet bench showed they net-negative); single-rule isolated blocks like `@D ship` MAY use `tool` per tape v1.4 spec"
  dont = "monolithic `@D := \"<name>\" :: governance` block mashing many concepts into one do/dont string — that exceeds v1.2's 500-char/entry cap and dilutes LLM attention (v4 bench: granular 33/36 vs single-block 31/36)"

@D g20 := "no hardcoding · implement generically" :: governance [required active]
  do   = "implement once, parameterize over instances · code in one canonical home (single stdlib · single dispatcher) · manifest-driven extension (new instance = manifest only, no code change) · universal generic path"
  dont = "hard-code per-instance / per-domain / per-tenant branches · duplicate implementation across topical folders · per-instance Producer / Dispatcher / Handler class family · branch on instance name in the generic layer"

@D g21 := "no workaround / temp-fix as user choice — go straight to the proper fix" :: governance [required active]
  do   = "when the proper fix is identifiable, just implement it (the proper fix is THE action, not one option among many)"
  dont = "offer the user a menu like `quick patch vs proper refactor vs workaround` when the proper path is clear · present workaround / temp-fix / band-aid as alternatives to be picked between"

@D g22 := "version discipline — bump SemVer + lockstep all version surfaces" :: governance [required active]
  do   = "any user-visible behavior change → bump SemVer (patch = fix / new entry · minor = new feature / format · major = breaking) + update ALL version-bearing surfaces in the SAME commit (manifest · README plugin row · CHANGELOG · marketplace · cache · etc.) + ship per project's ship cycle"
  dont = "ship behavior change without a version bump · update some version surfaces but skip others (drift between files) · skip the CHANGELOG entry"

@D g23 := "sidecar slash commands — use when applicable" :: governance [active]
  do   = "use sidecar slash commands when the situation fits — discovery: `/brainstorm` (depletion ideation) · `/gap` (42-lens audit) · `/kick` (hexa kick wrapper) · `/verify` (hexa verify wrapper) · workflow: `/inbox` (cross-project handoff) · `/all-bg-go` (parallel fan-out) · `/domain <NAME>` (UPPERCASE snapshot + log sister) · `/inject` (mid-session sidecar refresh) · `/prefs` (language settings) · style: `/easy` (friendly response) · research: `/research:arxiv` · `/research:yt`"
