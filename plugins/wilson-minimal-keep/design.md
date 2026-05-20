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

### Decision 4 — archive snapshot EXCLUDE — `_clm_` substring 으로 anima 백업 sibling 디렉토리 제외
- **picked**: EXCLUDE 에 `_clm_` 추가
- **rationale**:
  - 2026-05-20 측정 — top-10 by lines 의 절반이 `anima_clm_*` 류 sibling root 디렉토리 (anima_clm_10/11/12/13… 등 12개 발견). 이건 anima 의 branch snapshot 워크플로우이지 active master 가 아님 → guardrail 의 대상에서 빠져야 함
  - substring `_clm_` 은 사용자 워크플로우-specific 명명 규칙 — 다른 일반 디렉토리/파일에 충돌 없음 (확인: ~/core 의 다른 어떤 path 도 `_clm_` 포함 안 함)
  - 변경 범위 1 라인 · 회귀 위험 0 · 후속 calibration 측정에서 archive 들을 active master 분포에 섞지 않음

### Decision 5 — S3 history regex 정밀화 — heading 짧고 키워드가 heading 끝 근처일 때만 match
- **picked**: `HISTORY_HEADING` = `^#{1,4}\s+[^#\n]{0,60}\b(?:log|history|changelog)\b[^#\w]{0,10}$`
- **rationale**:
  - 기존 regex `^#+\s.*\b(log|history|changelog)\b` 는 heading 내 *어디든* 키워드 등장하면 match → false-positive: `## Log Sources` (목록 제목), `# (...## Log)` (본문 narration), `# actions · session log lives in SEED.tape` (한 줄 inline 언급)
  - 정밀화: heading body ≤ 60 chars + 키워드가 heading 끝 근처 ([^#\w]{0,10}$) → `## Changelog` / `## Audit log` / `# ─── migration history ────` 같은 진짜 archive-section heading 유지, 부분 일치 narration 차단
  - H1-H4 까지만 (`^#{1,4}`) — H5/H6 의 history section 은 거의 없음, 또한 다른 plugin 들이 heading 깊이로 의도를 시그널 (e.g. H1/H2 = canonical section)
  - 변경 범위 1 라인 (regex compile) · 회귀 위험 작음 · false-positive 직접 줄임

### Decision 6 — S4 tape-entry hard cap — `.tape` v1.2 Compactness invariants 강제
- **picked**: per `@<TYPE>` 블록 — `MAX_ENTRY_CHARS=500` · 헤더+body 합산 · field 값 1줄 (heredoc ban) · field 수 ≤ 5; 적용은 tape header (`@<TYPE>`) 를 포함하는 content 에 한정
- **rationale**:
  - 2026-05-20 사용자 신호 ".tape 너무 길어지지 않게 @ 마다 글자수 제한". 측정: sidecar AGENTS.tape 의 `g_ship_syncs_install` 블록이 ~570 자 — apply 필드가 산문 escape 로 부풀어진 상태. cap 없으면 다음 governance 가 600 → 800 으로 자라는 게 기본 경로
  - hard cap 500 = 현 최장 블록 미만 → "더 줄여 써라" 압력. 별도 `.md` pointer escape hatch 금지 — 그 hatch 가 있으면 사람들이 거기로 다 도망가고 cap 이 무의미해짐 (사용자 직접 거절)
  - heredoc (`<<~EOF`) 차단 = 산문 escape 차단의 본체 — 1-line field 강제는 단순 글자수 cap 보다 미시적인 형태 제약, 분리·기호 압축·외부 참조 셋 중 하나로 마이그레이션 강제
  - spec 측 정의는 `~/core/tape/spec/tape.md` 2026-05-20 amendment 로 같은 PR 에 동반 — detect 와 정의가 한 단계에서 정렬되어야 day-1 dogfood 실패 없음 (g_ship_syncs_install 자체를 단축해서 ≤500 으로 통과시킴)
  - 측정 범위: 헤더 라인 + 모든 body 라인 (들여쓰기 포함), \n 1자, CJK 와 Latin 동일하게 1자 — 룰 단순 · CJK 정보밀도가 높아 영어보다 약간 빡센 게 의도된 비대칭
  - 적용 범위: 선언적 placement (`AGENTS.tape` / `identity.tape` / `<DOMAIN>.tape`) 만. append-only event-stream (`<sid>.tape` · `<DOMAIN>.log.tape`) 은 unbounded — runtime 이벤트는 자연스럽게 길이 분포가 다름. plugin 은 content sniff 로 자동 판별 (tape header 없으면 S4 skip)
