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
