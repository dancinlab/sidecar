---
description: /deck <domain> <slug> '<spec-json>' — 🍞 도메인 input deck 빵틀 generator. Thin wrapper around `hexa-lang stdlib/deck/gen.hexa`. RTSC QE el-ph first impl (vc-relax + scf + ph + run.sh emit). chem/chip/bio/nuclear/material stub. Output = exports/<domain>/decks/<slug>/. Preflight estimate + d16 dry-run hint reported after emit.
argument-hint: "[list | spec <slug> | <domain> <slug> '<spec-json>']"
allowed-tools: Bash, Read, Edit, Write, Skill
---

# /deck — 🍞 빵틀 (도메인 input deck generator)

Input: `$ARGUMENTS`

## 하는 일

도메인 + slug + spec-json 받아서 input deck 자동 생성. 도메인-별 emitter 분리:

- **rtsc** = QE el-ph full impl (4 files: `vc-relax.in` · `scf.in` · `ph.in` · `run.sh`)
- **chem · chip · bio · nuclear · material** = stub (TODO — 첫 RTSC impl 가 패턴 확정 후 graduation)

빵틀 = 같은 anchor + 같은 q_grid 라도 press / soc / sscha 만 바꿔서 N개 deck 을 자동 emit 하는 빵 굽기 machine.

## 비유

빵틀에 재료 넣으면 자동 빵 나오는 기계. 도메인 (rtsc) + 재료 (anchor=h3o) + 조건 (press=1500 · q_grid=4x4x4 · sscha=true) → 4 파일 자동 emit.

```
재료 → 빵틀 → 빵 4개
spec-json → /deck → 4 input files
```

## ASCII

```
   spec-json {"anchor":"h3o","press":1500,"q_grid":"4x4x4","sscha":true}
        │
        ▼
   /deck rtsc h3o_sscha_precision  ← 🍞 빵틀
        │
        ▼
   exports/rtsc/decks/h3o_sscha_precision/
        ├─ vc-relax.in   (ibrav=0 · CELL_PARAMETERS · press 1500 kbar)
        ├─ scf.in        (ecutwfc 80 · ecutrho 800 · methfessel-paxton)
        ├─ ph.in         (q_grid 4x4x4 · el_ph_sigma 0.005 · electron_phonon='simple')
        └─ run.sh        (cd $(dirname $0) + source conda + pw.x → ph.x chain)
```

## 비교

| | 빵틀 (/deck) | 수작업 |
|---|---|---|
| 시간 | 1초 (1 cmd) | 5분/deck (4 files copy-paste) |
| 재현 | spec-json = SSOT (audit) | 수정 기록 추적 불가 |
| 오타 | 0 (template-driven) | `electron-phonon` 오타 흔함 |
| sweep | press 200 / 300 / 400 = 3 cmd | 12 files 수작업 (4×3) |

## 사용법

### bare / list / spec

```bash
/deck                           # = /deck list
/deck list                      # 등록된 도메인 (rtsc=full · 그 외 stub)
/deck spec <slug>               # 기존 deck 의 spec-json 조회 (재현용)
```

### emit

```bash
/deck <domain> <slug> '<spec-json>'
```

### 예시 (RTSC, 이번 demiurge 캠페인 패턴)

```bash
# h3o anharmonic SSCHA precision
/deck rtsc h3o_sscha_precision \
  '{"anchor":"h3o","press":1500,"q_grid":"4x4x4","sscha":true}'

# CaAuH3 SOC full-relativistic
/deck rtsc CaAuH3_SOC \
  '{"anchor":"CaAuH3","press":50,"q_grid":"4x4x4","soc":true}'

# AcBeH8 ambient
/deck rtsc AcBeH8_ambient \
  '{"anchor":"AcBeH8","press":0,"q_grid":"4x4x4"}'

# YH10 pressure sweep (3 decks)
/deck rtsc YH10_200 '{"anchor":"YH10","press":2000,"q_grid":"4x4x4"}'
/deck rtsc YH10_300 '{"anchor":"YH10","press":3000,"q_grid":"4x4x4"}'
/deck rtsc YH10_400 '{"anchor":"YH10","press":4000,"q_grid":"4x4x4"}'
```

### stub 도메인 (TODO)

```bash
/deck chem ...      # 🍞 deck: chem emitter is TODO — RTSC first impl only
/deck chip ...      # 🍞 deck: chip emitter is TODO — RTSC first impl only
/deck bio ...
/deck nuclear ...
/deck material ...
```

stub 은 honest exit-1 + TODO 메시지. graduation 경로: `stdlib/deck/gen.hexa` 에 `emit_<domain>()` 추가 + manifest stub→full flip.

## flow (round-by-round)

### Step 0 — parse args
```
$ARGUMENTS = "<domain> <slug> '<spec-json>'"
            | "list"
            | "spec <slug>"
            | bare (== list)
```

