The investigation reports are thorough and the details check out. Compiling the implementation-ready spec now.

# 세션 트러블 3 근본원인 — 구현-ready 종합 spec

세 fix 모두 **sidecar CLI**(`~/.sidecar/cli`, repo `dancinlab/sidecar`)의 layer-1 code guard/기능 결함이다. RC2만 hexa-lang repo에 별도 adoption PR을 동반한다. 각 fix는 서로 다른 파일을 건드리므로 **완전 독립**이며 병렬 랜딩 가능하다.

---

## 우선순위 근거 — "미래 세션 트러블 제거량" 기준

| RC | 결함 | 재발 빈도 | 제거 효과 | 우선순위 |
|---|---|---|---|---|
| **RC2** | CHANGELOG.jsonl line-1 prepend → 병렬 PR add/add 충돌 | **매 PR (구조적 100%)** | 조각-디렉토리로 충돌 표면 **완전 소멸** | **P0 최우선** |
| **RC1** | force-push 훅 cross-segment 토큰 bleed 오탐 | 복합 명령마다 (조건부·잦음) | 정상 push 오차단 제거 | **P1** |
| **RC3** | worktree-보유 main서 `git add -A` → 타세션 WIP 캡처 | 드묾 (사고성·고위험) | 데이터 손실 벡터 봉쇄 | **P2** |

**RC2가 최우선인 이유**: 충돌은 세션 최대 시간낭비이며, 매 병렬 PR마다 reap `unionResolve` refresh-in-worktree 절차를 강제로 탄다. line-1 prepend라는 단일 구조원인에서 100% 발생하므로, 조각-디렉토리 전환이 이 클래스 전체를 없앤다. RC1은 잦지만 조건부(복합 명령), RC3은 고위험이나 드문 사고성이다.

---

## RC2 — CHANGELOG 충돌-처닝 → `CHANGELOG.d/` 조각-디렉토리 (P0)

### repo
- **sidecar** (`~/.sidecar/cli`) — 엔진 로직 · pr-cycle+ship
- **hexa-lang** — gate/config adoption · PR

### 결함 근본원인
`modules/changelog.ts:124` `entries.unshift(...)` — 모든 entry가 단일파일 **line-1에 prepend**. 동시 PR N개가 전부 line-1을 편집 → add/add 충돌 확정. hexa-lang `.gitattributes`의 `CHANGELOG.jsonl merge=union`은 **GitHub 서버측에서 무시**되어(`reap.ts:25` 주석 명시) PR UI는 여전히 CONFLICTING → 매번 로컬 refresh 강제.

### 설계 — 조각 파일 규약
- 파일명: `CHANGELOG.d/<ts>-<counter>-<slug>.jsonl`, **파일당 정확히 1줄**
  - `<ts>` = `YYYYMMDDHHMMSS` UTC (정렬키)
  - `<counter>` = 프로세스 랜덤 4-hex (초 단위 동시성 완전 고유화)
  - `<slug>` = title `[a-z0-9]+` 소문자 `-`-join, 앞 40자 (가독성용)
- **충돌 0 근거**: 각 PR = 신규 파일 = 서로 다른 경로 → git add/add 불가능. 단일 line-1 편집 소멸.

### sidecar diff 위치 (file:line)

| 파일 | 위치 | 변경 |
|---|---|---|
| `modules/changelog.ts` | `:25` 뒤 | `FRAG_DIR() = resolve(REPO_ROOT, "CHANGELOG.d")` + `USE_FRAGMENTS = existsSync(FRAG_DIR())` 자동감지 (하위호환) |
| `modules/changelog.ts` | `:45-60` `load()` | 조각 모드: 레거시 `CHANGELOG.jsonl`(존재시) + `readdirSync(FRAG_DIR())` `.jsonl` 필터, 각 1줄 파싱(malformed skip 유지), 파일명 ts 내림차순 정렬. 레거시 모드 현행 유지 |
| `modules/changelog.ts` | `:124-128` `add` | 조각 모드: `unshift`+전체재작성 대신 `writeFileSync(join(FRAG_DIR(), name), JSON.stringify(entry)+"\n")` **신규 파일 1개만 생성**. trim은 파일-단위 |
| `modules/changelog.ts` | `:63-65` `save()` | 레거시 경로 전용으로 격리. 조각 모드는 `writeFragment(entry)` + `trimFragments(keepN)` 분리 |
| `modules/changelog.ts` | `:190-200` `autoprune` + `prune` | `--keep N` → newest-N 조각 유지 + 초과 `unlink`; `--older-than D` → 파일명 ts 필터 unlink. keep-N은 entry 카운트가 아니라 **조각 파일 개수** |
| `modules/changelog.ts` | 신규 서브커맨드 | `migrate --to-fragments` — 기존 N줄 → 각각 조각파일 분해. `ts` null은 순번 역산으로 안정 정렬키. 완료 후 `CHANGELOG.jsonl` 삭제 |
| `commands/changelog.md` | description | `changelog.d 조각모드(충돌-0)` 한 줄 추가 |

