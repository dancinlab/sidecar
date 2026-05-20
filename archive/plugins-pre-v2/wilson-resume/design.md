# Design

> Step-by-step decision gate audit trail. One decision per gate, never batched. See `/wilson-decision-gate sample` for the full convention.

---

## Decisions

### Decision 1 — Stuck 감지 + 탈출 — wilson-resume Stop hook 확장
- **picked**: Stuck 감지 + 탈출 — wilson-resume Stop hook 확장
- **rationale**:
  - deadlock 의 무한(unbounded) 부분은 over-scoped goal 의 다음-세션 re-arm 이며 ① 만 그 지점을 끊는다
  - 옵션 ②(경고만)
  - ③(handoff 만)는 cross-session 재무장 루프를 그대로 둔다
  - wilson-resume 가 이미 Stop hook 에서 transcript 를 스캔하므로 새 플러그인 없이 ~30줄 추가로 끝난다 — one-plugin-one-guardrail 유지
  - 감지 후 over-scoped goal 을 stuck 으로 마킹해 다음 SessionStart 에서 /goal 재무장 대신 handoff 브리핑을 띄운다

### Decision 2 — 즉시 감지 — decline-marker 1회로 트리거, 카운터 없음
- **picked**: 즉시 감지 — decline-marker 1회로 트리거, 카운터 없음
- **rationale**:
  - 사용자 지시 '3회 말고 바로 인지'
  - N회 반복 카운트는 stuck 을 9턴 native cap 직전까지 방치해 토큰을 그만큼 더 태운다 — 첫 신호에 끊는 게 낭비를 최소화
  - 정직한 에이전트(g3)는 over-scoped goal 을 만나면 그 턴에 'exceeds single-session scope' 류로 스스로 선언한다 — 그 선언 자체가 거짓 양성 없는 즉시 신호이므로 카운터가 불필요
  - Stop hook 이 latest assistant message 를 bilingual(en·ko) decline-marker 목록으로 스캔해 1회 매치 시 바로 stuck 마킹

### Decision 3 — native cap 수용 — ①은 cross-session 무한 루프만 끊고 세션 내 ≤9턴은 native circuit breaker 에 위임
- **picked**: native cap 수용 — ①은 cross-session 무한 루프만 끊고 세션 내 ≤9턴은 native circuit breaker 에 위임
- **rationale**:
  - CLAUDE_CODE_STOP_HOOK_BLOCK_CAP 은 전역 적용이라 낮추면 정상적인 긴 goal 도 잘려나간다 — over-scoped 만 선별 차단 불가
  - hook 은 세션 중 env 를 못 바꾸므로 wilson-resume 가 cap 조정을 자동화할 수 없다 — guardrail 범위 밖
  - 무한이던 cross-session re-arm 루프가 끊기고 stuck state 가 디스크에 즉시 기록되므로 ≤9턴이 끝나도 다음 세션이 handoff 에서 재개 — native 가 이미 준 circuit breaker 를 존중하는 게 minimal-keep 에 부합

### Decision 4 — marker coverage iteration — turn-scope / safety-limit / multi-cycle phrasing 추가, 스킴 변경 없음
- **picked**: marker coverage iteration — turn-scope / safety-limit / multi-cycle phrasing 추가, 스킴 변경 없음
- **rationale**:
  - 실패 케이스 (2026-05-20 transcript) — assistant 가 정직하게 "본 turn 안전 한도 도달 · 본 single turn 의 안전 한도 초과 · 5 cycle 분할 필요 · 다른 세션 sync" 로 over-scope 를 선언했으나 v0.3.0 `DECLINE_MARKERS` 가 session-scope phrasing 만 담아 매치 누락 → stuck 마킹 실패 → 9턴 native cap 까지 burn + 다음 세션 re-arm 위험
  - root cause 는 마커 *목록* 누락이지 *스킴* 결함 아님 — Decision 2 의 "1회 매치 · 카운터 없음" 가정은 그대로 유효
  - 추가 phrase 는 self-decline 표현 (`"안전 한도 초과"` / `"안전 한도 도달"` / `"turn 안전 한도"` / `"cycle 분할 필요"` / `"exceeds single-turn scope"` / `"multi-cycle"` 등) — healthy turn 에서 등장 빈도 매우 낮아 false-positive 위험 작음
  - 변경 범위 ~8 라인 (`_r.py` 한 파일) · plugin.json patch bump 0.3.0 → 0.3.1 · one-plugin-one-guardrail / minimal-keep 그대로 유지

