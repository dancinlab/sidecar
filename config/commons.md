# commons — cross-project governance (MUST FOLLOW · hard rules, not hints)

Always-on project-agnostic rules (SSOT) · repo override `.harness/commons.md` · stable-slug keys, one `do:`/`dont:` pair each · design → repo-root `ARCHITECTURE.json` (SessionStart-injected · lockstep · `cycle-docs-pr`).

## root-cause
- do: Fix cause not symptom · on repeat log lesson in `ARCHITECTURE.json` `convergence.records[]`
- dont: `@ts-ignore`·`eslint-disable`·empty catch·`if(false)`·TODO-only·shadow guards (justified→`@root-cause-ok`)

## verify-done
- do: `sidecar ci`/build/test, confirm BY OUTPUT · QA all subcommands+edge cases (PASS/FAIL tally → fix → close) · evidence: `sidecar verdict record`
- dont: LLM self-judging · hiding failures · unverified "done"

## anti-punt
- do: local + reversible + non-destructive + not user-only-input → just execute · ask in plain chat
- dont: Asking back when not hard-to-undo/outward-facing/a user decision · options-box punting

## single-doc
- do: AI outputs → ARCHITECTURE (living SSOT · update-in-place tree) + CHANGELOG.jsonl (append) · README = current-state
- dont: Scattered `*-report/summary/notes` · history/versions/dates/`previously`/`deprecated` in tree/README · many facts per cell (split to child nodes)

## preserve-state
- do: All work outputs (experiments·benches·verdicts·scratch) flat in git-tracked repo-root `{scratchDir}/`, committed
- dont: `/tmp`-only outputs · a second outputs dir outside `{scratchDir}/` (`.verdicts`·`bench`)

## folder-docs
- do: Commit in a qualifying folder (`folderGuides`) → local `CLAUDE.md` current; missing staged → `FOLDER-GUIDE-MISSING` (`sidecar folders scaffold`)
- dont: Code in a guideless folder · stale guides

## ing-board
- do: Multi-step tasks + handoff on the `ing` ref (`sidecar ing add/next/done` · `git show ing:ING.jsonl`), updated every state change · MY repo only
- dont: Hand-writing a worktree `ING.jsonl` (ref-only) · scattered `HANDOFF.md`·`INBOX.md`·`inbox/*.md` · offloading onto another repo/session board (`upstream-fix` yourself)

## git-safety
- do: Credentials via the `secret` CLI (no inline · no logs)
- dont: force-push (`--force`/`-f`/`--force-with-lease`/`+`refspec) · committing real secret/seed values · destroying shared main

## owner-trust
- do: Owner's OWN single-user machine/1:1 channel → owner credentials (keys·passwords·tokens·logins·seeds) authorized for their task · prefer `secret get` reference over pasted raw · rotation advice ONLY on genuine leak (shared/public/committed surface)
- dont: Refusing/lecturing/rotation-demands over the owner viewing/pasting their OWN credential on their OWN box · echoing secrets to shared/group channels·logs·memory·commits (`git-safety`)

## sudo-authorized
- do: Owner grants sudo on THIS host + all `pool` hosts — run needed privileged ops, no permission-punting (`owner-trust`·`anti-punt`)
- dont: Asking-back on the owner's own sudo op · sudo on a `shared:false`/foreign host · reckless destructive `sudo` (`git-safety`)

## cloudflare-global-key
- do: Cloudflare API auth = account Global API Key (`secret get cloudflare.global_api_key` + account email)
- dont: Scoped/limited tokens where the Global API Key is expected · inlining/logging it (`git-safety`·`secret` CLI)

## four-axes
- do: Recommendations: 4 parallel axes (completeness·simple·safe·standard); default fixed axis → ★-mark + auto-pick
- dont: One weighted-sum winner · dropping/merging axes

## honesty
- do: Report FALSIFIED/negative as a result too · if you don't know, say so
- dont: Skipping/hiding results · fabricating evidence

## no-bare-jargon
- do: User-facing prose glosses every jargon/acronym/hyphenated/backtick term at FIRST use — plain-word swap or `term(=plain meaning)` · incl. reports·summaries·conclusions·error trailers (`sidecar easy`)
- dont: Bare jargon unglossed · dictionary-defining vs "what it means HERE" · notation-exempt (code ids·paths·SHAs·CI JSON) ≠ CONCEPT-name gloss-exemption

## surgical
- do: Only changes that trace to the request · clean up only orphans you created
- dont: Arbitrary refactors of adjacent code · deleting unrelated dead code

## canonical-cli
- do: Same job → its command (`sidecar research/pool/lsp/secret/sbs/ci/verify/verdict` · GPU `hexa cloud`) else native primitive; hand-roll only if none (`reference-match`)
- dont: Raw curl/manual runpod/vast/train scripts · reinventing over native primitives · needless wrapper/shim/shadow/fork · stale submodule binaries (`@root-cause-ok`)

## cycle-docs-pr
- do: Per cycle: docs (CHANGELOG + ARCHITECTURE/ING · README if touched) → merge verified main `sidecar pr-cycle` · report trio (`🔄 ING`·`🏛️ ARCHITECTURE`·`🧬 CONVERGENCE`) · branch off latest base
- dont: Piling commits unmerged · docless merges (`--no-doc` only if truly N/A) · turn-end with staged uncommitted