### Step 1 — domain routing (generic dispatch · d4)
```bash
# 도메인 manifest lookup (no hardcoded if/elif on domain name)
hexa run $HOME/.hx/install/hexa-lang/stdlib/deck/gen.hexa \
  --domain "<domain>" \
  --slug "<slug>" \
  --spec "<spec-json>" \
  --out "exports/<domain>/decks/<slug>/"
```

- domain ∈ {rtsc} → full emit
- domain ∈ {chem · chip · bio · nuclear · material} → stub exit-1
- else → ❌ unknown domain · list 호출 권장

### Step 2 — RTSC emitter body (rtsc only)

spec keys:
- `anchor` (필수) — 결정구조 anchor (h3o · h3f · CaAuH3 · AcBeH8 · YH10 등)
- `press` (필수) — pressure in kbar (0 = ambient)
- `q_grid` (필수) — phonon q-mesh (예: "4x4x4")
- `soc` (옵션 default false) — true → full-relativistic UPF branch
- `sscha` (옵션 default false) — true → SSCHA anharmonic driver 추가

emit 산출물:
```
exports/rtsc/decks/<slug>/
  ├─ vc-relax.in     # variable-cell relax @ press
  ├─ scf.in          # post-relax SCF · dense k-mesh
  ├─ ph.in           # phonon + el-ph linewidth
  ├─ run.sh          # cd $(dirname $0) + conda activate qe + pw → ph chain
  └─ (sscha=true → sscha_min.in + sscha_loop.sh 추가)
```

### Step 3 — post-emit report
```
🍞 deck staged: exports/rtsc/decks/<slug>/
   vc-relax.in  <N> lines · scf.in <N> · ph.in <N> · run.sh <N>
   spec: {"anchor":"...","press":...,"q_grid":"...","soc":...,"sscha":...}

📐 preflight (closed-form mem-budget estimate):
   hexa cloud preflight --kind dft-phonon --atoms <N> --nq <Q>
   → <verdict>  (RAM <X> GB · walltime <T> hr · single-pod feasible: <yes|no>)

⚠ d16 governance — cost-bearing rent BEFORE pool free dry-run:
   pool on ubu-1 'cd <deck-dir> && pw.x -i scf.in 2>&1 | head -50'
   (1-iter syntax check · catches directive/basis/pseudo errors free)
```

## list 출력 형식

```
🍞 /deck — 등록 도메인

  rtsc       full       QE el-ph emitter (4 files · vc-relax · scf · ph · run.sh)
  chem       stub       TODO — graduation = emit_chem() in stdlib/deck/gen.hexa
  chip       stub       TODO
  bio        stub       TODO
  nuclear    stub       TODO
  material   stub       TODO

SSOT: hexa-lang stdlib/deck/gen.hexa (d3 single canonical home)
```

## spec 출력 형식 (재현 audit)

```bash
/deck spec h3o_sscha_precision
```
```
🍞 /deck spec — h3o_sscha_precision

  domain: rtsc
  spec:   {"anchor":"h3o","press":1500,"q_grid":"4x4x4","sscha":true}
  staged: exports/rtsc/decks/h3o_sscha_precision/  (4 files · mtime 2026-05-29 …)
  re-emit: /deck rtsc h3o_sscha_precision '<above spec>'
```

## demiurge RTSC 캠페인 데모 (2026-05-29)

| slug | spec | status |
|---|---|---|
| `CaAuH3_SOC` | `{anchor:CaAuH3, press:50, q_grid:4x4x4, soc:true}` | staged (Phase A #2) |
| `h3o_sscha_precision` | `{anchor:h3o, press:1500, q_grid:4x4x4, sscha:true}` | queued |
| `h3f_baseline` · `h3p_baseline` · `h3cl_baseline` | `{anchor:hX, press:0, q_grid:4x4x4}` | queued |
| `AcBeH8_ambient` | `{anchor:AcBeH8, press:0, q_grid:4x4x4}` | queued |
| `YH10_200/300/400` | `{anchor:YH10, press:2000/3000/4000, q_grid:4x4x4}` | queued (pressure sweep) |

9 anchor sweep → 9 decks × ~36 files 모두 1 batch fire 가능 (spec-json sweep = 빵틀 9번 굽기).

## 의존 (upstream)

이 plugin 은 **thin wrapper**. 실제 emit 로직 = `hexa-lang stdlib/deck/gen.hexa` (별 PR).

- `stdlib/deck/gen.hexa` 미설치 → `/deck` 가 "🛑 stdlib/deck/gen.hexa not found · install hexa-lang ≥ <ver>" 안내
- `stdlib/deck/gen.hexa` 설치 후 자동 동작 (sidecar plugin 재배포 불필요 · stdlib hot-swap)

## triggers

`/deck`, `빵틀`, `deck-gen`, `input deck 생성`, `bake deck`, `빵 굽기`, `deck 만들어`, `cooking deck`
