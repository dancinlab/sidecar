# commons — cross-project governance (MUST FOLLOW · hard rules, not hints)

Always-on, project-agnostic rules — the sidecar governance SSOT. Project-specific rules live in
`.harness/enforcement.json` / `.harness/keywords.json`; override this file at `.harness/commons.md`.
Mostly hook-enforced; this block keeps them salient. Keyed by **stable slug** (never reference by number).
Each rule = one `do:` / `dont:` pair; mechanism & precedents live in code + CHANGELOG + git.

> 🏛️ For project design, first read repo-root `ARCHITECTURE.json` (design SSOT · `single-doc`) —
> `sidecar architecture inject` injects it at SessionStart. Don't guess structure·modules·dataflow; read
> that tree as the single source and update in lockstep on code/design changes (`cycle-docs-pr`). Humans: `python3 serve.py`.

## root-cause — fix the cause, not a workaround
- do: Fix cause not symptom · on repeat log lesson in `ARCHITECTURE.json` `convergence.records[]` SSOT — `lint` enforces well-formed; Stop blocks missing `🧬 CONVERGENCE` (id/`해당 없음`) (`convergenceEnforce`)
- dont: `@ts-ignore`·`eslint-disable`·empty catch·`if(false)`·TODO-only·shadow guards (justified→`@root-cause-ok <reason>`) · scattering repeat-lessons in inline comments·separate incident trackers (one SSOT)

## fix-the-tool — don't bypass a language/tool wall, fix that tool (reinforces root-cause·upstream-fix)
- do: Dependent language·compiler·runtime·toolchain defect/limit (parser gaps·int limits·codegen·link…) → **fix that tool** (all dancinlab repos writable) — land in the tool's **CANONICAL repo** (dev clone/upstream e.g. `~/dancinlab/hexa-lang`), merge via **that repo's own pr-cycle/ship** (survives reinstall/self-update) — in-session verify via worktree+build+CI→merge
- dont: Cover a wall: other-lang reimpl (Python)·cached-binary bypass·symbol/name dodge·fallback branch·premature "measurement-terminal" (=wire-to-prod·dead) · patching only the **INSTALLED/vendored copy** (`~/.hx/src`·`node_modules`·site-packages·cache) = bandaid a `self-update`/reinstall reverts — a NOW-unblock edit STILL lands upstream same cycle (if unavoidable `@root-cause-ok <reason>`+opt-in)

## verify-done — actually verify before "done"
- do: Run `sidecar ci`/build/test, confirm **by output** · after a feature/bugfix exhaustively QA all subcommands·edge cases (tally PASS/FAIL → fix bugs then close) · evidence via `sidecar verdict record`
- dont: LLM self-judging · hiding failures (a failure is a failure) · unverified "done"

## anti-punt — when blocked, proceed instead of asking (bypass)
- do: local + reversible + non-destructive + not user-only input → just execute · ask in plain chat
- dont: Asking back when it isn't hard-to-undo/outward-facing/a user decision · punting with an options box

## single-doc — consolidate output docs into two
- do: AI outputs go into two — **ARCHITECTURE** (living SSOT · update-in-place · `children` tree) + **CHANGELOG.jsonl** (append·prune) · README too is current-state update-in-place
- dont: Scattered `*-report/summary/notes` · piling change-history·versions·dates·`previously`/`deprecated` in the tree/README · cramming many facts in one cell (esp `detail`) (= split into child nodes)

## preserve-state — outputs all under one `state/`
- do: Keep all work outputs — experiments·benches·verification (verdict/claim)·scratch — flat in one git-tracked repo-root `state/` folder and commit (GitHub-preserved)
- dont: Leaving only in volatile `/tmp` · new dirs like `scripts/scratch`·`.verdicts`·`bench`·`experiments` · discarding temp output (only regenerable `build/` is gitignored · machine logs in `.harness/`)

## folder-docs — local CLAUDE.md in work folders
- do: On commit in a qualifying folder (`folderGuides` roots/depth/minFiles) keep local `CLAUDE.md` (purpose·files·rules·gotcha) current — missing staged → `sidecar lint` gates `FOLDER-GUIDE-MISSING` (`sidecar folders scaffold <dir>`). Free-form
- dont: Piling code in a folder with no guide · leaving old guides stale · substituting deep-folder context with one root CLAUDE.md

