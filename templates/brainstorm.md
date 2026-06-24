# brainstorm — iterative ideation, dispatched to ONE subagent (breadth over selection)

> Offload the divergence to a single background `Agent` so the rounds-until-depletion don't pile
> up in the main session context — like `/abg`, but ONE continuous divergent thread (not N parallel
> branches). The main session gets only the final dedup + cluster + shortlist back.

## 절차 (한 메시지에)
1. seed 를 확정 — CLI 가 출력한 `seed:` 줄(인자)이 있으면 그것, 없으면 직전 대화 맥락에서 발산 대상을 잡는다. 둘 다 없으면 한 줄로 묻고 멈춘다(발산 대상이 없으면 지어내지 말 것).
2. **단발 `Agent` 도구 하나**로 발사 — 아래 "발산 규약"을 self-contained 프롬프트로 통째로 넣어 서브에이전트가 고갈까지 돌게 한다. 한 줄기 발산이라 `parallel()`/`Workflow` 불필요(단발 단일 agent 는 commons `fanout-workflow` 예외). 사용자가 "계속 작업하겠다"면 `run_in_background:true`, 결과를 바로 보려면 foreground.
3. 서브에이전트가 끝나면 최종 산출(라운드별 발산 → dedup → cluster → 3–5 shortlist)만 메인에 회수해 제시한다 — 중간 라운드는 메인에 옮기지 않는다(오프로드가 목적).

## 서브에이전트에 넣을 발산 규약 (프롬프트 본문 그대로)
Given the seed, generate ideas in **rounds** until depletion. Breadth first — selection/critique comes later.

Per round:
- produce a batch of **N distinct ideas** (default 8–12) from genuinely different angles
- DON'T converge, rank, or critique yet — quantity + diversity is the goal
- vary the lens each round: first-principles · analogy from another domain · invert the goal ·
  constraint-removal · combine two earlier ideas · extreme/edge version

Between rounds:
- build on AND diverge from prior ideas; mark near-duplicates as `~dup of #k`
- note unexplored angles to seed the next round

Stop condition — **depletion**: when a full round yields no genuinely new idea.
Then: dedup → cluster into themes → surface the 3–5 most promising with a one-line why each.

Return: numbered ideas per round, then the final dedup + cluster + shortlist.

## 규칙
- 발산은 **서브에이전트가** 한다 — 메인 컨텍스트에 라운드를 쌓지 말 것(이 명령의 존재 이유 = 컨텍스트 오프로드).
- **단발 Agent**(한 줄기 발산) · N-parallel 이 아님 → Workflow 불필요. 여러 직교 seed 를 동시에 펼치고 싶으면 그건 `/abg` 의 일.
- seed 없으면 지어내지 말고 한 줄 질문 후 멈춤(REACTIVE).

## 종료 메시지 (정확히 이 형태)
```
brainstorm dispatched to 1 subagent: <seed 한 줄 요약>

Result returns as: rounds → dedup → cluster → 3–5 shortlist (once depletion is reached).
```
