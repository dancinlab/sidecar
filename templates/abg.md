# /abg — all-bg-go (병렬 백그라운드 fan-out)

> 직전 어시스턴트 턴이 사용자에게 제시한 **브랜치/옵션/방향들**을, 한 메시지 안에서 브랜치당 백그라운드 Agent 하나씩 동시 발사.

## 절차 (한 메시지에)
1. 직전 어시스턴트 턴을 보고 제시된 distinct 브랜치를 전부 열거.
2. 컴팩트 plan 표 출력 — `| # | label | subagent_type | iso | goal |` (병렬 계획 가시화).
3. 표 바로 뒤에 N 개의 `Agent` tool 호출 — 각각 `run_in_background: true`, 코드 편집이면 `isolation: "worktree"`, 자기완결 프롬프트.

## 규칙
- **REACTIVE only** — 직전 턴이 제시한 것만 fan-out. 직전 목록이 없으면 만들지 말 것(스스로 다음 작업을 생성하는 self-generating 루프는 이 명령이 아님).
- 인자(`$ARGUMENTS`)가 있으면 해당 label 만, 없으면 전부.
- 가드: 파괴적 fan-out 금지 · 없는 브랜치 지어내기 금지 · 8개 초과면 확인 후 진행 · 중첩 금지.

## 종료 메시지 (정확히 이 형태)
```
N agents launched in parallel: <branch labels>

Next iteration: `all bg go` to fan out the next round of branches once results land.
```
`Next iteration` 줄은 의도적 — TUI 자동제안이 다시 `all bg go` 를 제안하도록 유도.