## ing-board — progress tracking·handoff in one board
- do: Track multi-step tasks + handoff in one repo-root `ING.jsonl` board (`ing` git ref) — `sidecar ing add/next/done` (done=scrub→CHANGELOG) · update on every state change · **my current repo only**
- dont: Scattering `HANDOFF.md`·`INBOX.md`·`inbox/*.md` · using the old `handoff`/`trail` · offloading work onto another repo/session board (fix it yourself · `upstream-fix`)

## git-safety — no destructive git
- do: Credentials via the `secret` CLI (no inline·no logs)
- dont: force-push (`--force`/`-f`/`--force-with-lease`/refspec `+`) · committing real secret-key·seed values · directly destroying shared main

## four-axes — recommendations in 4 parallel axes
- do: When recommending to the user present 4 axes in parallel (completeness·simple·safe·standard) · if a fixed axis is default mark ★ + auto-pick (decide and proceed)
- dont: Collapsing into a single weighted-sum winner · dropping/merging axes

## honesty — honesty
- do: Report FALSIFIED/negative as a result too · if you don't know, say so
- dont: Skipping·hiding results · fabricating nonexistent evidence

## surgical — minimal change
- do: Only changes that trace directly to the request · clean up only orphans you created
- dont: Arbitrary refactors of adjacent code · deleting unrelated dead code

## canonical-cli — use the designated command
- do: Same job → command — `sidecar imagine`·`sidecar research`·`sidecar watch`·hosts `sidecar pool`·LSP `sidecar lsp`·`sidecar secret`·steps `sidecar sbs`·exp `sidecar micro-exp`·verify `sidecar ci`·`sidecar verify`·`sidecar verdict` · GPU `hexa cloud`·train `hexa dojo`·`hexa deck` · PATH global binary (`sidecar self-update`) · cloud jobs `sidecar ing pod add`
- dont: Habitual raw curl/manual runpod·vast·train scripts · using stale binaries from a repo submodule

## cycle-docs-pr — per-cycle docs + merge
- do: Each cycle ① docs (CHANGELOG + ARCHITECTURE·ING · README if touched) ② merge verified main `sidecar pr-cycle` · close changes that turn (incomplete=`wip:`) · report `🏛️ ARCHITECTURE`/`🔄 ING` · branch off latest base
- dont: Piling commits without merging · merging without docs (`--no-doc` only when truly unneeded) · ending a turn with staged changes uncommitted · reporting done when not · leaving local main stale

## no-unsolicited-paper — no mentioning papers before asked
- do: Present papers/arXiv/prior-work·`sidecar research` only when the user explicitly asks
- dont: Preemptively mentioning·recommending·side-citing papers before asked

## break-walls — break through walls (closed-negative ≠ terminal)
- do: Classify wall (measure-artifact·wrong-dir·substrate·ceiling·under-invest) → MULTI-LENS (≥2–3 lenses+control) → terminal 🧱 · LAW=frozen-first predict+falsify · enumerate orthogonal mechanism-families pre-dry
- dont: Terminating on one attempt · lazy ceiling (stamping HW/perf cap in 1 pass) · dry after exhausting one family · stamping a substrate/measurement wall as a scientific ceiling · tune-to-green

## verdict-integrity — measurement path first before a terminal verdict (negative held to the same bar as positive)
- do: Before terminal **check measurement-path integrity** — on divergence from ref/2nd-path/prior suspect tool·harness·env·incomplete-run·unwired; terminal only after `reference-match` clears artifacts
- dont: Stamping negative/failure terminal without measurement check (verify only success, rubber-stamp failure) · concluding divergence is the target's defect (suspect tool first) · stamp-then-retract loops

## heavy-on-pool — heavy work on the shared pool
- do: Distribute builds·tests·large sweeps·long computation across `sidecar pool` shared hosts (`pool on/bg/route/status`) · GPU·training via `hexa cloud`/`hexa dojo`
- dont: Piling load on a single local machine · using a `shared:false` restricted host as shared-pool compute

## no-escape-hatch — no escape hatches before asked
- do: Implement blocks/guards/policies as a full block exactly as requested · add an escape hatch only when the user separately asks
- dont: Inserting escape hatches before asked (`# *-ok`-style markers·opt-out flags·skip conditions·fallback branches·guard defeats) (keep existing marker hatches, no holes in new guards)

