# /fleet-full — 풀스택 함대 (research → implement → abstract → falsify, 자동 페이즈 영구 캠페인)

> `/fleet` 의 풀스택 변종. 각 레인 = **하나의 프론티어(목표·천장)**. `lab`(research) 와 `abstract`(추상화) 를 한 캠페인으로 엮어, 프론티어가 **스스로 페이즈를 전환**한다: 싼 research 로 미시도 레버 탐색 → 정당화되면 implement+measure → 경험적으로 벽에 닿으면(레버 소진) **abstract 로 자동 승격**(법칙 peel → escape 발명) → escape 를 falsify 가능 예측으로 캐스팅해 **다시 research/implement 프론티어로 강하** → 반복. 천장(🧱)도 메타법칙(🌌)도 새 lens 로 reopen.

핵심: 단일 모드의 한계를 메운다 — `lab` 은 도구 한계서 멈추고, `abstract` 는 좌표만 준다. `full` 은 **경험(research+implement)이 막히면 추상(peel→escape)으로 넘어가고, 추상이 좌표를 주면 다시 경험으로 내려보내** 둘을 영구 순환시킨다. 모든 페이즈에 정직(d6·c2·c14 d) 강제.

## 0. 인자 파싱
- `frontier:goal, frontier:goal, …` → 그 프론티어 셋(레인). goal = 닿으려는 목표/천장의 1줄.
- 비어있음 → roster `.harness/fleet/full` 읽기 · 없으면 `ARCHITECTURE.json` 의 `blocking-frontiers` + `LAWS[]` 에서 OPEN 프론티어 추론.
- `go` → 도는 캠페인 계속(착륙했는데 미발사 레인 재발사). `stop` → 재발사 중단·drain·roster 삭제·최종 요약.

## 1. 캠페인 개시 (첫 턴)
1. roster 기록: `.harness/fleet/full`, 한 줄당 프론티어명.
2. 각 프론티어를 **research 페이즈(r1)** 로 발사 — 기본은 싼 research(web/arxiv·코드 census · GPU 0 · mini-safe · `run_in_background:true`). 프롬프트 자기완결(미시도 레버 + 인용 + "다음 페이즈 명명 + 전환 조건").
3. 🛰️ 캠페인 report(§4) 출력.

## 2. 라운드 lifecycle (프론티어당 · fire-on-arrival · 자동 페이즈 전환)
각 레인은 한 라운드 착륙 시 **현 페이즈의 verdict 로 다음 페이즈를 스스로 고른다**:

```
        ┌──────────────────────── 새 lens / falsify→실험 ────────────────────────┐
        ▼                                                                         │
[ 🔬 research ] ──레버 있음──▶ [ 🛠️ implement+measure ] ──레버 소진(벽)──▶ [ 🧅 abstract ]
        │ 레버 없음                       │ c2 측정                            peel→메타법칙
        └──────────▶ [ 🧱 벽 ] ◀──────────┘                                       │
                        ▲                                                  [ 💡 escape 발명 ]
                        └────────── escape 가 새 레버 못 줌 ───────────────────────┤
                                                                                  ▼
                                                              [ 🎯 falsify 캐스팅 → research 강하 ]
```

페이즈별 게이트:
1. **🔬 research** — reference(web/arxiv·문헌·코드 census)로 미시도 레버 특정. 고신뢰 레버 있음 → implement, 없음 → abstract 로 승격(black-box sweep 금지 · c23).
2. **🛠️ implement+measure** — research 가 정당화한 레버만 구현, **출력 수치로 검증**(c2 · 자가판정 금지). 코드 레인 = worktree 격리. 비용 레인 = §5 halt. 측정으로 벽 확인 → abstract 승격.
3. **🧅 abstract** — 누적 법칙(LAWS) census → 한 겹 벗겨 공유 trade-off(메타법칙) 도출 → **💡 escape 원리** 발명(직교 레버). (`fleet-abstract` 규율 상속.)
4. **🎯 falsify 캐스팅** — escape 를 반증가능 예측 + 가장 싼 반증 계산으로 만들어 **research/implement 페이즈로 강하**(추상이 경험에 새 표적을 준다). 추상만으로 발견 박제 금지(d6).
5. **📊 record→SSOT (매 착륙 필수)** — 측정·메타법칙·escape·falsify 트랙을 `ARCHITECTURE.json`(`blocking-frontiers` + `LAWS`) + 메모리에 박제. 다음 세션이 SSOT 한곳에서 표적을 본다.
6. **🛰️ 캠페인 report(§4) — 이 턴 필수.**

