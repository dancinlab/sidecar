# Friendly response — canonical reference

> Canonical reference for **raw 165 user-facing-response-friendliness-mandate**.
> Pinned 2026-04-28 per queue approval `req-raw165-user-facing-response-friendliness-mandate`.
> User-marked "완벽" on 2026-04-28 HEXA-* explanation session.

## Surfaces in scope (Tier-A)

- Interactive CLI chat (Claude Code TUI / hive coding-agent interactive)
- CLI tool stdout / stderr (hive / nexus / anima / hexa-lang / CANON)
- docs / README / `.guide` cold-entry
- raw 66 ai-native-error trailer body (reason + fix lines)
- commit-message body user-summary section (NOT title — title remains terse)

## Out-of-scope

- SSOT files `.raw` / `.own` / `.roadmap` / `.ext` / `.chain` — raw 33 ai-native-english-only takes priority
- Code identifiers / math symbols / API names / DOI / commit SHA / file paths
- CI machine-pipe output (`--format json` / `jsonl`)

---

## 7-element pattern (gold reference)

> Strengthened 2026-04-29 — ASCII diagram element added (raw 165 strengthening 2026-04-29 ascii-diagram-element-mandatory). User session 2026-04-29 surfaced ASCII visualization gap; gold reference HEXA-* response 2026-04-28 already shipped ASCII (4-Sister tetrahedron + FOLD-vs-WEAVE side-by-side) but pattern declaration missed it. Now canonical 7-element.

Every non-trivial concept explanation should hit these 7 elements:

1. **Icon** — single emoji that visually anchors the topic (예: 🧶 🤖 ✂️ 🦠)
2. **English-name** — canonical identifier (예: `HEXA-WEAVE`)
3. **Locale-nickname** — short friendly name in user's input language (예: `"뜨개질 AI"`)
4. **What-it-does** — one-line plain description
5. **Analogy** — everyday-object comparison (스웨터 짜기 / 집게 로봇 / RNA 가위 / 레고 축구공)
6. **ASCII-diagram** — visual schematic in fenced ``` ``` block (tree / side-by-side / before-after / structural sketch)
7. **Compare** — how it differs from existing tool (vs AlphaFold / vs single-protein folding)

### Gold example: HEXA-* family

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

### Gold comparison example: FOLD vs WEAVE

| 축 | FOLD (종이접기) | WEAVE (뜨개질) |
|---|---|---|
| 행위 | "접기" | "짜기" |
| 재료 | 끈 1개 | 실 여러 가닥 |
| 결과물 | 종이학 | 스웨터·바구니 |
| 비교 도구 | AlphaFold (2020~) | HEXA-WEAVE (2026~) |

---

## Major-event emoji enum (3-tier + everyday)

5-count emoji = visual marker reserved for **major events**. Inflation banned.

| Tier | Marker | Trigger | Examples |
|---|---|---|---|
| 🛸 **TRANSCEND** | `🛸×5` | Paradigm shift / absolute limit breakthrough | raw 18 self-host fixpoint first achievement · raw 137 80% target ACHIEVED byte-canonical · 4-sister cycle closure |
| 🎉 **BREAKTHROUGH** | `🎉×5` | Meaningful discovery / cross-repo consensus | New paradigm raw + 5/5 sister consensus (raw 47) · σ(6)=12 first verification · falsifier RETIRED |
| ⭐️ **WIN** | `⭐️×5` | Major success / target reached | raw warn → live promotion · kick witness verdict PASS · 30d 0-violation streak |
| ✅ **everyday** | single ✅ / 🎯 / 📌 | Routine OK | selftest PASS · commit land · byte-eq round-trip verified |

### 🚫 BAN list

- 5-count emoji on simple acknowledge (`OK` / `received` / `done` / `진행`)
- 3+ different 5-count emoji types in single response (e.g. `⭐️×5 + 🎉×5 + 🛸×5` simultaneously) — outside multi-axis closure events only
- 5-count emoji emit without explicit tier classification (TRANSCEND / BREAKTHROUGH / WIN)

---

## Acronym first-use rule

Expand on first occurrence, abbreviate after:

- ❌ `FEP minimizes free-energy via VFE bound`
- ✅ `FEP (Free Energy Principle) minimizes free-energy via the VFE (Variational Free Energy) bound`
- ✅ subsequent: `FEP / VFE` OK

Exempt: well-known general acronyms (`AI`, `API`, `JSON`, `URL`, `CPU`, `GPU`).

---

## Language-tracking rule

Claude Code CLI has **no `language` settings key** in `settings.json`.
Auto-track user input language is the standard signal:

- User writes in Korean → respond in Korean
- User switches to English mid-session → respond in English
- Code identifiers / math symbols / API names / file paths remain in English regardless

---

## Measurement axes (raw 165 lint)

| Axis | Target | Method |
|---|---|---|
| jargon-ratio | ≤ 0.30 on Tier-A | Keyword-list scan |
| analogy-presence-rate | ≥ 0.80 on non-trivial topics | Pattern detection (비유: / like / 처럼) |
| acronym-first-use-expansion | ≥ 0.80 | First-occurrence expansion check |
| emoji-tier-classification-correctness | = 1.00 | TRANSCEND/BREAKTHROUGH/WIN explicit class on 5-count |
| canonical-5-element-pattern-adoption | ≥ 0.50 at warn promotion | 5-element presence on non-trivial explanations (legacy axis, retained for 30d transition) |
| canonical-7-element-pattern-adoption | ≥ 0.50 at warn promotion | 7-element presence (5 + ASCII + compare) on non-trivial explanations (raw 165 strengthening 2026-04-29) |
| ascii-diagram-presence-rate | ≥ 0.50 at warn promotion | ≥1 ASCII diagram per non-trivial explanation (raw 165 strengthening 2026-04-29; F-RAW165-6 falsifier preregistered) |

---

## Counter-example (when NOT to apply)

- `.raw` / `.own` SSOT files — English-only per raw 33
- Code blocks with identifiers / math symbols
- CI machine-pipe JSON / JSONL output
- Pure code-output with no narrative
- Emergency security alert with declared rationale (severity-justified emoji-5-count allowed)
