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

### Decision 7 — A — Build 스테이지를 worktree-pr + wilson-checkpoint에 매핑
- **picked**: A — Build 스테이지를 worktree-pr + wilson-checkpoint에 매핑
- **rationale**:
  - D5
  - D6=A와 같은 프리미티브 매핑 노선 — 3단계 연속 동일 철학, 응집
  - 재사용 대상이 GROWTH §1 히어로 웨지(checkpoint 한도/크래시 무손실) — generic Build엔 없는 차별 자산
  - 얇은 skill
  - 본문 노동 최소, worktree-pr 이미 출하
  - 트레이드오프: worktree-pr/checkpoint 결합 disabled면 inert → fallback 한 줄 완화

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
