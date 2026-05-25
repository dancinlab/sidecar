---
type: policy
scope: sidecar autonomous loop (/cycle) + domain SSOT (/domain) — all dancinlab projects
principle: the loop may declare a domain "done" ONLY from a fresh, live SSOT — and a perpetual domain is NEVER done
ssot: sidecar/CLOSURE_POLICY.md (this file) — enforced by cycle @D ssot_freshness + @D perpetual_domain + domain _stale_shadow_warn/_is_perpetual
---

# CLOSURE_POLICY — 자율 루프의 "닫힘" 정직성 정책

> `LATTICE_POLICY.md` 의 자매. lattice 가 *한계 주장*의 정직성("천장은 진짜 물리 한계여야 한다")이라면, 이건 *닫힘 주장*의 정직성("도메인이 끝났다는 판정은 진짜여야 한다"). `/cycle` 의 depletion 판정과 `/domain` 의 진행도가 **가짜 100%** 를 외치지 않도록 한다. 원칙 뿌리 = `feedback-closure-is-physical-limit`.

## 왜 — 촉발 사건 (LIFE-class false closure)

anima `LIFE` 도메인이 매 `/cycle` 라운드 헤매다 잘못 `✅ domain depleted — loop terminates`(100% 종료)를 외쳤다. 근본원인은 **2겹**이었고, 둘 다 "루프가 잘못된 입력을 신뢰" 한 문제였다.

```
  /domain set LIFE                /cycle
  ────────────────                ──────
  working tree 의 LIFE.md          0 open · no deferred
  = orphan-recover 브랜치가          ↓ (stale 입력 맹신)
    추적 해제한 STALE 사본     ──▶  ✅ depleted (거짓 100%)
    (전부 [x], perpetual            │
     @goal 누락)                    └─ 진짜 origin/main 의 LIFE.md 는
  + DOMAINS.tape 미등록(ghost)         "영구 엔진"(열린 축 A~D) 이었음
```

| # | 근본원인 | 결과 |
|---|---|---|
| 1 | **stale untracked SSOT shadow** — working-tree `LIFE.md` 가 origin/main 의 live 버전을 가린 옛 사본 | depletion 을 옛 닫힌 사본 기준으로 판정 |
| 2 | **perpetual 도메인 오취급** — `@goal` 이 "종료 조건 없음" 인데 종료 가능한 일반 도메인처럼 다룸 | 종료-없는 도메인에 terminal closure |

## 두 기둥

### 1. SSOT 신선도 — stale shadow 를 신뢰하지 않는다

**원칙**: 루프는 **LIVE SSOT** 만 신뢰한다. working-tree 사본이 (a) **UNTRACKED** 이거나 (b) **origin/main 보다 뒤처지면** = stale shadow → 진행도·닫힘 판정의 근거로 쓰지 않는다.

| 메커니즘 | 위치 | 시점 |
|---|---|---|
| `_stale_shadow_warn` | domain `_domain.hexa` | `/domain set <NAME>` |
| `@D ssot_freshness` | cycle `SKILL.md` + `cycle.md`·`cycle-full.md` | Stage 0 (enumerate·depletion 前) |

- **fail-open**: git repo 가 아니거나 `origin/main` ref 가 없으면 조용히 skip — 가드가 작업을 막지 않는다.
- **surface, don't overwrite**: 자동 `git checkout` 으로 덮어쓰지 **않는다**. 사용자의 의도적 로컬 편집일 수 있고, working tree 는 다세션 공유다. 경고만 띄우고 reconcile 은 사용자/부모가 결정한다.

### 2. 닫힘 정직성 — depletion ≠ done · perpetual = never terminal

**원칙** (`feedback-closure-is-physical-limit`): "끝"은 100% 체크박스가 아니라 **물리/수학 한계**(perf 도메인) 또는 **open horizon**(탐구 도메인)이다.

