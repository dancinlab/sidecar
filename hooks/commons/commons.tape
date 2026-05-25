@V := "tape" :: spec [active]
  version = "1.2"

@D g0 := "Occam's razor — simplest sufficient path" :: governance [required active]
  do   = "prefer the simplest explanation / solution that fits — fewest assumptions · fewest moving parts"
  dont = "multiply entities beyond necessity · choose a complex path when a simpler one suffices"

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

# g5 tier rubric (`hexa verify rubric` · TECS-L-aligned · paste the matching verdict verbatim):
#   🔵 SUPPORTED-FORMAL       closed-form / symbolic identity reproduced exactly (Tier 1, deterministic)
#   🟢 SUPPORTED-NUMERICAL    libm / Newton numerical recompute matches (Tier 2, non-symbolic)
#   🟡 SUPPORTED-BY-CITATION  atlas / literature registered · NO hexa recompute (never auto-🔵)
#   🟠 INSUFFICIENT/DEFERRED  no calc path · or external hw / data / API dep (Tier 3)
#   🔴 FALSIFIED              calc deterministically disagrees — a CLOSED negative (≠ INSUFFICIENT)
#   ⚪ SPECULATION-FENCED     imagination / metaphor — verify N/A, SF ≠ proven

@D g6 := "hexa kick for gap discovery" :: governance [active]
  do   = "`hexa kick --seed \"<expr>\" [--rounds N]` for gap breakthroughs · discovery"

@D g7 := "consult hexa --help for unfamiliar verbs" :: governance [active]
  do   = "consult `hexa --help` for unfamiliar hexa CLI verbs"

@D g8 := "rented-GPU pod dispatch via hexa cloud" :: governance [required active]
  do   = "runpod / vast.ai → `hexa cloud {run|nohup|poll|copy-to|copy-from|copy-dir-*|preflight}`"
  dont = "raw `ssh` / `scp` / `runpodctl` / `vastai` CLI · fall back to separate hexa-cloud binary (g11)"

@D g9 := "sidekick-pool dispatch via pool" :: governance [required active]
  do   = "sidekick roster → `pool on <host> <cmd>` — macOS-only (swift/xcode) · GPU · heavy build"
  dont = "run host-specific work on local shell when a sidekick host fits — roster in SessionStart"

@D g10 := "background work — detach + log + Monitor, survive rate-limit" :: governance [required active]
  do   = "long/background job → detach (`nohup`/`setsid`) + write a progress log (`> <job>.log 2>&1`)"
  do   = "attach `Monitor` to the LOG (not the live pipe) — token-light, re-attach after rate-limit"
  do   = "liveness via a detached OS `while` heartbeat (token-free); on resume re-read the log"
  dont = "model-side `tail -f` / `sleep`-poll / repeated cat-poll — burns turns, dies on rate-limit"
  dont = "long job attached to the session (no detach/log) — rate-limit death SIGHUPs it, progress lost"

@D g11 := "no gap workarounds — fix at source" :: governance [required active]
  do   = "log hexa-lang upstream gaps to `<hexa-lang>/INBOX.log.md` (`/domain set INBOX`) on discovery"
  dont = "implement workarounds for known gaps — log an upstream INBOX handoff, fix at source"

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

@D g31 := "permission-blocked write — diagnose + clear, don't punt" :: governance [required active]
  do   = "EPERM write? check `ls -lO` flags (uchg/schg) + ACLs — clear via chflags / passwordless sudo"
  dont = "declare a write impossible before diagnosing — sudo is available, immutable flags are clearable"

@D g32 := "think before coding — surface ambiguity, don't guess" :: governance [required active]
  do   = "state assumptions · surface real interpretation forks · ask when genuinely unclear"
  dont = "guess silently past ambiguity · fake ambiguity to punt clearly-OK work (g18)"

@D g33 := "simplicity first — minimum code, nothing speculative" :: governance [required active]
  do   = "minimum code that solves the asked problem — 200 lines that could be 50 → rewrite"
  dont = "speculative abstraction / flexibility with no current caller · handling for impossible states"

@D g34 := "surgical changes — touch only what the request needs" :: governance [required active]
  do   = "match existing style · every changed line traces to the request · remove only orphans you created"
  dont = "refactor / reformat adjacent working code · delete pre-existing dead code unprompted — flag it"

