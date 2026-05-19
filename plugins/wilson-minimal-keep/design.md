# Design

> Step-by-step decision gate audit trail. One decision per gate, never batched. See `/wilson-decision-gate sample` for the full convention.

---

## Decisions

### Decision 1 — default mode warn → block — detect 와 차단을 동일 디폴트에서 일어나게
- **picked**: default mode warn → block — `SIDECAR_MINIMAL_KEEP_MODE` 미설정 시 PreToolUse 가 deny
- **rationale**:
  - 2026-05-20 진단 — 사용자 신호 "플러그인 구현해도 잘 안 된다" 의 root cause 는 detect 와 차단의 디폴트 분리: 0.1.0 은 detect 는 정확했지만 warn 만 띄우고 Write 는 통과시켜서, 같은 사용자가 같은 commit cycle 에 다시 부풀리는 것을 막지 못함
  - block 으로 디폴트 가면 부풀리는 Write 가 PreToolUse 에서 즉시 거절 → 사용자가 의식적으로 trim 하거나 history 를 REGISTRY.md / GROWTH.md 로 옮기게 강제됨 (본 plugin 의 의도된 동작)
  - escape hatch 그대로: `SIDECAR_MINIMAL_KEEP_MODE=warn` 으로 명시적 다운그레이드 가능, `SIDECAR_NO_MINIMAL_KEEP=1` 로 전체 off 가능 → 워크플로우 차이 흡수
  - 변경 범위 최소 (~3 라인) · 회귀 위험 거의 0 · one-plugin-one-guardrail 유지