`keepN()`(`changelog.ts:31-39`)은 harness.config.json `lint.changelog.keep` fallback 30 — 그대로 재사용, 조각 파일 개수에 적용.

### hexa-lang adoption diff 위치 (gate 3곳 파일명 확장)

| 파일 | 위치 | 변경 |
|---|---|---|
| `modules/lint.ts` | `:154-168` `CHANGELOG-MISSING` | `staged.includes(file)` → `staged.includes(file) \|\| staged.some(f => f.startsWith("CHANGELOG.d/"))`. config `lint.changelog.fragmentDir` 구동 |
| `lib/config.ts` | `:58` 타입 | `fragmentDir?: string` 추가 |
| `modules/pr-cycle.ts` | `:108` doc-gate 정규식 | `/(^\|\/)CHANGELOG\.(jsonl\|md)$/` → `…$\|(^\|\/)CHANGELOG\.d\//` (조각 추가도 changelog 갱신 인정) |
| `modules/reap.ts` | `:49` `UNION_RE` | 그대로 유지 (레거시 tail 과도기 무해; `CHANGELOG.d/`는 신규파일=auto-mergeable, union 대상 아님) |
| `harness.config.json` | `lint.changelog` | `fragmentDir: "CHANGELOG.d"` 추가 |
| `harness.config.json` | `docs.allow` (`:67`) | `CHANGELOG.d/` 추가 |
| `CHANGELOG.jsonl` → `CHANGELOG.d/` | — | 마이그레이션 (`migrate --to-fragments` 산출) |
| `.gitattributes` | `merge=union` 라인 | 레거시 tail 남는 동안 유지 (조각은 union 불필요) |

**주의**: `lib/config.ts` 파일명 매칭 — sidecar repo와 hexa-lang이 각각 vendored 사본을 가지므로, 타입 필드(`fragmentDir?`)는 sidecar 원본에 추가하고 hexa-lang은 self-update/sync로 전파받는다. lint/pr-cycle 확장도 sidecar 원본에서 하고 전파.

### 구현순서
1. **sidecar**: `changelog.ts` 조각모드(자동감지 하위호환) + `migrate --to-fragments` + `commands/changelog.md` → **pr-cycle → self-update → shadow (`/ship`)**
2. **sidecar**: `lint.ts`/`pr-cycle.ts`/`config.ts` gate 파일명 확장 → 같은 ship (1과 묶어도 됨)
3. **hexa-lang PR ①**: `harness.config.json`(`fragmentDir`/`docs.allow`) + `.gitattributes` 유지 확인
4. **hexa-lang PR ②** (마이그레이션): `CHANGELOG.jsonl` → `CHANGELOG.d/*.jsonl` 분해. **이 PR 자체가 마지막 line-1 충돌** — 단독 랜딩, 다른 PR 없을 때
5. 이후 모든 PR 충돌 0

### verify 방법
- 조각모드 add 후 `git status` → **신규 파일 1개만** staged, `CHANGELOG.jsonl` 무변경 확인
- 병렬 재현: 두 브랜치에서 각각 `sidecar changelog add` → 각 다른 조각파일 → merge 시 conflict 0
- `sidecar changelog render` = 병합-정렬 뷰가 마이그레이션 전과 동일 markdown 산출 (내용 무손실)
- `sidecar changelog prune --keep 30` → newest-30 조각만 잔존, git history에 나머지 보존
- **byteeq/CI 중립 증명**: CHANGELOG는 소스·codegen·runtime 산출물 아님. `hexa verify` g5·byteeq 3-target·shipping smoke 어디도 CHANGELOG 내용을 읽지 않음(3 gate 전부 "존재/staged 여부"만 검사). 컴파일 바이트 0 영향. downstream 소비자(README/serve.py/architecture.html) 없음 — `render`만 유일 소비자

