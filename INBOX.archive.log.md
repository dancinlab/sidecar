# INBOX — archive (log)

Resolved/routed entries moved from `INBOX.log.md` (2026-05-27 이하 · 역순 보존). 활성 추적은 `INBOX.log.md`; 본 파일은 history 보관용 (lint soft-cap 해소 2026-05-29).

## 2026-05-27 — /sbs (commands/step-by-step) FULL mode: chat+analogy 1Q + final "이거 맞아요?" ASCII confirm (UX 제안) ✅

**해소** (commands/step-by-step 0.4.0): FULL 자체가 chat-form으로 전환 (별도 sub-mode 토큰 X · 사용자 정정 반영). 한 라운드 = ONE 채팅 질문, easy-mode 7-요소 scaffold (아이콘·이름·별칭·평이·비유·ASCII·비교표·추천 + `→ A · B · 또는 자유응답`). 라운드 종료 후 `🎯 합의된 결정셋 (N개)` ASCII tree pause — user `go` / `Qn=<X>` 수정. mid-run new ambiguity도 chat 라운드 + 재합의 후 resume. Fallback: 사용자가 selectbox 원하면 그 1라운드만 AskUserQuestion. step-by-step.md + sbs.md 동기.



> **사건**: demiurge 세션에서 `/sbs full web gui, cli 8verb 처리과정 구현계획` 으로 진입 → 모드는 disambiguate-first(FULL) 가 맞으나, AskUserQuestion 4-옵션 선택상자가 한 번에 4축을 묶어 던져 사용자 인지부하 ↑. 사용자 명시 요청: "선택상자 말고 비유하면서 채팅으로 진행". 채팅+비유 1문항씩으로 전환하니 흐름이 깔끔. 또한 disambiguate 종료시점에 "최종 원하는게 이거 맞아요?" 의 ASCII 구조 합의 화면 부재 — 사용자가 plan 진입 전 전체 결정셋을 한 눈에 보고 yes/no 할 surface 가 없음.

> **갭 #1 — UX 형식 고정 1종**: FULL mode 가 AskUserQuestion(선택상자) 사실상 강제. 채팅+비유 1Q 방식이 더 적합한 케이스(설계 상담, 도메인 비전문가, 비유 매개 학습) 에 옵션 없음.

> **갭 #2 — 합의 화면 부재**: disambiguate 라운드 N개 종료 후 plan 직행. 사용자 머리속의 결정셋과 실제 누적 결정셋 정렬 확인 단계 없음. → plan 실행 중 "어 이거 그 선택 아니었는데" 발견 시 되돌리기 비용 큼.

**구현 제안 (`commands/step-by-step/SKILL.md` · `/sbs` 모드 spec)**
- [ ] **(a) FULL 모드 sub-format 옵션 2종 추가**:
  - `FULL` (default · 현행): AskUserQuestion 4-옵션 선택상자 round 반복
  - `FULL-chat` (신규): 1문항씩 채팅으로 · 비유(🍳🍱🧶 등) + ASCII + 비교표 + 추천 한 줄 · 사용자는 자유응답(예: `A` / `B` / `다른 안 ...`). easy 응답 스타일과 자연 결합. 트리거: `/sbs full-chat <task>` 또는 사용자가 "선택상자 말고 채팅" 류 요청
  - first-arg 토큰: `go|auto|manual|full|full-chat`
- [ ] **(b) "최종 이거 맞아요?" 합의 화면 (모든 FULL 변종 공통)**:
  - disambiguate 라운드 종료 시점(`ambiguity → 0`) 에 plan 으로 직행 ❌
  - 대신 누적 결정셋을 ASCII 구조로 한 번에 펼침:
    ```
    🎯 합의된 결정셋 (N개)
    ┌─ Q1: <축>  →  ✅ <선택>
    ├─ Q2: <축>  →  ✅ <선택>
    └─ Qn: ...
    ```
    + 한 줄 요약 + "맞으면 `go` · 수정은 `Qn=<다른선택>`"
  - 사용자 `go` 떨어지면 plan 단계로 진입
  - 도중 사용자가 `Qn=<X>` 적으면 그 결정만 갱신, 나머지는 유지하고 다시 합의 화면

**비교 (현행 FULL vs 신규)**
| 축 | 현행 FULL | FULL-chat | 합의 화면 |
|---|---|---|---|
| 인지부하 | 4축 동시 | 1축씩 | 누적 한 눈 |
| 학습 친화 | 낮음 (옵션 텍스트만) | 높음 (비유+ASCII) | 합의 명시 |
| 자유응답 | ❌ "Other" 슬롯 | ✅ 자연 자유 | ✅ 수정 |
| plan 진입 정렬 | 가정 | 가정 | **명시 yes/no** |

