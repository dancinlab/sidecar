# CHANGELOG

## feat: worktree — no-pileup/no-stranded enforcement (sidecar worktree-gc/worktree-guard parity)

원칙: PR/branch/worktree 누적 금지 · 워크트리에 작업 방치 금지 · 방치 작업 있으면 새 작업 시작 금지.

- **`harness worktree scan`** — linked worktree 전수 분류(clean/dirty/unpushed/merged[gone]/locked) + **방치(stranded=dirty 또는 unpushed) 적발**. stranded 존재 시 exit 1 → 새 작업 게이트로 사용 가능.
- **`harness worktree gc`** — merged([gone] upstream, squash-safe)·dangling **agent** worktree/branch 자동 sweep(`git worktree remove --force` + `git branch -D` + prune). UNCONDITIONAL live-work 가드: dirty·HEAD commit <1h·locked 는 SKIP → 진행 중 작업 절대 안 지움. 항상 exit 0.
- **`harness worktree guard <cmd>`** — `git worktree add` advisory: 방치 작업 선존재 시 "먼저 완료(pr-cycle)/정리 후 새 작업" + 기존 브랜치 재사용 stale-base(anima #1105) 경고.
- 자동 연동: ① SessionStart 훅에 `worktree gc` 추가(init) → 세션 시작마다 merged 자동 청소. ② `prompt`(UserPromptSubmit) 가 stranded worktree 있으면 새 작업 전 advisory 선출력. ③ `pre bash` 가 `git worktree add` 에 hygiene advisory.
- 14-case 라이프사이클 검증(stranded SKIP / merged old-commit sweep). pr-cycle 은 이미 push→PR→**main merge(squash·admin)**→delete-branch→worktree sweep 까지 자동 — 본 모듈이 누적/방치 방지를 보강.

## feat: git-guard — force-push deny in pre bash (sidecar git-guard parity)

- **`pre bash` built-in 가드** (`modules/git-guard.ts`): force-type push 를 config 규칙보다 먼저 차단(deny). 탐지 대상: `git push --force` / `-f`, `--force-with-lease[=…]`, `git push <remote> +<refspec>`(refspec-level force). 따옴표 strip 후 토크나이즈 → `'--force'` / `+"main"` 같은 인용형도 잡음. `cd … && git push --force` 도 토큰 인접성으로 탐지.
- `--no-verify` 는 force 가 아니므로 **차단하지 않음**(sidecar 와 동일, 하네스 자체 커밋도 사용). config `git.guardForcePush=false` 로 비활성(기본 on).
- 차단 메시지: 오버라이드 없음 — 정말 필요하면 에이전트 밖에서 실행하라 안내. 14 케이스 단위검증 통과.

## fix: pr-cycle — full post-merge worktree sweep (sidecar 0.5.0 parity)

- 기존엔 merge 후 `git worktree prune` 만 호출 → 실제 worktree 디렉토리·로컬 브랜치가 누적되는 누수. main merge(squash·admin·delete-branch into base)는 정상이었음.
- 이제 merge 성공 후 `sweepMergedWorktrees()`: MAIN worktree 로 cd(현재 worktree 안에서 실행한 경우 포함) → `git fetch -p` → upstream `[gone]`(squash-safe 머지 신호)인 **linked agent worktree**(`.claude/worktrees/`)만 `git worktree remove --force` + `git branch -D` + `git worktree prune`. main 체크아웃·locked·live/absent upstream(미푸시 작업 보유 가능)은 절대 건드리지 않음.

## feat: lsp (editor LSP wiring + grammar auto-rebuild)

- **`harness lsp {wire|status|rebuild <file>}`** — sidecar hexa-lsp/lsp-rebuild parity.
  - `wire` → repo-root `.lsp.json`(Claude Code 표준 파일명)에 `lsp.servers` 매핑 기록. 기본 서버: **hexa**(`hexa lsp`, `self/lsp.hexa` 보유 첫 후보 dir 로 cd 후 exec · `.hexa`) + **kosmos**(`kosmos-lsp` · `.kosmos`). n6/hxc/tape 는 동일 한 줄 패턴으로 추가 가능.
  - `status` → 서버별 바이너리 PATH 존재(🟢/🔴) + `.lsp.json` 와이어링 상태 + rebuild 플래그.
  - `rebuild <file>` → LSP grammar 소스(`*/lsp/*_lsp.hexa` 또는 hexa-lang `self/lsp.hexa`·`self/lsp/*.hexa`) 편집 시 prebuilt 바이너리를 **백그라운드 재빌드**(log: `~/.harness/lsp-rebuild.log`) + 비차단 advisory. 항상 exit 0(fail-open).
- PostToolUse(Write/Edit) 자동 연동: `post edit <file>` 가 `lspRebuildOnEdit` 호출 → grammar 소스 편집이 바이너리를 자동 lockstep. config `lsp.rebuild=false` 로 비활성.

## feat: secret (credential-store CLI passthrough)

- **`harness secret <verb> [args]`** — `secret` CLI 얇은 패스스루(sidecar /secret parity): get·set·rotate·check·delete·list·service·init·backup·sync·migrate. PATH → `/opt/homebrew/bin` → `~/.local/bin` → `~/.hx/bin` 순으로 바이너리 자동 탐색, 없으면 설치 안내(dancinlab/secret).
- 보안 가드: `secret get` 은 값이 세션 컨텍스트에 노출되므로 경고 출력 + tool 인자엔 인라인 `$(secret get <k>)` 권장. 모듈 자체는 값을 로그/캡처하지 않음. 자격증명 하드코딩 금지(G-SECRET-LITERAL)와 한 쌍.

## feat: end (session-closure safety check)

- **`harness end`** — 읽기전용 종료 점검 대시보드(sidecar /end parity): 미커밋·미푸시·stash·내 열린 PR·병합후미삭제 브랜치·linked worktree 를 ✓/⚠/○ 로 표시 + 최종 ✅/⚠ 판정.

## feat: verdict · atlas · upstream

- **`harness verdict {record <slug>/<id> <cmd>|list|show}`** — verification-evidence ledger (hexa verify/g5 parity): verify 명령 stdout 을 `.verdicts/<slug>/<id>.txt` 에 verbatim 기록 + PASS/FAIL tier + 통과율. LLM 자가판정 금지, 캡처 출력이 증거.
- **`harness atlas {add <id> <claim>|link <id> <vid>|list}`** — claim registry → `ATLAS.md`; atom 은 PASS verdict 링크 시에만 🟢 verified (hexa atlas parity).
- **`harness upstream {list|fix <name|repo>}`** — 다운스트림 작업 중 업스트림(hexa-lang 등) 결함은 inbox 메모 말고 그 세션에서 root-cause 수정→verify→PR+merge (config.upstreams, 기본 hexa-lang).
- docs.allow 에 ATLAS.md/CLAIMS.md 추가.

## feat: ing (in-progress board + POD tracking)

- **`harness ing {show|add <text>|done <match>|next <text>|pod ...}`** — repo-root `ING.md` 단일 진행중 보드: `## 작업(in-progress)` · `## POD(running)` 표 · `## 다음(next)`. 완료분은 CHANGELOG, 최종설계는 ARCHITECTURE 로 졸업.
- `ing pod {add <id> <provider> <gpu> <purpose> [cost]|rm <id>|list}` — 실행중 GPU pod 추적.
- ING.md 는 docs.allow 기본 포함(quickref 내장). keywords `in-progress-board` 트리거(진행중/pod 관리/지금 뭐).

## feat: pool (host roster + remote exec)

- **`harness pool {list|add|rm|on|status}`** — 머신 단위 호스트 roster(`~/.harness/pool.json`, 글로벌) + ssh 원격 실행 (sidecar pool parity). add `<name> [target]` · on `<name> <cmd>` · status(도달성 🟢/🔴).

## feat: pod · dojo · demi

- **`harness pod`** — GPU cloud pod dispatch runbook (preflight→fire→poll→harvest→down · 회수 우선 · wall-time first · 비용 발생은 명시 go) — sidecar pod/cloud parity.
- **`harness dojo [<slug>] [--lang]`** — cloud training-job scaffolder: runbook + `exports/dojo/<slug>/{job,train,run.sh}` 생성 (sidecar dojo parity).
- **`harness demi`** — design-architecture program runbook (7-verb spine 명세→구조→설계→해석⟲→합성→검증→인계; ARCHITECTURE.md=합성 SSOT) — sidecar demiurge parity.

## feat: update · fleet · pr-cycle + lint severity-gate

- **`harness update [--hooks]`** — bump `.harness-engine` submodule to its tracked-branch tip → adopt new engine features (answers "기능 추가 어떻게 반영"). Reports old→new + changelog, then `git add .harness-engine` + commit.
- **`harness fleet [name:goal,…|go|stop|status]`** — perpetual multi-lane orchestrator (sidecar fleet parity): roster `.harness/fleet/active` + fire-on-arrival runbook (`templates/fleet.md`).
- **`harness pr-cycle [gh flags]`** — push branch → `gh pr create --fill` → self-merge (squash·admin·delete-branch); refuses on main/master (sidecar pr-cycle parity).
- **lint severity-gate** — `lint` now exits 1 only on BLOCK-severity violations; warn-severity (e.g. L0-LOCKDOWN) is reported but no longer hard-blocks a deliberate commit.

## feat: docs.scopeDirs

- `docs.scopeDirs` (optional) — scatter/quickref 검사를 지정 top-level dir(""=root)로 한정. 연구 repo(anima: 문서 5963건)의 corpus 폭주 방지. CLAUDE-MD 검사는 영향 없음(항상 동작).

## fix: hook guards (submodule 미초기화 내성)

- `init` 이 생성하는 `.claude/settings.json` hook 들을 `[ -x .harness-engine/bin/harness ] && … || true` 로 guard — submodule 미초기화(`git submodule update --init` 전) clone 에서 `No such file` 에러 대신 조용히 통과.
- git pre-commit/pre-push hook 도 wrapper 부재 시 `exit 0` 으로 skip.
- 적용된 repo 에서 매 프롬프트마다 뜨던 `bash: .harness-engine/bin/harness: No such file or directory` 비차단 에러 제거.

## self-dogfood

- 하네스가 **자기 자신에게** 적용됨 (harness.config.json profile:default · 엔진=repo 루트, submodule 없음). `.claude/settings.json` self hooks(pre/post/prompt + prefs/easy/recommend inject) + git pre-commit(`bin/harness lint`). hardcore 자기모순(protectedBranches·no-verify 차단)은 제외해 자기 개발 흐름 보존. CHANGELOG 강제(.ts 변경 시) + 번들 enforcement(root-cause/secret/force-push) self 적용.

## 0.5.0

- **다국어 1급 지원** — 웹/JS 편향 제거. Python·Rust·C/C++·Go·Swift·hexa 로컬/모바일 앱에서 즉시 동작.
  - `harness init` 스택 자동감지: 마커 파일(Cargo.toml·pyproject·go.mod·Package.swift·CMakeLists·*.hexa…)로 `verify.checks`(cargo/pytest/swift build/…)와 CHANGELOG `triggerPattern` 자동 생성, 혼합 스택 병합.
  - `G-ROOT-CAUSE` 우회패턴 다국어화: `# type: ignore`·`# noqa`·`except: pass`(Py) · `#[allow(...)]`(Rust) · `//nolint`(Go) · `swiftlint:disable`(Swift) · `#pragma ... diagnostic ignored`·`NOLINT`(C/C++) 추가.
  - L0 파서·folderGuides·secret·root-cause 대상 확장자에 c/h/cpp/cc/cxx/hpp/m/mm/rs/go/kt/scala/php/dart/hexa 기본 포함.
  - [docs/languages.md](docs/languages.md) 추가 — 언어별 프리셋 + Node(tsx) 런타임 요구 명시(타깃 빌드와 무관).

## 0.4.0

- **CHANGELOG 갱신 강제** — `lint` 에 `CHANGELOG-MISSING`(block) 체크 추가: 소스 코드가 staged 인데 `CHANGELOG.md` 가 함께 staged 되지 않으면 차단. `lint.changelog`(file/triggerPattern/ignore) config 로 조정, docs/test/엔진 경로는 ignore.
- **`harness init` 이 git pre-commit hook 설치** — 커밋 시 `harness lint` 자동 실행으로 위 규칙이 실제 강제됨. `--no-verify` 로 우회 가능(의도된 탈출구).
- **경로 정규화** — REPO_ROOT/HARNESS_ROOT 를 realpath 로 canonical 화(macOS `/var`↔`/private/var` 심볼릭 대응) → 생성되는 wrapper/hook 경로가 항상 정확.
- `scripts/harness` wrapper 를 repo-root 기준(`$ROOT/<engine>/bin/harness`)으로 견고화.

## 0.3.0

- **`harness folders` 추가** — 서브폴더별 `CLAUDE.md` 작성 유도. `scan`(누락 폴더 목록) · `scaffold <dir>`(5칸 템플릿 생성). `post edit` hook 이 가이드 없는 소스 폴더의 파일 편집 시 그 폴더당 1회 넛지(dedupe). `folderGuides`(roots/depth/minFiles/ignore/ext) config 로 조정, 기본 enabled.
- 번들 `keywords.json` 에 `folder-guides` 트리거(폴더 구조/서브폴더/코드 탐색) 추가.

## 0.2.0

- **`harness init` 추가** (`install` alias) — 한 방 스캐폴딩: `harness.config.json`(프로젝트명 자동감지) + `.harness/{enforcement,keywords,severity-map}.json`(번들 기본 복사) + `.gitignore` 로그 무시 + `scripts/harness` 래퍼 + `.claude/settings.json` hook(`--hooks`). 기존 파일은 보존(`--force` 만 예외), `--dry-run` 으로 미리보기. 멱등(재실행 시 skip).

## 0.1.0

최초 공개 — 프로젝트-무관 AI 코딩 하네스 엔진.

- **코어 12 모듈**: `pre` · `post` · `prompt` · `lint` · `verify` · `errors` · `ledger` · `bitter-gate` · `audit` · `gc` · `handoff` · `convergence` · `sync`
- **config 주도**: 모든 프로젝트 색채를 `harness.config.json` + `.harness/*.json` 로 분리. 엔진 코드는 도메인 하드코딩 0.
- **repo-root 자동탐색**: submodule / vendor / 심볼릭링크 어느 배치든 동작 (`HARNESS_REPO_ROOT` override).
- **번들 기본 규칙**: 도메인-무관 enforcement(force-push · curl|sh · rm -rf · 비밀키 리터럴 · 우회패턴 · 인라인 hook 금지).
- **문서 3종**: 전수 설계(architecture) · 설치(install) · 확장(extending).
- 출처: 운영 중인 두 하네스(애플리케이션 본체 + 매니저)를 전수조사해 일반형으로 추출. 도메인 전용 모듈(배포/DB/SSH 등)은 제외하고 확장 패턴만 문서화.