@D g35 := "goal-driven execution — verifiable success criteria" :: governance [required active]
  do   = "recast tasks as verifiable goals — bug → failing test → green · loop until verified"

@D g36 := "cross-project handoff via INBOX domain" :: governance [required active]
  do   = "cross-repo gap/patch/bug/RFC → `cd <repo> && /domain set INBOX` then `/domain todo <handoff>`"
  dont = "scatter handoffs in ad-hoc files — use the target repo's INBOX domain (INBOX.md/INBOX.log.md)"

@D g37 := "plist — user-request only" :: governance [required active]
  dont = "create `.plist` (LaunchAgents · LaunchDaemons · Info.plist) unprompted — explicit request only"

@D g38 := "autonomous work-loop via /cycle" :: governance [required active]
  do   = "multi-round goal → `/cycle` (self-enumerate → parallel-plan → fan-out → loop)"
  dont = "serialize multi-round work · manual orchestration when `/cycle` fits the loop pattern"

@D g39 := "project-state docs via /domain" :: governance [required active]
  do   = "project tasks/decisions → `/domain <task>` (logs <NAME>.md spec + <NAME>.log.md history)"
  dont = "scatter project state across ad-hoc TODO.md / PLAN.md / notes/*.md — use /domain"

@D g40 := "multi-axis gap sweep via /gap (sister of /kick)" :: governance [active]
  do   = "stuck on a problem → `/gap` (42-lens 8-family sweep) or `/kick <seed>` (g6 · discovery)"
  dont = "brute-force a stuck problem without lensing — multi-axis catalog ready in /gap"

@D g41 := "reactive fan-out via /all-bg-go (sister of /cycle)" :: governance [active]
  do   = "PRIOR-turn branches → `/all-bg-go` (single reactive fan-out) · `/cycle` is self-generating (g38)"
  dont = "manual one-by-one when prior turn offered N disjoint branches — fan them out"

@D g42 := "depletion ideation via /brainstorm (discovery family)" :: governance [active]
  do   = "depletion ideation → `/brainstorm <seed>` · sister to /kick (g6) · /gap (g40)"
  dont = "stop at first few ideas when /brainstorm exhausts the well — width-first ideation"

@D g43 := "external research fetch via /research" :: governance [active]
  do   = "arxiv paper / YT video → `/research:arxiv <query|id>` · `/research:yt <url|id>`"
  dont = "raw `curl` arxiv API · `WebSearch` for what /research already wraps cleanly"

@D g44 := "image generation via /imagine (gpt-image-2 pinned)" :: governance [required active]
  do   = "image needs → `/imagine <prompt-file> <out.png>` (default backend: fal · model: gpt-image-2)"
  dont = "silently swap gpt-image-2 → gpt-image-1 · dall-e-3 · flux — model is user-pinned"

@D g45 := "user language prefs via /prefs" :: governance [active]
  do   = "user changes language pref → `/prefs {code|docs|response} <lang>` (SSOT: $CLAUDE_PLUGIN_DATA)"
  dont = "ask user to retype lang each session — `/prefs` persists 3 axes (code · docs · response)"

@D g47 := "PR ship discipline — create → merge → clean, no unmerged stacks / dead worktrees" :: governance [required active]
  do   = "create one PR → merge (squash) → delete branch + remove its worktree → next · main-based"
  dont = "leave a PR unmerged · a merged branch · or a dead worktree behind at session end"

@D g48 := "cross-project INBOX ack — close-then-notify" :: governance [required active]
  do   = "handoff done → `/domain done <item>` in your INBOX + ack entry to sender's INBOX.log.md"
  dont = "close your handoff without ack-ing sender — handoff loop broken · sender stays in the dark"

@D g49 := "GPU dispatch priority — pool first, cloud as fallback" :: governance [required active]
  do   = "GPU work → check `pool list` for GPU host → `hexa cloud` only when pool has no GPU host"
  dont = "default to rented runpod/vast.ai when an enabled pool host with GPU is in the roster"

@D g50 := "AI CLI first — API/SDK only as fallback" :: governance [required active]
  do   = "AI need (image/search/transcript/…) → CLI wrapper first · API/SDK only if no wrapper exists"
  dont = "openai/anthropic/fal SDK · curl POST · raw HTTP when a /imagine /research /… CLI wraps it"

