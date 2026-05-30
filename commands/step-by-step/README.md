# step-by-step

`/step-by-step` (별칭 `/sbs`) — **계획 먼저, 그다음 순차 자동 실행** 런북. 작업을 번호 매긴 순서 단계로 쪼갠 뒤, 단계 사이에서 멈추지 않고 위→아래로 끝까지 실행한다. `/cycle`(병렬 fan-out)의 정반대 — **한 가닥, 직렬, 위→아래**.

## 동작

| 단계 | 내용 |
|---|---|
| 1. 타깃 해석 | 인자 있으면 그 텍스트 · 없으면 컨텍스트의 현재 작업(가정 한 줄 명시 후 진행, 묻지 않음) |
| 2. 계획 | 의존성 순으로 번호 매긴 단계 목록 출력 (`📋 plan (N steps)`). 승인 게이트 없음 — 보여주고 바로 실행 |
| 3. 순차 실행 | 위→아래 한 번에 한 단계(병렬 아님). 단계마다 `▶ i/N — <step>` → 작업 → `✅`/`⚠`/`❌` |
| 4. 클로저 | `🏁 <done>/<N> steps complete` |

## 멈춤 조건 (자동 실행 ≠ 무조건 강행)

- **단계 실패(`❌`)** — 어느 단계인지 + 에러 원문 + 안 돌린 나머지 단계를 보고하고 사용자 판단에 넘김
- **비가역·파괴적·외부 노출 단계** (배포 · 공개 · force-push · 대량 삭제 · 전송) — 그 단계 직전에 확인받고 재개. `bypass` self-check와 같은 기준 (가역·로컬은 자동, 비가역은 확인)

## /cycle 와의 차이

| 축 | /step-by-step | /cycle |
|---|---|---|
| 실행 | 직렬 (한 가닥, 순서대로) | 병렬 (background Agent fan-out) |
| 멈춤 | 실패·비가역 단계만 | 라운드 단위 loop |
| 쓸 때 | 의존성 있는 순차 작업을 한 런북으로 | 독립 작업을 한꺼번에 |

## chat-form 7-요소 라운드 = `hexa easy` 빌트인 래핑 (0.9.0)

disambiguation 라운드의 7-요소 scaffold(아이콘 · 이름 · 별칭 · 하는 일 · 비유
· ASCII · 비교 표 · 추천)는 손으로 짜지 않는다. 골격과 점수는 결정적이므로
`hexa easy` 빌트인에 맡긴다 — `easy-doc` · `easy-paper` 가 쓰는 바로 그 backbone.

```
[ 라운드 N ] ─▶ ① hexa easy scaffold ─▶ ② LLM 슬롯 채움 ─▶ ③ hexa easy lint ─▶ 라운드 렌더
                   7-슬롯 골격(결정적)      창의 질문(LLM만)      prose 품질 advisory
```

- **SSOT** — 7-요소 패턴 + 4종 ASCII 템플릿은 `hooks/easy-auto/styles/easy.<lang>.md`
  소유. 가리켜 쓰되 복제 금지.
- `hexa easy scaffold` — 라운드 빈 7-슬롯 골격.
- `hexa easy lint` — 라운드 prose 품질 advisory 게이트 (disambiguation/auto-pick
  로직은 빌트인과 독립 · 항상 실행).
- **graceful fallback** — toolchain 미동기 시 styles SSOT로 손-골격 + 체크리스트
  self-check. advisory라 빌트인 부재가 라운드를 막지 않는다.

## 별칭

`/sbs` — 동일 동작의 3글자 단축 (`/question`→`/q` 선례).