| 도메인 종류 | 닫힘 의미 | 메커니즘 |
|---|---|---|
| **perpetual** (@goal 에 종료-없음 마커) | **절대 terminal 없음** — lane 소진 시 ♾️ pause + 선언된 축에서 재시드 | domain ♾️ 배지 (`_is_perpetual`) · cycle `@D perpetual_domain` |
| **일반 (exploratory/perf)** | $0 lane 소진 = **PAUSE**, 위 lane(cost-bearing·larger-spec·intractable-limit)은 OPEN | cycle `@D depletion_not_terminal` |
| **진짜 finite-scope** | 모든 기준 충족 + 열린 physical-limit frontier 없음 → ✅ terminal (드묾) | 명시적으로만 |

**perpetual 마커** (KO+EN, `_is_perpetual` 과 동일): `종료 조건 없음` · `완료되지 않` · `100% 미도달` · `미도달 = 설계` · `영구` · `끝없` · `perpetual` · `open horizon` · `no termination` · `never terminal`.

### 보조 — roster self-heal

도메인 스냅샷이 디스크엔 있는데 `DOMAINS.tape` 에 미등록이면(LIFE 가 ghost 였던 갭), `/domain set` 이 `_ensure_roster` 로 roster row 를 자동 등록한다. 미등록 도메인이 `/domain list` 에서 사라지거나 `/cycle` 이 해석 못 하는 일을 막는다.

## 설계 방향 (원칙)

1. **SSOT = single LIVE source.** working tree 는 origin/main 과 reconcile 되기 전엔 SSOT 가 아니다 — 검증 없이 신뢰하지 않는다.
2. **정직성 > 진행감.** 가짜 100% 보다 정직한 PAUSE (commons g3 honesty). 닫힘은 증명해야 하는 주장이지 기본값이 아니다.
3. **fail-open 가드.** 가드는 경고/스킵만 하고 작업을 hard-block 하지 않는다 — 오탐이 워크플로를 막으면 안 된다.
4. **surface, don't act.** 파괴적 reconcile(덮어쓰기)은 사용자/부모가. 가드는 신호만 표면화. (다세션 공유 워킹트리 안전.)
5. **마커 기반 일반화** (commons g20). 도메인 종류를 하드코딩하지 않고 `@goal` 마커로 perpetual 여부를 런타임 판정 — 새 perpetual 도메인은 코드 변경 0.

## 구현 매핑

| 가드 | 종류 | 위치 | 버전 | 막는 LIFE-원인 |
|---|---|---|---|---|
| `_stale_shadow_warn` | domain helper | `_domain.hexa` | domain 0.8.8 | #1 stale shadow |
| `@D ssot_freshness` | cycle 거버넌스 | `cycle/SKILL.md` + commands | cycle 0.7.7 | #1 stale shadow (depletion read) |
| `_is_perpetual` + ♾️ 배지 | domain helper | `_domain.hexa` `_show` | domain 0.8.8 | #2 perpetual 오취급 |
| `@D perpetual_domain` | cycle 거버넌스 | `cycle/SKILL.md` + commands | cycle 0.7.7 | #2 perpetual 오취급 |
| `_ensure_roster` | domain helper | `_domain.hexa` | domain 0.8.8 | 보조 (ghost roster) |

## 검증

- **격리 temp git repo** 에서 LIFE 재현(untracked perpetual 스냅샷 + roster 미등록) → `/domain set` 이 roster 자동등록 + UNTRACKED 경고 + ♾️ 배지 3개 전부 출력.
- **live GPU 도메인** 에서 `_stale_shadow_warn` 의 BEHIND-main 신호 실측 (working-tree GPU.md 가 origin/main 보다 뒤처짐을 실제로 캡처).

## 관련

- `feedback-closure-is-physical-limit` (원칙 뿌리 · perf=roofline %, 탐구=open horizon)
- `LATTICE_POLICY.md` (자매 — 한계 주장의 정직성)
- `reference_domain_init_untracked_ssot` (untracked SSOT 패턴)
- commons `@D g58` (cycle = active-domain 한정) · `DESIGN.log.md` Decision 7 (INBOX 도메인)