### risk
- **낮음.** 유일 행동변화 = git 충돌 표면(소멸) + gate 3곳 파일명 매칭 확장(fail-open 아님 — 조각 있으면 통과, 더 관대). required gate `selfhost-gates-summary`와 무관.
- 과도기 리스크: 마이그레이션 PR과 레거시 add가 겹치면 tail 잔존 — `USE_FRAGMENTS` 자동감지가 두 모드를 공존시켜 무해. autoprune이 레거시 tail을 keep-N 초과분으로 자연 소멸.

---

## RC1 — force-push 훅 cross-segment 토큰 bleed 오탐 (P1)

### repo
- **sidecar** (`~/.sidecar/cli`) — 단일파일 fix · pr-cycle+ship

### 결함 근본원인
`modules/git-guard.ts:detectForcePush` — 첫 `git … push` 토큰 인덱스 `gp` 확정 후 두 스캔 루프(flag-force `:53-58`, refspec-force `:62-66`)가 **`gp+1`부터 토큰 스트림 끝 `n`까지 shell-separator 경계 없이** 순회. 복합 명령에서 `&&`/`||`/`;`/`|` 뒤 **다른 프로그램**의 `-f`/`--force`/`+refspec` 토큰이 첫 push에 오귀속.

재현 (patched-off):
```
git push origin HEAD:feat/x && rm -f /tmp/foo          → BLOCKED (rm의 -f)
git push origin HEAD:feat/x ; git push --force other   → BLOCKED (2nd push의 --force)
```
세션 증상: bare push(zeroc PR들)는 clean, 복합 명령의 `feat/reseed-canonical-keywords-rfc` push만 오차단. 원인은 branch명/refspec 아니라 **cross-segment 토큰 bleed**. block label `[GIT-FORCE-PUSH] … git push --force / -f`는 flag-force 브랜치 return 문자열(`git-guard.ts:57`)로 확정 — config `H-FORCE-PUSH`(`enforcement.json:5-14`) 아님(그건 label `[H-FORCE-PUSH]`).

### diff 위치 (file:line)

| 파일 | 위치 | 변경 |
|---|---|---|
| `modules/git-guard.ts` | `:28-69` `detectForcePush` | 리팩터: 기존 body → `detectInSegment(toks)`. 신규 `isSep()` 헬퍼(`&& \|\| ; \| & \|&`) + 세그먼팅 `detectForcePush()` 래퍼 (+37/−4) |

핵심: 토큰 스트림을 shell separator에서 **세그먼트 분할** → 각 세그먼트에 기존 감지를 per-segment 실행. force flag/refspec는 **자기 세그먼트의** `git push`에만 귀속. 모든 세그먼트 여전히 스캔 → 진짜 chained force-push는 계속 차단.

이미 `main`에 적용됨(투자 조사 시점) — 브랜치+PR로 ship만 남음.

### 병행 follow-up (같은 클래스 · 별도 라운드)
`enforcement.json:5-14` `H-FORCE-PUSH` config 정규식 `git\s+push\b[\s\S]*--force(?!-with-lease)\b` — `[\s\S]*`로 **동일한 cross-command bleed** 보유. code guard가 실제 트리거지만 parity 위해 config도 세그먼트-aware regex로 fix 권장(별도 PR).

### 구현순서
1. **sidecar**: `git-guard.ts` 현 상태(main 적용됨) 브랜치로 분리 + `CHANGELOG.jsonl` entry → **pr-cycle → self-update → shadow (`/ship`)**
2. follow-up PR: `enforcement.json` `H-FORCE-PUSH` regex parity fix