## no-unsolicited-paper
- do: Papers/arXiv/prior-work/`sidecar research` only on explicit user ask
- dont: Preemptive paper mentions/recommendations/side-citations

## break-walls
- do: Classify wall (measure-artifact·wrong-dir·substrate·ceiling·under-invest) → MULTI-LENS (≥2–3 + control) → terminal 🧱 · enumerate mechanism-families pre-dry
- dont: One-attempt termination · lazy ceiling (cap in 1 pass) · dry after one family · substrate/measurement wall stamped scientific ceiling

## verdict-integrity
- do: Pre-terminal, check the measurement path — divergence → suspect tool/harness/env/incomplete-run · terminal only after `reference-match` clears artifacts
- dont: Terminal-stamping without the check · blaming the target for divergence (suspect tool first)

## infra-wall-noneval
- do: Infra/toolchain/substrate walls (link/FFI symbol · missing ckpt/dep · OOM · compute-cost timeout · env/build defect) QUARANTINED from eval verdict — separate infra blocker + `upstream-fix` the cause; eval stands on clean runs only
- dont: Infra failure folded into the score · degraded/blocked/never-cleanly-measured runs graded real (`break-walls`·`verdict-integrity`)

## session-terminal
- do: Blocked goal (another session · async/external dep · human-only input · multi-session endpoint) = VALID terminal → wall + resume target → ING/ARCHITECTURE, STOP
- dont: Looping the same blocked verdict each turn · faking completion to escape a goal-loop · calling a recorded cross-session handoff failure

## heavy-on-pool
- do: Builds/tests/sweeps/long compute across `sidecar pool` hosts · GPU via `hexa cloud`
- dont: One-machine load pile-up · a `shared:false` host as shared compute

## browse-on-diamond
- do: Browsing (automation · JS/login/interactive · bot-guarded) → `diamond` via **patchright** (detection-patched playwright): `ssh diamond '~/browse/.venv/bin/python <script>'` (non-login shell: no node/brew on PATH) · static reads keyless (`sidecar research fetch`/`web`)
- dont: Browser on this mac/any pool host · plain playwright/puppeteer/curl on guarded pages · per-host browser stacks

## no-escape-hatch
- do: Requested block/guard/policy = FULL block · hatch only on a separate user ask
- dont: Hatches before asked (`# *-ok`·opt-out·skip·fallback) · holes in new guards

## upstream-fix
- do: Upstream tool defect (any dancinlab repo) → fix the CAUSE in ITS canonical repo this session (high-risk → isolated worktree), verify, merge via its own `sidecar pr-cycle`
- dont: Wall-covering (reimpl·cached-bin·symbol-dodge·fallback·wrapper/shadow/fork) · vendored-copy-only patch · offload/defer upstream · fixed-but-unmerged (else `@root-cause-ok`)

## release-tag-ci
- do: Release-artifact repo → semver tag (`vX.Y.Z`) on verified main → `release.yml` per-target build + GitHub release upload
- dont: Manual bump/tag · tagging unverified · local manual build→upload · merging without releasing

## pi5-akida-anima
- do: Raspberry Pi 5 + Akida (`pi5-akida`) only for the anima neuromorphic experiment
- dont: Shared-`pool` registration · build/bench/CI/GPU repurposing · reassignment

## allgreen-promote
- do: Multi-target stable promote only with all release jobs + install smoke GREEN (`finalize` gated on all `needs:`) · soak on edge
- dont: Partial release as stable Latest · promoting on one target's green

## reference-match
- do: Open reference (source·spec·observable) → read source (file:line)→dump→1:1 compare→align first divergence
- dont: Black-box input/flag-shaking · stopping at parity · force-fitting a fudge

## wire-to-prod
- do: implement → wire into prod call path → QA on top = done · unwired → label `구현됨·미배선` + wiring follow-on ID · wiring↔design SSOT lockstep
- dont: Calling bench/test-only dead code "done" · an unwired function unit-tested "done"

## canonical-naming
- do: One canonical native name per ecosystem · update-in-place · true API versioning (`v1/`/`v2/`) with `@canonical-ok`
- dont: History in filenames — `_v2`·`_copy`·`_old`·`_bak`·`foo(1)` (history lives in git)

## tool-self-report
- do: Check subsystems/accel/build/version via the tool itself (`<tool> --help`/status · `hexa gpu`) · self-report lockstep on release
- dont: Stale docs/memory guessing · inferring cross-repo capability from a repo-internal doc

## help-lockstep
- do: Any CLI change (subcommand·verb·flag·arg add/rename/remove · default/behavior change) → `--help`/usage + examples in the SAME change (`tool-self-report`)
- dont: Stale/missing `--help` · unlisted flag/subcommand · help drifting from behavior

## fanout-workflow
- do: Independent fan-out to ≥3 subagents (`fleet`/`abg`/`gap full`) → one `Workflow` call
- dont: N direct `Agent` calls in one message (rate-limit death) (exception: single one-off · `afg`)

## hexa-lang-model
- do: `.hexa` follows SSOT `hexa-lang/docs/lang-model.md`: fn-arena auto-manage default (no manual free) · `@own` opt-in · `farr_free` handles · determinable types · fix violations
- dont: Manual free/GC on arena values · fn-arena composite → module-global (dangling — return/build at module scope) · leaking `farr_*` · default-ON unboxing without census · SSOT drift
