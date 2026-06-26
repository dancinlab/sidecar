# /fleet-full — 풀스택 함대 (research → implement → abstract → falsify, 자동 페이즈 영구 캠페인)

> `/fleet` 의 풀스택 변종. 각 레인 = **하나의 프론티어(목표·천장)**. `lab`(research) 와 `abstract`(추상화) 를 한 캠페인으로 엮어, 프론티어가 **스스로 페이즈를 전환**한다: 싼 research 로 미시도 레버 탐색 → 정당화되면 implement+measure → 경험적으로 벽에 닿으면(레버 소진) **abstract 로 자동 승격**(법칙 peel → escape 발명) → escape 를 falsify 가능 예측으로 캐스팅해 **다시 research/implement 프론티어로 강하** → 반복. 천장(🧱)도 메타법칙(🌌)도 새 lens 로 reopen.

핵심: 단일 모드의 한계를 메운다 — `lab` 은 도구 한계서 멈추고, `abstract` 는 좌표만 준다. `full` 은 **경험(research+implement)이 막히면 추상(peel→escape)으로 넘어가고, 추상이 좌표를 주면 다시 경험으로 내려보내** 둘을 영구 순환시킨다. 모든 페이즈에 정직(d6·c2·c14 d) 강제.

> ⚖️ **3 페이즈 전부 통과가 기본 (implement 스킵 금지)**: 한 프론티어는 🔬research→🛠️implement→🧅abstract 를 **순서대로** 밟는다 — research 가 "레버 없음" 이라고 implement 를 건너뛰고 abstract 로 직행하는 건 lazy-ceiling(c14 d · 규율 전문 §3). abstract 만 도는 캠페인은 고장이다.
> ▶️ **기본 실행 = 순차(afg-style)**: 프론티어를 **하나씩 foreground 로** 한 라운드(현 페이즈) 완주시키고 다음으로 넘어간다(`/afg` 의 순차정신). 다수 프론티어 병렬 fan-out 은 `/fleet-full parallel` 로 명시할 때만(그때만 Workflow 묶음 · §7).

## 0. 인자 파싱
- `frontier:goal, frontier:goal, …` → 그 프론티어 셋(레인). goal = 닿으려는 목표/천장의 1줄.
- 비어있음 → roster `.harness/fleet/full` 읽기 · 없으면 `ARCHITECTURE.json` 의 `blocking-frontiers` + `LAWS[]` 에서 OPEN 프론티어 추론.
- `go` → 도는 캠페인 계속(착륙했는데 미발사 레인 재발사). `stop` → 재발사 중단·drain·roster 삭제·최종 요약.
- `parallel` (또는 `par`) → 순차 기본을 끄고 다수 프론티어를 Workflow 로 동시 발사(§7). 미지정 시 **순차(afg) 기본**.

## 1. 캠페인 개시 (첫 턴)
1. roster 기록: `.harness/fleet/full`, 한 줄당 프론티어명.
2. 각 프론티어를 **research 페이즈(r1)** 로 발사 — 기본은 싼 research(web/arxiv·코드 census · GPU 0 · mini-safe). 프롬프트 자기완결(미시도 레버 + 인용 + "다음 페이즈 명명 + 전환 조건").
   - **순차 기본(afg)**: 프론티어를 **하나씩** foreground `Agent` 로 발사하고 그 라운드 착륙(§2)을 **await** 한 뒤 다음 프론티어로 — 한 번에 한 레인만 in-flight. (한 프론티어 안에서도 페이즈는 research→implement→abstract 순서대로 한 번에 하나.)
   - **`parallel` 일 때만**: 다수 프론티어(≥3) 동시 발사를 `Workflow` 한 번으로 묶어 동시성 cap+큐잉(싼 research 라도 동시 API 스트림 N개 = rate-limit 사망 · commons c27); 1–2개면 background `Agent` 직접.
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
1. **🔬 research** — reference(web/arxiv·문헌·코드 census)로 미시도 레버 특정. 레버 강함 → implement. **레버 약함이어도 abstract 로 직행 금지** — 가장 싼 로컬 implement/probe(작은 n · 단일 케이스 · 무비용)라도 돌려 벽을 측정한 뒤 abstract 로 간다(아래 ②). research 만으로 "레버 없음" 박제는 lazy-ceiling(c14 d · black-box sweep 도 c23 로 금지).
2. **🛠️ implement+measure** — research 가 정당화한 레버만 구현, **출력 수치로 검증**(c2 · 자가판정 금지). 코드 레인 = worktree 격리. 비용 레인 = §5 halt. 측정으로 벽 확인 → abstract 승격.
3. **🧅 abstract** — 누적 법칙(LAWS) census → 한 겹 벗겨 공유 trade-off(메타법칙) 도출 → **💡 escape 원리** 발명(직교 레버). (`fleet-abstract` 규율 상속.)
4. **🎯 falsify 캐스팅** — escape 를 반증가능 예측 + 가장 싼 반증 계산으로 만들어 **research/implement 페이즈로 강하**(추상이 경험에 새 표적을 준다). 추상만으로 발견 박제 금지(d6).
5. **📊 record→SSOT (매 착륙 필수)** — 측정·메타법칙·escape·falsify 트랙을 `ARCHITECTURE.json`(`blocking-frontiers` + `LAWS`) + 메모리에 박제. 다음 세션이 SSOT 한곳에서 표적을 본다.
6. **🛰️ 캠페인 report(§4) — 이 턴 필수.**

