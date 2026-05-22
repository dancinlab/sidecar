@V := "tape" :: spec [active]
  version = "1.2"

@D g1 := "ai-native + canonical first" :: governance [required active]
  do   = "ai-native · hexa-native first · native + canonical patterns per language / framework"

@D g3 := "minimal authoring + tables + ASCII" :: governance [required active]
  do   = "write minimally · markdown tables · ASCII diagrams (tree · box · arrow) when shape matters"
  dont = "prose-only · verbose · over-engineered"

@D g4 := "stacked PRs" :: governance [required active]
  do   = "stacked PRs · <200 lines · 1 logical thing · `gh pr create --base <previous-layer>`"
  dont = "large multi-purpose PRs · long-lived feature branches"

@D g5 := "verify via hexa CLI only" :: governance [required active]
  do   = "`hexa verify` for correctness · purity · grade · identity claims — paste the verdict VERBATIM"
  dont = "LLM self-judge correctness · cite sympy / PyPhi / Wolfram / Mathematica as primary evidence"

@D g6 := "hexa kick for gap discovery" :: governance [active]
  do   = "`hexa kick --seed \"<expr>\" [--rounds N]` for gap breakthroughs · discovery"

@D g7 := "consult hexa --help for unfamiliar verbs" :: governance [active]
  do   = "consult `hexa --help` for unfamiliar hexa CLI verbs"

@D g8 := "runpod dispatch via hexa cloud" :: governance [required active]
  do   = "runpod dispatch via `hexa cloud {run|nohup|poll|copy-to|copy-from}` — canonical subcommand form"
  dont = "raw `ssh` / `scp` for runpod · fall back to a separate `hexa-cloud` binary (paper-over per g11)"

@D g9 := "pool + /inbox CLIs available" :: governance [active]
  do   = "know `pool` (host roster + remote exec) and `/inbox` (cross-project handoff) are available CLIs"

@D g10 := "Monitor tool for streaming" :: governance [active]
  do   = "use Claude Code's `Monitor` tool to stream background-process events (per-line stdout)"
  dont = "`tail -f` / `sleep`-poll loops for background-event streaming"

@D g11 := "no gap workarounds — fix at source" :: governance [required active]
  do   = "file hexa-lang upstream gaps as `<hexa-lang>/inbox/patches/<slug>.md` on discovery"
  dont = "implement workarounds for known gaps — file an upstream inbox patch, fix at source"

@D g12 := "fan out parallel pods" :: governance [active]
  do   = "fan out up to 8 parallel pods when total wall time shrinks (compute / variants disjoint)"

@D g13 := "portable paths only" :: governance [required active]
  do   = "resolve paths at runtime: `$HOME` · `${CLAUDE_PLUGIN_ROOT}` · `$CLAUDE_PLUGIN_DATA` · PATH binaries"
  dont = "hardcode absolute paths in shipped code (`/Users/<you>/…` · `/home/<you>/…` · machine dirs)"

@D g14 := "5-count emoji for major events" :: governance [active]
  do   = "mark major events with 5-count emoji (🛸 transcend · ⭐️ win · 🔥 breakthrough) — never routine"

@D g15 := "current-state docs · history in dedicated surfaces" :: governance [required active]
  do   = "write docs in completed-form (current state) — history → `CHANGELOG.md` / `git log`"
  dont = "mix migration history into living docs — no inline `replaces X` / `migrated from Y`"

@D g16 := "AGENTS.tape dormant · don't touch" :: governance [required active]
  dont = "touch AGENTS.tape (dormant carry — user-request override only)"

@D g17 := "project.tape user-request only" :: governance [required active]
  dont = "touch project.tape unprompted — active SSOT · read freely, modify on explicit request only"

@D g18 := "bypass — auto-execute, don't punt" :: governance [required active]
  dont = "punt clearly-OK agent work — if not (human-input · destructive · external · review-asked), execute"

@D g19 := "project.tape — granular B form" :: governance [required active]
  do   = "edit project.tape / multi-rule `.tape` as granular @D blocks — one rule each · do/dont only"
  dont = "monolithic `@D` block mashing many concepts into one do/dont string"

@D g20 := "no hardcoding · implement generically" :: governance [required active]
  do   = "implement once · parameterize over instances · one canonical home · manifest-driven extension"
  dont = "hard-code per-instance branches · duplicate implementation across topical folders"

@D g21 := "no workaround / temp-fix as user choice" :: governance [required active]
  do   = "when the proper fix is identifiable, just implement it — the proper fix IS the action"
  dont = "offer a `quick patch vs proper vs workaround` menu when the proper path is clear"

@D g22 := "version discipline — bump SemVer + lockstep surfaces" :: governance [required active]
  do   = "user-visible change → bump SemVer + update ALL version surfaces in the same commit + CHANGELOG"
  dont = "ship a behavior change without a version bump · drift between surfaces · skip the CHANGELOG"

@D g23 := "sidecar slash commands — use when applicable" :: governance [active]
  do   = "use sidecar slash commands when they fit: /brainstorm /gap /kick /verify /hexa-help /inbox /all-bg-go /cycle /domain /inject /ship /prefs /pool /cloud /secret /easy /research"

@D g24 := "research — explore all viable paths in parallel" :: governance [active]
  do   = "in research / experiment, fan out ALL disjoint viable paths in parallel — let evidence converge"
  dont = "serialize independent research paths · pick-one menu when paths are disjoint + parallelizable"

@D g25 := "real-limits-first — anchor ceilings to real bounds" :: governance [required active]
  do   = "anchor any ceiling / limit claim to a REAL math / physical bound — see `LATTICE_POLICY.md`"
  dont = "lattice n=6 as a ceiling for external systems · invent artificial ceilings"

@D g26 := "lattice-as-tool, not constraint" :: governance [required active]
  do   = "treat the n=6 lattice as an analytical tool — use where it fits · see `LATTICE_POLICY.md`"
  dont = "treat the lattice as a hard constraint · force-fit it onto external entities"

@D g27 := "ship cycle — commit + push + reinstall local copy" :: governance [required active]
  do   = "ship atomically: commit (explicit paths · cred scan) → push → reinstall the local copy to HEAD"
  dont = "build-and-stop with a stale install · defer reinstall · `git add -A`/`-u` · skip the cred scan"

@D g28 := "credentials — never expose verbatim" :: governance [required active]
  do   = "fetch credentials only via `secret get <key>` — inline `$(secret get <k>)`, process-ephemeral"
  dont = "print / log / commit / paste a credential anywhere · pass creds in subprocess argv · cat cred files"

@D g29 := "CHANGELOG.md at repo root" :: governance [required active]
  do   = "create + maintain `CHANGELOG.md` at every repo root as the chronological history surface"

@D g30 := "no self-authored bypass — guards ship without an off switch" :: governance [required active]
  do   = "if a guard / hook / lint mis-fires, fix or remove the guard itself"
  dont = "add an opt-out / bypass (env var · flag · skip-list) to a guard or rule you authored"

@D g31 := "permission-blocked write — diagnose + clear, don't punt" :: governance [required active]
  do   = "EPERM write? check `ls -lO` flags (uchg/schg) + ACLs — clear via chflags / passwordless sudo"
  dont = "declare a write impossible before diagnosing — sudo is available, immutable flags are clearable"
