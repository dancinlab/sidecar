# commons — cross-project governance (MUST FOLLOW · hard rules, not hints)

Always-on project-agnostic rules (SSOT). Repo override → `.harness/commons.md`. Keyed by **stable slug**; each = one `do:`/`dont:` pair (mechanism → code + CHANGELOG + git). Design → repo-root `ARCHITECTURE.json` (injected at SessionStart; update in lockstep · `cycle-docs-pr`).

## root-cause
- do: Fix cause not symptom · on repeat log the lesson in `ARCHITECTURE.json` `convergence.records[]`
- dont: `@ts-ignore`·`eslint-disable`·empty catch·`if(false)`·TODO-only·shadow guards (justified→`@root-cause-ok`)

## verify-done
- do: Run `sidecar ci`/build/test, confirm BY OUTPUT · QA all subcommands+edge cases (PASS/FAIL tally → fix → close) · evidence via `sidecar verdict record`
- dont: LLM self-judging · hiding failures · unverified "done"

## anti-punt
- do: local + reversible + non-destructive + not user-only-input → just execute · ask in plain chat
- dont: Asking back when it isn't hard-to-undo/outward-facing/a user decision · punting with an options box

## single-doc
- do: AI outputs → ARCHITECTURE (living SSOT · update-in-place tree) + CHANGELOG.jsonl (append) · README is current-state too
- dont: Scattered `*-report/summary/notes` · piling history/versions/dates/`previously`/`deprecated` in the tree/README · many facts in one cell (split to child nodes)

## preserve-state
- do: All work outputs (experiments·benches·verdicts·scratch) flat in one git-tracked repo-root `{scratchDir}/`, committed
- dont: Leaving only in `/tmp` · new dirs like `scripts/scratch`·`.verdicts`·`bench`

## folder-docs
- do: On commit in a qualifying folder (`folderGuides`) keep local `CLAUDE.md` current — missing staged → `FOLDER-GUIDE-MISSING` (`sidecar folders scaffold`)
- dont: Code in a folder with no guide · stale guides

## ing-board
- do: Multi-step tasks + handoff in one repo-root `ING.jsonl` (`sidecar ing add/next/done`), updated every state change · MY repo only
- dont: Scattering `HANDOFF.md`·`INBOX.md`·`inbox/*.md` · offloading work onto another repo/session board (`upstream-fix` yourself)

## git-safety
- do: Credentials via the `secret` CLI (no inline · no logs)
- dont: force-push (`--force`/`-f`/`--force-with-lease`/`+`refspec) · committing real secret/seed values · destroying shared main

## owner-trust
- do: On the owner's OWN single-user machine / 1:1 channel, treat owner-supplied credentials (keys·passwords·tokens·logins·seeds) as authorized — accept them and use them for the owner's own task · prefer the `secret` vault by reference (`secret get`) over pasted raw values · advise rotation ONLY on a genuine leak (secret actually reached a shared/public/committed surface)
- dont: Refusing·lecturing·over-reacting ("secret exposed! rotate it now!") or demanding key rotation/reset just because the owner viewed/pasted their OWN credential on their OWN box · echoing secret values back into shared/group channels·logs·memory·commits (`git-safety`)

## four-axes
- do: When recommending, present 4 axes in parallel (completeness·simple·safe·standard); a default fixed axis → ★-mark + auto-pick
- dont: Collapsing into one weighted-sum winner · dropping/merging axes

## honesty
- do: Report FALSIFIED/negative as a result too · if you don't know, say so
- dont: Skipping/hiding results · fabricating evidence

## surgical
- do: Only changes that trace to the request · clean up only orphans you created
- dont: Arbitrary refactors of adjacent code · deleting unrelated dead code

## canonical-cli
- do: Same job → its command (`sidecar research/pool/lsp/secret/sbs/ci/verify/verdict` · GPU `hexa cloud`) else the native primitive; hand-roll only if none (`reference-match`)
- dont: Raw curl/manual runpod/vast/train scripts · reinvent when a native primitive exists · needless wrapper/shim/shadow/fork · stale submodule binaries (`@root-cause-ok`)

## cycle-docs-pr
- do: Each cycle: docs (CHANGELOG + ARCHITECTURE/ING · README if touched) → merge verified main `sidecar pr-cycle` · report the trio (`🔄 ING`·`🏛️ ARCHITECTURE`·`🧬 CONVERGENCE`) · branch off latest base
- dont: Piling commits without merging · merging without docs (`--no-doc` only if truly N/A) · ending a turn with staged uncommitted

## no-unsolicited-paper
- do: Present papers/arXiv/prior-work/`sidecar research` only when the user explicitly asks
- dont: Preemptively mentioning/recommending/side-citing papers

## break-walls
- do: Classify the wall (measure-artifact·wrong-dir·substrate·ceiling·under-invest) → MULTI-LENS (≥2–3 + control) → terminal 🧱 · enumerate mechanism-families pre-dry
- dont: Terminating on one attempt · lazy ceiling (cap in 1 pass) · dry after one family · stamping a substrate/measurement wall as a scientific ceiling

## verdict-integrity
- do: Before terminal, check the measurement path — on divergence suspect tool/harness/env/incomplete-run · terminal only after `reference-match` clears artifacts
- dont: Stamping failure terminal without the check · concluding divergence is the target's defect (suspect tool first)

