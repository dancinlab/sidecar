# /fleet-lab — 연구 함대 (research-driven 영구 프론티어 랩)

> `/fleet` 의 연구-특화 변종. 각 레인 = **막힌 프론티어(벽)**. 매 라운드는 **싼 research(web/arxiv·코드 census, mini-safe) 먼저 → 고신뢰 미시도 레버를 찾을 때만 비싼 implement/measure(pool/GPU/build) 로 escalate → 측정(c2) → SSOT 박제 → 재-research 또는 벽 확정**. 벽(🧱)은 새 research 로 reopen 가능.

핵심: fleet 의 fire-on-arrival 위에 **research-gate** 를 얹는다 — "벽이다" 단정 전에 항상 정답지(reference) 한 겹 더 펼친다(c23 reference-first · implement-to-wall). 싼 정찰이 비싼 구현을 정당화한다.

## 0. 인자 파싱
- `frontier:wall, frontier:wall, …` → 그 프론티어 셋(레인). wall = 닫으려는 벽의 1줄 목표.
- 비어있음 → roster `.harness/fleet/lab` 읽기 · 없으면 `ARCHITECTURE.json` 의 `blocking-frontiers` 노드에서 OPEN 프론티어 추론.
- `go` → 도는 랩 계속(착륙했는데 미발사 레인 재발사). `stop` → 재발사 중단·drain·roster 삭제·최종 요약.

## 1. 랩 개시 (첫 턴)
1. roster 기록: `.harness/fleet/lab`, 한 줄당 프론티어명.
2. 각 프론티어를 **research 라운드(r1)** 로 발사 — 기본은 **싼 research Agent**(web/arxiv·문헌·코드 census · GPU 0 · mini-safe). 비싼 implement 는 research 가 정당화한 뒤에만(§2 gate). 프롬프트 자기완결(미시도 레버 탐색 + 인용 + "다음 라운드 명명 + depletion 테스트"). **다수 프론티어(≥3) 동시 발사는 `Workflow` 한 번**으로 묶어 동시성 cap+큐잉 — 싼 research 라도 동시 API 스트림 N개면 **rate-limit 사망**한다(commons c27); 1–2개면 background `Agent` 직접.
3. 🔬 랩 report(§4) 출력.

## 2. 라운드 lifecycle (프론티어당 · fire-on-arrival)
각 레인은 한 라운드 착륙 시 다음 단계로 스스로 전진한다:

```
[ 🔬 research ] ──고신뢰 미시도 레버?──▶ [ 🛠️ implement+measure ]
       ▲              │ 아니오                      │ c2 측정
       │              ▼                             ▼
  새 research     [ 🧱 벽 확정 ]  ◀─ 레버 소진 ─ [ 📊 record→SSOT ]
  (reopen)                                          │
       └──────────────── 잔여 레버 있음 ◀───────────┘
```

1. **research-gate (필수)** — 비싼 라운드(pool/GPU/build) 전에 reference(web/arxiv·CUTLASS·문헌·커널명 디코드·코드 census)로 미시도 레버를 먼저 특정한다. 고신뢰 레버가 없으면 implement 하지 않는다(black-box sweep 금지 · c23).
2. **implement+measure** — research 가 정당화한 레버만 구현하고 **출력 수치로 검증**(c2 · LLM 자가판정 금지 · 캡처된 명령 출력이 증거). 코드 편집 레인 = worktree 격리. 비용 레인은 §5 halt.
3. **record→SSOT (필수)** — 측정 결과를 `ARCHITECTURE.json` 의 `blocking-frontiers` 노드 + 메모리에 박제한다(측정 root-cause + 인용 + 다음 research 표적). 다음 세션 research 가 흩어진 메모리 대신 SSOT 한 곳에서 표적을 본다.
4. **re-research OR 벽** — 잔여 레버 있으면 다음 research 라운드 발사 · 레버 소진 + 측정으로 벽 확인 시 🧱(measured-wall). **🧱 는 영구 아님** — 새 reference 가 미시도 레버를 surface 하면 즉시 reopen(🔬).
5. **🔬 랩 report(§4) — 이 턴 필수.**

모든 프론티어 🧱/📦/resolved → `.harness/fleet/lab` 삭제 + 최종 요약.

## 3. 벽 규율 (wall discipline · 핵심)
- 🧱 는 **측정으로만** 선언 — 얕은 "못한다" 금지. researched 레버를 전수 구현·측정한 뒤에만.
- 🧱 는 **reopenable** — 새 research(다른 축·신기법·벤더 커널명 디코드 등)가 미시도 레버를 찾으면 즉시 reopen. (예: parity 벽 → cuBLAS split-K 커널명 발견 → reopen → 부분 승리.)
- filler 금지 — 정직한 다음 레버가 없으면 벽, 억지 라운드를 만들지 말 것(commons c3 anti-punt 의 반대편: 없는 진척을 지어내지 않는다).

## 4. 🔬 랩 report — 필수 형태 (랩 live 인 매 턴)
```
🔬 랩 — <N> frontier (<live>/<N> in-flight)
├─ <icon> <frontier> : r<k> <round-goal> <status>
└─ <icon> <frontier> : ...

방금 착륙: <frontier> r<k> — <verdict 1줄: 인용/측정수치> → <next: r<k+1> research | implement | 🧱>
대기:     <in-flight frontier 목록>
SSOT:     <record 한 노드/메모리>   (record 한 턴만)
depletion: <🧱/📦 frontier + 이유>  (없으면 생략)
```
status 토큰 — `🔬`research중 · `🛠️`implement+measure중 · `📊`측정착륙 · `✅→🔁`착륙+재발사 · `🧱`측정벽(closed·reopenable) · `📦`deferred(risk/cost) · `💰`비용대기(go 대기).

## 5. Halts (fleet 상속)
- 비용 레인(pool/GPU rent) → 4축 박스 + 명시 `go`(자동 rent 금지). **research 라운드는 mini-safe 라 무비용 자동 진행** — 비싼 건 research 가 정당화한 implement 뿐.
- 파괴적/되돌릴수없는/외부노출(public push·삭제·대량쓰기) → 확인 후 재개.
- Agent 가 rate-limit/socket 에러로 죽음 → checkpoint 브랜치/worktree 남김 → 거기서 재발사(지수 backoff), 처음부터 재시작 금지.

## 6. depletion
모든 프론티어 🧱(측정벽·reopen 레버 0) OR 📦(deferred) OR resolved → roster 삭제 + 최종 요약. 단 🧱 는 차세션 research 로 부활 가능하므로 SSOT(`blocking-frontiers`)에 다음 표적을 남긴다.

## 7. 동시성
**동시 라이브 서브에이전트 스트림은 Workflow cap(min(16,cores−2))을 넘기지 않는다**(c27 · rate-limit 방지) — 다수 프론티어 동시 발사는 Workflow 로 묶어 자동 큐잉. 그 안에서 머신 부하 정직하게. implement 라운드는 worktree 격리 + pool 호스트 직렬화 고려(같은 GPU 연타 회피).