### verify 방법
- 이미 실증됨 (`scratchpad/proof.mjs`, sidecar tsx 통해 실제 patched 모듈 실행 — ALL GREEN):
  - **benign 통과** (all `null`): bare FF push · `push … && rm -f x` · `push … ; tar -cf` · `push … | tee` · `--force-with-lease[=x]` · `-u` · `# force-ok`
  - **genuine force 차단** (all block): `--force` · `-f` · `+HEAD:refs/heads/x` · trailing `-f` on same push · chained `benign && git push --force` · `echo ; git push -f` · `git -c k=v push --force`
- ship 후 `/self-update`로 러닝 클론 갱신 확인

### risk
- **낮음.** 순수 오탐 축소 (fail-open 아님 — 진짜 force는 모든 세그먼트 스캔으로 여전히 차단). CC 스키마 `permissionDecision:"deny"` emit 경로 무변경.

---

## RC3 — shared-main mutate 가드 (`git add -A` in worktree-보유 repo-root) (P2)

### repo
- **sidecar** (`~/.sidecar/cli`) — 신규 모듈 + 배선 · pr-cycle+ship

### 결함 근본원인
현 pre-Bash git 가드(`pre.ts:preBash` @ `:217`)는 force-push·branch-switch·main-ref-move·danger·commit-lint 5종 전부 **HEAD-이동/ref-변경**만 방어. RC3의 **인덱스-스테이징 벡터** — worktree-보유 main서 `git add -A`가 타세션 WIP + embedded worktree를 하나의 인덱스에 캡처 — 는 커버 밖. `git add` 규칙이 모듈·enforcement.json 통틀어 0.

사고 기전: `cd .worktrees/cXXXX` 실패(worktree 자동제거) → 쉘이 cwd를 shared main으로 유지 → `git add -A && git commit`이 foreign WIP + embedded worktree 캡처(push 안 해 무해했으나 WIP 손실 위험).

### 추천 가드 규칙
`git add`의 인자에 all-form 토큰(`-A`/`--all`/`.`/bare `-u`/`:/`/`*`)이 있고, cwd(또는 `-C <path>`)가 **main worktree**이며, `git worktree list` 카운트 **> 1**(sibling linked worktree ≥1)일 때 **full block**. 명시 파일 add는 통과. **no inline escape-hatch** (force-push·branch-switch 동형; 사용자가 hatch 미요청). off 스위치는 config `git.guardAddAllShared=false`만.

### diff 위치 (file:line)

| 파일 | 위치 | 변경 |
|---|---|---|
| `modules/git-add-guard.ts` | **신규** | `detectAddAll(rawCmd)` 파서 — `git add` all-form 감지, `-C <path>` 추출, chain/pipe 연산자에서 statement scope 종료, `--help`/`-h` 제외, bare `-u`(positional 0개)만 update-marker |
| `modules/pre.ts` | branch-switch 블록 뒤 (`:268` 직후, danger 가드 앞) | import + 배선: `config().git.guardAddAllShared` 게이트 → `detectAddAll(cmd)` → `isMainWorktree(effDir)`(헬퍼 `pre.ts:211-215` 재사용) → `git worktree list --porcelain` 카운트 > 1 → `emitBlock("GIT-ADD-ALL-SHARED-MAIN", …)` |
| `lib/config.ts` | `:207` 인터페이스 (`guardStaleMainEdit` 뒤) | `guardAddAllShared: boolean;` |
| `lib/config.ts` | `:400` 기본값 | `git: {…, guardAddAllShared: true, staleFetchTtlSec: 300}` |
| `lib/config.ts` | `:202` 주석 블록 | guardAddAllShared 설명 3줄 (다른 guard 동형) |
| `README.md` | git-safety 가드 목록 | `GIT-ADD-ALL-SHARED-MAIN` 1줄 추가 (SSOT가 4 guard 나열 → 5번째 lockstep 필수) |
| `CHANGELOG.jsonl` | — | 1 entry (RC2 랜딩 후면 `CHANGELOG.d/` 조각으로) |

핵심 load-bearing 규칙: **block 조건 = `detectAddAll(cmd) != null` AND `isMainWorktree(effDir)` AND `worktree-list-count > 1`** → full block, no inline hatch.

`git worktree list`는 `detectAddAll`이 all-form을 파싱한 **뒤에만** 실행 (non-add·명시파일 add는 git 호출 0) — branch-switch 가드의 lazy 패턴과 동일. per-bash 상시 비용 없음.

