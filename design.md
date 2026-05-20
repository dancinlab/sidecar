# Design

> Step-by-step decision gate audit trail. One decision per gate, never batched. See `/wilson-decision-gate sample` for the full convention.

---

## Decisions

### Decision 1 — B — 플러그인별 동반 skill 감사 (20개 전수 리뷰, hook이 강제하는 걸 skill이 설명)
- **picked**: B — 플러그인별 동반 skill 감사 (20개 전수 리뷰, hook이 강제하는 걸 skill이 설명)
- **rationale**:
  - 사용자 명시 요구('플러그인 하나하나 검토')를 직접 반영 — 전수 감사가 본인 의도
  - enforce↔explain 짝을 가드별로 완성 → 커버리지 최대, 각 hook의 '왜'가 skill로 노출돼 오탐 시 사용자 이해를 도움
  - 트레이드오프 감수: 표면 ~20배
  - 정체성 희석 리스크 → 단계별 게이트로 '어느 플러그인이 skill을 받을지' 개별 결정해 희석 통제
  - A(집중형) 대비: 단일 워크플로 skill로는 커버 못 하는 플러그인별 맥락(secret-guard
  - dangerous-path 등)을 각자 설명 가능

### Decision 2 — A — enforce→explain 갭만 (deny-guard군 ~7개에만 동반 skill)
- **picked**: A — enforce→explain 갭만 (deny-guard군 ~7개에만 동반 skill)
- **rationale**:
  - skill 본질 가치 = 모델이 미리 알면 차단을 안 당함 — deny-guard군이 정확히 그 갭(복구 턴 낭비 예방)
  - 순수 컨텍스트 주입군(ssot
  - prefs
  - output-trim)은 이미 수동 주입돼 skill 중복 — B(무차별 20)는 노이즈
  - Decision 1에서 감수한 '희석 통제'의 구체적 척도 = 원칙 있는 필터 ~7 vs 무차별 20
  - C(워크플로군) 대비 워크플로는 commands로 일부 노출 중 — 갭 더 큰 쪽은 deny-guard(설명 0)

### Decision 3 — A — 구조 템플릿만 차용 (frontmatter+섹션 골격만, 본문 100% wilson 가드 맥락 자작)
- **picked**: A — 구조 템플릿만 차용 (frontmatter+섹션 골격만, 본문 100% wilson 가드 맥락 자작)
- **rationale**:
  - sidecar 핵심 자산은 'wilson에서 검증된 가드 이식' 계보 — addyosmani 본문 적응(B)은 그 서사 약화, 우리 skill은 가드의 왜를 말해야 함
  - 라이선스
  - attribution
  - upstream 드리프트 부담 0 — standalone-port 원칙(외부 의존 0)과 일관
  - 구조(name+description
  - When to Use
  - 게이트 ASCII)는 사실상 CC skill 표준 — 차용해도 차별화 손실 0
  - 트레이드오프 감수: 본문 노동 큼 → 후보별 범위 축소로 상쇄

### Decision 4 — A — 별도 신규 wilson-sdlc skills 플러그인 (Spec→Ship, D2 불변·가산)
- **picked**: A — 별도 신규 wilson-sdlc skills 플러그인 (Spec→Ship, D2 불변·가산)
- **rationale**:
  - SDLC는 연결된 7단계 내러티브 — B(기존 분산)는 파이프라인 파편화
  - D3=A 차용할 addyosmani 단일 워크플로 구조 깨짐
  - Decision 2=A 감사 온전 — 가산이지 번복 아님, 깔끔한 audit trail
  - sidecar 최강 메타 서사 일치 'worktree→PR→decision-gate로 자기를 만든 에이전트' — wilson-sdlc=그 도그푸딩을 가르침=프로덕션 검증 계보 주장 그 자체
  - 트레이드오프 감수: 신규 플러그인 +1 — 응집
  - 격리돼 리뷰 용이

### Decision 5 — A — Spec 스테이지를 wilson 프리미티브에 매핑 (design.md + wilson-decision-gate + AGENTS.md SSOT)
- **picked**: A — Spec 스테이지를 wilson 프리미티브에 매핑 (design.md + wilson-decision-gate + AGENTS.md SSOT)
- **rationale**:
  - sidecar 논지=통합 가드레일 — 기존 decision-gate+design.md 재사용이 '시스템' 신호 최강, 지금 이 walk 자체가 라이브 증거
  - D3=A 본문=wilson 실제 메커니즘(design.md+decision-gate)이 진짜 도그푸딩
  - GROWTH §1 메타 서사
  - 얇은 skill=본문 노동
  - 드리프트 최소, 인프라 중복 대신 canonical 지시
  - 트레이드오프: decision-gate 결합(disabled면 inert) → 'plain design.md' fallback 한 줄로 완화

### Decision 6 — A — Plan 스테이지를 wilson task 툴 + wilson-goal에 매핑
- **picked**: A — Plan 스테이지를 wilson task 툴 + wilson-goal에 매핑
- **rationale**:
  - D5=A와 일관된 프리미티브 매핑 노선 — 파이프라인 전체 동일 철학이어야 응집
  - 재사용 대상 이미 출하(TaskCreate 내장 + wilson-goal) — 이 walk를 TaskCreate로 분해한 게 라이브 도그푸딩
  - 얇은 skill
  - 본문 노동 최소, wilson-goal '목표 compaction 너머 영속'이 generic엔 없는 차별점
  - 트레이드오프: wilson-goal 결합(disabled면 inert) → fallback 한 줄 완화

### Decision 7 — A — Build 스테이지를 wilson-checkpoint에 매핑
- **picked**: A — Build 스테이지를 wilson-checkpoint에 매핑
- **rationale**:
  - D5
  - D6=A와 같은 프리미티브 매핑 노선 — 3단계 연속 동일 철학, 응집
  - 재사용 대상이 GROWTH §1 히어로 웨지(checkpoint 한도/크래시 무손실) — generic Build엔 없는 차별 자산
  - 얇은 skill
  - 본문 노동 최소
  - 트레이드오프: wilson-checkpoint 결합 disabled면 inert → fallback 한 줄 완화

### Decision 8 — B — Test & Recover 결합 스테이지 (debugging-and-error-recovery 구조 + wilson-pool 본문, D15 통합)
- **picked**: B — Test & Recover 결합 스테이지 (debugging-and-error-recovery 구조 + wilson-pool 본문, D15 통합)
- **rationale**:
  - D3=A는 addyosmani 구조 차용 전제 — test엔 구조 없고 debugging-and-error-recovery만 실재('테스트 실패 시 사용' 명시), B만 D3 위배 안 함
  - D8↔D15 중복(debugging 두 트랙 등장) 자연 해소 — skill 1개
  - 중복 0
  - wilson 본문 살아있음: heavy test wilson-pool 라우팅 → 실패 시 근본원인 = pool 재사용+복구 결합
  - 트레이드오프: 배지 Test→Test&Recover 이미지와 미세 어긋남 — 소스 없는 얇은 test-only보다 정직

### Decision 9 — B — 독립 Review skill (addyosmani 5축 + wilson decision-conformance 6번째 축)
- **picked**: B — 독립 Review skill (addyosmani 5축 + wilson decision-conformance 6번째 축)
- **rationale**:
  - Review는 매핑할 wilson 프리미티브가 처음으로 부재 — 억지 매핑은 confirmation theatre, 정직하게 노선 전환
  - D3=A가 승인한 케이스 — addyosmani code-review-and-quality 5축(correctness
  - readability
  - architecture
  - security
  - performance)은 재사용 가치 큰 구체 골격
  - wilson 차별점 유지 — 6번째 축 decision-conformance가 diff를 design.md 결정과 대조해 Review를 decision-gate 감사추적과 연결
  - 트레이드오프 감수: 독립 skill은 본문 노동 큼 — 7단계 중 자기 본문을 가질 자격 있는 유일 스테이지라 수용

