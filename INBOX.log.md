# INBOX — log

Append-only history sister of `INBOX.md`. Each entry starts with `## <ISO timestamp> — <header>` (newest on top); body = `- [x]` (done) / `- [ ]` (pending) checkbox tasks.

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