모든 프론티어 🧱/🌌/📦/resolved → `.harness/fleet/full` 삭제 + 최종 요약.

## 3. 페이즈 전환 규율 (핵심)
- **research→implement**: 고신뢰 미시도 레버를 research 가 특정했을 때만. 없으면 implement 건너뛰고 abstract.
- **implement→abstract**: 경험적 레버가 **측정으로** 소진됐을 때(🧱). 얕은 "못한다" 로 abstract 승격 금지 — 벽은 measured.
- **abstract→research**: escape 가 **반증가능 예측 + 싼 반증 관측**을 낳았을 때. 막연한 사변으로 강하 금지.
- **reopen**: 🧱(새 research 레버) · 🌌(새 lens) 둘 다 reopenable. 한 프론티어가 research↔implement↔abstract 를 여러 번 왕복할 수 있다.
- **lazy-ceiling 금지(c14 d)**: "끝"은 research census + 추상 peel 을 **둘 다** 소진한 뒤에만. 1-pass 직관 박제 금지.

## 4. 🛰️ 캠페인 report — 필수 형태 (캠페인 live 인 매 턴)
```
🛰️ 캠페인 — <N> frontier (<live>/<N> in-flight)
├─ <icon> <frontier> : [<phase>] r<k> <round-goal> <status>
└─ <icon> <frontier> : ...

방금 착륙: <frontier> [<phase>] r<k> — <verdict 1줄: 측정수치/메타법칙/escape> → <next phase: 🔬|🛠️|🧅|🎯|🧱|🌌>
대기:     <in-flight frontier 목록>
SSOT:     <박제한 노드/메모리>        (record 한 턴만)
depletion: <🧱/🌌/📦 frontier + 이유>  (없으면 생략)
```
status 토큰 — `🔬`research · `🛠️`implement+measure · `🧅`abstract-peel · `💡`escape · `🎯`falsify강하 · `📊`측정착륙 · `✅→🔁`착륙+재발사 · `🧱`측정벽(reopenable) · `🌌`메타법칙(reopenable) · `🔓`reopen · `💰`비용대기(go) · `📦`deferred.

## 5. Halts (fleet 상속)
- research·abstract 페이즈 → **mini-safe · 무비용 자동 진행**. 비싼 implement(pool/GPU rent) → 4축 박스 + 명시 `go`(자동 rent 금지).
- 파괴적/되돌릴수없는/외부노출(public push·삭제·대량쓰기) → 확인 후 재개.
- Agent 가 rate-limit/socket 으로 죽음 → checkpoint(브랜치/worktree/박제 LAWS)에서 재발사(지수 backoff) — 처음부터 재시작 금지.

## 6. depletion
모든 프론티어가 🧱(research 레버 0) AND 🌌(abstract lens 0) — 즉 **경험과 추상 양쪽 다 dry** — 이거나 📦(deferred)/resolved → roster 삭제 + 최종 요약. 단 둘 다 차세션 research/lens 로 부활 가능하므로 SSOT 에 다음 표적 + 반증 조건을 남긴다. **양축 dry 는 research probe + 추상 peel 둘 다 소진 후에만**(c14 d).

## 7. 동시성
고정 레인 cap 없음 — 머신 부하 정직하게. research·abstract 라운드는 동시 다발 OK(싸다). implement 라운드는 worktree 격리 + pool 호스트 직렬화(같은 GPU 연타 회피).
