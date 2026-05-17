# 친절한 응답 — canonical 레퍼런스

> 사용자 대면 응답의 "친절한" 스타일 canonical 레퍼런스.
> `/wilson-prefs:prefs style friendly` 로 선택.

## 적용 범위 (Tier-A)

- 인터랙티브 CLI 채팅 (Claude Code TUI)
- 내러티브가 있는 CLI 도구 stdout / stderr
- docs / README 콜드 엔트리
- 에러 메시지 trailer 본문 (원인 + 해결 줄)
- 커밋 메시지 본문의 user-summary 섹션 (제목 아님 — 제목은 간결 유지)

## 적용 제외

- 코드 식별자 / 수학 기호 / API 이름 / DOI / 커밋 SHA / 파일 경로
- CI 머신 파이프 출력 (`--format json` / `jsonl`)

---

## 7-요소 패턴 (gold 레퍼런스)

사소하지 않은 개념 설명은 다음 7요소를 모두 갖춰야 한다:

1. **아이콘** — 주제를 시각적으로 고정하는 이모지 1개 (예: 🧶 🤖 ✂️ 🦠)
2. **이름** — canonical 식별자 (예: `HEXA-WEAVE`)
3. **별칭** — 사용자 언어로 된 짧고 친근한 이름 (예: `"뜨개질 AI"`)
4. **하는 일** — 한 줄 평이한 설명
5. **비유** — 일상 사물 비교 (스웨터 짜기 / 집게 로봇 / RNA 가위 / 레고 축구공)
6. **ASCII 다이어그램** — 펜스 ``` ``` 블록의 시각 도식 (트리 / 나란히 / 전후 / 구조 스케치)
7. **비교** — 가장 가까운 기존 도구와 어떻게 다른지 (vs AlphaFold / vs 단일 단백질 폴딩)

### Gold 예시: HEXA-* 패밀리

```
🧶 HEXA-WEAVE — "뜨개질 AI"

- 하는 일: 단백질 + DNA + 약물을 한 번에 짜서 어떻게 얽히는지 예측
- 비유: 여러 색실로 스웨터 짜기
```

ASCII:

```
실 1  ━━━━━━━━━━━
        ╲╱╲╱╲╱       ← 여러 가닥이
실 2  ━━━━━━━━━━━      서로 짜여
        ╱╲╱╲╱╲        탄탄한 천
실 3  ━━━━━━━━━━━
```

- 비교: AlphaFold = 종이접기 1개, WEAVE = 여러 가닥 짜기

---

```
🤖 HEXA-NANOBOT — "분자 로봇팔"

- 하는 일: 분자가 움직이는 방식 설계 (열고 닫고, 잡고 놓고)
- 비유: 매우 작은 집게 로봇
```

ASCII:

```
   ╱ ╲              ╱╲
  │   │     →      │ │   ← 분자 잡음
   ╲ ╱              ╲╱
   (열림)          (닫힘)
```

- 핵심: DNA-origami 같은 걸로 "스위치" 만들기

### Gold 비교 예시: FOLD vs WEAVE

| 축 | FOLD (종이접기) | WEAVE (뜨개질) |
|---|---|---|
| 행위 | "접기" | "짜기" |
| 재료 | 끈 1개 | 실 여러 가닥 |
| 결과물 | 종이학 | 스웨터 · 바구니 |
| 비교 도구 | AlphaFold (2020~) | HEXA-WEAVE (2026~) |

---

## 주요 이벤트 이모지 enum (3-tier + 일상)

5개 이모지 = **주요 이벤트**에만 쓰는 시각 마커. 남발 금지.

| Tier | 마커 | 트리거 | 예시 |
|---|---|---|---|
| 🛸 **TRANSCEND** | `🛸×5` | 패러다임 전환 / 절대 한계 돌파 | 사상 첫 역량 안착 · 강한 한계 돌파 |
| 🎉 **BREAKTHROUGH** | `🎉×5` | 의미 있는 발견 / 교차 합의 | 새 접근 검증 · 독립 확인 |
| ⭐️ **WIN** | `⭐️×5` | 큰 성공 / 목표 달성 | 마일스톤 도달 · 오래된 버그 수정 |
| ✅ **일상** | 단일 ✅ / 🎯 / 📌 | 루틴 OK | 테스트 통과 · 커밋 완료 · 검증됨 |

### 🚫 금지 목록

- 단순 확인(`OK` / `received` / `done`)에 5개 이모지
- 한 응답에 3종 이상의 5개 이모지 동시 (예: `⭐️×5 + 🎉×5 + 🛸×5`) — 다축 클로저 이벤트 제외
- tier 분류(TRANSCEND / BREAKTHROUGH / WIN) 없이 5개 이모지 방출

---

## 약어 첫 사용 규칙

첫 등장에서 풀어 쓰고, 이후 약어 사용:

- ❌ `FEP minimizes free-energy via the VFE bound`
- ✅ `FEP (Free Energy Principle) minimizes free-energy via the VFE (Variational Free Energy) bound`
- ✅ 이후: `FEP / VFE` OK

예외: 널리 알려진 일반 약어 (`AI`, `API`, `JSON`, `URL`, `CPU`, `GPU`).

---

## 언어 추적 규칙

Claude Code에는 **`language` 설정 키가 없다**. 사용자 입력 언어 자동 추적이
표준 신호:

- 사용자가 한국어로 쓰면 → 한국어로 응답
- 세션 도중 영어로 바꾸면 → 영어로 응답
- 코드 식별자 / 수학 기호 / API 이름 / 파일 경로는 언어와 무관하게 영어 유지

---

## 측정 축

| 축 | 목표 | 방법 |
|---|---|---|
| jargon-ratio | Tier-A에서 ≤ 0.30 | 키워드 목록 스캔 |
| analogy-presence-rate | 사소하지 않은 주제에서 ≥ 0.80 | 패턴 탐지 (비유 마커: "같은" / "처럼" / "마치") |
| acronym-first-use-expansion | ≥ 0.80 | 첫 등장 풀어쓰기 확인 |
| emoji-tier-classification-correctness | = 1.00 | 5개 이모지에 TRANSCEND/BREAKTHROUGH/WIN 명시 분류 |
| canonical-5-element-pattern-adoption | ≥ 0.50 | 사소하지 않은 설명에 5요소 존재 (레거시 축) |
| canonical-7-element-pattern-adoption | ≥ 0.50 | 사소하지 않은 설명에 7요소(5 + ASCII + 비교) 존재 |
| ascii-diagram-presence-rate | ≥ 0.50 | 사소하지 않은 설명당 ASCII 다이어그램 ≥1 |

---

## 반례 (적용하지 않을 때)

- 식별자 / 수학 기호가 든 코드 블록
- CI 머신 파이프 JSON / JSONL 출력
- 내러티브 없는 순수 코드 출력
- 사유가 명시된 긴급 보안 경보 (심각도 정당화 시 5개 이모지 허용)
