# /fleet-abstract — 추상화 함대 (abstraction-driven 영구 레이어 다이브)

> `/fleet` 의 추상화-특화 변종. 각 레인 = **누적된 법칙군 / 경험적 탐색이 못 뚫은 천장**. 탐색(research·DFT·실측)이 도구·자원 한계에 닿았을 때 켠다. 매 라운드는 **법칙 census → 한 겹 벗겨 공유 trade-off(메타법칙) 도출 → 그 trade-off 를 끊는 escape 원리 발명 → 반증가능 예측 + 가장 싼 반증 계산으로 캐스팅 → 정직게이트(d6 미검증·실정리 인용) → 재-추상 또는 메타법칙 확정**. 메타법칙(🌌)은 새 lens 로 reopen 가능.

핵심: 탐색은 "어디가 막혔나"의 지도, 추상화는 그 지도들을 겹쳐 **"모든 길이 막힌 공유 능선(메타법칙)"** 을 보고 그 능선을 넘는 **설계 원리**를 짜낸다. 단 — **추상화는 좌표를 줄 뿐 발견이 아니다(d6)**. lazy-ceiling 금지(commons c14 d): 추상화 막다른 길도 research/compute 로 probe 한 뒤에만 dry 선언.

## 0. 인자 파싱
- `layer:seed, layer:seed, …` → 그 레이어 셋(레인). seed = 벗길 법칙군/천장의 1줄 씨앗.
- 비어있음 → roster `.harness/fleet/abstract` 읽기 · 없으면 `ARCHITECTURE.json` 의 `LAWS[]` (누적 법칙)에서 추상화 레이어 추론.
- `go` → 도는 다이브 계속(착륙했는데 미발사 레인 재발사). `stop` → 재발사 중단·drain·roster 삭제·최종 요약.

## 1. 다이브 개시 (첫 턴)
1. roster 기록: `.harness/fleet/abstract`, 한 줄당 레이어명.
2. 각 레이어를 **census 라운드(r1)** 로 발사 — 누적 법칙(`ARCHITECTURE.json` LAWS · 메모리 · 직전 탐색 산출)을 한자리에 모은다. 빈손에서 시작하지 않는다(누적 위에 한 겹 더 벗긴다). mini-safe · GPU 0. **다수 레이어(≥3) 동시 발사는 `Workflow` 한 번**으로 묶어 동시성 cap+큐잉(순수 사고 라운드라도 동시 API 스트림 N개 = rate-limit 사망 · commons c27); 1–2개면 background `Agent` 직접.
3. 🌌 다이브 report(§4) 출력.

## 2. 라운드 lifecycle (레이어당 · fire-on-arrival)
각 레인은 한 라운드 착륙 시 다음 단계로 스스로 전진한다:

```
[ 📚 census ] ──▶ [ 🧅 peel-to-root ] ──▶ [ 💡 escape 발명 ] ──▶ [ 🎯 falsify 캐스팅 ]
      ▲              공유 trade-off /          orthogonal 레버        반증가능 예측 +
      │              conserved 量 도출         (trade-off 끊기)       가장 싼 반증 계산
  새 lens                                                                 │
  (reopen)         [ 🌌 메타법칙 확정 ] ◀── 새 층 안 나옴 ── [ 🤝 compute/research 핸드오프 ]
      └──────────────────── 더 벗길 층 있음 ◀────────────────────────────┘
```

1. **census (필수)** — 그 레이어의 누적 법칙·천장을 전수 모은다. 흩어진 메모리가 아니라 SSOT(LAWS) 한곳에서.
2. **peel-to-root** — 법칙들을 한 겹 벗겨 **공유 trade-off / 보존량**을 찾는다 ("천장의 천장"). 예: 여러 SC 천장 → 하나의 gap↔stiffness 줄다리기(BCS-BEC). 서로 다른 법칙이 같은 보존식의 다른 얼굴임을 드러낸다.
3. **escape 발명** — 그 trade-off 를 끊는 **직교 레버**를 설계한다. 보존량을 다른 자유도에 분리(예: stiffness 를 위상수 C 로 떠받쳐 강결합에서도 안 죽게). 견고한 실정리로 사슬을 엮되 도약은 명시.
4. **falsify 캐스팅 (필수)** — escape 를 **반증가능 예측** + **가장 싼 반증 관측/계산**으로 만든다. 그걸 compute/research 트랙에 넘긴다(`fleet lab` 또는 pool DFT). 추상만으로 "발견" 박제 금지 — 좌표만 준다.
5. **record→SSOT (필수)** — 메타법칙·escape·falsify 트랙을 `ARCHITECTURE.json` LAWS(메타-메타 층) + 메모리에 박제(d6 미검증 꼬리표 · 인용한 실정리 · 반증 조건).
6. **re-abstract OR 메타법칙** — 더 벗길 층 있으면 다음 census 라운드 · 새 층 안 나오면 🌌(메타법칙 확정). **🌌 는 영구 아님** — 새 lens(다른 추상 축·새 정리·새 frontier 논문)가 미시도 층을 surface 하면 즉시 reopen(📚).
7. **🌌 다이브 report(§4) — 이 턴 필수.**