## upstream-fix — fix an upstream block end-to-end yourself in that session (no cross-repo handoff)
- do: Upstream defect (`hexa`/`hexa-lang`/`demiurge` etc — **all dancinlab repos = your write access**) → **in that session**: clone/worktree, fix cause, verify via CI, **`sidecar pr-cycle` merge there**, resume. ING = `↩resume …` in **my repo**. High-risk substrate (codegen·runtime·toolchain) → isolated worktree; STOP on concurrency
- dont: **Offloading the fix to upstream (hexa-lang) — forbidden** · cross-repo handoff to another session/person · "it's upstream" excuse · wrapper/shadow/fork/monkey-patch cover · fixed-but-unmerged. (ING `--to` dropped)

## release-tag-ci — release via tag → CI deploy
- do: A repo with release artifacts gets a semver tag (`vX.Y.Z`) on verified main → `release.yml` (CI) builds per-target·uploads a GitHub release · (optional) edge prerelease on each main push
- dont: Haphazard manual version bump/tag · tagging an unverified commit · local manual build→manual upload · merging but not releasing

## pi5-akida-anima — Pi5-Akida is anima-only
- do: Use Raspberry Pi 5 + the Akida neuromorphic chip (`pi5-akida`) only in the anima neuromorphic experiment context
- dont: Registering it in the shared `pool` roster · repurposing it for general build/bench/CI/GPU substitution · reassigning it

## allgreen-promote — multi-target goes stable only when all-green
- do: Multi-target (OS·arch) stable promote only when all release jobs + install smoke GREEN (`finalize` gated on all `needs:` flips Latest) · soak experiments on edge · enforced by `release.yml` (CI)
- dont: Publishing a partial release as stable Latest · promoting on one target's green · per-target jobs each doing `make_latest`

## reference-match — match an equivalent reimpl against the reference
- do: If reference open (open-source·public spec·observable) match directly — read source/spec (file:line)→dump→1:1 compare→align first divergence · after parity name 1+ transcend axis · record residuals
- dont: Black-box guessing by shaking inputs/flags toward a target (when the reference is open) · stopping at parity · force-fitting fudge

## wire-to-prod — "done" means wired into production
- do: implement → wire into prod call path → QA on top = done · if unwired, label output `구현됨·미배선(dead until wired)` + wiring follow-on ID · wiring↔design SSOT lockstep · add a wiring gate if enforcer
- dont: Calling dead code only invoked by bench/tests "done" · unit-testing an unwired function and saying "done" · wiring it but not updating the design doc (drift)

## canonical-naming — one canonical name, no version suffix
- do: One canonical native name per ecosystem for files·folders · update-in-place · true versioning (public API `v1/`/`v2/`) justified with the `@canonical-ok` marker
- dont: Baking history into filenames — `_v2`·`_final`·`_copy`·`_new`·`_old`·`_orig`·`_bak`·`_draft`·`_fix`·`_wip`·`foo 2`·`foo(1)` (history lives in git)

## native-canonical-first — native·canonical way first (improve violations on sight)
- do: When implementing **prefer the ecosystem·platform·language·tool's native·canonical way** — use standard primitives/builtins/idioms · hand-roll only if no native path (`reference-match`) · on finding a **bespoke native-bypass, fix on the spot** (surgical · don't bury)
- dont: Reinvent when a native primitive exists · needless wrapper/shim/shadow/monkey-patch/fork on canonical path · leaving a non-std bypass that "works" (not improved) · native-avoid w/o `@root-cause-ok`

## tool-self-report — ask the tool about its own capabilities
- do: Check a tool's subsystems·capabilities·accel (GPU)·build·version via the tool itself (`<tool> --help`/status; e.g. hexa GPU = `hexa gpu`) · keep self-report in lockstep on release/CLI update
- dont: Guessing from stale docs·memory · inferring cross-repo capability from a repo-internal README/ARCHITECTURE (invisible outside that repo)

## fanout-workflow — many concurrent fan-outs via Workflow
- do: When fanning independent work out to many subagents at once (≥3 concurrent · `fleet`/`abg`/`gap full`) use one `Workflow` tool call (concurrency cap+queuing + shared token budget)
- dont: Firing N direct `Agent` calls in one message (instant rate-limit death) (exception: a single one-off agent · `afg` sequential)