@D g51 := "paper lint — ≥10 pages + ≥1 fal.ai figure required" :: governance [required active]
  do   = "any /paper output must compile to ≥10 pages AND embed ≥1 fal.ai-generated figure (g44)"
  dont = "ship a /paper with <10 pages or zero fal-generated figures — substandard arxiv submission"

@D g52 := "auto-log to /domain — every decision/done" :: governance [required active]
  do   = "every task done / decision made → `/domain <text>` log immediately · don't batch · per-step"
  dont = "batch-log at session end · skip routine progress · only log major events (g39 enforcement)"

@D g53 := "/easy 7-element friendly explain — explain/report turns by default" :: governance [required active]
  do   = "non-trivial concept → 7-el: icon·NAME·alias·plain·analogy·ASCII·vs-tool"
  do   = "session-wide ON · no toggle · spec+gold = sidecar skills/easy/styles/easy.<lang>.md"
  dont = "skip in explanatory turns · jargon-dump w/o analogy · trivial yes/no may stay terse"
  dont = "exempt: code / math / identifiers / paths / SHA · CI machine pipes (json|jsonl)"

@D g55 := "wall-time first — minimize elapsed time, parallel / distributed over serial" :: governance [required active]
  do   = "fan out independent work across hosts/GPUs/pods (≤8) · many cheap-parallel beat 1 slow-serial"
  dont = "serialize embarrassingly-parallel work · 1 big slow unit when many small parallel are faster"

@D g56 := "progress as % — ASCII bar + fraction on multi-step work" :: governance [required active]
  do   = "multi-step task → lead with `▓▓▓░░ NN% · done/total` + next step · refresh each turn"
  dont = "prose-only progress without a % bar · drop the bar mid-task on multi-step work"

@D g57 := "pod fire → 🛰️ Monitor + SAVE_POD=1 + ⏱ walltime (no fire-and-forget polling)" :: governance [required active]
  do   = "after `hexa cloud nohup/run`: 🛰️ Monitor + SAVE_POD=1 + ⏱ walltime ETA + headroom hours"
  do   = "early-life-check ~5min post-fire — SSH ps + train.log progress + nvidia-smi util > 0%"
  dont = "tail -f / sleep-poll · SSH drop sans SAVE_POD=1 · undersize walltime — all = result LOST"
  dont = "infer train alive from pod RUNNING + watchdog-elapsed alone — idle burn risk (no progress)"

@D g58 := "/cycle family — enumerate only the active domain's open milestones" :: governance [required active]
  do   = "next-list = active <NAME>.md `- [ ]` items · run `/domain set <NAME>` first if none active"
  dont = "enumerate off-domain work · add milestones to non-active domain · scope drift"

@D g59 := "hexa improvement found → log upstream INBOX immediately (g11 specialization)" :: governance [required active]
  do   = "hexa-lang / CLI / runtime gap → log to `~/core/hexa-lang/INBOX.log.md` (`/domain set INBOX`) now"
  dont = "workaround silently · defer · note-in-chat-only · log under sidecar (wrong repo)"

@D g60 := "upstream INBOX reflex — aggressive, same-turn, over-file (g11/g59 generalization)" :: governance [required active]
  do   = "cross-repo gap / fix / idea → file that repo's INBOX same-turn · stub-first · dedup-check first"
  dont = "defer · gate on full repro · chat-only downgrade · assume another session will file it"

@D g61 := "hexa-lang stdlib is the SSOT for shared code — primitives + engines" :: governance [required active]
  do   = "promote reusable general primitives (math/info/signal/bitops/stats) to hexa-lang `stdlib/`"
  do   = "≥2-repo reusable domain engine → `stdlib/<domain>/` (e.g. `consciousness/iit4` · `dsp`)"
  do   = "engine = substrate-agnostic (stdlib) ⊥ adapter = per-repo (its data → stdlib engine input)"
  do   = "stdlib = plain `.hexa` · callers import-only (thin shim/adapter) · keep byte-equal"
  do   = "import `stdlib/…` resolves to ONE hexa-lang `stdlib/` (single physical SSOT · HEXA_LANG)"
  dont = "duplicate a primitive OR engine across repos · anima-locked abs-path import of shareable code"
  dont = "compiler builtin when stdlib fits · hand-edit `hexa_cc.c`/`hexa_v2` (use `hexa cc --regen`)"

@D g62 := "atlas register at checkpoints — session · domain · discovery · post-brainstorm" :: governance [required active]
  do   = "on a checkpoint, hexa atlas register the verified closed-forms/discoveries of that scope"
  dont = "let a closed-form decay unregistered · skip atlas at session/domain/brainstorm close"