### Decision 5 — 잔여(residual) 별도 채널 — 1회 매치, 새 state field, stuck briefing 본문에 inline
- **picked**: 잔여 marker 1회 매치 → state.json 에 별도 `residual` field → stuck briefing 본문에 `### 잔여 — 검토 필요` 섹션으로 합쳐 inject
- **rationale**:
  - 실패 케이스 (2026-05-20 transcript) — assistant 가 "본 권한 안 진행 가능한 잔여 = module-loader use-resolution bug + bootstrap regen deploy-pair commit" 으로 *구체적 핸드오프 항목* 을 선언했으나 v0.3.1 은 stuck 플래그만 다음 세션으로 넘기고 잔여 *내용* 은 버려짐 — 다음 세션이 "slice smaller" 라는 메타 권고만 받고 무엇이 남았는지 모름 (이전 transcript 를 직접 읽어야 알 수 있는 상태)
  - 잔여 자체가 already-honest 신호 (healthy in-progress turn 에 거의 안 나옴) — Decision 2 의 "1회 매치 · 카운터 없음" 가정 그대로 이어받음
  - stuck 과 묶는 옵션 B 는 over-scope 선언 *없이* 단순 cycle-scope-외 잔여만 있을 때 누락. 별도 새 marker enum + 별도 briefing 섹션(옵션 C)은 ~80 라인 추가 — stuck briefing 의 "slice smaller" 본문에 자연스럽게 합쳐지는 ~25 라인이 minimal-keep 에 부합
  - 변경 범위 추정: `_r.py` `RESIDUAL_MARKERS` enum + `extract_residual()` + `capture()` 통합 + `briefing()` inline + 새 state field (`residual` / `residual_at` / `residual_iso` / `residual_marker`) · plugin.json patch bump 0.3.1 → 0.4.0 (state schema 확장이므로 minor)

### Decision 6 — 잔여 marker 패턴 — 좁은 한정 leading marker 만
- **picked**: leading marker 한정 — `잔여 =` / `잔여 :` / `잔여:` / `remaining =` / `remaining:` / `outstanding =` / `outstanding:`
- **rationale**:
  - leading marker (`잔여 =` 류) 는 healthy 진행 보고 turn 에서 사실상 등장 안 함 — false-positive 근접 0
  - 옵션 B 의 산문 phrase (`scope 외` · `진행 가능한` 등) 는 일상 보고에도 자주 섞여 거짓 양성 위험 — `"scope 외 = 별도 작업"` 같은 단순 언급도 잡힘
  - 옵션 C 의 영어 광범위 (`TODO` · `still pending` · `not yet done`) 는 코드 인용 / 리뷰 텍스트 / 다른 플러그인의 출력 텍스트 안에 자주 등장 → guard noise 폭증
  - 매치 범위: marker 시작 줄부터 turn 끝, ≤2KB cap (briefing 본문이 커지면 SessionStart context 압박 — 다른 항상-주입 블록 (Pool · Prefs · SSOT) 과 합쳐도 합리적 크기 유지)

### Decision 7 — residual-only briefing — stuck 없이 잔여만 있어도 다음 세션 briefing 띄움
- **picked**: residual 단독 신호로 briefing trigger — stuck=False + residual=True 케이스도 `## Goal — interrupted` 본문에 `### 잔여 — 검토 필요` 섹션 inline
- **picked-by**: 추천 자동 채택 (사용자 "추천 방향 진행" 지시)
- **rationale**:
  - 사용자 원래 요청 ("잔여 발견시 검토해서 프롬프트 주입") 의 핵심은 *잔여 내용 자체의 다음 세션 노출* — stuck 동반 여부와 독립
  - 단순 turn-limit 으로 (over-scope 선언 없이) 잔여만 선언하는 케이스가 실제로 존재 — 옵션 B (stuck=True 일 때만) 가 이 케이스를 놓침
  - briefing 분기 단순화 — `if cond and (stuck or residual): print briefing` 1줄로 표현, 코드 늘어남 없음
  - 잔여 단독 case 의 briefing 본문은 stuck briefing 의 "do NOT re-arm" 강한 권고 대신 "interrupted" 의 표준 re-arm 안내 + 잔여 섹션 — re-arm 시 잔여 내용을 같이 받는 자연스러운 흐름
