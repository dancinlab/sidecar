# INBOX — log

Append-only history sister of `INBOX.md`. Each entry starts with `## <ISO timestamp> — <header>` (newest on top); body = `- [x]` (done) / `- [ ]` (pending) checkbox tasks.

## 2026-05-27 — pool-route data-locality pin + sign-local TTL 30min ✅ 해소 (from anima PURE F-CURRICULA-1)

> **사건**: anima PURE 도메인 F-CURRICULA-1 GPU fire 준비 중, local 입력파일(Mac session log 추출본 + Phase D corpus)에 의존하는 corpus build (`hexa run build_curriculum_corpus.hexa --corpus-path /Users/.../c.jsonl …`) 가 pool-route 의 두 라우팅 경로 모두에서 막혀 fire 가 2회 BLOCKED. 비용 0 정직 halt 였으나 자율 fire(`a_fire_autonomous`) + 상시 자원활용 흐름이 sign 게이트에 반복 차단되는 마찰.

> **갭 #1 — data-locality 오진단**: 0.9.0 inversion(default=pool)으로 bare `hexa run … --corpus-path /Users/.../c.jsonl` 가 ubu-2 로 라우팅 → 입력 jsonl(Mac-로컬)이 피어에 미동기화 → **compile-stage `source not found`** 로 죽음. 에러가 **데이터 부재**(입력파일이 그 호스트에 없음)인데 **코드 오류**(소스 못 찾음)처럼 보여 오진단.

> **갭 #2 — sign-local TTL < build 시간**: 절대경로 `hexa run` 은 fork-storm `sign local` 게이트인데 `! sidecar sign local` 발행해도 **토큰 5분 < corpus 재생성+build 10-20분** → build 중간 후속 `hexa run` 이 토큰 만료로 재차단. 5분마다 재서명은 비현실적.

**구현 (`hooks/pool-route/` 0.9.2 → 0.9.3 · `bin/sidecar` key-aware TTL · 모두 unconditional · opt-out 없음 · @D s11)**
- [x] **(a) data-locality pin** ✅ — `_pool_route.hexa` 에 `_is_data_input_flag` + `_is_synced_workdir_path` + `_has_local_data_input` 추가. hexa exec(`_is_hexa_exec`)이 데이터-입력 플래그(`--corpus-path` · `--corpus` · `--data` · `--data-path` · `--dataset` · `--input` · `--train-data` · `--eval-data` · `--weights` · `--ckpt` · `--checkpoint`)를 들고 그 값이 동기화 `~/core/`(tilde + `$HOME/core/` 양형) workdir 이 **아니면** local pin. `--flag value` + `--flag=value` 양형 파싱 · dangling flag(값 없음) 보수적 local. atlas-register pin 다음, heavy classifier 앞에 배치(LOCAL-EXECUTION 화이트리스트 5번째 structural exemption). 동기화 `~/core` 데이터는 라우팅 유지(피어 mirror).
- [x] **(b) sign-local TTL 30min** ✅ — `_local_signed()` 의 `age <= 300` → 명명상수 `LOCAL_SIGN_TTL = 1800`(30분). `bin/sidecar` 에 `LOCAL_SIGN_TTL=1800` + `sign_ttl_for <key>`(local=1800, 그외=300) 추가 → mint 확인메시지 + `sign --list` 잔여시간이 `local` 키엔 30분, 거버넌스 키엔 5분 정확 표기. **트레이드오프**: sign-local 이 abs-path heavy gate 를 SUPPRESS 하는 fork-storm 가드 윈도우가 6× 길어짐 — 수용(토큰 명시 · user-minted · agent 자가민팅 불가 · 단일키 · `sidecar sign clear local` 조기 해제). 단순 상수가 Occam(g0). `local` TTL 은 거버넌스 sign TTL(`SIGN_TTL=300` · sign-guard · commons/project/gitignore **편집** 게이트)과 **독립** — 후자는 5분 불변.

**검증**: `_pool_route.hexa` `hexa parse` clean · `bin/sidecar` `bash -n` clean.
- (a) standalone smoke 12/12 PASS — abs `--corpus-path /Users/...`/`--data=/Users/...`/`--weights /tmp/...`/`--ckpt /Users/...` → local(true) ✅ · 동기화 `--data ~/core/anima/d/`/`--corpus-path $HOME/core/...`/`--dataset=~/core/...` → 라우팅 유지(false) ✅ · `hexa run x.hexa`(플래그 무)/`hexa kick --seed` → false ✅ · `python train.py --data /Users/...`(non-hexa) → false(미적용) ✅ · dangling `--corpus`(값 무)/비-core 상대 `--input ./local.jsonl` → 보수적 true ✅.
- (b) TTL smoke — age 1000s(16.6분, 구 5min 은 reject) → valid · age 1900s(31.6분) → expired · `sign_ttl_for local=1800 commons=300` ✅.

**lesson**: 라우팅 휴리스틱은 **데이터 위치성(피어가 그 입력을 보유하는가)**도 고려해야 — code-portability ≠ data-portability. sign-local 같은 시간상자 게이트의 TTL 은 **보호하려는 작업의 실제 wall-clock**을 커버해야 마찰 없이 동작. severity: medium(우회 가능했으나 자율 흐름 반복 차단). anima 측은 입력 pre-sync 로 갭#1 완화 예정이나 pool-route 가 이제 구조적으로 local pin.

## 2026-05-27 — stale-base squash-merge 회귀 가드 ✅ 해소 (sidecar 3-가드) (anima #1105 가 35190 파일 삭제)

> **사건**: anima PR #1105(`decoder-m4b-gpu2-arch`)가 극도로 stale 한 base 에서 분기 → `gh pr merge --squash --admin` 시 main 의 **35190 파일**(state/ archive/ HEXAD/ docs/ AGENT/ training/ `.hexarc` 등 거의 전체 repo)을 회귀 삭제. 정당한 변경은 `CORE/DECODER/v3_moe_arch.hexa` + smoke 2파일뿐. 복구 = anima #1106(99d581691 부모에서 전체 복원 + port 유지). **자동 머지가 35190-삭제를 무경고 통과**시킨 게 핵심 위험.

> **root cause**: 이전 rejected turn 에서 생성된 브랜치(`decoder-m4b-gpu2-arch`)가 worktree 재사용으로 stale base 를 보유. git-guard 의 stale-base 경고는 `git push` 시점 backstop 인데 `gh pr merge` (squash) 경로에서 미동작 → 대량 삭제가 그대로 main 에 안착.

**구현 가드 (sidecar — 3개 lockstep · 모두 unconditional · opt-out 없음 · hexa-native)**
- [x] **삭제-수 sanity gate** ✅ — `hooks/pr-cycle-hook` 0.1.0→**0.2.0**. auto-merge tail append 전에 squash payload(`git diff --name-status <merge-base(origin/main,HEAD)>...HEAD` · cross-repo 는 `gh pr diff --repo X`)의 D/A 라인 카운트. D > 50 **또는** (삭제 >= 추가×10 이고 삭제 > 20)이면 `permissionDecision: deny` → PR 은 생성되되 squash-merge 보류 + 한국어 안내(수동 `gh pr merge` 권장). probe 실패는 fail-open(정당 머지 안 막음). **35190 삭제는 명백 이상치 → 확실히 deny.**
- [x] **브랜치 재사용 advisory** ✅ — `hooks/worktree-guard` 0.1.0→**0.2.0**. `git worktree add -b <br>` 의 `<br>` 가 이미 존재하면 non-blocking 경고. 로컬-only stale(origin 부재)면 별도 강조. fresh 분기 제안(`<br>-$(date +%s)`). (advisory — guards-narrow-scope; 실질 차단은 가드①.)
- [x] **stale-base 체크 머지경로 확장** ✅ — `hooks/git-guard` 0.5.0→**0.6.0**. 명령에 `gh pr merge` 있고 `git push` 없으면 동일 divergence probe → 머지 브랜치가 origin/main 보다 >= 20커밋 뒤처지면 머지 직전 advisory. cross-repo(`--repo X`) skip. (advisory.)

**검증**: 3 `.hexa` 모두 `hexa parse` clean. 가드① standalone smoke 7/7 PASS (35190 D/3 A → DENY · 60 D/2 A → DENY · 30 D/1 A asymmetry → DENY · 50 D/0 A → DENY · 3 D/5 A 정상 → allow · 10 D/40 A refactor → allow · [-1,-1] fail-open → allow). 가드② 로컬+origin 브랜치 재사용 fire · 신규 브랜치 0건. 가드③ force-push deny 보존 · behind-0 머지 false advisory 없음.

**lesson (작성자 규율)**: 브랜치/worktree 재사용 금지 — 매 PR 마다 `origin/main` 최신에서 fresh 분기 + HEAD 확인. severity: **high** (main 무결성 회귀). 이제 deletion-sanity-gate 가 대량삭제를 머지 시점에 hard-deny 하므로 35190-급 무경고 통과는 구조적으로 차단.

## 2026-05-27 — worktree-gc 활성 worktree mid-task wipe ✅ 해소 (from demiurge monograph fan-out)