모든 프론티어 🧱/🌌/📦/resolved → `.harness/fleet/full` 삭제 + 최종 요약.

## 3. 페이즈 전환 규율 (핵심 · implement 스킵 금지)
- **research→implement (스킵 금지)**: research 착륙 후 **항상 implement 를 시도한다** — 레버가 강하면 그 레버로, 약해도 *가장 싼 falsify 실험*(작은 n·단일 케이스·로컬·무비용)으로. research→abstract **직행은 금지**: 유일한 예외는 implement 가 물리적으로 불가능(측정 대상 자체가 없음)할 때뿐이고, 그때도 report 에 `implement-N/A:<이유>` 를 명시한다. "고신뢰 레버 못 찾음" 은 스킵 사유가 **아니다**.
- **implement→abstract**: 경험적 레버가 **측정으로** 소진됐을 때(🧱). abstract 승격은 **그 라운드에 측정 수치(c2)가 있을 때만** — 측정 없는 abstract 승격 금지(얕은 "못한다" 박제 금지 · 벽은 measured). abstract 페이즈 진입 전제 = 직전 implement 라운드의 캡처된 수치.
- **abstract→research**: escape 가 **반증가능 예측 + 싼 반증 관측**을 낳았을 때. 막연한 사변으로 강하 금지.
- **reopen**: 🧱(새 research 레버) · 🌌(새 lens) 둘 다 reopenable. 한 프론티어가 research↔implement↔abstract 를 여러 번 왕복할 수 있다.
- **lazy-ceiling 금지(c14 d)**: "끝"은 research census + 추상 peel 을 **둘 다** 소진한 뒤에만. 1-pass 직관 박제 금지.
- **mechanism-family census (벽 선언의 필수 전제)**: abstract 페이즈는 *직교 매커니즘 family* 를 census 해야 한다 — 한 family(예: precision-emulation = FP16-split·INT8-split·scheduling)만 측정-소진한 건 dry 아님. 다른 family(sparsity · sub-cubic · fusion · megakernel · 작업분해 …)를 인용으로 enumerate 한 뒤 각각 falsify 해야 양축 dry. "3 레버 다 falsify" 가 같은 family 면 🧱 아님 → 직교 family 로 reopen(🔓). (실전: TF32 "하드웨어 천장" 이 emulation family 만 본 착각이었고 megakernel/Stream-K family 가 미탐색이었다.)
- **착륙 = 수치 (c2)**: agent 가 측정 수치 없이 landing/"came to rest" 하면 그건 착륙 아님(미완) — 같은 라운드 재발사, 다음 페이즈 전진 금지. 커밋 메시지의 "MEASURED" 주장·LLM 자가판정만으론 부족 · 캡처된 출력이 유일한 증거.

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
- research·abstract 페이즈 → **mini-safe · 무비용 자동 진행**.
- implement 페이즈 — **비용으로만** 게이트한다(페이즈 자체로 게이트 아님): **싼/로컬 implement(무비용 · 로컬 빌드·작은 n·단일 케이스·worktree)는 자동 진행**(research·abstract 와 동급) — 이게 막혀있어서 implement 가 늘 스킵되던 누수를 막는다. **비싼 implement(pool 분산 · GPU rent · 대규모 sweep)만** 4축 박스 + 명시 `go`(자동 rent 금지). 즉 게이트는 "implement 냐" 가 아니라 "돈/대규모냐" 다.
- 파괴적/되돌릴수없는/외부노출(public push·삭제·대량쓰기) → 확인 후 재개.
- Agent 가 rate-limit/socket 으로 죽음 → checkpoint(브랜치/worktree/박제 LAWS)에서 재발사(지수 backoff) — 처음부터 재시작 금지.