**우선순위**: (a) > (b). (a)만 있어도 사용자가 채팅 흐름 쓸 수 있음. (b)는 모든 FULL 변종에 공통 안전망 — 합의 후 plan 진입은 g0(Occam) 이자 d2(돌이키기 비용 최소).

**참고**: easy-auto 스타일(7-요소 패턴) 과 자연 결합 — full-chat 의 각 라운드가 그대로 7-요소(아이콘·이름·별칭·평이·비유·ASCII·비교) 충족.

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

## 2026-05-26 — worktree-gc 가 활성 worktree prune (브랜치명 재사용 오판) (from demiurge monograph fan-out) ✅

**해소** (`hooks/worktree-gc` 0.2.0): HEAD-ancestor 진짜-merged 체크 (`git merge-base --is-ancestor`) + dirty/recent-mtime/cwd-in-use 3중 라이브 가드 + 원자 prune (실패 시 무삭제). CERN(#220)·ANTIMATTER(#222) 재발 차단.



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

## 2026-05-26T00:05Z — paper:paper v0.8 — 3 verb 버그 (from: demiurge ANTIMATTER paper rego PR #197) ✅

**해소** (skills/paper 0.11.0):
- `pr-roll`: bare repo name early reject (`OWNER/REPO 요구` 친절 에러) + jq 표현식이 `\\\\#` emit → LaTeX `\#` 살림 (전엔 jq `Invalid escape \#` crash)
- `atoms`: `LC_ALL=C` 래핑 (BSD awk illegal-byte-sequence 회피) + 사용자입력/파일 모두 lowercase 비교 (BSD awk는 GNU IGNORECASE 없음) + `fn <name>(` 시그니처 패턴 추가 (dispatch 라인 매칭)
- `arxiv-prep`: dir → absolute path 선해결 후 `cd $TMP && tar -czf <ABS> .` (전엔 relative target이 `$TMP/<dir>/...`로 해석돼 항상 실패)
- shipped `bin/hexa-verify` stale 관련 install-sync 갭은 별도 — paper 영역 외이므로 본 entry 범위 밖

smoke: bare reject ✅ · OWNER/REPO ✅ · `atoms verify` fn signatures + 주석 매칭 출력 ✅ · `arxiv-prep` no-main.tex reject 정상.



**맥락**: ANTIMATTER BLUE-MAX paper를 paper v0.8(sample-blue-max + 신규 verb)로 재생성 중 3개 verb가 advertised대로 동작 안 함. stub-first (g60) — 구현은 review 후.

- [ ] `paper pr-roll <repo> <since>` — `pr-roll.json` 작성은 OK이나 LaTeX `\paragraph` emit이 jq `\#` escape 버그로 crash · bare repo name 대신 `OWNER/REPO` slug 요구
- [ ] `paper atoms <DOMAIN>` — case-sensitive + `verify_cli.hexa` 주석 라인만 매칭 → usable atom list 안 나옴 (소스 fn dispatch 파싱 필요)
- [ ] `paper arxiv-prep [dir]` — tar target을 relative path로 만들고 `cd "$TMP"` subshell 안에서 tar 실행 → 항상 실패 (절대경로 또는 cd 제거)
- [ ] (관련 context) shipped `bin/hexa-verify`가 stale → antimatter atom 미인식, verify-block이 재빌드 강제 (install-sync 갭)

repro: demiurge antimatter-bluemax-2026 rego (PR #197) · paper plugin v0.8

## 2026-05-25T11:20Z — g61 stdlib-SSOT 강제·자동화·범위확장 (from: anima IIT4 세션) ✅

**해소** (4-track land): commons 0.10.7 g61 범위확장 (primitives + domain engines · engine⊥adapter · import-root) · `hooks/stdlib-ssot-guard` 0.1.0 (PreToolUse advisory + SessionStart stdlib-root 검증) · `skills/stdlib` 0.1.0 (`/stdlib check`/`promote` 런북) · SessionStart import-root 체크.



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

## 2026-05-25T08:00Z — `/domain` 아이콘+별칭 타이틀/서브타이틀 지정 (from: anima IIT4 세션) ✅ resolved (domain 0.8.5 · @title 필드 + title/subtitle verb)

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


**해소** (`skills/mining` 0.1.0~0.3.0): `/mining` 3rd pillar로 더 일반적인 해소. lens(발산) + connect(수렴) + tidy(정리) 3-workflow가 brainstorm/append/cart 패턴을 모두 포괄. `<NAME>.mining.md` + `<NAME>.mining.tape` 파일 패턴 동일.



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

## 2026-05-27 — ~/.pool/pods.json 활성 POD 매니페스트 (update-form, from demiurge RTSC) ✅

**해소** (hexa-lang `stdlib/cloud/pods_local.hexa` 0.4.0 · PR #1699 main 머지 · sidecar `skills/cloud/` 0.4.0). **위치/CLI 정정**: INBOX entry 원안의 `~/.pool/pods.json` 글로벌 + pool CLI는 사용자 의도("프로젝트마다 작업관리 시스템 · 파일 한 개로")와 영역 불일치(pool=호스트 roster · pods=작업 매니페스트) → **cwd `./pods.json` per-project + hexa cloud 확장**으로 land. pool 0.9.0 wip 폐기. 6 verbs (pods · dispatch · dispatch tree · active · add · verdict · rm) 8-case smoke ALL PASS. atomic write + .bak 로테이션 + auto `last_updated_utc` 스탬프(s11). 글로벌 `pod_registry` (`cloud orphans`/`reconcile` · `~/.hexa-cloud/pods.jsonl` 자동추적 billing/orphan 방어)와 분리 — `pods`/`dispatch`는 operator의 manual project work view, 공존.



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

---

## 2026-05-28 — /sbs full 18-round 진행 패턴 보강 (from demiurge Web GUI 설계) ✅ 흡수 (sbs 0.5.0 chat-form + plan.md handoff)

PR #194 (FULL chat+analogy) 후속. 18 라운드 disambiguation 실세션 운용 중 드러난 보강 거리.

**컨텍스트**:
demiurge `/sbs full web gui ,cli 로 8verb 처리과정 구현계획 잡자` → 18 라운드 Q-disambiguation → 청사진+9-step PR plan 합의 → PR#0 design SSOT (4 manifest) merge. 인터럽트 빈번 · 의도 변화 (예: starter → public-domain library) · 카테고리 변경 (6→5).

**제안 보강** (FULL 모드 한정):

1. **Q 매트릭스 매 답변 갱신** — `Q1~Q15 ✅ · Q16~ ❓` 한 줄로 상단 고정. 사용자 진행 가시성 + AI 망각 방지.
2. **결정 즉시 SSOT 저장** — N 라운드 결정될 때마다 `<topic>_DESIGN.md`에 누적 기록 (drift-guard 자동 발화에만 의존 X). 컨텍스트 압축 시 안전망.
3. **fork 라운드 명시 처리** — 사용자가 직전 결정 변경 (예: "X말고 Y") → 새 라운드 (Qn′ 또는 Qn-revised)로 번호 부여 · 기록 보존. 폐기된 결정은 ~~strikethrough~~ 로 트레이서빌리티 유지.
4. **최종 단계 = 청사진 + N-step plan 합성** — 모호함 0 도달 직후 자동: (a) ASCII 한 화면 청사진 (b) g4 stacked PR plan (≤200 LOC × N단계) (c) PR#0 = design SSOT manifest (코드 0 · 비용 0).
5. **카테고리/도메인 fork 시 4-place 동기 갱신** — 매니페스트 (.tape) + 디자인 SSOT (.md) + memory + MEMORY.md 포인터, 한 사이클로.
6. **guard rule 등록** — 사용자가 "X는 건들이지마" 발언 시 (예: 랜딩페이지) Q 형태로 명시 (예: `Q17 = guard · 랜딩페이지 무변경`). 후속 PR에서 자동 회피.
7. **응답 분량 g3** — 한 라운드 답변은 7요소(easy.ko) + 표 + ASCII + 옵션 3개 (A·B·C) + 추천 1개 + 한 줄 다음 Q. 50~70 라인 cap.

**왜 지금**: 18 라운드 / 인터럽트 12회 / 의도 fork 3회 / 매니페스트 갱신 7회 — 패턴이 안정화됨. 다음 사용자가 `/sbs full` 쓸 때 동일 효율 보장.

**관련**:
- PR #194 (FULL chat+analogy) — 이 보강의 base
- demiurge `domains/WEB_GUI_DESIGN.md` (18-round 실세션 산출물)
- demiurge `domains/STDLIB_MATRIX.tape` + `CATEGORIES.tape` + `PUBLIC_DOMAINS.tape` (PR#0 design SSOT)
- demiurge PR#388 (PR#0 stdlib-matrix-index merged)

**우선순위**: medium · 다음 `/sbs full` 사용 시 즉시 적용 가능 · 코드 변경 없음 (skill 문서 + style guide 갱신만).

---

## 2026-05-28 — handoff 모드 = stacked-PR plan 완료 후 자동 HANDOFF.md 생성 (from demiurge Web GUI fire) ✅ 흡수 (sbs 0.7.0 자동 HANDOFF.md 9-section)

PR #195 (/sbs full 18-round 보강) 자매 entry. demiurge `/sbs full` → 9-step stacked PR plan 자율 fire (PR#0~PR#8, 7 merged) 직후 운용 중 드러난 보강.

**관찰**:
demiurge Web GUI: 18 라운드 합의 → PR#0 (design SSOT 4 manifest) → PR#1~PR#7 (code 7 PR, ~1300 LOC, 0 npm, 0 GPU) → PR#8 (HANDOFF.md). 마지막 PR이 명시적 인계 문서가 아니면 다음 세션이 7 PR 결과를 재구성하느라 두 번 일함.

**제안 보강** (sbs FULL 모드 한정 · `/sbs full` + `handoff` 키워드 트리거):

1. **plan 완료 직후 = HANDOFF doc PR 자동 추가** — N-step plan 의 마지막 PR로 `domains/HANDOFF.md` (또는 repo 컨벤션 위치) 한 PR 강제. 한 문서에 9 섹션:
   - § PR 진행 상태 매트릭스 (번호 · 제목 · 상태 · merged 일시 · 핵심)
   - § 설계 SSOT 파일 인덱스 (먼저 읽을 파일들)
   - § 새 API surface (method · path · 역할 · 권한 표)
   - § 새 컴포넌트/lib 트리 (디렉토리 스케치)
   - § 환경 변수 (활성 전 필수)
   - § 다음 우선순위 (정렬된 todo list)
   - § 알려진 한계 + guard rule
   - § memory/CLAUDE.md 인덱스
   - § 한 줄 시작 가이드 (다음 세션 첫 명령)

2. **handoff trigger 키워드** — 사용자가 "handoff 모드 · 완전 구현" / "완전한 handoff" 발화 시 9-step fire 끝까지 자동 + 마지막 PR로 HANDOFF doc 강제.

3. **HANDOFF.md memory 미러** — `memory/project_<slug>_handoff.md` 한 줄 pointer 자동 등록 + `MEMORY.md` 한 줄 추가. drift-guard와 합치.

4. **"PR cycle 자동" 패턴 명시** — 단일 worktree (`~/core/<repo>-pr-cycle`) 안에서 branch 갈아끼우는 패턴이 N 회 worktree 생성/제거보다 5-10× 빠름 (실측: 7 PR 6 분). 매 PR `reset --hard origin/main + checkout -b` 사이클.

5. **PR-create hook 자동 merge 깨짐 보정** — cross-repo `--repo X` 사용 시 hook이 `gh pr merge --repo X` 만 append 하고 PR 번호 누락 → exit 1. fix: skill 이 PR 번호를 캡처해 명시적 `gh pr merge <N> --repo X` 폴백 발사.

**왜 지금**:
이번 demiurge fire 9 PR (#388~#397) 전부 PR-create hook의 number-누락 merge 실패 발생 → 명시적 merge 콜 반복. 패턴화 가치 있음.

**관련**:
- PR #194 (FULL chat+analogy)
- PR #195 (/sbs full 18-round 보강)
- demiurge `domains/HANDOFF.md` (이 entry 의 reference impl)
- demiurge PR#388/389/391/392/393/394/395/396/397 (9 stacked PR cycle 실측)

**우선순위**: medium-high · skill 갱신 + style guide 한 줄. 다음 `/sbs full handoff` 즉시 적용 가능.

---

## 2026-05-28 — handoff 모드 보강 — "handoff verb 완성형 = end-user 산출물" (sidecar #197 clarify) ✅ 흡수 (sbs 0.7.0 step 10 end-user dossier)

PR #197 entry 가 "stacked-PR plan 직후 HANDOFF.md PR 자동 추가" 패턴이었으나, **demiurge 사용자 본의는 다름** — 8 verb 중 `handoff` verb 자체가 end-user 가 클릭 한 번에 **실 산출물 (dossier bundle)** 을 받아 들고 나갈 수 있어야 한다는 의미. PR #197 는 다음 세션(AI) 인계 문서였고, 핵심은 사용자 인계.

**둘 다 필요 · 둘 다 패턴화**:

1. **AI 세션 인계** (#197 의 HANDOFF.md): 다음 세션이 작업을 이어받기 위한 doc. 9-step plan 끝에 강제 PR. ✅ 유지.
2. **End-user 인계** (이번 보강): handoff verb 페이지가 실 산출물 생성 + 다운로드. demiurge 구현 = `/api/v1/handoff/[domain]?download=1` → JSON dossier (records + manifest + generated_at). PR #398 reference impl.

**handoff verb 완성형 체크리스트** (sbs full + handoff 트리거 시 강제 항목):

- [ ] `GET /api/v1/handoff/{domain}` 엔드포인트 — JSON dossier 반환
- [ ] `?download=1` 시 `Content-Disposition: attachment` 헤더
- [ ] dossier = `{ domain, uid, generated_at, records[], manifest{verb_count, complete/in_progress/todo} }`
- [ ] 클라이언트 컴포넌트 = 미리보기 + ⬇ 다운로드 버튼 + status 카운트 카드
- [ ] `/handoff/[domain]` 페이지 slot = 위 클라이언트 컴포넌트 (placeholder 제거)
- [ ] (선택) zip / pdf / 사이드카 paper 합본 export

**관련**:
- sidecar PR #197 (HANDOFF.md AI-인계 패턴)
- demiurge PR #398 (handoff verb 완성형 reference impl: dossier endpoint + 다운로드 UI)
- demiurge `domains/HANDOFF.md` § 6 next-priority list

**우선순위**: high — "사용자 handoff 가 완성형이어야 한다" 가 사용자 본의. skill 갱신 시 PR #197 패턴과 함께 묶어 한 set 으로.

---

## 2026-05-28 — /sbs 마지막에 QA 단계 강제 추가 (from demiurge Web GUI 21 PR fire 후속) ✅ 흡수 (sbs 0.6.0 자동 QA 4축 · functional/visible/conformance/regression)

PR #194 (FULL chat+analogy) · PR #195 (18-round 보강) · PR #197/#198 (handoff 패턴) 자매. 21 PR 자율 fire 직후 발견 — **설계(spec) ↔ 구현(code) 1:1 매칭 확인 단계가 빠짐**. 사용자 본의는 작업 끝낸 후 "설계대로 됐나" QA 점검.

**관찰**:
demiurge handoff 모드 9-step + 추가 8-step (총 21 PR) 모두 merge ✅, Cloud Run deploy ✅. 사용자는 https://demiurge.dancinlab.org/dashboard 들어갔으나 visible 변화 인식 못 함 → "그대로" / "엉망". 원인 = (a) /dashboard 가 인증 redirect (b) PR#17 의 새 UI 가 페이지 하단 (c) verb 별 페이지 디자인 일관성 부족. **acceptance test (= QA) 단계가 있었다면 즉시 적색 깃발**.

**제안 보강** (sbs FULL 모드 한정 · 마지막 단계 강제):

1. **QA 단계 추가** — handoff (마지막 PR · HANDOFF.md) 직후, fire 종료 전 자동:
   - 모든 Q 결정 (Q1~Qn) × 라이브 surface 매트릭스 생성
   - 각 행: ✅ matches / ⚠️ partial / ❌ missing
   - 결과 = `domains/QA.md` (또는 `<slug>/QA.md`)
2. **QA 4축**:
   - **functional** — 결정한 endpoint/route/component 실제 응답?
   - **visible** — 사용자가 들어가는 URL 에서 변화가 보이나? (랜딩 vs auth vs scrolled)
   - **conformance** — 결정셋 (decision-set) 18 항목 × 코드 위치 매핑 표
   - **regression** — 기존 surface 안 깨졌나 (Q17 guard 페이지)
3. **QA fail → 자동 follow-up PR 제안** — ❌ 행마다 "fix idea + LOC 추정" 제안
4. **/sbs 흐름 갱신**:
   ```
   disambiguate → plan → fire → HANDOFF.md → 🔍 QA → done
                                              ↑ 신규 단계
   ```
5. **QA terminology 표준화** — `QA` (포괄) = `Acceptance Test` (정확). 둘 다 INBOX/skill doc 에 명시.

**왜 지금**:
이번 demiurge fire 에서 처음 발견. 21 PR 모두 merged + URL 응답 OK 인데 사용자가 "그대로/엉망" 인 격차 = QA 단계 부재의 정확한 증상. 

**관련**:
- PR #194/#195 (/sbs FULL chat+analogy + 18-round)
- PR #197/#198 (handoff 모드)
- demiurge PR #388~#409 (21 PR fire — QA 단계 없이 종료)
- demiurge `domains/HANDOFF.md` (handoff doc 만 있고 QA 없음)

**우선순위**: high — 다음 `/sbs full` fire 즉시 적용 가능 · skill doc + style guide 갱신만.
