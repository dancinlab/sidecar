# 단계별 결정 게이트 — canonical 레퍼런스

> sidecar 플러그인 **`wilson-decision-gate`**(wilson `step-by-step-decision-gate` 거버넌스 원칙의 standalone 포팅)의 long-form 샘플.
> 기본값 = 플러그인 설치 시 **ON**. 끄려면 `/wilson-decision-gate off`, `/sidecar off decision-gate`, 또는 `SIDECAR_NO_DECISION_GATE=1`.
> 이 파일은 canonical *적용법* 레퍼런스 — 한 번 읽고, 다중 결정 작업 시작 시 템플릿으로 사용. `/wilson-decision-gate sample [en|ko|ja|zh|ru]`로 출력.

## 이 원칙이 작동하는 시점

이 원칙은 **다중 결정 작업** — 사용자가 골라야 할 분기점이 N개인 작업 — 에서 발동합니다. 예:

- 새 스펙 랜딩 (결정 = 명칭, falsifier 세트, 강제 레이어, 감사 포맷, …)
- 스코프 선택이 있는 비자명 리팩터 (어떤 파일 in/out, 추상화 형태, 마이그레이션 순서, deprecation 기간, …)
- API 설계 (동사 명명, 파라미터 형태, 에러 모델, 버저닝 정책, …)
- 마이그레이션 계획 (단계 순서, 롤백 게이트, 중간 상태 형태, …)
- 실행 가능한 접근이 2개 이상 떠오르는 모든 Plan-mode 작업

원샷 작업(단일 버그 수정, 짧은 Q&A, 기계적 편집)에서는 **발동하지 않습니다** — 무력화할 배칭이 없으니까.

## "한 결정 = 한 사용자 게이트"의 의미

각 분기점마다 에이전트는 **반드시**:

1. **분기점을 따로 제시** — 두 결정을 하나의 yes/no로 묶지 않는다.
2. **옵션 나열** (2개 이상) 각 한 줄 설명.
3. **하나 추천** (`### 🎯 추천:` 또는 동등 헤더) + **3개 이상 불릿 근거**를 "**근거**:" / "**Why**:" 아래.
4. 다음 결정으로 가기 전 **사용자 선택 대기**. 가능하면 `AskUserQuestion` 사용, 아니면 멈추고 평문으로 질문.
5. 진행하며 `design.md`(또는 세션 로그)에 **선택 + 근거 기록** — `/wilson-decision-gate decide "<선택>" "<근거>"`가 아래 포맷으로 append.

감사 추적(`design.md` 결정 섹션 + 해당 시 스펙/PR 교차링크)은 **산출물의 일부**이지 사후 첨부물이 아니다.

## 배칭 금지 이유

배칭은 N개 선택을 하나의 yes/no로 붕괴시킨다. 구체적으로:

- 대부분의 선택이 무숙고로 통과 — 사용자는 헤드라인만 읽고 "다 yes", 부담스러운 선택이 고무도장 처리됨.
- 사후 책임 전가 불가피 — 묶인 선택 중 하나가 틀리면 "네가 yes 했잖아"는 취약한 감사 앵커.
- 게이트가 게이트가 아니게 됨 — 확인 연극이 된다. step-by-step의 핵심은 각 분기점을 자기만의 결정으로 늦추는 것.

그래서 이 원칙이 일반화하는 프로토콜은 하드 룰을 정의한다: **게이트당 선택 1개 초과 → 차단**.

## 결정-기록 포맷

design.md / 세션 로그 안에서 모든 결정은 이렇게 안착:

```markdown
### 결정 N — <한 줄 설명>
- **picked**: ⭐ <옵션 라벨> (여럿 랭킹 시 🥇 / ✅ / ❌)
- **근거**:
  - <불릿 1 — 왜 대안보다 나은가>
  - <불릿 2 — 어떤 트레이드오프를 수용하는가>
  - <불릿 3 — 나중에 무엇이 이 선택을 falsify하는가>
```

3불릿이 최소. 핵심 결정은 더 써도 좋다. 그 미만 = 근거가 얇아 3주 뒤의 독자(=당신)가 트레이드오프를 재구성하지 못한다.

## 교차링크

- 결정이 속한 스펙 / PR에 `decision_audit_ref: <design.md 경로>` 한 줄을 단다 (양방향 — 스펙 → design.md, design.md 머리 → 스펙/PR).
- 세션 로그를 둔다면 위 결정-기록 포맷이 그 안의 한 섹션으로 들어간다.

## Worked example

실제 다중 결정 스펙/설계 세션을 worked example로 삼는다: 각 분기점이 자기 게이트, `picked` 줄, 3불릿 근거를 갖고, 하나의 `decision_audit_ref`로 스펙/PR에 교차링크. 그런 design.md 하나를 한 번 읽어 패턴을 체화한 뒤 이 템플릿을 재사용.

## 반례 (적용하지 않을 때)

- 근본 원인이 명확한 원샷 버그 수정 — 게이트할 결정 없음.
- 기계적 리팩터(rename, 포매팅, lint 수정) — 분기점 없음.
- Q&A / 설명 / 상태 보고 — 산출물 없음.
- 속도 > 숙고인 긴급 핫픽스 (세션 동안 `/wilson-decision-gate off` / `SIDECAR_NO_DECISION_GATE=1` kill-switch 사용, 이유를 기록).

## "friendly preset"과의 독립성

이 원칙이 일반화하는 프로토콜은 두 가지를 묶는다:

1. **Friendly preset** (7-element 패턴, 추천 포맷, 이모지 enum 등) — 그건 *어떻게 쓰는가*이고, sidecar `wilson-prefs` 플러그인에 응답 스타일로 별도 존재.
2. **Step-by-step 사용자-확인 게이트** — *이* 원칙, *어떻게 결정하는가*.

자연 축으로 분리된다: friendly preset은 어떻게 쓰는가, step-by-step은 어떻게 결정하는가. 한쪽이 켜진 채 다른 쪽이 꺼질 수 있다.

## 활성화 치트시트

```sh
# 기본: 설치되면 ON (SessionStart가 원칙 주입; UserPromptSubmit는
# branch-point처럼 보이는 프롬프트에만 짧은 리마인더 — 매 프롬프트 아님).

/wilson-decision-gate off          # 원칙 주입 끄기
/wilson-decision-gate on           # 다시 켜기
/sidecar off decision-gate         # 컨트롤 플러그인으로 런타임 토글
SIDECAR_NO_DECISION_GATE=1         # 세션 kill switch (env, 항상 우선)

/wilson-decision-gate decide "<선택>" "<근거>"   # Decision 한 건 append
/wilson-decision-gate log          # design.md 결정 섹션 출력
/wilson-decision-gate path <file>  # 다른 design.md 지정
```
