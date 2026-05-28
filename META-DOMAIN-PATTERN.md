# meta-domain pattern — composable orchestrator domains

> `+` 표기로 다른 도메인을 합성하는 상위 도메인 패턴. 단일 도메인이 cross-cut 작업의 SSOT 가 되지 못할 때 사용.

## 개요

```
🪆 META-DOMAIN — "도메인의 도메인"

- 하는 일: 여러 sub-domain 을 한 우산 아래 묶어 cross-cut orchestrate
- 비유: 마트료시카 — 큰 인형 안에 작은 인형들
```

ASCII:

```
   ANIMA (meta · "+" 합성)
       ├─ DECODER     (sub-domain · 자체 .md/.log.md/milestone)
       ├─ BRIDGE      (sub-domain)
       ├─ METACOG     (sub-domain)
       ├─ DREAM       (sub-domain)
       ├─ INTENT      (sub-domain)
       ├─ SAVANT      (sub-domain)
       └─ HIVE-MIND   (sub-domain)
```

| 축 | 일반 domain | meta-domain |
|---|---|---|
| 표기 | `DECODER` | `ANIMA` (sub들의 우산) |
| NAME 패턴 | UPPERCASE-start + UPPERCASE/digits/`-` | + `+` 가 추가 허용 (e.g. `RTSC+HTS`) |
| 책임 | 한 lane 의 SSOT | cross-lane orchestration · 진행도 집계 |
| sub-domain 관계 | flat (혼자) | parent → children (분배·롤업) |
| roster 등록 | `DOMAINS.tape` 1 행 | parent 1 행 + 각 child 별 1 행 |

vs 일반 domain: 자체로 작업 단위. **meta-domain** = 작업 단위 ❌ → orchestrator 단위 ✅. milestone 은 child 들의 진행도 집계 또는 cross-cut goal (모든 child 가 동시 만족해야 close 가능).

## 언제 만드는가

다음 셋 모두 충족 시:

1. **lane 분리 가능** — 작업이 명확히 N 개 sub-lane 으로 나뉘고 각 lane 이 자기 milestone/log/PR 흐름을 갖는다.
2. **cross-lane 결합도** — sub-lane 들이 완전 독립이 아니며 (별 repo 였다면 충분), 한 우산에서 진행도/우선순위 조율이 필요하다.
3. **single domain 한계** — 한 `<NAME>.md` 에 다 넣으면 milestone 이 30+ 로 폭주하거나 lifecycle (experiments/roadmap/backlog) 가 섞여 닫기 어렵다.

## 합성 표기 (`+`)

```
RTSC+HTS    = RTSC 와 HTS 를 합쳐 하나의 작업 단위로 보는 ad-hoc 합성
ANIMA       = 7 sub-domain (DECODER, BRIDGE, ...) 의 정식 meta (parent 명명)
```

- `+` 형식: 가벼움 — 단발성 cross-domain 작업 (PR 한두건 후 해체)
- parent-name 형식: 무거움 — 장기 orchestrator (sub-domain 들이 영구적 lane)

## roster + lifecycle

`DOMAINS.tape` 에는 parent + 각 child 가 별도 행으로 등록된다:

```
ANIMA       | anima/ANIMA.md             | meta
DECODER     | anima/decoder/DECODER.md   | sub-of:ANIMA
BRIDGE      | anima/bridge/BRIDGE.md     | sub-of:ANIMA
...
```

bare `/domain` 은 active 도메인 (parent 든 child 든) 하나만 표시. parent 의 progress bar 는 child 들의 가중 평균 (또는 명시적 milestone 의 직접 합).

## anti-pattern

- **flat 도메인을 30+ milestone 로 폭주시키지 않는다** — meta 로 split 하라는 신호.
- **단일 lane 작업에 meta 를 적용하지 않는다** — over-engineering. 일반 domain 으로 충분.
- **meta 의 milestone 을 child 들과 중복으로 트래킹 하지 않는다** — child 의 milestone 닫힘이 parent 의 진행도로 자동 집계되도록 설계.
- **`+` 합성 후 해체 시 child 도메인을 지우지 않는다** — child 는 자체 SSOT 로 계속 산다. 합성은 view 일 뿐.

## 참고

- 일반 domain spec: `skills/domain/SKILL.md`
- candidate orchestration 의 build/fire phase 분리 (domain-agnostic): commons `@D g75` (build = `/cycle-bg <domain>` · fire = `/micro-exp <scope>`)
- meta-domain 의 build phase 는 `/cycle-bg <parent>` 로 모든 child 의 infra 동시 prep 가능
