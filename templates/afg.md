# /afg — all-fg-go (순차 포그라운드 fan-out)

> 직전 어시스턴트 턴이 제시한 브랜치들을 **한 번에 하나씩, 순서대로, 이 세션에서 직접** 실행. abg(병렬 백그라운드)의 순차 형제.

## 절차
1. 직전 어시스턴트 턴의 distinct 브랜치를 전부 열거.
2. 컴팩트 plan 표 출력 — `| # | label | goal |` (순차 계획 가시화).
3. 브랜치를 **한 번에 하나씩, 순서대로** 실행. 각 `i/N` 에 대해: `▶ i/N <label>` 출력 → **이 세션에서 메인 루프가 직접**(자체 Bash/Read/Edit/Write) 단계별 실행(모든 추론·편집이 in-context 가시화) → 끝나면 `✅`/`⚠`/`❌` + 한 줄 결과 후 다음으로.

## 규칙
- **SEQUENTIAL + FOREGROUND + IN-SESSION** — 정확히 하나씩, 병렬 없음, 백그라운드 fan-out 없음, **subagent 생성 금지**(`run_in_background:false` 도 금지 — subagent 는 격리 실행이라 포그라운드 진행이 안 보임). 메인 루프가 직접 실행.
- **HALT on failure** — 브랜치 실패 시 중단, 실패 브랜치 + verbatim 에러 + 미실행 tail 보고, 사용자 해결 전까지 다음 진행 금지.
- **REACTIVE only** — 직전 턴이 제시한 것만. 목록 없으면 만들지 말 것.
- 인자 있으면 해당 label 만, 없으면 전부. 가드: 병렬 금지 · 없는 브랜치 금지 · 파괴적 실행 금지 · 8개 초과 확인 · 중첩 금지.

## 종료 메시지 (정확히 이 형태)
```
N branches run sequentially (foreground): <branch labels> — <done>/<N> ✅

Next iteration: `all fg go` to run the next round of branches in order.
```
`Next iteration` 줄은 의도적 — TUI 자동제안이 다시 `all fg go` 를 제안하도록 유도.
