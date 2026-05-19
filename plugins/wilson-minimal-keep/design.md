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

### Decision 2 — EXCLUDE 에 `/.claude/worktrees/` 추가 — anima 격리-워크트리 사본 노이즈 제거
- **picked**: EXCLUDE 에 `/.claude/worktrees/` 추가
- **rationale**:
  - 2026-05-20 scan ~/core — anima/.claude/worktrees/agent-*/ 아래 동일 AGENTS.tape 사본이 N개 (수십 개), 각각 같은 fire (S1+S2) 를 일으켜 마스터 AGENTS.tape 의 진짜 신호를 묻음
  - 이건 실제 bloat 가 아니라 anima 의 isolated-agent 워크트리 격리 메커니즘이 만든 사본들 — guardrail 의 대상은 마스터 1개여야 함
  - 변경 범위 ~1 라인 (EXCLUDE 튜플에 한 항목 추가) · 회귀 위험 0 · 동일 패턴이 Claude Code Agent isolation 등 다른 격리 워크트리에도 일반화 적용됨
  - 후속 calibration (약점 4) 의 분포 측정이 사본 N개 카운팅으로 왜곡되지 않으려면 B 가 *선행* 되어야 함

### Decision 3 — S2 longest-line cap 800 → 500 — 세 신호 fire-rate 정렬
- **picked**: `MAX_LINE_LEN` 800 → 500
- **rationale**:
  - 2026-05-20 분포 측정 (164 unique master AGENTS.*, EXCLUDE 적용) — S2 longest-line cap 800 의 fire rate 3% 가 S1 lines>280 의 10%, S3 history 의 10% 와 정렬되지 않음. 세 신호가 동일 의도 (top-decile bloat detector) 라면 비율도 align 되어야 함
  - p90 = 375, p95 = 565 → cap 500 은 p95 약간 아래로, "거의 모든 master 가 통과하지만 명백한 single-line jam 은 잡는다" 위치. fire rate 3% → 6%
  - 진짜 catastrophic (anima 8006, wilson 3915, anima-pcn 2172, demiurge 1584, phanes 1018) 은 cap 무관하게 그대로 fire — 잃는 것 없음, 추가로 754/620/570 같은 borderline jam 도 잡음
  - 옵션 B (400, p90 근처) 는 fire 8.5% 로 비율 align 면에서 더 정확하지만 healthy borderline master (wilson 754, bedrock 620, hexa-lang 570) 까지 잡아 마찰↑ — 500 이 측정 데이터 기준 균형점