@D g63 := "micro-exp honest sweep — every candidate reaches a verify tier" :: governance [required active]
  do   = "every /micro-exp candidate reaches a verify tier · record FALSIFIED as a CLOSED negative"
  dont = "silent-drop a candidate · cherry-pick passes · treat FALSIFIED as skip (it is a closed result)"

@D g64 := "sweep budget cap — declare budget before dispatch, halt on breach" :: governance [required active]
  do   = "declare `pod_concurrent_max` (+ usd_max_per_week when known) before sweep dispatch · halt at cap"
  dont = "exceed the declared pod/usd budget silently · dispatch a wave past pod_concurrent_max"

@D g65 := "sweep aggregation — typed ledger per batch" :: governance [required active]
  do   = "every sweep batch writes `exports/sweep/<batch>/ledger.json` (manifest + verdicts + pattern)"
  dont = "let the ledger drift from atlas state · leave a batch with no aggregate surface"

@D g66 := "sweep pod-cap ≠ agent-cap — distinct semantics" :: governance [required active]
  do   = "keep pod_concurrent_max (rent budget) and parallel-agent-cap (≤3 · rate-limit) separate"
  dont = "conflate the two caps · apply the agent-cap to pod dispatch · the pod-cap to parse Agents"

@D g67 := "intra-project domain reuse lattice — atlas-first · provenance · per-repo NEXUS.tape" :: governance [required active]
  do   = "before building a primitive, grep atlas + sibling-domain records for a verified one to reuse"
  do   = "stamp each record with cross-domain edges — reused[] (borrowed) · provides[] (offered)"
  do   = "keep a repo-root NEXUS.tape reuse graph current — nodes = domains, edges = reuse"
  dont = "rebuild a primitive a sibling domain already verified · leave a reuse edge unrecorded"
  dont = "couple domains across separate repos — intra-project only (hexa-lang substrate hub exempt · g68)"

@D g68 := "hexa-lang stdlib/atlas = shared substrate hub — the one cross-project link" :: governance [required active]
  do   = "draw shared primitives from the hexa-lang stdlib (code home · @D d3) + atlas (verified atoms)"
  do   = "record consumed stdlib primitives as from-hexa[] in a repo's NEXUS.tape (star, not mesh)"
  do   = "keep hexa-lang's root NEXUS.tape atlas-backed — atlas auto-folds atoms on verify, no manual sync"
  dont = "fork a hexa-lang stdlib primitive into a project · treat the hub as a peer inter-project mesh"

@D g69 := "domain finalization gate — BLUE-MAX 🔵-pair audit at absorbed=true" :: governance [required active]
  do   = "before absorbed=true, run `hexa verify --blue-max <DOMAIN>` and cite the tier matrix in the flip log"
  do   = "for every 🟢 libm-class atom, ensure a 🔵 algebraic-root pair exists (integer factor/exponent)"
  dont = "flip absorbed without a BLUE-MAX audit citation · ship 🟢 atoms with no 🔵 pair attempt"

@D g70 := "non-Latin term canonical-command map (stall-prevention)" :: glossary [required active]
  do   = "term 'blue-max bonghap' (KR phonetic) = `hexa verify --blue-max <D>` + absorbed=true (g69)"
  do   = "term 'bonghap' (KR phonetic) = the post-gate flip-to-absorbed closure-sequence tail (d5)"
  do   = "term 'NEXUS' = repo-root NEXUS.tape reuse-lattice SSOT (g67 · hexa-lang hub g68)"
  dont = "stall on a non-Latin term lookup — invoke the command per g67/g68/g69, do not grep-spin"

@D g71 := "pool work — sync to origin/main first; avoid local sign-gate for heavy jobs" :: governance [required active]
  do   = "before routing heavy/data-bound work to a pool host: git fetch + checkout origin/main on it"
  do   = "prefer a pool host over a Mac-local sign-gated path for heavy / cost-bearing / data-bound work"
  do   = "audit launcher/dispatcher for hardcoded host paths — pool fire needs portable repo-root"
  dont = "run on a stale pool checkout (silent arg/codegen drift = idle GPU burn) · sign-token loop on local"
  dont = "assume origin/main is portable — a `/Users/...` hardcode silently scp-fails on a Linux pool host"