### 구현순서
1. **sidecar**: `git-add-guard.ts` 신규 + `pre.ts` 배선 + `config.ts` 스키마/기본값/주석 + `README.md` lockstep + `CHANGELOG` entry → **pr-cycle → self-update → shadow (`/ship`)**

### verify 방법
- **사고 재현 확정** (실측):
  - 사고 cwd `/Users/mini/dancinlab/hexa-lang` → `git rev-parse --absolute-git-dir` = `…/.git` (no `/worktrees/`) → `isMainWorktree=true` ✅
  - `git worktree list` = 10+ 엔트리 → `nWt > 1` ✅
  - `git add -A && git commit` → `detectAddAll`이 `-A` 감지 → block emit ✅ → 캡처 자체 미발생
- 오탐 회귀:
  - worktree 없는 일반 repo `git add -A` → `nWt === 1` → **통과** (오탐 0)
  - linked worktree 내부 `git add -A` → `isMainWorktree=false` → **통과** (권장 워크플로)
  - `git add foo.ts bar.hexa` (명시 파일) → `detectAddAll` null → **통과**
  - `git add -u src/` (범위 update, positional 있음) → **통과**

### risk
- **낮음~중.** `nWt > 1` 게이트가 오탐 방어 핵심 — 일반 solo repo 무영향. no-hatch가 full block이라 정당한 whole-tree add가 막힐 수 있으나 (config off 스위치만), 이는 force-push·branch-switch와 동형 정책.
- **잔여 위험 (훅범위 밖)**: 1차 원인 "`cd` 실패 → cwd main 폴백"은 쉘 레벨이라 PreToolUse 훅이 감지 못 함. 이 가드는 **폴백 이후 mutate를 봉쇄**하는 실질 방어선 (근본원인 제거가 아니라 피해 발현 차단 — force-push 가드가 clobber를 막는 것과 동형).

---

## 독립성 · 랜딩 순서 종합

```
RC1 (git-guard.ts)      ─┐
RC2 (changelog.ts+gates) ─┼─ 서로 다른 파일 = 완전 독립 = 병렬 랜딩 가능
RC3 (git-add-guard.ts)   ─┘
```

- **RC1·RC2 sidecar·RC3**는 sidecar에서 각각 별도 브랜치 → **pr-cycle → self-update → shadow (`/ship`)**. 3개 sidecar PR은 무충돌 병렬.
- **RC2만 hexa-lang PR 2건 추가**: ① config/gate adoption, ② 마이그레이션(단독·마지막 line-1 충돌).
- 권장 실행: **RC2 sidecar 엔진 먼저 ship** → hexa-lang adoption PR ① → 마이그레이션 PR ② (다른 PR 없을 때). RC1·RC3 sidecar는 언제든 병렬.

### 파일 경로 요약
- **RC1**: `/Users/mini/.sidecar/cli/modules/git-guard.ts` (적용됨) · follow-up `/Users/mini/.sidecar/cli/config/enforcement.json:5-14`
- **RC2 sidecar**: `/Users/mini/.sidecar/cli/modules/changelog.ts` · `/Users/mini/.sidecar/cli/lib/config.ts` · `/Users/mini/.sidecar/cli/modules/lint.ts:154-168` · `/Users/mini/.sidecar/cli/modules/pr-cycle.ts:108` · `/Users/mini/.sidecar/cli/commands/changelog.md`
- **RC2 hexa-lang**: `/Users/mini/dancinlab/hexa-lang/harness.config.json` · `/Users/mini/dancinlab/hexa-lang/CHANGELOG.jsonl`→`CHANGELOG.d/` · `/Users/mini/dancinlab/hexa-lang/.gitattributes`
- **RC3**: `/Users/mini/.sidecar/cli/modules/git-add-guard.ts` (신규) · `/Users/mini/.sidecar/cli/modules/pre.ts` (`:268` 직후) · `/Users/mini/.sidecar/cli/lib/config.ts` (`:207`·`:400`·`:202`) · `/Users/mini/.sidecar/cli/README.md` · `/Users/mini/.sidecar/cli/CHANGELOG.jsonl`