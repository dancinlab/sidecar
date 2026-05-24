# INBOX — log

Append-only history sister of `INBOX.md`. Each entry starts with `## <ISO timestamp> — <header>` (newest on top); body = `- [x]` (done) / `- [ ]` (pending) checkbox tasks.

## 2026-05-25 — worktree/branch 하네스 4-gap (from anima)

> anima 세션 (PURE Phase D + kosmos 단일 SSOT 이관) 중 `isolation:worktree` agent 6개 + closure agent 를 fan-out 하며 반복 발생. 기존 `hooks/worktree-gc`(merged prune)와 별개 — 이쪽은 격리 누수 + ref 유실 + PR 정합성.

- [ ] **#1 worktree agent 가 공유 .git HEAD 를 이동 (격리 누수)** — `isolation:worktree` 인데도 작업 후 메인 작업트리(anima)의 체크아웃 브랜치가 세션 브랜치(`feat/stdlib-…`)→`main` 으로 바뀜. agent 들이 "main worktree checkout 했다"고 보고. 세션 연속성 깨져 매번 수동 `git checkout <session-br>` 원복 (이번 세션 3회). 추정: gh pr create/merge 의 `git fetch` + worktree 생성/제거가 공유 HEAD 를 건드림. **harness(Anthropic) 영역** — sidecar 는 hook 으로 감지/경고 or upstream 보고.
- [ ] **#2 로컬 브랜치 ref 유실** — agent/gh 작업 후 로컬 feat 브랜치 ref 가 사라짐 (`git log <br>` → `unknown revision`). origin 엔 안전했으나 로컬 소실로 **커밋 유실 오인** (a_kosmos directive 가 사라진 듯 보임). 복구: `git checkout -B <br> origin/<br>`. **harness 영역** — 최소한 ref 삭제 전 경고.
- [ ] **#3 worktree agent PR 무관파일 bundle (sidecar-fixable)** — `isolation:worktree` 가 worktree 를 **부모 세션 feature-branch HEAD** 기준 생성 → 그 브랜치 in-flight 변경이 agent PR 에 딸려감 (PR #418: manifest 1파일 의도인데 CHANGELOG/INBOX/STDLIB/inbox-patches 등 11파일 동봉). g34(surgical) 위반. **sidecar fix 한계**(재분류 2026-05-25): base 강제는 harness(`isolation:worktree` 가 부모 세션 브랜치 HEAD 기준 worktree 생성) 영역 · PR 파일수 경고는 PreToolUse(`gh pr create`) 시점에 PR 이 아직 없어 측정 불가(PostToolUse hook 신설해야 가능, 별건). → #1·#2 와 함께 **harness-upstream** 으로 분류, sidecar 직접 fix 불가.
- [x] **#4 pr-cycle hook 의 `gh pr merge` cross-repo 오작동** — ✅ FIXED pr-cycle 0.3.6 (`5059…`→`hooks/pr-cycle/bin/_pr_cycle.hexa`): 신규 `_repo_flag` 가 `--repo <X>` 를 파싱 → cross-repo create 면 머지도 `gh pr merge --repo <X>`, 그리고 로컬(cwd) worktree cleanup 은 skip(PR repo ≠ cwd repo). same-repo 동작 불변. Smoke: `--repo dancinlab/kosmos` → merge 도 `--repo dancinlab/kosmos` · `--repo` 없음 → 기존 cwd merge. (원증상: `gh pr create --repo kosmos` 후 머지가 cwd repo anima main 을 fetch/머지)
- 출처: anima 세션 2026-05-25 (kosmos migration PR #3 + cycle-full 6-agent fan-out). #1·#2 harness-upstream · #3·#4 sidecar hook 으로 완화 가능.

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
