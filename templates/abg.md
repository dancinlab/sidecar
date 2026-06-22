# /abg — all-bg-go (병렬 백그라운드 fan-out)

> 직전 어시스턴트 턴이 사용자에게 제시한 **브랜치/옵션/방향들**을, 한 메시지 안에서 브랜치당 백그라운드 Agent 하나씩 동시 발사.

## 절차 (한 메시지에)
1. 직전 어시스턴트 턴을 보고 제시된 distinct 브랜치를 전부 열거.
2. 컴팩트 plan 표 출력 — `| # | label | subagent_type | iso | goal |` (병렬 계획 가시화).
3. 표 바로 뒤에 **`Workflow` 도구 한 번**으로 발사 — `parallel()` 에 브랜치당 thunk 하나(`agent()` 호출, 코드 편집이면 `isolation:'worktree'`, 자기완결 프롬프트). Workflow 가 동시성을 min(16,cores−2) 로 cap+큐잉하고 토큰 budget 을 공유하므로 **N개 background `Agent` 직접 발사로 인한 rate-limit 사망을 막는다**(commons c27). 브랜치가 1개뿐이면 단발 `Agent` 로 충분(Workflow 불필요).

## 규칙
- **REACTIVE only** — 직전 턴이 제시한 것만 fan-out. 직전 목록이 없으면 만들지 말 것(스스로 다음 작업을 생성하는 self-generating 루프는 이 명령이 아님).
- 인자(`$ARGUMENTS`)가 있으면 해당 label 만, 없으면 전부.
- **다수 동시 발사 = Workflow 로 라우팅**(c27) — N개 병렬 `Agent` 직접 호출 금지(rate-limit 사망).
- 가드: 파괴적 fan-out 금지 · 없는 브랜치 지어내기 금지 · 8개 초과면 확인 후 진행 · 중첩 금지.

## 종료 메시지 (정확히 이 형태)
```
N agents launched in parallel: <branch labels>

Next iteration: `all bg go` to fan out the next round of branches once results land.
```
`Next iteration` 줄은 의도적 — TUI 자동제안이 다시 `all bg go` 를 제안하도록 유도.