> 핸드오프 증상: `hooks/worktree-gc` 0.1.0 이 작업 중 `wt-*-mono` worktree 를 mid-build prune → `.git` 링크 + `main.tex`/`Makefile`/`appendix/` 소실, `companion/`+`cover.png` 만 생존(비원자 흔적). CERN(#220)·ANTIMATTER(#222) 둘 다 발생, checkpoint-commit 으로만 복구.

- [x] **진단 — 근본원인**: 0.1.0 prune 판정이 `merged_hit || origin_gone` 이고 `origin_gone = !_has_origin_branch(branch)` = **브랜치명 기준**. 이전 세션이 동명 브랜치(`feat/cern-monograph`)를 merge→origin 삭제하면, 동명을 재사용한 신규 worktree(아직 미푸시 라이브 작업)가 "origin-gone" 으로 오판되어 force-remove 당함. `open-PR skip`(merged set) 가드는 PR 생성 전 빌드 단계엔 무력.
- [x] **fix — 판정 교체 + 4중 라이브 가드**: `origin/<branch>` ref 소실 단독 신호 **폐기**. 신규 `_head_merged_into_main()` 가 worktree HEAD 를 resolve → `git -C <repo> merge-base --is-ancestor <HEAD> origin/main`(없으면 `origin/master` fallback, 둘 다 없으면 keep) 으로 **진짜 landed 여부**만 판정. 후보가 되어도 prune 전 4중 가드 통과 필수, 모두 unconditional(opt-out env 없음 · commons s11): (a) `_is_dirty` = `git status --porcelain` 비어있지 않거나 조회 실패 → SKIP, (b) `_is_recent` = HEAD commit epoch(`%ct`) 또는 working file `find -newermt '1 hour ago'` 가 <1h, 또는 `now` 확정 실패 → SKIP, (c) `_is_cwd_in_use` = `lsof -a -d cwd -- <path>` 비어있지 않음(lsof 부재 시 `pgrep -f <path>` fallback) → SKIP, (d) HEAD-ancestor 재확인.
- [x] **atomic prune**: `git worktree remove --force` 가 유일 삭제경로 — 실패(rc≠0) 시 branch -D 도 안 하고 아무것도 안 지움. companion/ 만 남고 .git 링크 소실 같은 비원자 상태 구조적 불가. (수동 `rm -rf` 부분삭제 경로 자체가 코드에 없음.)
- [x] **검증**: `hexa parse hooks/worktree-gc/bin/_worktree_gc.hexa` → parses cleanly. 가드 primitive smoke test (이 라이브 worktree 대상): (b) HEAD delta 12s<3600 → recent SKIP, (c) lsof 가 zsh+lsof 의 cwd 검출 → SKIP, (d) HEAD 가 origin/main ancestor 아님(merge-base rc=1) → prune 후보조차 아님. 라이브 작업이 4중으로 보호됨 확인.
- [x] **버전 + 배포**: 0.1.0 → 0.2.0, 4 surface lockstep (plugin.json · marketplace.json · README 행 · CHANGELOG 신규 섹션). hook 은 `hexa run <source>` 직접 실행(prebuilt 바이너리 없음)이라 별도 build 불필요.

## 2026-05-26 — `pool` CLI 회귀 ✅ 로컬 해소 + 상류 debt (from hexa-lang RUNTIME)

> 핸드오프 증상: 전 subcommand 가 `OK: <첫인자>` 만 반환, bare `pool` → `hexa-cc` usage. 1차추정은 "shim 정상, `~/.hx/bin/hexa` 인터프리터 또는 `pool.hexa` 설치본 손상". 진단 결과 손상은 **결과**였고 원인은 따로 있었음.

- [x] **진단 — clobber 의 진짜 원인**: 설치본 `~/.hx/packages/pool/bin/pool.hexa` 가 51799B 소스 → 259B `// Generated by HEXA self-host compiler` C stub 로 덮여 있었음(git HEAD `feed954` 0.8.6 대비). 이게 "OK: <arg>" 의 정체 — 빈 main 컴파일 stub. `hexa.toml` 도 0.8.8 로 stray bump(소스 클로버 부산물 · 받쳐주는 커밋 없음 — reflog=clone 단일). **소스 복원해도 `pool` 호출마다 즉시 재클로버**.
- [x] **근본원인 = Mac build 게이트 + 실패-시-소스-clobber**: shim 은 `exec hexa <pool.hexa> "$@"` = implicit-run(=compile-then-exec). Darwin 에서 run-driver 가 기본 build 출력을 `/tmp` 로 잡음 → `hexa build REFUSED on Darwin … reason: output under /tmp (panic trigger path)` (2026-04-20 커널패닉 가드). 실패 경로가 부분 stub 을 **소스 파일에 기록** → 매 호출 자가파괴. m3b 툴체인 교체(`~/.hx/bin/hexa.real`→hxv2 컴파일러 ce5753, 05-26 05:47)가 AOT 캐시(`~/.hexa-cache/`) 키를 무효화 → 강제 recompile → 게이트 상시 충돌. (세션 초반 정상 = 캐시 warm + 세션 env 에 `HEXA_MAC_BUILD_OK` 존재했을 것.)
- [x] **검증 — 정상 build 경로**: `HEXA_MAC_BUILD_OK=1 HEXA_LANG=$HOME/.hx/packages/hexa-lang ~/.hx/bin/hexa-run build <pool.hexa> -o ~/path-NOT-under-/tmp` → 성공(526288B 네이티브, codegen=`~/.hx/bin/self/native/hexa_v2`, 소스 무손상). `-o` 가 `/tmp` 면 REFUSE, 미지정이면 소스 clobber.
- [x] **로컬 fix (적용·검증)**: 네이티브 바이너리 → `~/.hx/bin/pool.bin`, `~/.hx/bin/pool` shim 을 그 바이너리 직접 exec 로 repoint(implicit-run 폴백 보존 · 원본 → `~/.hx/bin/pool.shim-bak-2026-05-26`). `pool list`·`status`·`on ubu-2 echo`(→ Linux 도달) 전부 정상, `pool.hexa` 51799B 무손상, pool repo git clean. **g9 offload 복구**. (이 fix 는 hx 의 `pool.bin` 미사용 정의일 뿐 — 차기 `hx install pool` 가 shim 재생성하면 회귀 가능 → 상류 fix 전까지 재적용 필요.)
- [ ] **상류 debt #1 — hexa-lang run-driver** (sibling `core/hexa-lang`): (a) Mac 기본 build 출력을 `/tmp` 밖으로(또는 캐시 dir), (b) **build 실패 시 소스 파일 clobber 절대 금지**(가장 위험 — 자가파괴 버그), (c) m3b 이후 `~/.hx/bin/hexa.real` 이 순수 `hexa-cc`(run/dispatch 인격 상실)인지 점검 — `hexa <file>` implicit-run 이 raw-compile 로 디스패치되면 모든 hx 패키지 CLI 가 동일 회귀.
- [ ] **상류 debt #2 — `dancinlab/pool` install** (sibling repo): `install.hexa` 가 첫 설치에서 네이티브 선컴파일(`-o` 안정경로) + shim 을 바이너리 직접 exec 로 생성 → implicit-run 의존 제거(hexa.toml 의 "compiled on first run, then cached" 의도를 실제 구현). hx-generated shim 회귀 방지.
- repro(고정): `pool list` → 전엔 `OK: list` + `pool.hexa` 259B 클로버, 이제 roster 출력 + 소스 무손상.

## 2026-05-26 — worktree-gc 가 활성 worktree prune (브랜치명 재사용 오판) (from demiurge monograph fan-out)

> demiurge monograph 함대(CERN·RTSC·ANTIMATTER·UFO)를 `isolation:worktree` + `/Users/ghost/wt-*-mono` 로 fan-out 하던 중, 빌드 진행 중인 worktree 가 통째로 사라지는 사고가 다수 에이전트에서 반복. 기존 `hooks/worktree-gc` 0.1.0(merged-prune)이 *살아있는* worktree 를 prune 한 것 — 2026-05-25 "4-gap"(harness HEAD/ref/bundle)과 별개의 **worktree-gc 자체 갭**(sidecar-actionable).

- [ ] **증상**: `git worktree add -b feat/cern-monograph /Users/ghost/wt-cern-mono origin/main` 성공 직후, 빌드 중 worktree 가 wipe — `.git` 링크 + `main.tex`/`Makefile`/`appendix/` 소실, `companion/` + fal.ai `cover.png` 만 생존(= 비원자/race prune). CERN(PR #220)·ANTIMATTER(PR #222) 각각 1회, 모두 checkpoint-commit + `/private/tmp` 재컷으로 복구.
- [ ] **원인 추정**: 브랜치명 재사용. 이전(압축된) 세션이 동명 `feat/<dom>-monograph` 를 생성→merge→origin 브랜치 삭제 → SessionStart worktree-gc 가 worktree 의 브랜치를 **이름 기준 "origin-gone"** 으로 판정 → 동명으로 재컷한 신규 worktree(미푸시 라이브 작업)를 merged 로 오인하고 prune. 0.1.0 의 open-PR skip 가드는 빌드(=PR 생성 전) 단계엔 무력.
- [ ] **fix 후보** (worktree-gc 0.2.0):
    - **dirty/recent-mtime 가드**: prune 전 `git -C <wt> status --porcelain` 비어있지 않거나 최근 N분(예: 30m) 내 mtime 파일 있으면 skip — 라이브 에이전트가 쓰는 중.
    - **HEAD-ancestor 진짜-merged 체크**: "원격 브랜치명 부재"가 아니라 worktree 의 로컬 HEAD 가 merge 커밋의 ancestor 일 때만 prune. 동명 재사용 + 신규 로컬 커밋은 ancestor 아님 → 보존.
    - **cwd-in-use 체크**: `lsof`/프로세스 cwd 가 worktree 안이면 skip.
    - **원자 prune**: 가드 통과 후엔 all-or-nothing (부분 wipe 금지).
- [ ] **severity**: high — in-flight 에이전트 작업을 조용히 파괴. 이번 세션 monograph 함대에서 다수 재발. checkpoint-commit 이 유일한 방어선이었음.
- 출처: demiurge monograph fan-out 2026-05-26 (CERN #220 · RTSC #221 · ANTIMATTER #222 · UFO in-flight). 회피책(현재): 빌드 worktree 를 `/private/tmp` 에 두고 `make` 대신 texbin 직접 호출(별 갭 — pool-route 가 `make` 단어를 ubu 로 라우팅).

## 2026-05-26T00:05Z — paper:paper v0.8 — 3 verb 버그 (from: demiurge ANTIMATTER paper rego PR #197)

**맥락**: ANTIMATTER BLUE-MAX paper를 paper v0.8(sample-blue-max + 신규 verb)로 재생성 중 3개 verb가 advertised대로 동작 안 함. stub-first (g60) — 구현은 review 후.

- [ ] `paper pr-roll <repo> <since>` — `pr-roll.json` 작성은 OK이나 LaTeX `\paragraph` emit이 jq `\#` escape 버그로 crash · bare repo name 대신 `OWNER/REPO` slug 요구
- [ ] `paper atoms <DOMAIN>` — case-sensitive + `verify_cli.hexa` 주석 라인만 매칭 → usable atom list 안 나옴 (소스 fn dispatch 파싱 필요)
- [ ] `paper arxiv-prep [dir]` — tar target을 relative path로 만들고 `cd "$TMP"` subshell 안에서 tar 실행 → 항상 실패 (절대경로 또는 cd 제거)
- [ ] (관련 context) shipped `bin/hexa-verify`가 stale → antimatter atom 미인식, verify-block이 재빌드 강제 (install-sync 갭)

repro: demiurge antimatter-bluemax-2026 rego (PR #197) · paper plugin v0.8

## 2026-05-25T11:20Z — g61 stdlib-SSOT 강제·자동화·범위확장 (from: anima IIT4 세션)

**맥락**: IIT4 엔진(의식 Φ-structure)을 hexa-brain·eeg 등 타 프로젝트와 공유하려고 stdlib 승격을 검토하던 중, 사용자: *"hexa-lang 을 최대한 단일 SSOT 로 하려면 sidecar 어떻게 수정해야될까"*. → commons.tape 에 이미 **g61**("hexa-lang stdlib is the SSOT for general primitives")이 존재 = **정책은 있음**. 빠진 건 **강제·자동화·범위·물리적 단일해석** 4가지. INBOX 에 제안만, 구현은 사용자 review/sign 후.

### 현행 g61 (정책 OK)
```
@D g61 := "hexa-lang stdlib is the SSOT for general primitives"
  do  = promote reusable general primitives (math/info/signal/bitops/stats) → hexa-lang stdlib/
  do  = stdlib modules = plain .hexa · caller repos import-only · byte-equal
  dont= duplicate a primitive across repos · compiler builtin when stdlib fits · hand-edit hexa_cc.c
```
→ anima IIT4 의 bitops 리팩터(pow2_int/bit_set 위임)가 이미 이 g61 준수 사례.

### 갭 & 제안 (4)
1. **범위확장 (g61 amend OR 신규 g67)** — 현행 "primitives(math/info/signal/bitops/stats)" 는 *작은 함수* 한정. **재사용 domain engine**(consciousness/Φ·DSP·stats-pipeline 등 multi-module 라이브러리)은 명시 범위 밖 → 회색지대. 추가 문구: *"≥2 repo 가 쓰는 reusable domain library/engine → `stdlib/<domain>/` (예: consciousness/iit4). engine = substrate-agnostic(stdlib) ⊥ adapter = repo별(substrate→입력 변환)."* (phi_spatial 이 이미 `stdlib/consciousness/` 로 간 선례와 정합.)
2. **강제 hook — 신규 `stdlib-ssot-guard`** — `.hexa` Write/Edit PreToolUse: (a) stdlib 에 이미 있는 fn名 재구현 감지(dup-primitive) (b) 타 repo 절대경로 import(`/Users/.../<repo>/.../lib/…`) 중 shareable 한 것 감지(anima-locked) → 경고+`/stdlib promote` 안내. g61 을 stated→enforced 로.
3. **자동화 skill — 신규 `/stdlib`** — `check`(현 repo 의 g61 위반=stdlib중복·anima-locked import 스캔) · `promote <file>`(hexa-lang stdlib 이전 + caller thin-shim + import rewrite 까지 1-command, phi_native #769 수작업 흐름을 자동화). decompose-to-stdlib 의 표준 진입점.
4. **import-root 단일해석 (물리 SSOT)** — `import "stdlib/…"` 가 *모든* repo 에서 **하나의** hexa-lang `stdlib/` 로 해석되게 보장 (HEXA_LANG 검색루트). SessionStart 에서 HEXA_LANG 유효성/단일성 검증 hook (없거나 stale 면 경고). 코드 SSOT 가 논리뿐 아니라 물리적으로도 1곳.

### 근거
정책(g61)만 있고 강제가 없으면 각 repo 가 조용히 primitive 를 재구현 → SSOT 침식. guard+skill 이 "승격이 기본, 중복이 예외" 를 워크플로로 만든다. 범위확장은 IIT4 같은 *엔진* 공유(hexa-brain/eeg)를 g61 우산 안에 넣는다. (commons.tape = sign-gated → g61 확장은 `sidecar sign commons` 후 land; guard+skill 은 신규 plugin 이라 sign 불요.)

**관측 맥락** (anima PURE 도메인 · F-CURRICULA-1 GPU fire 준비 중):
local 입력파일(Mac 의 session log 추출본 + Phase D corpus)에 의존하는 corpus build (`hexa run build_curriculum_corpus.hexa …`) 가 **두 경로 모두에서 막혀** fire 가 2회 BLOCKED. 비용 0 으로 정직하게 halt 됐으나, 자율 fire 흐름이 sign 게이트에 반복 차단되는 마찰이 드러남.

### 갭 #1 — pool-route data-locality 오진단
- bare `hexa run …` → pool-route 가 ubu-2 로 라우팅 → ubu-2 에 입력 jsonl(Mac-로컬)이 미동기화 → **compile-stage `source not found`** 로 죽음.
- 문제: 에러가 **데이터 부재**(입력파일이 그 호스트에 없음)인데 **코드 오류**(소스 못 찾음)처럼 보여 오진단 유발. classifier 가 "이 invocation 은 로컬 입력파일 의존" 임을 모름.
- **fix 후보**: classifier(`@D s10`)가 인자에 **존재하는 로컬 경로**(`--corpus-path`·`--out`·입력 jsonl)를 참조하는 `hexa run` 을 **local-bound 분류 → 미라우팅** (또는 "input `<path>` not on `<host>` — local-bound, not routing" 명시). zero-macOS-offload `@D s12` 정합. pool-route 0.6.10 local-pin 위 잔여 케이스.

### 갭 #2 — sign-local 토큰(5분) < 실제 build 시간(10-20분)
- 절대경로 `/Users/ghost/.hx/bin/hexa run …` → fork-storm `sign local` 게이트. `! sidecar sign local` 발행해도 **토큰 5분** 인데 corpus 재생성+build 는 **10-20분** → build 중간 다음 `hexa run` 재차단(토큰 만료).
- 정당한 단일 로컬 작업이 **한 토큰 윈도우 안에 못 끝남** → 5분마다 재서명하는 비현실적 마찰.
- **fix 후보**: (a) 윈도우 내 *시작된* invocation 은 완료까지 커버(wall-clock 5분 mid-build kill 금지), (b) known-safe 로컬 build 용 긴 토큰 tier, (c) `sidecar sign local <minutes>` 인자. (a) 가 fork-storm 안전성 유지하며 마찰 최소.

### severity
medium — 우회 가능(반복 서명 or 입력 pool 선동기화)하나 자율 fire(`a_fire_autonomous`) + 자원 상시활용(anima `a_pool_resource_ready` 제안 중) 흐름을 반복 차단. anima 측은 입력 pre-sync 로 갭#1 완화 예정.

## 2026-05-25T08:00Z — `/domain` 아이콘+별칭 타이틀/서브타이틀 지정 (from: anima IIT4 세션)

**사용자 요청** (2026-05-25, anima IIT4 도메인 세션):
> "도메인 문서 마다 🧠 IIT4 — \"의식 측정자(尺)\" 해당형태로 타이틀 이나 서브타이틀 지정할수 있도록"

즉 각 도메인 문서가 **easy plugin 의 7요소 패턴(아이콘 · 이름 · 별칭)** 헤더를 가질 수 있게 — `🧠 IIT4 — "의식 측정자(尺)"` 처럼. 현재 `<NAME>.md` 는 `# IIT4 — current state` 고정 H1 + `@goal:` 만 있고, bare `/domain` / `set` 출력도 `◆ active domain: IIT4   🎯 <goal>` 로 아이콘·별칭 개념이 없음. INBOX 에 제안만 던지고 구현은 사용자 review 후 driven (target = `domain` plugin).

### 동기
- 도메인이 누적되면(현재 anima 한 repo 만 IIT4 · LIFE · PURE · STDLIB · …) 이름만으론 "이게 뭐 하는 lane 이지?"가 즉시 안 떠오름. 친근한 별칭("의식 측정자") + 아이콘이 한눈 식별·기억을 돕는다.
- 이미 easy-auto plugin 이 응답에 7요소(아이콘·이름·별칭·…)를 강제하는데, 정작 도메인 트래커 문서 자체엔 그 헤더가 없다 — 정합성 갭.

### 제안 surface (`domain` plugin)
- [ ] **`<NAME>.md` 옵션 `@title:` 필드** — `@goal:` 위/아래에 `@title: 🧠 IIT4 — "의식 측정자(尺)"` 한 줄 (옵션, 없으면 현행 동작 유지 = non-breaking).
- [ ] **`/domain title <text>` 서브커맨드** (alias `subtitle`) — `@title:` set/갱신. 예 `/domain title "🧠 IIT4 — 의식 측정자(尺)"`. 인자 형태 자유 (아이콘+이름+별칭 권장이나 강제 X).
- [ ] **bare `/domain` · `set <NAME>` 출력 렌더** — `@title:` 있으면 `◆ active domain: IIT4` 대신 `◆ 🧠 IIT4 — "의식 측정자(尺)"   🎯 <goal>` 렌더. 없으면 현행 fallback.
- [ ] **lint(옵션)** — `@title:` 없을 때 경고는 **하지 않음** (별칭은 취향 — `@goal`/milestone 처럼 필수 아님). 형식 강제도 지양 (g0 occam, over-engineering 회피).

### 예시 (before / after)
```
before:  # IIT4 — current state
         @goal: hexa-native faithful IIT 4.0 …

after:   # IIT4 — current state
         @title: 🧠 IIT4 — "의식 측정자(尺)"
         @goal: hexa-native faithful IIT 4.0 …

bare /domain:
  before: ◆ active domain: IIT4   🎯 …
  after:  ◆ 🧠 IIT4 — "의식 측정자(尺)"   🎯 …
```

**근거**: 작은 비침습 추가(옵션 필드 1개 + 서브커맨드 1개 + 출력 렌더 분기). 미설정 도메인은 100% 현행 동작. easy plugin 7요소와 도메인 트래커의 정합을 메운다.

### 제안 surface 처리

- [x] **`<NAME>.md` 옵션 `@title:` 필드** — ✅ `_get_title`(=`_get_goal` 미러) 추가. `@goal:` 위에 위치.
- [x] **`/domain title <text>` 서브커맨드** (alias `subtitle`) — ✅ `title`/`subtitle` verb 추가. `_set_title` 은 기존 `@title:` in-place 교체(빈 줄 누적 없음)·없으면 헤딩 바로 아래 삽입.
- [x] **bare `/domain` · `set <NAME>` 출력 렌더** — ✅ `_show` 가 `@title:` 있으면 `◆ <title>   🎯 <goal>`, 없으면 `◆ active domain: NAME` 현행 fallback.
- [x] **lint(옵션)** — ✅ `_lint` 미변경 = `@title:` 부재 무경고 (취향 필드 · g0). 형식 강제도 없음.

**Status**: ✅ resolved · fix=domain 0.8.5 (`skills/domain/bin/_domain.hexa` + plugin.json·marketplace.json·SKILL.md·commands/domain.md·README·CHANGELOG) · non-breaking(미설정=현행) · 3× title-edit idempotency + render 검증 · 2026-05-25

## 2026-05-25T06:01Z — pool.json roster race-wipe → atomic-write/lock 방어 (from: demiurge RTSC 세션)

**증상 (이번 세션 실증)**: 동시 claude 세션/agent 다수가 `~/.pool/pool.json` 을 read-modify-write 하던 중 roster 가 `{"hosts": []}` (17B) 로 통째 wipe. `pool list` → "empty roster" · `pool on ubu-1` → "not in roster" → 실행 중 DFT job (ubu-1 nohup) 접근이 전면 차단됨. 직전 정상본 `pool.json.n11bak` (639B) 수동 `cp` 복구로 해소.

**원인 (추정)**: pool add/remove/state-update 가 전체 JSON 을 비원자적으로 truncate-rewrite — 두 writer 가 동시 stale-read 후 한쪽이 빈/부분 roster 로 덮음. 파일 lock 부재. (`route-log.jsonl` append 동시성과 별개로 `pool.json` 본체가 취약.)

**방어 제안 (우선순위)**:
- [x] **atomic write** — temp write → `mv -f`(rename(2), 동일 fs 원자 교체) · truncate-in-place 폐기. ✅ pool 0.8.5 `_save`. **원 wipe 벡터 제거** — reader 가 truncate 중간 상태를 못 봄.
- [x] **empty-write guard** — 디스크에 non-empty roster 가 있는데 write 결과가 `hosts:[]` 면 거부. ✅ pool 0.8.5 `_save(root, allow_empty)` — `pool rm` 의 마지막 호스트 제거만 `allow_empty=true` 로 정당 통과(별도 `pool clear` verb 불요).
- [x] **백업 rotation** — write 직전 `pool.json.bak` 자동 생성. ✅ pool 0.8.5 (+ `_load` 가 빈/torn 파일 만나면 `.bak` 복구 — n11bak 우연 패턴을 정식화).

**Deferred (별도 future-enhancement · 이 핸드오프 범위 밖)**:
- **flock(2) advisory lock** — writer 직렬화로 lost-update 방지. macOS 에 `flock(1)` 부재(비포터블) · 원자 write 가 관측된 wipe 를 이미 제거 · lost-update 는 저severity(한 동시 edit 유실, 전체 wipe 아님 · 재실행 회복).
- **add/remove = item 단위 merge** — lock 내 read-modify-write. 원자 write + empty-guard 로 wipe 가 닫혀 우선순위 하락 · flock 과 함께 deferred.

**근거**: worktree agent 다수 + 메인 세션 동시 실행은 흔한 워크플로. `pool.json` 은 단일 공유 mutable state — race 방어가 없으면 roster 소실 = 실행 중 캠페인 전면 중단 위험. 이번엔 n11bak 우연 복구로 살았으나, 백업이 없었다면 ubu-1 의 진행 중 DFT job 회수가 불가능했음.

**Status**: ✅ resolved · fix=`dancinlab/pool` 0.8.5 (`601a42d`) · `_save` 원자 write + empty-clobber 가드 + `_load`/.bak 로테이션 · 30-writer 동시 storm 무손상 검증 · `hx install pool` 로컬 라이브 · flock 직렬화(lost-update)는 deferred(macOS 비포터블 · 저severity) · 2026-05-25

## 2026-05-25T07:50Z — skill family context-awareness audit + fallback chain proposal (from: demiurge user-feedback)

**사용자 피드백 인용** (2026-05-25T07:30Z, demiurge 세션):
> "sidecar 도 개선필요할듯 다른명령어 처럼 맥락따라 작동하게 지정안하면" → (정정) "아니다 inbox"

즉 **다른 sidecar skill 들 (`/cycle` · `/domain` · `/check` · `/end`) 은 args 없으면 active domain / cwd / 직전 turn 컨텍스트로 graceful fallback 하는데, args-required skill 들 (`/micro-exp` · `/imagine` · `/paper`) 은 args 없으면 stuck/fail — 일관성 부족**. INBOX 에 audit + propose 만 던지고 fix 는 사용자가 review 후 driven.

### Audit (24 skills · context-aware ✓ 9 · mixed 6 · args-required ✗ 9)

| skill | 분류 | 현재 args-handling 패턴 |
|---|---|---|
| `/check` | ✓ context-aware | bare = cwd 의 `*.log.md` checkbox + git status + gh PRs (zero-arg dashboard) |
| `/end` | ✓ context-aware | bare = cwd repo 의 uncommitted/unpushed/stash/PR/version-drift 진단 |
| `/cycle` | ✓ context-aware | bare = active `<DOMAIN>.md` 의 `- [ ]` milestone 자동 열거 + 1a 라운드 auto-seed (직전 turn 시그널) |
| `/cycle-loop` | ✓ context-aware | bare = `/cycle` wrapper (active domain) + loop 페이싱 |
| `/all-bg-go` | ✓ context-aware | bare = 직전 assistant turn 이 제안한 모든 branch fan-out (REACTIVE) |
| `/inject`, `/ij` | ✓ context-aware | bare = cwd `project.tape` + sidecar commons.tape 자동 주입 (zero-arg) |
| `/quota` | ✓ context-aware | bare = unified all-accounts table (default verb = `list`) |
| `/hexa-help` | ✓ context-aware | bare = `hexa --help` top-level catalog (verb optional) |
| `/easy` | ✓ context-aware | bare = 직전 user message 의 language auto-detect → styles/easy.<lang>.md |
| `/ship` | mixed | bare = uncommitted status + 편집 가능한 template 표시 (never auto-stages); `-m <msg> <path>...` 강제 |
| `/atlas` | mixed | read verbs (hash · stats · lookup · dump) 일부 bare OK; write verbs (register · export) args 강제 |
| `/domain` | mixed | bare = active + @goal + progress bar + lint; init/set/goal/milestone/done args 강제 |
| `/secret` | mixed | bare = top-level usage; 모든 실 verb (get/set/...) args 강제 |
| `/pool` | mixed | bare = usage; `list`/`status` 는 zero-arg, `on/add/rm` 은 args 강제 |
| `/verify` | mixed | bare = usage; `rubric` 은 zero-arg, `<id>`/`--expr`/`--fence` 는 args 강제 |
| `/cycle-full`, `/cycle-full-loop` | ✗ args-required | `<seed-or-goal>` 강제 (depletion brainstorm 의 시작점) — bare fallback 없음 |
| `/micro-exp` | ✅ context-aware (0.2.0) | ~~`<manifest.yaml>` 강제~~ → **manifest 폐기**: 바 `/micro-exp`=대화/active-domain 맥락 self-enumerate · 인자=스코프 (이 audit 직후 land · 아래 top-3 #1 참고) |
| `/imagine` | ✗ args-required | `<prompt-file> <out.png>` 강제 — `list` · `help` 만 zero-arg |
| `/paper` | ✗ args-required | verb 자체가 강제 (new/sample/fig/compile/lint/list/help); cwd 가 paper-dir 이면 `compile`/`lint` 추론 가능한데 안 함 |
| `/cloud` | ✗ args-required | subverb (preflight/run/nohup/...) 강제 — bare fallback 없음 |
| `/kick` | ✗ args-required | `<seed>` 강제 (자연어 발산 입력 필요) |
| `/brainstorm` | ✗ args-required | `<seed>` 강제 — 직전 turn 의 topic 으로 fallback 안 함 |
| `/research:arxiv` | ✗ args-required | `<query | arxiv-id>` 강제 |
| `/research:yt` | ✗ args-required | `<url-or-id>` 강제 — 직전 turn 의 URL 추출 가능한데 안 함 |
| `/question`, `/q` | ✗ args-required | `<question>` 강제 (built-in `/btw` alias 의 본질이라 적절) |

### 제안: 5-step generic fallback chain (args-required skill 들에 적용)

```
1. args 명시           → use as-is (no fallback needed)
2. active <DOMAIN>.md  → grep skill-specific hint field (예: `@micro-exp: <manifest>`, `@paper: <slug>`, `@imagine: <prompt-file>`)  → use
3. cwd convention      → conventional filename probe (manifest.yaml · main.tex · prompt.txt · etc.) → use 첫 hit
4. 직전 turn context   → last-mentioned candidate 추출 (assistant 이전 turn 의 file path / URL / slug) → use
5. graceful diagnose   → 가능한 default 들 list + 사용자 선택지 surface (현재 `/micro-exp` stage 1 의 invalid-manifest 진단 패턴 그대로) — NEVER silently stuck
```

핵심 원칙: **stuck 금지** — 5번째 단계까지 와도 항상 사용자가 다음에 뭘 할지 명확한 명령어 한 줄 제시. `/cycle` 의 "🛑 no open milestones + no seed signal — choose: …" 패턴이 모범.

### 우선 개선 top-3 (사용자가 자주 잊는 명령어 순)

1. **`/micro-exp`** ✅ **RESOLVED (0.2.0, 2026-05-25)** — 제안된 manifest-fallback-chain 대신 **더 강한 해법 채택**: manifest 파일 자체를 폐기하고 `/cycle` 처럼 맥락에서 candidate self-enumerate (바=현재 맥락 · 인자=스코프 · no-signal 시 steer-options 정지). commons `g63-g66` 동반 land. → fallback-chain 단계 1~5 불요(맥락 self-enumerate 가 그 정신을 직접 구현). 나머지 top-3(`/paper`·`/imagine`)는 아래 그대로 open.
   - (원 제안 보존) fallback chain: (2) active domain `@micro-exp:` hint → (3) `cwd/manifest.yaml` → (5) diagnose. 0.2.0 이 이를 manifest-free 로 넘어섬.

2. **`/paper`** (next — verb 강제가 가장 부담)
   - **fallback chain**: (3) cwd 가 paper-dir 이면 (main.tex 존재) → default verb = `compile`; cwd 가 paper-dir 인데 `main.tex` 없으면 → `lint`; cwd 가 빈 dir → `list` (templates) → (5) diagnose
   - 즉 bare `/paper` 가 cwd 에서 가장 합리적인 verb 자동 선택.

3. **`/imagine`** (third — prompt-file convention)
   - **fallback chain**: (3) `cwd/prompt.txt` 또는 `cwd/prompts/<latest>.txt` → out.png 도 `cwd/out-<timestamp>.png` 자동 → (4) 직전 turn 의 image-request 문구를 mktemp 으로 prompt-file 화 → (5) diagnose + `list` 으로 fallback

이 셋이 정착되면 나머지 args-required skill (`/cloud` · `/kick` · `/brainstorm` · `/research:*` · `/cycle-full`) 도 같은 5-step 패턴으로 일반화 가능.

### 추가 관찰

- `/cycle` 의 **1a auto-seed** 메커니즘 (직전 turn 시그널 → ≤3 milestone seed → 재열거) 이 정확히 이 패턴의 **이미 구현된 reference implementation**. 다른 args-required skill 들도 같은 정신을 적용하면 일관성 확보.
- mixed skill 들 (`/domain` · `/atlas` · `/verify` 등) 의 bare-fallback 도 같은 패턴으로 통일하면 사용자 mental model 단순화 (`bare = read/show · args = write/act`).
- skill-specific hint field 를 `<DOMAIN>.md` 헤더에 추가하는 안은 `domain` skill 의 lint 도 같이 업데이트 필요 (별 PR).

**Status**: partial · `/micro-exp` ✅ resolved (0.2.0 context-driven · commons g63-g66 · 2026-05-25) · `/paper`+`/imagine`+일반화는 awaits:user-review · source:user-feedback-2026-05-25T07:30Z

- [ ] 사용자 review: 5-step fallback chain 패턴 채택 여부 (`/micro-exp` 은 manifest-free 로 선례 land — 나머지 args-required skill 에 일반화할지)
- [x] ~~우선 개선 top-3 `/micro-exp`~~ ✅ land (0.2.0 manifest 폐기 · context self-enumerate) · 남은 `/paper`·`/imagine` 은 사용자 review 대기
- [ ] 사용자 review: `<DOMAIN>.md` 의 skill-specific hint field (`@micro-exp:` · `@paper:` · `@imagine:`) 도입 여부
- [ ] fix PR (사용자 driven · 본 INBOX 는 audit + proposal 만)

## 2026-05-25T22:00Z — `/micro-exp` slash command + commons.tape 거버넌스 (from: demiurge RTSC)

**Motivation** — 이번 세션(demiurge RTSC)에서 입증된 inverse 패턴: 1-big-run 대신 **검증가능한 작은 실험 N개를 동시에** 던져 monitor + agent-parse + atlas-direct-fold 으로 닫는 closed loop. 인프라는 이미 사이드카 + hexa-lang에 다 깔림 (hexa-lang #846 atlas SSOT inversion + #859 generic verify-delegation + hexa cloud rent/down/list #798 + sidecar pr-cycle 0.3.6 + Monitor closed-loop). **빠진 것 = 사이클을 한 줄로 묶는 슬래시 표면**.

**Proposed slash command: `/micro-exp <manifest>` (or `/sweep`)** — one-shot 후보-리스트 sweep 오케스트레이터:
  1. manifest 파싱 (YAML/JSON · 항목당 `{candidate_id, kind, inputs_dir, pseudo_dir, host_class, parser_template}`)
  2. 각 후보 per: stage inputs → `hexa cloud rent` pod → copy-to → run → 🛰️ Monitor 무장 → JOB DONE 시 auto harvest+down → parse 에이전트 dispatch (manifest의 `parser_template` 사용) → 🟢 시 atlas register (generic verify-delegation, #859)
  3. **pod 예산 게이트**: ≤N concurrent (manifest 선언) · 초과분은 queue
  4. **aggregate** → `exports/sweep/<batch>/ledger.json` (manifest + per-candidate 결과 + 통합 패턴)

**Concrete unlocked use-cases** (이 세션이 직접 만난 것들): H₃X 전 가족 sweep (group 13-17 × 4 구조 × 압력 ≈ 80–100 micro-exps · ~$100/wk vast 예산) · SSCHA 양자보정 sweep (unstable 후보 일괄) · ML→DFT funnel (ALIGNN 10k 후보 → top-100 DFT). **현재 수동 비용**: ~30 min 인간시간/후보 × 100 = 50h. **자동화 시**: ~5h 셋업 + monitor.

**commons.tape 거버넌스 갭 (제안 @D)**:
- `@D g_micro_exp_honest_sweep` — sweep 내 모든 실험은 verify tier(🔵/🟢/🟠/🔴) 도달 필수 · silent drop 금지 · FALSIFIED는 CLOSED negative로 기록(스킵 아님). 이 세션의 RbTlH₃·h3as·SrAuH₃ 정직-FAIL 패턴이 sweep mode에서도 보존되도록.
- `@D g_sweep_budget_cap` — sweep manifest는 upfront `$_max/wk + pod_concurrent_max` 선언 의무 · 초과 시 dispatch halt. upstream `hexa cloud --max-price` TODO와 짝(이미 별도 INBOX 추적 중).
- `@D g_sweep_aggregation` — 모든 sweep batch는 typed ledger(manifest + verdicts + 통합 패턴 ASCII)를 `exports/sweep/<batch>/`에 출력. 사람이 한 번에 sweep 전체를 읽을 수 있도록.
- `@D g_sweep_pod_vs_agent_cap` — 현 `parallel-agent-cap=2-3`은 *AGENT* 캡 (rate-limit-kill 회피). sweep mode는 *POD* 캡 8(또는 manifest 선언) + *AGENT* 캡은 parse 단계만. 두 캡 의미 명확화 필요.

**Related upstream items (cross-ref)**:
- hexa-lang RFC 091 (preflight DFT/HPC) — sweep launch 전 budget/feasibility 게이트
- hexa-lang INBOX `hexa cloud 개선 4건` (`vast --max-price` 등) — sweep 예산 가드 의존성
- sidecar 기존 `/cycle` (active-domain 다음 라운드) — `/micro-exp`는 *manifest-driven sweep*, `/cycle`은 *milestone-driven loop*; 보완 관계

**Status** (2026-05-25 ✅ resolved): 4 sub-task 전부 closed. skill `skills/micro-exp/` 0.2.0 **context-driven 재설계** (manifest 파일 폐기 → `/cycle`처럼 맥락에서 candidate self-enumerate · 바=현재 맥락·인자=스코프) + commons.tape **g63-g66** land (유저 `sidecar sign commons` 후). 남은 의존 없음 — demiurge RTSC + TTR-* 도메인이 바로 `/micro-exp [scope]` 로 소비 가능. INBOX.md row closed.

- [x] design draft: `/micro-exp` slash command — **land** (0.2.0, **context-driven 재설계**): manifest 파일 요구 폐기 → `/cycle` 패턴대로 대화/active-domain 맥락에서 candidate matrix self-enumerate (바=현재 맥락 · `$ARGUMENTS`=스코프 필터 · no-signal 시 fabricate 금지·steer-options 정지). per-candidate `{id·kind·inputs_dir·pseudo_dir·parser_template}` 는 도메인 컨벤션에서 추론 · `batch_id` 자동 도출 · budget 은 dispatch 전 선언. 표면: `SKILL.md`(단일 @D + 5-stage 주석) · `commands/micro-exp.md`(Stage 1 = self-enumerate) · `plugin.json` · `marketplace.json`(line 342). `examples/h3x-sample.yaml` 제거(맥락 입력으로 대체).
- [x] propose commons.tape additions: `g63 micro-exp-honest-sweep · g64 sweep-budget-cap · g65 sweep-aggregation · g66 sweep-pod≠agent-cap` — **land** (유저 `sidecar sign commons` 5-min 토큰 후): commons.tape g63-g66 추가(do/dont만 · `@D tape-d-do-dont` 준수 · g63 do 는 100-char cap 맞춰 tier-이모지 목록 제거). commons hook 0.10.4→0.10.5 + marketplace 동기화(description `g0..g61`→`g0..g66`). `@V tape` spec 은 1.2 유지(스펙 미변경).
- [x] prototype 후보 matrix — **재설계로 manifest 파일 불요**: 후보는 호출 시 맥락(active domain · 대화 candidate matrix)에서 열거. 실제 sweep 실행(pod rent + ph.x 측정)은 입력파일(`~/etc/rtsc-results/`)을 가진 **demiurge RTSC 도메인 소관** — sidecar 는 표면만 제공.
- [x] cross-ref hexa-lang RFC 091 + `hexa cloud --max-price` 의존 추적 — command.md preflight(`RFC 091 stub` deferred 분기) + budget 선언(`usd_max_per_week` ↔ upstream `--max-price` TODO 짝) 인라인 cross-ref. 의존 자체는 hexa-lang INBOX(`hexa cloud 개선 4건`)에서 별도 추적.

## 2026-05-25 — worktree/branch 하네스 4-gap (from anima)

> anima 세션 (PURE Phase D + kosmos 단일 SSOT 이관) 중 `isolation:worktree` agent 6개 + closure agent 를 fan-out 하며 반복 발생. 기존 `hooks/worktree-gc`(merged prune)와 별개 — 이쪽은 격리 누수 + ref 유실 + PR 정합성.

- [ ] **#1 worktree agent 가 공유 .git HEAD 를 이동 (격리 누수)** — `isolation:worktree` 인데도 작업 후 메인 작업트리(anima)의 체크아웃 브랜치가 세션 브랜치(`feat/stdlib-…`)→`main` 으로 바뀜. agent 들이 "main worktree checkout 했다"고 보고. 세션 연속성 깨져 매번 수동 `git checkout <session-br>` 원복 (이번 세션 3회). 추정: gh pr create/merge 의 `git fetch` + worktree 생성/제거가 공유 HEAD 를 건드림. **harness(Anthropic) 영역** — sidecar 는 hook 으로 감지/경고 or upstream 보고.
- [ ] **#2 로컬 브랜치 ref 유실** — agent/gh 작업 후 로컬 feat 브랜치 ref 가 사라짐 (`git log <br>` → `unknown revision`). origin 엔 안전했으나 로컬 소실로 **커밋 유실 오인** (a_kosmos directive 가 사라진 듯 보임). 복구: `git checkout -B <br> origin/<br>`. **harness 영역** — 최소한 ref 삭제 전 경고.
- [ ] **#3 worktree agent PR 무관파일 bundle (sidecar-fixable)** — `isolation:worktree` 가 worktree 를 **부모 세션 feature-branch HEAD** 기준 생성 → 그 브랜치 in-flight 변경이 agent PR 에 딸려감 (PR #418: manifest 1파일 의도인데 CHANGELOG/INBOX/STDLIB/inbox-patches 등 11파일 동봉). g34(surgical) 위반. **sidecar fix 한계**(재분류 2026-05-25): base 강제는 harness(`isolation:worktree` 가 부모 세션 브랜치 HEAD 기준 worktree 생성) 영역 · PR 파일수 경고는 PreToolUse(`gh pr create`) 시점에 PR 이 아직 없어 측정 불가(PostToolUse hook 신설해야 가능, 별건). → #1·#2 와 함께 **harness-upstream** 으로 분류, sidecar 직접 fix 불가.
- [x] **#4 pr-cycle hook 의 `gh pr merge` cross-repo 오작동** — ✅ FIXED pr-cycle 0.3.6 (`5059…`→`hooks/pr-cycle/bin/_pr_cycle.hexa`): 신규 `_repo_flag` 가 `--repo <X>` 를 파싱 → cross-repo create 면 머지도 `gh pr merge --repo <X>`, 그리고 로컬(cwd) worktree cleanup 은 skip(PR repo ≠ cwd repo). same-repo 동작 불변. Smoke: `--repo dancinlab/kosmos` → merge 도 `--repo dancinlab/kosmos` · `--repo` 없음 → 기존 cwd merge. (원증상: `gh pr create --repo kosmos` 후 머지가 cwd repo anima main 을 fetch/머지)
- 출처: anima 세션 2026-05-25 (kosmos migration PR #3 + cycle-full 6-agent fan-out). #1·#2 harness-upstream · #3·#4 sidecar hook 으로 완화 가능.
- ✅ **resolved** (2026-05-25) — sidecar-actionable 항목 closed: **#4** pr-cycle 0.3.6 land (cross-repo `--repo` 전파 + cwd-mismatch worktree cleanup skip). **#1·#2·#3** 은 재분류 후 harness-upstream(Anthropic `isolation:worktree` 영역) — sidecar 직접 fix 불가하므로 추적만 유지. INBOX.md row closed.

## 2026-05-25 — `/domain` folder-nested domain 미지원 (from demiurge CARDIO+)
- [x] **gap**: `skills/domain` 의 `/domain set <NAME>` 이 `<NAME>.md` 를 **repo-root 에서만** resolve. 도메인 SSOT 가 self-contained 폴더로 중첩된 경우(`<NAME>/<NAME>.md`) root 에 빈 스캐폴드(`<NAME>.md` 127B + `<NAME>.log.md` 196B)를 매번 재생성.
- [x] **reproduction**: demiurge `CARDIO+` 는 `CARDIO+/CARDIO+.md` (+ `CARDIO+/CARDIO+.log.md`) self-contained 메타도메인. `/domain set CARDIO+` 호출마다 repo-root 에 빈 `CARDIO+.md`/`CARDIO+.log.md` 생성 → 매번 수동 `rm` 필요 (이번 세션 2회 재발).
- [x] **functional impact (cosmetic 아님)**: `/cycle` (g58) 는 active `<NAME>.md` 의 `- [ ]` 를 next-list 로 열거 — root 빈 파일을 읽으면 **milestone 0개 → 루프 구동 불가**. 폴더-중첩 도메인은 `/cycle` 자동화가 깨져 수동 orchestration 강제됨 (이번 CARDIO+ 세션 실제 발생).
- [x] **fix 후보**: `/domain` resolve 순서를 (1) root `<NAME>.md` → (2) fallback `<NAME>/<NAME>.md` (폴더-중첩) 로 확장. set/goal/milestone/done/cycle-enumerate 전부 resolved 경로 사용. 없을 때만 스캐폴드 생성 (현재는 무조건 root 생성).
- [x] **severity**: low-medium (수동 우회 가능하나 `/cycle` 자동화 차단 + 매 호출 noise). `+` meta-domain (folder 구성 권장 패턴)과 정면 충돌.
- 출처: demiurge `CARDIO+/CARDIO+.md` (self-contained 메타도메인 · CARDIO+ 10/10 · DOCTOR 10/10 작업 중 발견)
- ✅ **resolved** (2026-05-24, domain 0.8.0) — `skills/domain` 에 `_domain_dir`/`_snap_path`/`_log_path` resolver 추가: 모든 verb 가 root `<NAME>.md` → folder-nested `<NAME>/<NAME>.md` → root-default 순으로 해석(log 는 snapshot 디렉터리 따라감). root 도메인 무회귀(root 파일 존재 시 root 반환). nested FOO smoke (set/milestone/done/todo → `FOO/FOO.*` · root 빈파일 0개) 통과. `/cycle`(g58) 은 active 도메인을 `/domain` 으로 읽으므로 nested milestone 정상 열거.

## 2026-05-25 — skill `--root` 빈-바이너리 + pool-route 전면 escalate (from demiurge CARDIO+)
- [x] **#1 skill `--root` 빈-바이너리 가드** — wrapper 패턴 `H="$(command -v _<skill>.hexa)"; hexa run "$H" --root "$(dirname "$H")/.." …` 에서 `command -v` 가 빈 문자열을 반환하면 `hexa run "" --root …` → `--root` 가 첫 positional 로 소스파일 오인 → `source file not found: --root`. routed 환경(skill 바이너리 PATH 부재)서 `/imagine`·`/paper` 전면 차단. 빈-바이너리 guard 추가: `[ -z "$H" ] && { echo "skill binary _<skill>.hexa not on PATH (host=$(hostname))"; exit 127; }` (~5 LOC × N skills: imagine·paper·research·domain·inbox·ship 등 동일 패턴 전부)
- [x] **#2 pool-route 전면 escalate (load-escalated)** — load-escalated(Mac load > 150%) 분기가 macOS-only 명령까지 무차별 ubu SSH 라우팅 → 도달 불가: `secret`(Keychain)·`pool` CLI 자체·`pdflatex`/`/Library/TeX`·`_*.hexa` skill wrapper·`/opt/homebrew` 절대경로. 또 `SIDECAR_NO_POOL_ROUTE=1` override 가 load-escalate 분기서 무시됨. fix: escalate 제외 allowlist + `SIDECAR_NO_POOL_ROUTE=1` hard-override + `pool on <host>` 자체 재escalate 금지(idempotency) (~30 LOC)
- 출처: hexa-lang `inbox/patches/sidecar-skill-root-arg-and-pool-route-escalate-2026-05-25.md` (handoff 이관 후 hexa-lang 쪽 archive). 원 리포트 #3(`hexa verify --expr` ubu-2 `verify_cli.hexa` build segfault)은 hexa-lang 소관 — 별도 추적(이 handoff 범위 밖).
- ✅ **resolved-obsolete** (2026-05-24, sidecar `6383af9` 기준) — 두 항목 다 옛 sidecar 스냅샷 기준이라 현재 손댈 것 없음. **#1**: 모든 skill wrapper 가 이미 `$CLAUDE_PLUGIN_ROOT/bin/_*.hexa` 절대경로 사용 — `command -v` 미사용이라 빈-바이너리 실패 모드 자체가 없음 (INBOX.log 2026-05-24 fix 가 동일 건). **#2**: load-escalation 게이트는 pool-route 0.6.0 에서 제거됨 (`_pool_route.hexa` 414-428 = 제거 사유 주석 · classifier-only `@D s10` · zero-macOS-offload `@D s12`) + 요청한 `SIDECAR_NO_POOL_ROUTE=1` override 는 `@D s11`(escape-hatch 변수 금지) 위반이라 **미구현**.

## 2026-05-24 — worktree disk fill-up · 자동 prune (from anima)
- [x] `hooks/worktree-gc` 0.1.0 land — SessionStart 에서 merged linked worktree prune (threshold-gated · open-PR skip · NO opt-out)

## 2026-05-24 — agent self-merge via admin toggle (from hexa-lang PROBE r14)
- [x] `hooks/gh-api-guard` 0.1.0 + commons `@D g55` land — agent surface 의 branch-protection toggle + `gh pr merge --admin` hard-block (env-var bypass 없음)

## 2026-05-24 — `.hexa`-migrated skill 이 PATH 로 bin 못 찾음 (from anima)
- [x] resolved — command 템플릿을 `$CLAUDE_PLUGIN_ROOT/bin/_*.hexa` 절대경로로 전환 (research·domain·inbox·imagine·paper·ship)

## 2026-05-23 — hexa shim regen after rebuild (to hexa-lang)
- [x] closed — upstream 이미 해결 (hexa-lang #421·#446·#466, `hexa` 래퍼 추적됨) · sidecar #85 portable resolver 가 defense-in-depth

## 2026-05-22 — reflect hexa cloud cycle C (preflight) in /cloud (from hexa-lang)
- [x] resolved in `cloud` 0.2.0 — `preflight` verb + GPU mem-budget surface 반영

## 2026-05-27 — /domain `<NAME>.brainstorm.md` + `.tape` 3rd pillar (from demiurge)

협업 brainstorm 결과 영구 기록을 위한 도메인 평면 형제 파일 도입 제안.

**현재 패턴**: `<NAME>.md` (spec) + `<NAME>.log.md` (append-only log)
**제안**: `<NAME>.brainstorm.md` (분석/추론/도구, 사이클별 누적) + `<NAME>.brainstorm.tape` (아이디어 cart, @X 항목)

**상황**: demiurge RTSC에서 8 cycle 협업 brainstorm (math↔physics same-formula 24+ 아이디어, 2D→5D 차원 지도, 트리 가지치기 ~35 leaf) 산출물을 `.discoveries/`에 임시 저장 → `domains/rtsc.brainstorm.{md,tape}` 평면 형제로 수동 이전 (demiurge PR #370/371). 도메인 스킬 자체가 지원하면 더 깨끗.

**제안 verbs**:
- `/domain brainstorm <text>` → `<NAME>.brainstorm.md` 끝에 timestamped append (cycle 헤더 옵션)
- `/domain cart <text>` 또는 `/domain idea <text>` → `<NAME>.brainstorm.tape` 끝에 @X 항목 append
- bare `/domain` 상태 표시에 brainstorm 라인 추가 (`brainstorm: N cycles · M cart items`)

**디자인 노트**:
- `log.md` 와 차이: log = step-by-step 작업 기록 / brainstorm = 분석·아이디어 정리 (다른 목적, 분리 정당)
- `.tape` format = 기존 `@X` (speculation/cart) 활용
- 사이클 헤더는 timestamp 자동 (`## Cycle <N> — <date>`)

**우선순위**: medium · 워크어라운드(수동 편집)이 작동하지만, 협업 brainstorm 패턴이 도메인 스킬에 포함되면 모든 demiurge/anima/hexa-lang 도메인이 즉시 사용 가능.

**관련**: demiurge PR #335/344/346 (m-sign doc 본체) · PR #370/371 (brainstorm 이전).

## 2026-05-27 — /mining 슬래시 커맨드 (from demiurge RTSC) ✅ 해소

**해소** (sidecar `skills/mining/` 0.1.0): 신규 plugin · 6 verbs (bare/lens/append/cycle-new/depletion/tree) · 6 bundled lens (same-formula · ouroboros · dimensional · tension · combinatorial · custom · `~/.sidecar/lens/` 확장) · `<NAME>.mining.md` + `.mining.tape` 패턴 · active-domain only (commons @D g58) · profiles tier `core`.

---

협업 lens-driven 발산 가지치기 워크플로를 정식 슬래시 커맨드로.

**상황**: demiurge RTSC 도메인에서 13 사이클 동안 다음 흐름이 자연발생:
- math↔physics 같은-공식 lens · ouroboros (자기-닫힘) lens · 차원 사다리 lens · 모순 채굴 lens · 조합 곱 lens
- 각 lens 적용 → 트리 가지치기 → 사이클별 누적 → 영구 기록 (`domains/<NAME>.mining.md` + `.tape`)
- 결과: ~94 leaf + Cooper-Kramers fixed-point (LL-1) + Yoneda equivalence (LL-2) 발견

**제안 /mining verbs**:
- `/mining <lens>` — 명시 lens 적용 라운드 (lens ∈ {same-formula, ouroboros, dimensional, tension, combinatorial, custom})
- `/mining` (bare) — 활성 도메인의 mining.md 현황(사이클 수·leaf 수·미고갈 lens)
- `/mining append <text>` — 현 사이클에 timestamped append
- `/mining cycle new <title>` — 새 사이클 헤더 + skeleton
- `/mining depletion` — 현 lens가 새 leaf 0개면 "lens 고갈" 마킹
- `/mining tree` — 누적 트리 ASCII 시각화

**파일 패턴**: `<NAME>.mining.md` (사이클별 분석/추론) + `<NAME>.mining.tape` (idea cart, @X 항목). `/domain` 패턴과 sibling.

**디자인 노트**:
- log.md = 작업 step, mining.md = lens-driven 발산. brainstorm.md 잠재 별칭(둘 다 가능).
- lens 카탈로그 = sidecar bundled (확장 가능 — `~/.sidecar/lens/<name>.md`).
- cycle = chronological, depletion 선언이 cycle 종결.
- ouroboros 류 self-reference 표면화는 lens 자체 fixed-point 신호 = goal 자동 종결.

**관련**:
- demiurge PR #335/344/346 (m-sign formula doc, math↔physics lens)
- demiurge PR #370-378 (mining.md/.tape 본체 + 13 cycle 누적)
- sidecar INBOX #189 (`<NAME>.brainstorm.{md,tape}` 3rd pillar — 본 entry의 선행)

**우선순위**: medium · 수동 패턴이 작동하지만 `/mining`이 정식이면 모든 demiurge/anima/hexa 도메인 즉시 사용. brainstorm/mining 명칭은 둘 다 받아도 됨 (mining이 lens-driven 함의 더 명확).

## 2026-05-27 — /mining connect|edges 점잇기 verb (from demiurge RTSC) ✅

**해소** (sidecar `skills/mining/` 0.2.0): connect/edges/graph/saturate 4 verbs 추가 · `<NAME>.mining.md`에 `## edges` 섹션 추가 · status line `edges=M` 표시 · `(no-edge) L<a> ⊥ L<b>` NEGATIVE 기록 패턴 · saturate inner-pass cap 5 (안전) · trivial-transitive/re-packaging/generic-ancestor 제외 디자인 + `#189` (`<NAME>.brainstorm.{md,tape}` 3rd pillar) ✅ superseded — 양방향 lens-divergence + connect-convergence가 #189 "verify 후 underlying truth로 통합" 요구를 더 일반적으로 해소.

`/mining` 슬래시(#190)에 *edge enumeration* verb 추가 — 발산 후 자연 다음 단계.

**상황**: demiurge RTSC mining에서 14 사이클(~94 leaf) 발산 후 사용자 "선들 연결해봐 고갈까지" → Cycle 15에서 leaf-leaf 의미있는 direct edge 32개 발견 → 그래프 본질 토폴로지 도달 (정보 압축: ~94 leaf → 1 진실 + 6 미커버).

**제안 verbs**:
- `/mining connect` 또는 `/mining edges` — 현 누적 leaf 사이의 의미있는 direct edge 발견 라운드. 동일 lens 기능에 *추가* (lens=발산, connect=수렴).
- `/mining connect <leaf-a> <leaf-b>` — 특정 두 leaf 사이 edge 정당화(혹은 무관 확인).
- `/mining graph` — 누적 edge 그래프 ASCII 시각화 + 통계 (n leaf · m edge · n(n-1)/2 가능 · 의미 비율).
- `/mining saturate` — 새 edge 없을 때까지 자동 반복 (depletion analog of `/mining` lens 루프).

**디자인**:
- lens 종류 = 발산 (leaf 추가); connect 종류 = 수렴 (edge 추가).
- 둘 합쳐 mining = (leaves, edges) 그래프 누적 — 그래프 이론에서 자연 짝.
- edge "의미있음" = 사용자 판단 또는 LLM 자기-평가 (재포장/transitive 제외).
- `/mining depletion`이 이미 있다면 lens+connect 둘 다 고갈 시 활성.

**관련**:
- sidecar #189 (`<NAME>.brainstorm.{md,tape}` 3rd pillar)
- sidecar #190 (`/mining` lens-driven 발산)
- demiurge PR #380 (Cycle 15 edge 32개 + 그래프 고갈 실증)

**우선순위**: medium-high · 사용자 패턴이 sidecar #190만으론 발산만 자동화, 수렴(점잇기)도 정식화하면 mining 워크플로 완결.

## 2026-05-27 — /mining tidy|consolidate 정리 verb (from demiurge RTSC) ✅

**해소** (sidecar `skills/mining/` 0.3.0): tidy/consolidate/squash 3 verbs 추가 (총 12 verbs) · 4 phase 그룹(divergence/analysis/convergence/external) · cycle-index 표(chronological 순서 보존 — LOSSLESS) · stats(n leaves · m edges · K cycles · covered/uncovered axes · meaningful ratio) + closure box 자동 · `--depth=light`(header+index) / `--depth=full`(body regroup, DEFAULT) · squash=cosmetic dup-header dedup only (low-risk pre-step) · `@kind:` 누락 시 phase 추정 금지 → 명시 요구 · status 자동 advisory ≥10 cycles & ≥500 lines.

`/mining` 슬래시(#190)에 *재정리* verb 추가 — 발산(lens)/수렴(connect)에 이어 *organize*.

**상황**: demiurge RTSC mining 15 사이클 누적 후 chronological raw 형식이 가독성 떨어짐. 사용자 "마이닝 계속 고갈시까지 정리" → mining.md를 430→230줄로 phase 그룹화 + dedup (#382). 이 워크플로를 슬래시화.

**제안 verbs**:
- `/mining tidy` 또는 `/mining consolidate` — 누적된 사이클을 phase 그룹(발산/분석/수렴/외부)으로 재조직. 사이클 인덱스 표 + 통계 + 미커버 axis + 단일 closure box 자동 생성. content lossless (chronological 정보는 인덱스 표로 보존).
- `/mining tidy --depth=light` — 헤더 + TOC만 추가 (Cycle 8 안전 모드).
- `/mining tidy --depth=full` — 본문도 재조직 (Cycle 15 본 PR 패턴).
- `/mining squash` — 중복 헤더(예: 반복되는 "다음 사이클 예정")만 단일화.

**디자인 노트**:
- lens(발산) + connect(수렴) + tidy(정리) = mining 워크플로 3종 완성 (lens/edges/organize).
- tidy는 destructive 보임이나 chronological 정보를 *인덱스 표*로 보존 → lossless.
- depth 매개변수: light=cosmetic / full=structural.
- 자동 트리거 가능: 사이클 수 ≥10 + log 행 ≥500 시 `/mining tidy` 제안 메시지.

**관련**:
- sidecar #189 (`.brainstorm/.mining` 패턴) · #190 (`/mining` lens) · #191 (`/mining connect`)
- demiurge #382 (mining.md v2 정리 본체 — phase 그룹 + 단일 closure)

**우선순위**: medium · 발산/수렴 완성된 sidecar #190/#191 후 자연 다음 step. 누적 doc의 가독성·유지보수성 직격.

## 2026-05-27 — ~/.pool/pods.json 활성 POD 매니페스트 (update-form, from demiurge RTSC)

호스트 roster용 `~/.pool/pool.json` (이미 존재 · update-form)의 sibling — 활성 DFT/dispatch POD 상태를 *append 아닌 update 형식*으로 관리.

**상황**: demiurge RTSC 캠페인에서 8 DFT job + 8 background watcher 동시 진행. 현재 상태가 산재:
- background watcher PID (bfvsatagh, b8tw784iy, ...)는 `/private/tmp/.../tasks/*.output` (chronological append)
- pod-에 dispatched 정보는 `exports/sweep/<batch>/state.json` + `ledger.json` (cycle별 append)
- 한눈에 "지금 무엇이 어디서 진행중"이 안 보임 → 매 사이클 sweep 명령 반복 필요

**제안 파일**: `~/.pool/pods.json` (또는 `~/.pool/dispatch.json`)

```json
{
  "version": "1.0",
  "last_updated_utc": "2026-05-27T14:15:00Z",
  "pods": {
    "vast-ysbh6-pod-41837": {
      "host": "77.104.167.149:41837",
      "provider": "vast.ai", 
      "ssh_key": "id_vast_anima",
      "cores": 80,
      "qe_env": "/root/miniforge3/envs/qe",
      "rented_since": "2026-05-25T..."
    }
  },
  "jobs": {
    "mgb2_pure": {
      "pod": "vast-ysbh6-pod-41837",
      "dir": "~/mgb2_pure",
      "kind": "dft-elph",
      "stage": "ph",
      "started_utc": "2026-05-27T07:38:18Z",
      "pid": 10975,
      "watcher": "bpl3k1l8m",
      "watcher_output": "/private/tmp/.../bpl3k1l8m.output",
      "last_progress": {"iter": 16, "cpu_s": 22504},
      "anchor_tc_K": 39,
      "verdict": "PENDING"
    },
    "cah6_decompress": {"pod": "vast-ysbh6-pod-41837", "kind": "dft-vc-relax+ph",
       "stage": "vc-relax", "watcher": "bfvsatagh", ...},
    ...
  }
}
```

**update-form 의미**:
- 각 job/pod entry는 *전체 덮어쓰기*로 갱신 (`jq` merge 또는 atomic write).
- 같은 watcher 재무장하면 entry 갱신 (append 안 함).
- pod down/job 종료 시 `verdict` 필드만 갱신, entry 보존.
- JSON Patch (RFC 6902)로 idempotent merge: `jq -s '.[0] * .[1]' pods.json patch.json > pods.json.new && mv`.

**제안 `pool` CLI 확장**:
- `pool pods` (or `pool dispatch`) — pods.json render (테이블).
- `pool dispatch add <id> <host> <dir> ...` — entry 추가/덮어쓰기.
- `pool dispatch verdict <id> <status>` — verdict 필드 갱신.
- `pool dispatch rm <id>` — entry 제거.
- `pool dispatch active` — verdict=PENDING entry만.
- `pool dispatch tree` — pod별 job 트리 ASCII.

**디자인 노트**:
- `.json` 선택: `~/.pool/pool.json` 선례 + `jq` 표준 merge + 모든 도구 paseable.
- `.tape` 거부 이유: 발산/누적 지향(project.tape, mining.tape), update form 아님.
- 위치 `~/.pool/`: pool 생태계 sibling 자명.
- `last_updated_utc` 트래킹: stale detection.
- `watcher_output` 경로: monitor 재첨부 지점 (commons @D g10).

**관련**:
- 기존 `~/.pool/pool.json` (호스트 roster, update-form 선례)
- demiurge `exports/sweep/<batch>/{state,ledger}.json` (batch별 append, sibling 위치)
- sidecar #189/#190/#191/#192 (`<NAME>.brainstorm/.mining` + `/mining` 3종)

**우선순위**: medium-high · 현재 8 DFT 동시 진행 + 향후 wave-3 dispatch 시 매니페스트 부재가 가시성 병목. 멱등 update-form이 mining의 chronological log와 자연 분리(상태 vs 역사).