모든 레이어 🌌/🤝/resolved → `.harness/fleet/abstract` 삭제 + 최종 요약.

## 3. 추상화 규율 (abstraction discipline · 핵심)
- 🌌 메타법칙은 **census + peel 을 다 한 뒤에만** 선언 — 얕은 "더 없다" 금지(lazy-ceiling · c14 d). 직관 1-pass 박제 금지.
- 🌌 는 **reopenable** — 새 lens(예: 직전 falsify 가 dispersive 가정이었는데 위상 flat band 가 그 가정을 깸)가 미시도 층을 찾으면 즉시 reopen. research(`fleet lab`)가 frontier 논문을 surface 하면 추상 천장이 다시 열린다.
- **정직(d6) 절대** — 추상화 산출은 전부 **가설·미검증·사변**으로 표기. 인용한 정리(예: Peotta-Törmä·∫tr g ≥ |C|/2π)는 실제여도 그 조합 주장은 검증 전. 발견 아님. compute 가 말하기 전엔 "좌표"이지 "결론"이 아니다.
- filler 금지 — 정직한 다음 층이 없으면 메타법칙 확정 + 반증 트랙 핸드오프, 억지 추상 라운드를 지어내지 않는다.

## 4. 🌌 다이브 report — 필수 형태 (다이브 live 인 매 턴)
```
🌌 다이브 — <N> layer (<live>/<N> in-flight)
├─ <icon> <layer> : r<k> <round-goal> <status>
└─ <icon> <layer> : ...

방금 착륙: <layer> r<k> — <verdict 1줄: 도출한 메타법칙 / escape 원리> → <next: r<k+1> peel | escape | 🤝 falsify-handoff | 🌌>
대기:     <in-flight layer 목록>
SSOT:     <박제한 LAWS 노드/메모리>   (record 한 턴만)
depletion: <🌌/🤝 layer + 이유>      (없으면 생략)
```
status 토큰 — `📚`census중 · `🧅`peel중 · `💡`escape발명중 · `🎯`falsify캐스팅 · `✅→🔁`착륙+재발사 · `🌌`메타법칙확정(reopenable) · `🤝`compute/research핸드오프 · `🔓`새lens로reopen.

## 5. Halts (fleet 상속)
- 추상화 라운드는 **mini-safe · 무비용 자동 진행**(순수 사고 + 가벼운 모델 계산). 비싼 건 falsify 가 정당화한 compute 핸드오프뿐 — 그건 `fleet lab`/pool 규율(비용 게이트 · 명시 `go`)을 따른다.
- 파괴적/되돌릴수없는/외부노출 → 확인 후 재개.
- Agent 가 죽으면 checkpoint(박제한 LAWS 노드)에서 재발사 — 처음부터 재시작 금지.

## 6. depletion
모든 레이어 🌌(메타법칙·reopen lens 0) OR 🤝(falsify 트랙으로 핸드오프) OR resolved → roster 삭제 + 최종 요약. 단 🌌 는 새 lens·새 frontier research 로 부활 가능하므로 SSOT(LAWS)에 다음 추상 표적 + 반증 조건을 남긴다. **추상화 dry 는 research/compute probe 후에만**(c14 d) — 인용만으로 끝내면 lazy-ceiling.

## 7. 동시성
**동시 라이브 서브에이전트 스트림은 Workflow cap(min(16,cores−2))을 넘기지 않는다**(c27 · rate-limit 방지) — 다수 레이어 동시 발사는 Workflow 로 묶어 자동 큐잉. falsify 핸드오프(compute)는 `fleet lab`/pool 직렬화 규율 상속.