## 5.5 장수 측정 agent 규율 (long-runner lifecycle · 핵심 · 실전 박제)
implement 페이즈의 GPU/원격 측정은 흔히 수십 분 걸린다 — 이 구간을 잘못 다루면 **진행을 죽이고 가짜 벽을 박는다**. 규율:
- **느린 ≠ 멈춤**: 무거운 측정(large-n GEMM · FP64 레퍼런스 대조 · n≥8K sweep)은 수십 분이 정상. Monitor-wait 재-arm 통지를 "stall/zombie" 로 오판해 `blocked`/🧱 박제 금지 — measurement-blocked 선언은 **호스트 직접 확인으로 root-cause 측정한 뒤에만**(c2).
- **재-ping 금지 (가장 비싼 실수)**: live 측정 agent 를 ping/resume/SendMessage/TaskStop 하면 매 ping = **resume = 진행 리셋 + "아직 warming up" 재보고** 의 무한루프. 자연 완료(agent 자체 Monitor fire)를 기다린다. 조급한 ping 이 stall 의 *원인* 이 된다.
- **ping 대신 ground-truth**: 막혔는지 의심되면 추정 말고 **호스트에 직접 들어가 실측** — `pool on <host> 'pgrep -af <bench>; nvidia-smi; tail -5 <log>'`. (실전: "8회 stall" 로 보인 lane 이 사실 CPU 99.9%/GPU 0% 로 FP64-CPU-레퍼런스에 갈린 bench 설계결함이었고, ps 한 번이 그걸 즉시 규명했다.)
- **"came to rest" ≠ 결과**: 빈/idle 출력으로 쉰 통지는 terminal 아님 — 산출(브랜치 커밋 · 로그 수치)을 직접 회수. 닫은 lane 의 **좀비 잔향 통지**는 무대응(다시 건드리면 resume).
- **stale 중복 통지 검증**: 늦게 도착한 "came to rest" 는 그 사이 이미 머지/superseded 일 수 있다 — **현재 main/SSOT 와 대조 후에만** 행동. 구(旧) 방향 브랜치를 무검증 머지하면 방금 고친 걸 되돌린다.
- **체크포인트 = 재개의 전제**: agent 가 죽기 전 산출을 브랜치 push 로 보존해야 "재시작" 이 아닌 "재개" 가 된다. 재개는 **좁은 범위(증명 + 수치 회수)** 로 재발사해 rate-limit/throttle 을 회피.

## 6. depletion
모든 프론티어가 🧱(research 레버 0) AND 🌌(abstract lens 0) — 즉 **경험과 추상 양쪽 다 dry** — 이거나 📦(deferred)/resolved → roster 삭제 + 최종 요약. 단 둘 다 차세션 research/lens 로 부활 가능하므로 SSOT 에 다음 표적 + 반증 조건을 남긴다. **양축 dry 는 research probe + 추상 peel 둘 다 소진 후에만**(c14 d) · 그리고 **소진은 직교 mechanism-family 전수**여야 한다(§3).

## 7. 동시성 (순차 기본 · `parallel` 일 때만 fan-out)
**기본은 순차(§1.2)** — 한 번에 한 레인만 in-flight 라 동시성 문제 자체가 없다(rate-limit·부하 최소). `parallel` 인자일 때만 다수 프론티어를 Workflow 로 묶어 발사하고, 그때 **동시 라이브 서브에이전트 스트림은 Workflow cap(min(16,cores−2))을 넘기지 않는다**(c27 · rate-limit 방지 · 자동 큐잉). 어느 모드든 머신 부하 정직하게. implement 라운드는 worktree 격리 + pool 호스트 직렬화(같은 GPU 연타 회피).