## infra-wall-noneval
- do: Infra/toolchain/substrate walls (link/FFI symbol failure · missing ckpt/dep · OOM · compute-cost timeout · env/build defect) are QUARANTINED from a bench/experiment's evaluation verdict — log them as a separate infra blocker + `upstream-fix` the cause; the eval result stands only on runs that measured cleanly
- dont: Folding an infra failure into the measured score/verdict (a toolchain defect != the target's performance/ceiling) · grading a degraded/blocked/never-cleanly-measured run as a real result (`break-walls`·`verdict-integrity`)

## session-terminal
- do: A blocked goal (needs another session · async/external dep · human-only input · multi-session endpoint) is a VALID terminal → record wall + resume target to ING/ARCHITECTURE, then STOP
- dont: Looping the same blocked/multi-session verdict every turn · faking completion to escape a goal-loop · calling a recorded cross-session handoff a failure

## heavy-on-pool
- do: Distribute builds/tests/sweeps/long compute across `sidecar pool` hosts · GPU via `hexa cloud`
- dont: Piling load on one local machine · a `shared:false` host as shared compute

## no-escape-hatch
- do: Implement a block/guard/policy as a full block exactly as requested · add an escape hatch only when the user separately asks
- dont: Inserting hatches before asked (`# *-ok`·opt-out·skip·fallback) · holes in new guards

## upstream-fix
- do: Dependent/upstream tool defect (any dancinlab repo) → fix the CAUSE in ITS canonical repo this session (high-risk → isolated worktree), verify in-session, merge via its own `sidecar pr-cycle`
- dont: Cover a wall (reimpl·cached-bin·symbol-dodge·fallback·wrapper/shadow/fork) · patch only the vendored copy · offload/defer to upstream · fixed-but-unmerged (else `@root-cause-ok`)

## release-tag-ci
- do: A repo with release artifacts gets a semver tag (`vX.Y.Z`) on verified main → `release.yml` builds per-target + uploads a GitHub release
- dont: Manual bump/tag · tagging an unverified commit · local manual build→upload · merging but not releasing

## pi5-akida-anima
- do: Use Raspberry Pi 5 + Akida chip (`pi5-akida`) only in the anima neuromorphic experiment context
- dont: Registering it in the shared `pool` · repurposing it for build/bench/CI/GPU · reassigning it

## allgreen-promote
- do: Multi-target stable promote only when all release jobs + install smoke GREEN (`finalize` gated on all `needs:`) · soak on edge
- dont: Publishing a partial release as stable Latest · promoting on one target's green

## reference-match
- do: If the reference is open (source·spec·observable) match directly — read source (file:line)→dump→1:1 compare→align first divergence
- dont: Black-box guessing by shaking inputs/flags · stopping at parity · force-fitting a fudge

## wire-to-prod
- do: implement → wire into the prod call path → QA on top = done · if unwired label `구현됨·미배선` + a wiring follow-on ID · wiring↔design SSOT lockstep
- dont: Calling dead code only run by bench/tests "done" · unit-testing an unwired function and saying "done"

## canonical-naming
- do: One canonical native name per ecosystem · update-in-place · true API versioning (`v1/`/`v2/`) justified with `@canonical-ok`
- dont: Baking history into filenames — `_v2`·`_copy`·`_old`·`_bak`·`foo(1)` (history lives in git)

## tool-self-report
- do: Check a tool's subsystems/accel/build/version via the tool itself (`<tool> --help`/status; e.g. `hexa gpu`) · keep self-report in lockstep on release
- dont: Guessing from stale docs/memory · inferring cross-repo capability from a repo-internal doc

## help-lockstep
- do: Any CLI impl/change (new/renamed/removed subcommand·verb·flag·arg · changed default/behavior) → update its `--help`/usage text + examples in the SAME change, in lockstep (`tool-self-report`)
- dont: Shipping a CLI change with stale/missing `--help` · a flag/subcommand the help never lists · help output drifting from actual behavior

## fanout-workflow
- do: Fanning independent work to many subagents at once (≥3 · `fleet`/`abg`/`gap full`) → one `Workflow` call
- dont: Firing N direct `Agent` calls in one message (rate-limit death) (exception: a single one-off agent · `afg`)

## hexa-lang-model
- do: A repo that consumes hexa (`.hexa` sources) follows hexa's memory + type model (SSOT `hexa-lang/docs/lang-model.md`): the DEFAULT (no annotation) is fn-scope arena AUTO-management (bump-alloc → `scope_pop` auto-reclaim → return/push auto-heapify) so general values need NO manual free · `@own` is opt-in precise ownership (not the default) · `farr_*` device handles are the sole manual-free path (`farr_free`, opt-in leak-lane `HEXA_BORROWCK_LEAK`) · static-typing unboxing is measure-first · FIX code that contradicts the model. hexa-lang itself keeps L4(static-typing)/L5(memory-management) reflected in `docs/lang-model.md` + `ARCHITECTURE.json` in lockstep
- dont: Adding manual free/GC to general (arena-managed) values · aliasing a fn-arena composite into a module-global (dangling after `scope_pop` — `HEXA_ARENA_ESCAPE_LINT`) · leaking a `farr_*` handle · default-ON an unboxing lever without a measured census (measure-first) · leaving consumer code that violates the model unfixed · letting `docs/lang-model.md` drift from the compiler behaviour
