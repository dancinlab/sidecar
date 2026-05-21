@V := "tape" :: spec [active]
  version = "1.4"

# ─── core posture ──────────────────────────────────────────────────────

@D g1 := "ai-native + canonical first" :: governance [required active]
  do   = "ai-native · hexa-native first · native + canonical patterns first when implementing (per language / framework)"

@D g2 := "english artifacts · korean response" :: governance [required active]
  do   = "english artifacts (code · docs · config) · korean responses to the user"

@D g3 := "minimal authoring + tables + ASCII" :: governance [required active]
  do   = "write & implement minimally · use markdown tables actively · use ASCII structure diagrams (tree · box · arrow) when shape/flow matters"
  dont = "prose-only · verbose · over-engineered"

# ─── version control ───────────────────────────────────────────────────

@D g4 := "stacked PRs" :: governance [required active]
  do    = "stacked PRs (<200 lines · 1 logical thing · --base previous layer)"
  dont  = "large multi-purpose PRs · long-lived feature branches"
  tool  = "gh pr create"
  usage = "gh pr create --base <previous-layer-branch>"

# ─── hexa CLI integration ──────────────────────────────────────────────

@D g5 := "verify via hexa CLI only" :: governance [required active]
  do    = "use `hexa verify` for correctness · purity · grade · identity claims (paste verdict VERBATIM)"
  dont  = "LLM self-judge correctness · cite sympy / PyPhi / Wolfram / Mathematica as primary evidence"
  tool  = "hexa verify"
  usage = "hexa verify <claim>  ·  hexa run <verifier>.hexa"

@D g6 := "hexa kick for gap discovery" :: governance [active]
  do    = "use `hexa kick` for gap breakthroughs · discovery"
  tool  = "hexa kick"
  usage = "hexa kick --seed \"<expr>\" [--rounds N]"

@D g7 := "consult hexa --help for unfamiliar verbs" :: governance [active]
  do    = "consult `hexa --help` for unfamiliar hexa CLI verbs before guessing"
  tool  = "hexa --help"
  usage = "hexa --help  ·  hexa <verb> --help"

@D g8 := "runpod dispatch via hexa cloud (not raw ssh/scp)" :: governance [required active]
  do    = "for runpod dispatch use `hexa cloud` (structured argv)"
  dont  = "raw `ssh` / `scp` for runpod dispatch"
  tool  = "hexa cloud"
  usage = "hexa cloud {run|nohup|poll|copy-to|copy-from}"

# ─── tooling availability ──────────────────────────────────────────────

@D g9 := "pool CLI available — host roster + remote exec" :: governance [active]
  do    = "use `pool` for host roster + remote exec"
  tool  = "pool"
  usage = "pool {list|add <host>|on <host> <cmd>|status|install tailscale}"

@D g10 := "Monitor tool for streaming (not tail -f / sleep loops)" :: governance [active]
  do    = "use Claude Code's `Monitor` tool for streaming background-process events (per-line stdout = notification)"
  dont  = "`tail -f` / `sleep`-poll loops for background-event streaming"
  tool  = "Monitor (Claude Code)"

@D g11 := "no gap workarounds — file upstream inbox patch" :: governance [required active]
  do    = "file hexa-lang upstream gaps as inbox patches immediately on discovery (fix at source)"
  dont  = "implement workarounds for known gaps (never paper over)"
  tool  = "<hexa-lang>/inbox/patches/"
  usage = "<hexa-lang-repo>/inbox/patches/<slug>.md"

# ─── pool / parallel ───────────────────────────────────────────────────

@D g12 := "fan out parallel pods when wall time shrinks" :: governance [active]
  do    = "fan out up to 8 parallel pods when total wall time shrinks (compute / variants disjoint)"

# ─── paths · portability ──────────────────────────────────────────────

@D g13 := "portable paths only — no hardcoded absolutes" :: governance [required active]
  dont = "hardcoded absolute paths (use `$HOME` · `${HOME}` · relative · `<repo-name>/<relpath>` notation)"

# ─── emoji tier ───────────────────────────────────────────────────────

@D g14 := "5-count emoji for major events only" :: governance [active]
  do   = "mark major events with 5-count emoji (🛸*5 transcend / ⭐️*5 win / 🔥*5 breakthrough)"
  dont = "5-count emoji on routine OK"

# ─── docs · history surfaces ──────────────────────────────────────────

@D g15 := "current-state docs · history in dedicated surfaces" :: governance [required active]
  do    = "write docs in completed-form (describe current state)"
  dont  = "mix migration / replacement / archive history into living docs (`replaces X` / `migrated from Y` / `archived YYYY-MM-DD`)"
  tool  = "CHANGELOG.md / git log"

# ─── SSOT tape files ─────────────────────────────────────────────────

@D g16 := "AGENTS.tape dormant carry — don't touch unprompted" :: governance [required active]
  dont = "touch AGENTS.tape (kept dormant carry — user-request override only)"

@D g17 := "project.tape user-request only" :: governance [required active]
  dont = "touch project.tape unprompted (active project SSOT — read freely, but modify only on explicit user request)"