### Decision 10 — A — Simplify를 내장 /simplify 시퀀싱 + design.md 대조로
- **picked**: A — Simplify를 내장 /simplify 시퀀싱 + design.md 대조로
- **rationale**:
  - 내장 /simplify는 Anthropic 관리 — B(복제)는 no-redundancy
  - simplicity 위배 + upstream 드리프트
  - A도 배지값 함 — 내장 실행 후 단순화가 design.md 결정 안 깼나 검증, D9 6번째 축과 같은 decision-conformance 시그니처 연속
  - D3=A 본문 노동 최소 — 가장 얇은 skill, 유지되는 의존에 기댐
  - 트레이드오프: CC 내장 결합(rename 시 부패) → 안정 번들이라 저위험
  - 수동 리뷰로 우아 degrade

### Decision 11 — B — 독립 Ship skill (addyosmani shipping-and-launch 구조 + wilson 도그푸딩 출고 체크리스트)
- **picked**: B — 독립 Ship skill (addyosmani shipping-and-launch 구조 + wilson 도그푸딩 출고 체크리스트)
- **rationale**:
  - D9(Review)처럼 ship에 대응하는 단일 wilson plugin 부재 — version/marketplace.json/§10/commit은 다단계 규약, 독립 skill이 정직한 fit
  - D3=A — addyosmani pre-launch 체크리스트 골격 차용 + wilson 본문=이 프로젝트 실제 출고 절차(Task #5)
  - 도그푸딩 진정성 최고 — Ship skill을 ship하는 절차가 곧 본문, GROWTH §1 메타 서사 루프 완결
  - 트레이드오프: 독립=본문 노동 — Review
  - Ship 둘만 plugin 프리미티브 없어 본문 가질 자격, GROWTH 런치는 soft ref

### Decision 12 — 단일 공유 security 동반 skill (secret-guard·dangerous-path·bash-guard 통합)
- **picked**: 단일 공유 security 동반 skill (secret-guard·dangerous-path·bash-guard 통합)
- **rationale**:
  - 3 가드는 하나의 위협면(시크릿·시스템경로·파괴셸) — addyosmani security-and-hardening도 단일 skill, 쪼개면 중복
  - D2=A enforce→explain — hook 차단 전 규약 선교육해 복구 턴 절약
  - D3=A 구조 차용 + 본문=각 가드 트리거 회피법(wilson 고유 ~/.ssh·.env·rm -rf 패턴)
  - 트레이드오프: 3 plugin이 1 skill 공유 — 응집 위협면이라 수용

### Decision 13 — git-guard 동반 skill (안전 git 규약 선교육)
- **picked**: git-guard 동반 skill (안전 git 규약 선교육)
- **rationale**:
  - git-guard 강제 규약(main force-push·hook skip·destructive reset 금지)을 skill이 선교육 = enforce→explain
  - D3=A addyosmani git-workflow-and-versioning 구조 차용 + wilson 본문
  - 단일 가드 단일 skill — 위협면 1:1
  - 트레이드오프: 본문 노동 — git-guard 차단 빈도 높아 ROI 큼

### Decision 14 — 단일 docs-convention 동반 skill (readme-format + guards/domain-lint 통합)
- **picked**: 단일 docs-convention 동반 skill (readme-format + guards/domain-lint 통합)
- **rationale**:
  - readme-format 안티패턴 + domain-lint 로드맵 구조는 하나의 문서 규약면 — addyosmani documentation-and-adrs 단일 skill과 정합
  - D2=A enforce→explain — README/UPPERCASE.md 작성 전 선교육
  - D3=A 구조 차용 + 본문=wilson 문서 규약(7초룰·Head+---+##Log)
  - 트레이드오프: 2 plugin 1 skill 공유 — 응집 규약면

### Decision 15 — wilson-checkpoint last_user_prompt() — transcript tail-only read (<=2 MiB), not whole-file
- **picked**: wilson-checkpoint last_user_prompt() — transcript tail-only read (<=2 MiB), not whole-file
- **rationale**:
  - real cause = CC built-in Stop-evaluator prompt overflow (harness scope) — sidecar code cannot remove the error itself, honest scope limit
  - Stop hook's per-turn full readlines() of a 14 MB transcript IS our code — bound it to an O(1) tail (<=2 MiB) regardless of session size
  - measured on real 14.4 MB transcript: identical result ('ok go'), I/O 3x lower (19.2->6.1 ms), small/missing/empty edges regression-free — surgical, behavior-preserving

### Decision 16 — B — wilson-pool injection mirrors the wilson-prefs cadence (full block on SessionStart/PreCompact/PostCompact + every Nth UserPromptSubmit; not every turn)
- **picked**: B — wilson-pool injection mirrors the wilson-prefs cadence (full block on SessionStart/PreCompact/PostCompact + every Nth UserPromptSubmit; not every turn)
- **rationale**:
  - audit-measured: wilson-pool re-injected the full ## Pool block on EVERY UserPromptSubmit with zero dedupe/cadence -> ~22.5k tok/long-session (53% of all plugin injection overhead)
  - wilson-prefs already proves the pattern in-repo via _should_full() — mirror a verified mechanism instead of inventing one
  - the Pool routing facts are static (roster, mirror-workdir rule) so re-sending every turn is purely multiplicative waste, while a periodic refresh keeps them from fading across long sessions/compactions

### Decision 17 — Option 1 — off-turn UserPromptSubmit emits a 1-line safety guard (routing + sync caveat); full ## Pool block only on SessionStart/PreCompact/PostCompact + every Nth UserPromptSubmit
- **picked**: Option 1 — off-turn UserPromptSubmit emits a 1-line safety guard (routing + sync caveat); full ## Pool block only on SessionStart/PreCompact/PostCompact + every Nth UserPromptSubmit
- **rationale**:
  - faithful mirror of wilson-prefs cadence — prefs never goes fully silent on off-turns (compact directives stay; only heavy style body is gated). Same shape = predictable + already-trusted
  - the sync caveat ('local edits not visible remotely until synced') is a correctness guard, not info — forgetting it causes silent stale-source remote builds, so it must stay every turn
  - token delta of keeping ~40 tok/turn is trivial vs the ~150 tok/turn we're removing — Option-2's extra savings cannot justify reintroducing a silent correctness hazard
  - only genuinely informational content (roster details, host-selection rule, mirror-workdir explanation) gets cadence-gated — gating exactly what should be gated

### Decision 18 — Option A — introduce plugins/wilson-pool/samples/pool.md (+ language variants) and inline it as the full_block() body on SessionStart/PreCompact/PostCompact + every Nth UserPromptSubmit; off-turn keeps the 1-line safety guard from 0.5.0
- **picked**: Option A — introduce plugins/wilson-pool/samples/pool.md (+ language variants) and inline it as the full_block() body on SessionStart/PreCompact/PostCompact + every Nth UserPromptSubmit; off-turn keeps the 1-line safety guard from 0.5.0
- **rationale**:
  - user explicitly cited friendly.md and step-by-step-decision-gate.md as the target shape — this is the canonical wilson-plugin sample pattern, B and C reject that intent
  - the routing-mechanism details that should live in the full body (heavy-command classification, autosync modes, platform-routing rule, sync caveat rationale) are exactly the questions where current 4-bullet hardcoded body fails the model — a long-form canonical reference solves it at the source
  - A reuses the _should_full() cadence ALREADY shipped in wilson-pool 0.5.0 (and proven in wilson-prefs) — incremental surface = sample file + 4-line patch to full_block() to read it. Lowest cost / highest alignment with repo conventions
  - B's SessionStart-only inject was explicitly rejected by both wilson-prefs and wilson-decision-gate (PostCompact full-refresh is the strictly-stronger path) — adopting it here would re-introduce a fade-out failure mode those plugins already designed away

### Decision 19 — Option A — pool.md adopts the 8-section full pattern (~5 KB): head/activation, in-scope (heavy classification), out-of-scope, routing mechanism, host selection, workdir modes (auto/explicit/autosync), sync caveat as correctness guard, counter-example
- **picked**: Option A — pool.md adopts the 8-section full pattern (~5 KB): head/activation, in-scope (heavy classification), out-of-scope, routing mechanism, host selection, workdir modes (auto/explicit/autosync), sync caveat as correctness guard, counter-example
- **rationale**:
  - matches the natural size of the two repo precedents (friendly.md 5.3 KB / step-by-step-decision-gate.md 6.7 KB) — 5 KB sits in the centre of established wilson-plugin sample sizing
  - Option B (core-only ~2.5 KB) would drop host-selection / autosync / workdir-mode detail — the exact routing-decision detail the 4-bullet body fails at today, so it defeats the very motivation for introducing sample.md
  - Option C (~7 KB with companion-plugin relations + worked routing trace) overshoots wilson-pool's nature: it is a mechanism tool not a governance principle, and a worked routing trace is inappropriate content for static inject context

### Decision 20 — Option A — remove PreCompact hook entry from both wilson-prefs/hooks.json and wilson-pool/hooks.json (no emit on PreCompact); SessionStart + UserPromptSubmit + PostCompact remain the cadence surface
- **picked**: Option A — remove PreCompact hook entry from both wilson-prefs/hooks.json and wilson-pool/hooks.json (no emit on PreCompact); SessionStart + UserPromptSubmit + PostCompact remain the cadence surface
- **rationale**:
  - wilson-prefs source-of-truth comment explicitly labels PreCompact 'belt-and-suspenders insurance' with PostCompact as 'strictly stronger' — author intent and measured behavior align
  - 'cheap insurance' was inaccurate — measured cost is ~6,062 tok/session for wilson-prefs and ~8,162 tok/session for wilson-pool, identical to the PostCompact full-body cost it duplicates (total ~14,224 tok/session of pure redundancy)
  - Option B (hook entry retained but emit-free) leaves a registered hook with zero current emit value and no future placeholder rationale — A removes the entry cleanly, simpler code/config surface to explain
  - applying to both plugins simultaneously preserves cadence-shape symmetry across wilson-* plugins (SS + UPS + PostCompact triple) — sets the canonical cadence reference for any new sample-inlining plugin

### Decision 21 — Option A — three plugins (wilson-decision-gate, wilson-prefs, wilson-pool) skip full-body inject when SessionStart payload carries source=compact; PostCompact owns the post-compaction full-body reload; SessionStarts other sources (startup/resume/clear) unchanged
- **picked**: Option A — three plugins (wilson-decision-gate, wilson-prefs, wilson-pool) skip full-body inject when SessionStart payload carries source=compact; PostCompact owns the post-compaction full-body reload; SessionStarts other sources (startup/resume/clear) unchanged
- **rationale**:
  - official CC docs define PostCompact as After context compaction completes and SessionStart as When a session begins or resumes — A maps each event to its precise semantic owner instead of duplicating the post-compaction reload across both
  - wilson-prefs and wilson-pool source comments already describe PostCompact as landing in the clean post-summary context with rules guaranteed present — Option A reflects that documented intent in code, Option B would remove the strictly-cleaner path that D20 explicitly preserved
  - measured savings about 14101 tok per 120-turn session across the three plugins (DG -1598 / prefs -4079 / pool -8424) — comparable to D20, addresses the largest remaining audit residue
  - identical 4-5 line patch in all three plugins establishes the canonical SS plus PostCompact cadence reference for any future wilson-* plugin that inlines a sample body

### Decision 22 — Option B — wilson-prefs default refresh_every: 25 -> 10 (full body refreshes 2.5x more often; UPS 1-line directive unchanged on off-turns)
- **picked**: Option B — wilson-prefs default refresh_every: 25 -> 10 (full body refreshes 2.5x more often; UPS 1-line directive unchanged on off-turns)
- **rationale**:
  - user reports friendly-style drift was pre-existing — default 25 is the structural cause, not the recent token-audit work (cadence has been sparse since the original cadence was introduced)
  - Option A (25->5) would refund half of D20+D21 savings and overshoots the symptom — user observed drift not zero-tolerance fidelity, average fade window of 5 turns under B is short enough to be invisible
  - Option C (richer short directive) injects keywords without the full 7-element pattern body — partial reminder cannot restore the exact ASCII/analogy/icon discipline the full body encodes, mitigates drift but does not solve it
  - measured cost ~3000 tok per long session vs the ~7800 tok of Option A — sits at the balance point where drift becomes visually rare while token reclaim from D17-D21 stays mostly intact

### Decision 23 — Option A — extract universal style rules (emoji 3-tier enum, acronym first-use, language-tracking) into styles/_common.md (+ 4 language variants) and concat with the active style body at inject time; friendly.{md,ko,ja,zh,ru}.md keep only friendly-specific sections (Tier-A scope, 7-element pattern, measurement axes, counter-example)
- **picked**: Option A — extract universal style rules (emoji 3-tier enum, acronym first-use, language-tracking) into styles/_common.md (+ 4 language variants) and concat with the active style body at inject time; friendly.{md,ko,ja,zh,ru}.md keep only friendly-specific sections (Tier-A scope, 7-element pattern, measurement axes, counter-example)
- **rationale**:
  - user explicitly cited two candidate forms (separate code or shared md) and the md form aligns with wilsons data-first convention (prefs.json, samples, style bodies all already md — sharing the same hand-edit surface)
  - existing language-variant resolver pattern is reused as-is (cands = [<DATA>/styles/X.<lang>.md, <ROOT>/styles/X.<lang>.md, <DATA>/styles/X.md, <ROOT>/styles/X.md]) — _common just becomes another X in that loop, so _inject.py grows ~10 lines of concat glue and zero new resolution complexity
  - adding a future style (terse / narrative / teaching) becomes a single file authored, not 5 (canonical + 4 language variants) where each repeats the same emoji-enum and acronym tables — eliminates the synchronisation-drift failure mode the current 5-fold duplication is exposed to
  - honest non-goal — runtime token cost is unchanged (only the active style body is injected, common or not) — this refactor is for maintainability and consistency, not for D17-D22 style token reclaim

### Decision 24 — Option A — new wilson-resume plugin owns the progress-narrative layer only ("goal X · N/M steps done · next: ..."); file-state resume stays wilson-checkpoint's job (no stash duplication)
- **picked**: Option A — new wilson-resume plugin owns the progress-narrative layer only ("goal X · N/M steps done · next: ..."); file-state resume stays wilson-checkpoint's job (no stash duplication)
- **rationale**:
  - the whole repo is designed one-plugin-one-concern (Decisions 1-14 split guards individually) — checkpoint=files / goal=objective / resume=narrative lands exactly on that principle, whereas B and C blur it
  - wilson-checkpoint already ships verified uncommitted-stash logic — Option B would parse/surface checkpoint's output line and couple wilson-resume to checkpoint's internal format, so a checkpoint change silently breaks resume
  - Option C's minimal file-capture sounds like the zero-dependency standalone-port rule but actually means two plugins create the same stash and collide — wilson-goal's own precedent (D5/D6) is to degrade to a one-line fallback when a companion is absent, never to duplicate its function; Option A still runs standalone (narrative only) when checkpoint is absent, so it complements rather than depends

### Decision 25 — Option A — wilson-resume captures progress automatically by reading CC's on-disk TodoWrite checklist; no model-facing slash command; degrades to git/transcript signals when a session used no todos
- **picked**: Option A — wilson-resume captures progress automatically by reading CC's on-disk TodoWrite checklist (verified: ~/.claude/todos/<session-id>-agent-<agent-id>.json, JSON array of {content,status,activeForm} with status in pending|in_progress|completed); no model-facing slash command; degrades to git diff-stat + last-user-prompt from transcript tail when a session used no todos
- **rationale**:
  - principle 1 (ai-native) — deterministic dispatch over LLM guesswork: A reads an artifact CC already maintains (the model's own checklist with per-item status), B/C make progress fidelity depend on the model remembering to self-report
  - B's model self-report is exactly the drift failure mode wilson-prefs spent D22 on — sparse voluntary updates fade, and a resume briefing built on a stale self-report is worse than none (false confidence)
  - A adds zero model-facing surface — no slash command to teach, no PROGRESS.md convention; capture is a free side-effect of normal TodoWrite usage. C's optional note path re-introduces a voluntary mechanism used inconsistently
  - honest degradation — a session that used no todos still yields a coarse but useful "last activity" briefing from deterministic git diff-stat + the last user prompt read from the transcript tail (bounded read, per D15)

### Decision 26 — Option A — capture on Stop every turn (snapshot resume.json) + SessionEnd writes a clean-exit flag; re-inject on SessionStart{startup,resume,clear}; no PreCompact, no compact source
- **picked**: Option A — capture on Stop every turn (snapshot resume.json) + SessionEnd writes a clean-exit flag; re-inject on SessionStart with source in {startup,resume,clear}; no PreCompact hook, compact source excluded from re-inject
- **rationale**:
  - a crash / usage-limit / rate-limit kill never fires SessionEnd — only a per-turn Stop capture preserves the last completed turn; Option B loses exactly that case and contradicts the plugin's purpose
  - the SessionEnd hook here is NOT the redundant re-emit belt D20 removed — it emits no body, it writes one distinct signal (clean-exit flag) that lets the next session's briefing tell "clean exit" from "abrupt interrupt", which the user explicitly framed the problem around (limit/rate-limit/crash)
  - PreCompact is excluded on both grounds — D20 precedent + compaction is same-session so todos stay in-context; for the same reason source=compact is excluded from re-inject (PostCompact territory), leaving {startup,resume,clear}
  - cost over Option C is only a ~10-line SessionEnd hook flipping one boolean, buying an accurate clean-vs-crash briefing tone

### Decision 27 — Option B — wilson-resume injects a progress-only block; the goal line stays wilson-goal's own SessionStart block (no goal-text duplication); resume state stored per-project at <DATA>/<sha1(cwd)[:12]>.json
- **picked**: Option B — wilson-resume injects a progress-only block; the goal line stays wilson-goal's own SessionStart block (no goal-text duplication, no code import); resume state stored per-project at ~/.claude/plugin-data/wilson-resume/<sha1(cwd)[:12]>.json
- **rationale**:
  - D24 already fixed "resume owns the narrative only, never reaches into other plugins" — B is the natural consequence; A and C partially reverse D24
  - wilson-goal already emits a ## Goal block on SessionStart — A would make wilson-resume print the goal text too, putting the goal on screen twice, exactly the duplication D17-D21 removed repo-wide
  - B's two blocks are complementary not redundant — wilson-goal = "what (destination)", wilson-resume = "where (current position)"; adjacent on SessionStart, zero coupling
  - honest degradation — with wilson-goal absent there is no goal block, but wilson-resume's todo contents carry their own context, so the briefing still stands alone; storage is per-project (resume state is inherently project-scoped, unlike wilson-goal's single global goal)

### Decision 28 — Decision 1: /gap 전략 축 = A안 큐레이션 분류 — hive state/*_audit 100개 중 범용 사고 렌즈 ~40개를 8개 가족으로 묶은 전략 지도
- **picked**: Decision 1: /gap 전략 축 = A안 큐레이션 분류 — hive state/*_audit 100개 중 범용 사고 렌즈 ~40개를 8개 가족으로 묶은 전략 지도
- **rationale**:
  - 사용자 요청이 '모든' 전략 방향이라 C안(핵심12개) 탈락 — 누락 불가
  - B안(100개 평면)은 100개 중 ~60개가 hive 전용 배관(oauth_slot/nexus_kick 등)이라 신규 프로젝트에서 신호 대 잡음 붕괴
  - A안은 범용 렌즈만 8가족으로 묶어 fan-out 병렬화 단위를 동시 확보 + wilson domain-meta-domain 분류 원칙과 정합
  - hive 자신이 raw_taxonomy_audit 분류 축을 보유 — A안은 hive 방법론을 hive에 적용하는 self-consistent 선택

### Decision 29 — course correction — wilson-resume repurposed as the persistence + re-arm companion for Claude Code's NATIVE /goal command; supersedes the TodoWrite-progress design of D24/D25/D27
- **picked**: course correction — wilson-resume is repurposed as the persistence + re-arm companion for Claude Code's NATIVE `/goal` command (CC v2.1.139+): it captures the `/goal` completion condition from the transcript and re-surfaces it on SessionStart. Supersedes the TodoWrite-progress-narrative design of D24/D25/D27 (D26's Stop-capture trigger kept; SessionEnd dropped)
- **rationale**:
  - the user clarified the target is CC's *native* `/goal` (a real built-in command — verified via the claude-code-guide agent), not the wilson-goal plugin; native `/goal` is session-scoped with NO disk persistence, so a hard interruption (crash / usage limit / a closed terminal never cleanly `--resume`d) loses the completion condition entirely — that is the gap the user calls the "보조 톱니바퀴"
  - the D24/D25/D27 design tracked the TodoWrite checklist as a generic resume narrative — adjacent to `/goal` but not a `/goal` companion; the user explicitly wants a cog that meshes with `/goal` specifically and is inert when no goal is set
  - capture stays deterministic — a native `/goal` appears in the transcript as a user message `<command-name>/goal</command-name>` + `<command-args>CONDITION</command-args>` (verified against real transcripts); wilson-resume reads the most recent one, persists it (a bare `/goal` with empty args = clear → drop state), and re-injects it on SessionStart{startup,clear} as a `/goal <condition>` re-arm directive — the persist+re-inject pattern wilson-goal already proves, which is the "wilson-goal 참고" the user pointed at
  - `resume`/`compact` SessionStart sources are excluded — native `/goal` already carries over a `--resume`d session and compaction is same-session, so re-arm is only needed on a fresh `startup` or after `/clear`

### Decision 30 — Decision 2: /gap 실행 방식 = C(트리아지 후 심화)가 기본 + A(전면 fan-out)는 선택 옵션 — 40개 축을 각각 한 줄 전략으로 뽑아 공통 카탈로그로 두고, C는 인라인 트리아지 후 히트 가족만 심화 subagent, A는 8가족 전부 fan-out
- **picked**: Decision 2: /gap 실행 방식 = C(트리아지 후 심화)가 기본 + A(전면 fan-out)는 선택 옵션 — 40개 축을 각각 한 줄 전략으로 뽑아 공통 카탈로그로 두고, C는 인라인 트리아지 후 히트 가족만 심화 subagent, A는 8가족 전부 fan-out
- **rationale**:
  - C 기본: 현재 대화 맥락을 그대로 쓰는 인라인 트리아지라 정확
  - 저렴하고, 진짜 gap이 잡힌 가족만 심화해 비용을 한정
  - A는 옵션으로 보존: 사용자가 트리아지를 건너뛰고 전 가족을 무조건 깊게 훑고 싶을 때 선택 가능
  - 공통 substrate는 40개 '한 줄 전략' 카탈로그 — C도 A도 같은 one-liner 목록을 소비하므로 모드만 갈리고 전략 집합은 단일 SSOT
  - B(인라인 1-pass)는 별도 모드로 채택 안 함 — 트리아지 단계가 곧 B의 상위호환이라 중복

### Decision 31 — Decision 3: /gap CLI = A안 단일 커맨드 + 인자 — /gap(맨몸)→C 직행, /gap full→A 전면 fan-out, /gap <텍스트>→범위 한정 C, /gap list→40 한줄전략 카탈로그 출력
- **picked**: Decision 3: /gap CLI = A안 단일 커맨드 + 인자 — /gap(맨몸)→C 직행, /gap full→A 전면 fan-out, /gap <텍스트>→범위 한정 C, /gap list→40 한줄전략 카탈로그 출력
- **rationale**:
  - 사용자가 명시한 '/gap 맨몸→C 직행, /gap <...> 인자형'과 1:1 일치
  - 기존 sidecar 커맨드(wilson-gpu/decision-gate/pool)가 전부 단일 커맨드+argument-hint 패턴 — 마켓플레이스 일관성 유지
  - '모든 걸 한 줄 전략으로 뽑아둔다' 요청은 /gap list 진입점으로 자연 흡수
  - 모드가 늘어도 커맨드 파일은 1개 고정 — B안은 모드마다 새 커맨드

### Decision 32 — Option A — the "예측보다 측정" / instrument-first methodology ships as a new standalone plugin (a fire-gate), NOT as a mode inside wilson-decision-gate
- **picked**: Option A — the instrument-first ("예측보다 측정") methodology ships as a new standalone plugin — a measurement-specialized fire-gate that injects the instrument-first principle and owns a `### Fire-decision N` ledger in design.md — rather than as a mode folded into wilson-decision-gate
- **rationale**:
  - the whole repo is one-plugin-one-concern (Decisions 1-14, D24) — instrument-first is its own distinct methodology (it currently lives as a standalone feedback memory), not a sub-feature of generic step-by-step gating; folding it into wilson-decision-gate dilutes that plugin's single concern
  - the trigger surfaces differ — wilson-decision-gate reacts to *any* multi-decision branch point, the fire-gate reacts specifically to a measure-vs-predict fork (narrower, domain-specific); separate plugins let each be toggled and tuned independently via `/sidecar`
  - wilson-decision-gate already ships stable at 0.2.1 — extending it risks regressing a working plugin, whereas a standalone plugin is additive, isolated and reviewable (the same reasoning as D4 keeping wilson-sdlc separate)
  - naming honesty — `wilson-decision-gate` is a *generic* gate; a measurement-specific principle hidden inside it is a surprise. A separately named plugin is self-describing

### Decision 33 — Option A — the plugin is named `wilson-fire-gate` and unifies on the "fire" vocabulary across name, principle body and ledger
- **picked**: Option A — plugin name `wilson-fire-gate`; the "fire" vocabulary (a *fire* = executing one real measurement instead of predicting its outcome) is used consistently across the plugin name, the injected principle body and the `### Fire-decision N` ledger
- **rationale**:
  - the user consistently says "fire" / "fire-게이트" / "Fire-decision N" — that vocabulary is their mental model, so matching the plugin to it is zero-friction
  - the ledger header is already fixed at `### Fire-decision N`; naming the plugin `fire` too keeps plugin + body + ledger coherent on one word, where Option B would split the plugin name from the ledger term
  - "fire" being opaque to a fresh marketplace user is resolved by the friendly first-use-definition rule — the principle body defines it once ("a fire = run a real measurement instead of predicting") and the plugin description states it
  - sidecar plugin names already use ecosystem vocabulary verbatim — `wilson-pool` ("pool" = host roster), `wilson-tape-recorder` ("tape" = the .tape format)

### Decision 34 — recommended (user delegated "추천방식으로 전부 선택") — the instrument-first principle ships as one focused English canonical sample file, no worked example
- **picked**: recommended — the instrument-first principle ships as a single focused English canonical sample at `plugins/wilson-fire-gate/samples/instrument-first.md`: the 4 tenets + the Fire-decision recording convention, no worked example. Injected on SessionStart + PostCompact; UserPromptSubmit adds a short reminder only on measurement/benchmark-looking prompts. Mechanism mirrors wilson-decision-gate
- **rationale**:
  - the methodology has 4 real tenets (faithful-predict-first; fire only when genuinely uncertain; never re-fire a result already determined by prior measurements; cost-no-object means "do not block a *needed* fire on cost", NOT "fire when the answer is already known") — a one-line block would lose the nuance, so a dedicated sample file is warranted
  - a worked example is excluded for the same reason D19 excluded a worked routing trace from wilson-pool's sample — worked examples bloat static inject context; the 4 tenets + the recording convention are the durable content
  - English-only for v0.1.0 matches the code/docs language pref and keeps the first release shippable fast — wilson-decision-gate's 5-language sample was a later maturation, not a v0.1.0 requirement; language variants can follow if wanted
  - the SessionStart + PostCompact cadence and the branch-point-only UserPromptSubmit reminder are the canonical wilson-* cadence already settled in D20/D21 — mirrored here rather than re-litigated

### Decision 35 — Decision 1: 스케쥴 플러그인 = A안 하루 일과 트래커, 단 실행 모델은 순차 커서가 아니라 background 병렬 subagent 위임 — add로 task 등록, '스케쥴 진행' 시 pending task 전부를 background 병렬 subagent로 fan-out, 완료 시 알림
- **picked**: Decision 1: 스케쥴 플러그인 = A안 하루 일과 트래커, 단 실행 모델은 순차 커서가 아니라 background 병렬 subagent 위임 — add로 task 등록, '스케쥴 진행' 시 pending task 전부를 background 병렬 subagent로 fan-out, 완료 시 알림
- **rationale**:
  - 사용자 명시: A안이되 순서대로가 아니라 subagent background 병렬 위임
  - 각 일과 항목은 독립 작업이므로 병렬 fan-out이 직렬 커서보다 wall-clock을 크게 단축
  - background 실행이라 '진행' 띄운 뒤 사용자는 다른 작업을 계속하고 완료 시 알림으로 수거
  - 내장 /schedule(원격 cron routine)과 구별 — 이건 로컬 task를 즉시 병렬 위임하는 실행기

### Decision 36 — Decision 2: 스케쥴 데이터 저장 = A안 글로벌 1개 목록 — ~/.claude/plugin-data/wilson-schedule/schedule.json 한 곳, 어느 repo에서든 같은 '하루 일과' 목록
- **picked**: Decision 2: 스케쥴 데이터 저장 = A안 글로벌 1개 목록 — ~/.claude/plugin-data/wilson-schedule/schedule.json 한 곳, 어느 repo에서든 같은 '하루 일과' 목록
- **rationale**:
  - 사용자 출발점이 '하루 일과' — 하루는 repo 경계와 무관한 나의 단위라 글로벌 1개 목록이 멘탈 모델
  - background 위임 task는 add 시 자유 텍스트로 들어오니 repo 필요 시 문장 안에 경로 명시 — 저장 위치를 쪼갤 이유 없음
  - 기존 wilson-goal이 글로벌 goal + 선택적 프로젝트 GOAL.md 패턴 — A안이 sidecar 관례와 일관
  - B안은 진행 시 '지금 어느 repo 목록?'이 헷갈려 하루 일과 트래커엔 과한 분절

### Decision 37 — Decision 3: 스케쥴 진행 디스패치 = A안 즉시 전량 fan-out — 진행 즉시 pending 전부를 background subagent로 launch, 각 에이전트 완료 시 해당 task 자동 done 처리 + 결과 수거
- **picked**: Decision 3: 스케쥴 진행 디스패치 = A안 즉시 전량 fan-out — 진행 즉시 pending 전부를 background subagent로 launch, 각 에이전트 완료 시 해당 task 자동 done 처리 + 결과 수거
- **rationale**:
  - 사용자 선택: 확인 없이 즉시 전량 fan-out
  - background 위임의 본질은 '맡기고 잊기' — 확인 단계가 그 흐름을 끊음
  - 자동 done + 결과 수거로 진행 직후 사용자 손이 떠남
  - 자원 가시성은 진행 직후 launch 요약(N개 띄움)으로 사후 1회 표시해 보완

### Decision 38 — confirmed — an active native /goal puts wilson-decision-gate and wilson-fire-gate into autonomy mode (record-and-proceed, not stop-and-wait); the conditional clause lives in each gate's injected principle text, no detection code
- **picked**: confirmed (via AskUserQuestion) — when Claude Code's native `/goal` is active, wilson-decision-gate and wilson-fire-gate switch from "stop and wait for the user's pick" to "adopt the recommendation, log it to the ledger, and continue". The clause is added to each gate's injected `PRINCIPLE_BASE` text; the model self-evaluates its own `/goal` state, so no goal-detection code is needed
- **rationale**:
  - root cause confirmed by the user — a native `/goal` ("keep working until the condition is met") directly conflicts with the gate principles ("stop at every decision/fire for a pick"); the goal stalls at the first gate, exactly the "골 입력해도 여기서 멈춤" symptom
  - the clause MUST live inside each gate's own principle — injecting it from a separate plugin would leave the gate principles still saying "always stop", a context contradiction; putting the conditional in the gate principle itself ("if /goal active → autonomy; else → wait") is the only contradiction-free shape
  - text-only, consistent with wilson-decision-gate's stated philosophy (a hook cannot enforce) — the model knows its own `/goal` state, so a text conditional needs zero detection code; strictly simpler than re-implementing wilson-resume's transcript /goal scan in two more plugins
  - autonomy mode removes only the deliberation pause, not the safety floor — PreToolUse safety guards (bash-guard, secret-guard, git-guard, dangerous-path) still fire, and the ledger still records every auto-adopted pick, so the audit trail stays intact and reviewable after the goal closes

### Decision 39 — Decision 4 (Decision 2 개정): 스케쥴 저장 = 글로벌 JSON 폐기 → 프로젝트 루트의 SCHEDULE.md 대문자 도메인 파일로 관리 (.git walk-up 루트, Head + --- + ## Log 규약, 태스크는 ## Log 하위 체크박스 불릿)
- **picked**: Decision 4 (Decision 2 개정): 스케쥴 저장 = 글로벌 JSON 폐기 → 프로젝트 루트의 SCHEDULE.md 대문자 도메인 파일로 관리 (.git walk-up 루트, Head + --- + ## Log 규약, 태스크는 ## Log 하위 체크박스 불릿)
- **rationale**:
  - 사용자 직접 지시: '루트의 대문자.md 로 스케쥴관리'
  - wilson domain-meta-domain 원칙(원칙 4)과 정합 — 도메인 = 루트 UPPERCASE.md 한 파일
  - 마크다운이라 사람이 직접 손으로 편집
  - 검토 가능 — JSON보다 투명
  - sidecar wilson-guards/domain-lint(루트 UPPERCASE.md = Head+---+##Log 강제)와 포맷 호환

### Decision 40 — Decision 5 (Decision 4 정정): 스케쥴 저장 = ~/SCHEDULE.json — 홈 루트의 글로벌 JSON 파일. Decision 4의 'repo-root SCHEDULE.md 마크다운' 해석은 오해였고 사용자 정정: 마크다운 아닌 JSON, 루트는 repo가 아닌 홈(~/), 글로벌 1개 파일
- **picked**: Decision 5 (Decision 4 정정): 스케쥴 저장 = ~/SCHEDULE.json — 홈 루트의 글로벌 JSON 파일. Decision 4의 'repo-root SCHEDULE.md 마크다운' 해석은 오해였고 사용자 정정: 마크다운 아닌 JSON, 루트는 repo가 아닌 홈(~/), 글로벌 1개 파일
- **rationale**:
  - 사용자 정정 verbatim: '루트의 글로벌.json / SCHEDULE.json'
  - 원래 Decision 2(글로벌 1개 목록)와 일관 — 파일 위치만 ~/.claude/plugin-data → ~/SCHEDULE.json 로, 이름은 SCHEDULE.json
  - JSON 유지 — _sched.py 저장 계층이 이미 JSON이므로 state_path()만 변경, 마크다운 파서 불필요
  - 홈 루트 글로벌이라 어느 repo에서 진행하든 동일한 하루 일과 목록

### Decision 41 — A1 — _inject.py가 명시적 response_lang(≠auto)일 때 _common 본문에서 '언어 추적 규칙' 섹션을 제거한 뒤 주입
- **picked**: A1 — _inject.py가 명시적 response_lang(≠auto)일 때 _common 본문에서 '언어 추적 규칙' 섹션을 제거한 뒤 주입
- **rationale**:
  - 충돌의 근원을 _inject.py 한 곳에서 물리적으로 제거 — 컨텍스트에 모순 지시가 남지 않음
  - 5개 언어 변형 데이터 파일을 안 건드려도 됨 (헤더 기준 slice ~8줄)
  - response_lang=auto 일 때는 추적 규칙이 그대로 살아 동작 보존
  - A2처럼 모델에게 '무시해줘'를 비는 게 아니라 충돌 자체를 없앰 — fade 와 같은 실패 모드 회피

### Decision 42 — B1 — 비-갱신 UserPromptSubmit 턴에 4단어 라벨 대신 7-요소를 압축한 always-on micro-spec(~8줄)을 주입; 풀바디는 여전히 Nth 턴마다
- **picked**: B1 — 비-갱신 UserPromptSubmit 턴에 4단어 라벨 대신 7-요소를 압축한 always-on micro-spec(~8줄)을 주입; 풀바디는 여전히 Nth 턴마다
- **rationale**:
  - fade window를 사실상 0으로 — 비-갱신 턴에도 실행 가능한 행동 스펙이 늘 컨텍스트에 있음
  - micro-spec은 ~400 tok 수준이라 매 턴 주입해도 5KB 풀바디 대비 가벼움
  - turns 카운터상 대부분 세션이 10턴 미만이라 재갱신 0회 — micro-spec은 매 턴 가므로 짧은 세션의 fade까지 동시 해결
  - B2(refresh_every 인하)는 라벨만 있는 빈 구간을 남긴 채 주기만 줄임 — 25→10 인하가 이미 부족했던 같은 약의 증량

### Decision 43 — C1 — _inject.py에 언어별 DIRECTIVES 딕셔너리(en/ko/ja/zh/ru). 주입 지시문(reply/code/terms/style)을 response_lang 로케일로 현지화, auto·미번역 언어는 en 폴백, '## Prefs' 헤딩은 리터럴 anchor 유지
- **picked**: C1 — _inject.py에 언어별 DIRECTIVES 딕셔너리(en/ko/ja/zh/ru). 주입 지시문(reply/code/terms/style)을 response_lang 로케일로 현지화, auto·미번역 언어는 en 폴백, '## Prefs' 헤딩은 리터럴 anchor 유지
- **rationale**:
  - 지시문 자체가 타깃 언어면 출력 유도가 더 강함 — '한국어로 응답하라'가 'Reply in ko'보다 자기강화적
  - 지시문은 줄당 ~10단어 고정 구조 문자열 — 영어판이 이미 _inject.py 에 하드코딩돼 있어 번역판도 같은 자리에 두는 게 single-source
  - C2(파일 외부화)는 큰 가변 콘텐츠에 맞는 방식 — 작고 거의 안 바뀌는 구조 문자열엔 이동 부품만 늘림
  - '## Prefs' 헤딩은 wilson-decision-gate 등이 참조하는 anchor 라 리터럴 유지 — 불릿만 현지화

### Decision 44 — A안 — pool.json 직접 Write/Edit를 PreToolUse 훅으로 deny, wilson-pool 명령어(pool.sh) 경유만 허용
- **picked**: A안 — pool.json 직접 Write/Edit를 PreToolUse 훅으로 deny, wilson-pool 명령어(pool.sh) 경유만 허용
- **rationale**:
  - 사용자가 A/B 중 A 선택 — '명령어로 지시할 때만 추가-삭제'라는 요청 의도에 정확히 부합
  - A는 직접 수정 경로를 deny해 명령어 경유만 남김 — 의도가 구조적으로 강제되고 약속에 기대지 않음
  - B(복원 가드)는 잘못된 수정을 일단 허용한 뒤 사후 롤백 — 한 턴이라도 깨진 roster가 routing에 노출됨

### Decision 45 — A안 — 가드를 wilson-pool 플러그인 내부 PreToolUse 훅으로 추가 (별도 가드 플러그인 신설 안 함)
- **picked**: A안 — 가드를 wilson-pool 플러그인 내부 PreToolUse 훅으로 추가 (별도 가드 플러그인 신설 안 함)
- **rationale**:
  - 사용자가 A/B 중 A 선택
  - pool.json 경로 해석(data_dir + 파일명)이 이미 _pool.py 안에 있어 같은 플러그인 내부여야 single-source — 경로 어긋날 위험 0
  - wilson-pool엔 이미 훅 3종(route/inject) 존재 — PreToolUse 하나 추가가 새 플러그인 신설(marketplace 등록+버전+설치동기화)보다 가벼움
  - 가드는 roster 무결성 방어라 라우팅과 한 도메인 — 'one plugin = one guardrail' 관례를 어기지 않음

### Decision 46 — A — wilson-research 의 YouTube 자막 추출은 순수 stdlib HTTP: watch 페이지의 ytInitialPlayerResponse JSON 에서 caption track URL 을 뽑아 timedtext 엔드포인트를 받아 파싱, urllib 만 사용
- **picked**: A — wilson-research 의 YouTube 자막 추출은 순수 stdlib HTTP: watch 페이지의 ytInitialPlayerResponse JSON 에서 caption track URL 을 뽑아 timedtext 엔드포인트를 받아 파싱, urllib 만 사용
- **rationale**:
  - 의존성 0 — sidecar 'no binaries / no deps' 정체성(AGENTS.tape id001)과 정확히 일치, /plugin install 한 번으로 완결
  - B(yt-dlp)
  - C(youtube-transcript-api)는 더 견고하나 외부 바이너리/pip 의존을 추가해 정체성을 깸 — 미설치 사용자는 그냥 실패
  - YouTube 페이지 변경 시 깨질 위험은 timedtext 추출 로직을 함수 하나로 격리하면 국소 수정으로 대응 가능

### Decision 47 — 옵션 1 — wilson-research 명령어 표면은 독립 명령어 2개: /wilson-research:yt <url> 와 /wilson-research:arxiv <query>
- **picked**: 옵션 1 — wilson-research 명령어 표면은 독립 명령어 2개: /wilson-research:yt <url> 와 /wilson-research:arxiv <query>
- **rationale**:
  - yt
  - arxiv 는 하나의 상태 객체에 대한 동사가 아니라 입력
  - 출력이 다른 독립 fetcher 둘 — 서브커맨드로 묶을 응집성이 없음
  - 단일 명령어로 묶으면 /wilson-research:research yt 처럼 플러그인명
  - 명령어명이 겹치는 'research research' 말더듬 발생
  - 명령어 2개는 /help 에 각각 노출돼 발견성이 높고 호출이 짧음 — prefs/pool 의 단일명령어 패턴은 stateful 제어 플러그인에만 맞는 것

### Decision 48 — A안 — 가드는 pool.json 한 파일의 절대경로만 deny ( .preflight.json 및 디렉토리 전체는 대상 아님)
- **picked**: A안 — 가드는 pool.json 한 파일의 절대경로만 deny ( .preflight.json 및 디렉토리 전체는 대상 아님)
- **rationale**:
  - 사용자가 A/B 중 A 선택
  - 사용자가 명시한 대상은 pool.json 하나 — roster만 irreplaceable한 사용자 의도라 보호 가치가 그 파일에 집중됨
  - .preflight.json은 derived ssh 캐시라 지워져도 route.sh가 다음 명령에서 재탐색 — 보호 이득 거의 0
  - B의 '미래 상태파일 자동 커버'는 지금 없는 파일을 위한 speculative 설계 (karpathy 원칙 위반) — 미래 상태파일은 그때 명시적 결정으로 한 줄 추가가 audit상 더 깨끗함

### Decision 49 — A안 — 가드는 Write/Edit/MultiEdit 도구만 deny, Bash 우회(리다이렉트 등)는 범위 밖
- **picked**: A안 — 가드는 Write/Edit/MultiEdit 도구만 deny, Bash 우회(리다이렉트 등)는 범위 밖
- **rationale**:
  - 사용자가 A/B 중 A 선택
  - helpful한 AI가 설정파일을 고칠 땐 idiomatic하게 Write/Edit 도구를 씀 — 실제 재발 위협이 그 경로에 있음, JSON 설정에 echo 리다이렉트는 비전형적
  - B의 Bash 문자열 정규식은 본질적으로 leaky — python/heredoc 변종을 못 잡으면서 오탐 위험만 추가, 부분 커버는 false confidence를 줌
  - Bash 우회가 실제 문제가 되면 그때 B를 명시적 결정으로 추가하는 게 audit상 깨끗 — 'one plugin ~100 lines' 미니멀 관례에도 부합

### Decision 50 — wilson-pool host에 sudo 필드 추가 — sudo:true 호스트로 라우팅될 때 root 필요 명령(apt/dpkg/yum/dnf/pacman/systemctl/ldconfig/setcap 등)을 자동으로 sudo prefix
- **picked**: wilson-pool host에 sudo 필드 추가 — sudo:true 호스트로 라우팅될 때 root 필요 명령(apt/dpkg/yum/dnf/pacman/systemctl/ldconfig/setcap 등)을 자동으로 sudo prefix
- **rationale**:
  - 사용자가 3개 후보(capability 필터 / 메타데이터만 / 자동 sudo prefix) 중 자동 prefix 선택
  - sudo:true는 '패스워드 없는 sudo 가능' 호스트 사실을 표현 — platform처럼 host capability 메타데이터
  - guard가 pool.json 직접 Edit를 막으므로 sudo 필드는 반드시 pool.sh 명령 경유로 들어가야 함 → 플러그인 개선이 필수

### Decision 51 — 라우팅 트리거 = DEFAULT_PATTERNS ∪ SUDO_RE — root 명령군(apt/dpkg/yum/dnf/pacman/systemctl/ldconfig/setcap)도 heavy 분류기와 무관하게 항상 라우팅 대상
- **picked**: 라우팅 트리거 = DEFAULT_PATTERNS ∪ SUDO_RE — root 명령군(apt/dpkg/yum/dnf/pacman/systemctl/ldconfig/setcap)도 heavy 분류기와 무관하게 항상 라우팅 대상
- **rationale**:
  - 검증 중 발견: DEFAULT_PATTERNS와 SUDO_RE 교집합이 공집합 → sudo-prefix가 절대 안 켜지는 죽은 코드였음
  - 사용자가 승인한 preview가 apt-get 원격 라우팅+sudo 그림이라 분류기 확장이 그 그림을 실현하는 유일한 경로
  - pool 취지(무거운 작업 원격화)에 빌드 의존성 설치가 일관 — linux capability 필터로 linux 호스트에만 가고 없으면 로컬 폴백

### Decision 52 — A — 새 독립 플러그인 (wilson-hexa-first 패턴 복제, 순수 텍스트 기여자, 갈림길 정공법 원칙 주입)
- **picked**: A — 새 독립 플러그인 (wilson-hexa-first 패턴 복제, 순수 텍스트 기여자, 갈림길 정공법 원칙 주입)
- **rationale**:
  - sidecar 정체성 규칙이 one plugin = one guardrail ~100 lines — 정공법 편향은 게이트 프로세스와 직교하는 별개 가드레일이라 decision-gate 확장(B)은 두 책임을 한 플러그인에 섞음
  - wilson-hexa-first가 순수 텍스트 기여자 + SessionStart/PostCompact 주입의 검증된 1:1 템플릿 — 텍스트만 갈아끼우면 됨, 구현 리스크 최소
  - C(hexa-first 확장)는 스코프 불일치 — 정공법은 전 언어
  - 프로젝트 일반 원칙인데 hexa-first는 hexa-native 경로 한정

### Decision 53 — A — 이름은 wilson-frontdoor
- **picked**: A — 이름은 wilson-frontdoor
- **rationale**:
  - sidecar 명명 관례가 행위
  - 은유 한 단어(wilson-pool/wilson-checkpoint/wilson-fire-gate) — frontdoor가 정공법을 1단어로 가장 정확히 압축
  - baseline은 ML/벤치마크 기준선 의미가 강해 발견성
  - 검색성 충돌, strategy는 가드레일 아닌 범용 명사라 한 줄 설명에서 정체성 흐려짐
  - root-cause는 디버깅 한정 인상이라 설계 선택
  - 의존성
  - 에스컬레이션 포함하는 넓은 적용 범위엔 좁음

### Decision 54 — B — 넛지 + 에스컬레이션 사다리 (근본이 상류/타 SSOT면 wilson-inbox 핸드오프)
- **picked**: B — 넛지 + 에스컬레이션 사다리 (근본이 상류/타 SSOT면 wilson-inbox 핸드오프)
- **rationale**:
  - 실제 최빈 실패 모드는 근본이 상류 repo인데 다운스트림에서 조용히 우회 — 근본 수리만 말하고 손 안 닿을 때 행동을 안 주면 무딘 칼
  - wilson-inbox가 바로 이 크로스-repo 핸드오프 가드레일이라 정공법 원칙이 그 출구를 가리키면 두 플러그인이 단일 SSOT로 합의 (wilson 원칙 6 project-governance 결)
  - C의 decision-gate 연계까지 본문에 박으면 한 원칙이 세 플러그인을 호명 — one-guardrail 미니멀 관례 위반, 그 연계는 사용자가 필요할 때 별도 결정으로 추가가 audit상 깨끗

### Decision 55 — B — SessionStart + PostCompact + Nth UserPromptSubmit 재주입 (fade 방지 2단)
- **picked**: B — SessionStart + PostCompact + Nth UserPromptSubmit 재주입 (fade 방지 2단)
- **rationale**:
  - 메모리 feedback_style_fade_drift: 희소 주입은 구조적으로 fade — 행동을 바꾸는 원칙은 fade하면 그 순간 우회로 샘, 기본값은 fidelity
  - 정공법이 가장 필요한 순간은 세션 깊숙이 벽에 부딪힌 디버깅 한복판인데 A는 바로 그때 원칙이 컨텍스트 맨 뒤라 가장 약함 — 타이밍 정반대
  - wilson-decision-gate/wilson-prefs가 이미 풀바디 Nth + 압축본 매턴의 검증된 2단 패턴 — 재사용이라 추가 구현 비용 거의 0

### Decision 56 — A — 지금 ship (커밋 + push + 로컬 설치본 동기화, wilson-sdlc:ship 체크리스트)
- **picked**: A — 지금 ship (커밋 + push + 로컬 설치본 동기화, wilson-sdlc:ship 체크리스트)
- **rationale**:
  - 빌드가 전 경로 스모크 검증됨 — 미룰 기술적 리스크 없음
  - sidecar 거버넌스 g_ship_syncs_install이 ship 시 같은 작업 안에서 로컬 설치본 갱신을 required로 요구 — 커밋만(B)은 다음 세션 신
  - 구 불일치를 거버넌스 위반으로 남김
  - 신규 0.1.0이라 버전 bump 불필요, 변경이 자기완결적(새 플러그인 + 레지스트리 3줄)이라 부분 출고로 쪼갤 이유 없음

### Decision 57 — A — GROWTH 로그 단계 skip (미니멀 전환 c08efd0 존중)
- **picked**: A — GROWTH 로그 단계 skip (미니멀 전환 c08efd0 존중)
- **rationale**:
  - c08efd0 전면 미니멀 전환이 per-ship 추적 로그를 의도적으로 제거한 명시적
  - 최신 결정 — 거기 버전 줄을 다시 넣으면 그 결정과 정면 충돌하고 문서를 재-부풀림
  - ship 스킬 본문 스스로 GROWTH 단계를 separate repo soft cross-repo reference로 규정 — hard step 아님
  - design.md Decision 52–56이 이미 실행 추적을 담당하고 커밋 메시지가 상세 changelog 역할 — 정보 손실 없음

### Decision 58 — block(무조건) + warn 2-mode 구조
- **picked**: block(무조건) + warn 2-mode 구조
- **rationale**:
  - 원래 .py/.sh Write를 deny로 막고(block=기본), warn은 advisory 1줄만
  - hexa-first가 principle 2순위 — 빨간불이 원칙 강제와 일관
  - 완화하고 싶을 때만 warn으로 내리면 되니 안전 floor가 기본

### Decision 59 — env 변수만 (SIDECAR_HEXA_FIRST_WARN_MODE) + 제안 deny 문구 채택
- **picked**: env 변수만 (SIDECAR_HEXA_FIRST_WARN_MODE) + 제안 deny 문구 채택
- **rationale**:
  - 이 플러그인은 지금도 env-only 설계 — 같은 모델 재사용이라 변경 ~5줄, 학습 비용 0
  - 새 파일
  - JSON 파싱
  - 슬래시 커맨드 0 — one-plugin-한-가드 미니멀 정체성 유지
  - 기존 opt-out도 쉘 프로필 방식 — 일관됨, config 파일은 요청 범위(한 줄) 초과

### Decision 60 — measure first (survey ~/core AGENTS.* before designing the cap)
- **picked**: A — 측정 먼저 (anima·hexa-lang 등 실제 파일 부풀음 측정 후 cap·규칙 확정)
- **rationale**:
  - cap 숫자를 감으로 박으면 정상 파일을 막거나 부푼 파일을 통과시킴 — 실제 분포를 봐야 정확
  - 측정 결과: 건강한 AGENTS.*는 ~130-200줄/6-15KB, 부푼 건 336-1533줄
  - "히스토리"가 changelog 누적이 아니라 줄 단위 폭주(7-9KB 한 줄)로 새는 게 드러남 — 탐지 규칙 방향이 바뀜
  - measure-vs-predict fork에서 측정 비용(파일 wc, ~5분) << cap 오설계 비용

### Decision 61 — new plugin wilson-minimal-keep (not a fold into an existing one)
- **picked**: B 후속 — 기존 35개 플러그인 조사 결과 AGENTS.* 비대화 가드 부재 → 신규 플러그인
- **rationale**:
  - wilson-readme-format이 구조 쌍둥이(특정 doc 파일 PreToolUse Write/Edit 포맷 단속)지만 대상이 README 한정
  - wilson-tree는 state/ 흩어짐+REGISTRY.md 색인이라 대상이 다름 — AGENTS.* 크기는 미관할
  - one-plugin-한-가드 정체성상 별도 가드는 별도 플러그인이 맞음 — 기존 플러그인에 끼우면 단일 책임 위반

### Decision 62 — three bloat signals: S1 total-lines · S2 long-line · S3 history
- **picked**: S1 total-lines >280 (Write only) · S2 long-line >800ch · S3 history (Log/History/Changelog heading or ≥3 dated bullets)
- **rationale**:
  - 측정상 healthy ≤200줄 / bloated ≥336줄 → 280줄 cap이 둘을 깔끔히 가름
  - 800ch/줄은 anima의 7-9KB 거대 줄을 잡으면서 정상 산문 줄(~300-500ch)은 통과 — "장황함"의 직접 신호
  - S1은 전체 파일이 필요 → Write 시에만 (readme-format L3 write-only 패턴과 동일 idiom)
  - 히스토리는 도메인-메타-도메인 원칙상 별도 파일로 — 사용자가 명시적으로 지목한 신호

### Decision 63 — 2-mode, default warn (not block)
- **picked**: 2-mode (SIDECAR_MINIMAL_KEEP_MODE), default = warn
- **rationale**:
  - 크기 초과는 soft 판단 — force-push/live-secret 같은 hard-dangerous가 아님
  - 정상적인 큰 편집을 block으로 막으면 과함 → warn이 안전 floor
  - block은 opt-in으로 남겨 강한 단속이 필요한 repo만 켜게 함 (hexa-first-warn과 반대 기본값 — 위험도 차이 반영)

### Decision 64 — wilson-tree integration: REGISTRY.md routing + one-way reference
- **picked**: 런타임 history→REGISTRY.md 라우팅 + minimal-keep description의 단방향 wilson-tree 참조 (wilson-tree 본체 미수정)
- **rationale**:
  - S3 발동 시 AGENTS 파일 옆에 REGISTRY.md(wilson-tree 산출물)가 있으면 거기로, 없으면 GROWTH.md로 안내 — 실질적 기능 결합
  - wilson-tree description은 이미 "ever-growing inline progress log" 개념 훅을 담음 — 본체 수정 시 불필요한 버전 bump
  - ship 범위 최소화 — 단방향 참조로 충분, 양방향은 결합도만 키움

### Decision 65 — manual cleanup scope: live top-level AGENTS.tape, snapshots excluded
- **picked**: live 4개(anima·wilson·hexa-lang·hexa-matter) top-level AGENTS.tape만 정리, anima_clm_* 스냅샷 제외, 타repo는 워킹트리만 정리 후 보고
- **rationale**:
  - anima_clm_NN_* 디렉터리는 동결된 학습-런 스냅샷 — 본질이 히스토리라 정리 대상 아님
  - 타repo SSOT 편집은 git-tracked라 복구 가능하지만 커밋은 각 repo 소유자 판단 — 워킹트리만 남기고 보고
  - sidecar repo만 이번 작업에서 커밋 (g_ship_syncs_install 거버넌스 적용 대상)
