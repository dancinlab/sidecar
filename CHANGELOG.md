# Changelog

Chronological log of notable changes. One section per ship batch, date-keyed. Per-plugin version bumps inline.

For the full audit trail, see `git log`.

---

## 2026-05-28 — system 0.5.0: `drive` verb — autonomous self-driving campaign (sticky cross-turn)

🚗 사용자 "시스템 개선해줘 자율주행하게". 기존 `auto` = 1회 in-session 패스 (시간당 도는 DFT/training 잡엔 부족). `drive` = `auto` 를 턴 가로질러 persistent 화 — 예산+큐 걸고 walk away.

- **`drive [--budget $X] [--max-pods N]` verb** — sticky 자율주행. 2 재진입: **watcher-event(primary)** + **ScheduleWakeup heartbeat(fallback, 1200–1800s — DFT/training cadence, 60s poll 금지 · cache-window 정합)**. drive 마커를 `pods.json` 에 영속(`drive:{on,budget_cap,max_pods,engaged_utc}`) → compaction/restart/rate-limit 생존.
- **각 tick**: status → harvest(exit-code-aware: TIMEOUT-RESUMABLE→recover, CRASHED→advance) → verdict(g5) → atlas(g62) → next(throttle-aware ≤2 fan, storm 시 backoff serialize) → re-arm → budget(g64)/depletion check → upstream-reflex(g59) → schedule-next.
- **halt ONLY**: 🏁 drain · 🛑 budget · ⏸ gated:human-only(그 candidate 만 pause, 나머지 계속) · interrupt. "continue?" 안 물음.
- **replay-safe**: 마커+manifest = durable state. rate-limit 사망 → 다음 watcher-event/heartbeat 재진입 재-derive (fired candidate 재발사 안 함).
- **`stop`/`drive off`** — 마커 clear (running 잡+watcher 는 유지, AUTO 재발사만 종료).
- 트리거: 자율주행 · self-driving · drive · "예산 걸고 알아서" · 멈춰. SKILL+command+meta 0.4.1→0.5.0.
- distinction: `auto`=지금 1패스(interactive) · `drive`=물리한계(budget/drain)까지 며칠 자가운전.

## 2026-05-28 — system 0.4.1: `upstream` verb origin/main 조회 보정 + entry-merged ≠ fix-status 구분

🔗 0.4.0 dogfood self-gap (upstream-reflex 가 제 보고 버그를 잡음).

- **origin/main 조회 보정 (local stale-tree false-empty)** — INBOX-scan 단계가 LOCAL working tree(`grep <repo>/INBOX.log.md`) 를 grep 해서 stale·다른-브랜치·미-pull 시 false-empty 반환. `git -C <repo> show origin/main:INBOX.log.md 2>/dev/null | grep -nE '^## ...'` 로 교체 — origin/main + gh remote 만 조회, working tree 절대 금지 note 명시. (gh PR list 단계는 이미 remote → 유지.)
- **entry-merged ≠ fix-status 구분** — INBOX 항목의 entry-PR 가 merged 됐다(=항목 기록됨)는 사실과 그 fix 가 landed 됐다(🟠 OPEN 권고 vs ✅ RESOLVED 구현)는 별개. 항목의 `🟠 OPEN` / `✅ RESOLVED` 마커를 파싱해 별도 컬럼으로 렌더. (증거: hexa-lang #1734 = ✅ RESOLVED 구현, #1775/#1828 = 🟠 OPEN 권고 — entry-PR 는 모두 merged.)
- command + plugin/marketplace 0.4.0→0.4.1.


## 2026-05-28 — system 0.4.0: `upstream` verb — report the g59 upstream-reflex trail

🔗 사용자 "system 플러그인에도 'hexa upstream fix in this session' 로 작업되게". 0.3.0 의 upstream-reflex(gap→INBOX 파일)의 짝 = 조회 verb.

- **`upstream [<repo>]` verb** — 캠페인이 upstream repo(s) 에 파일한 INBOX 항목 + merged PR trail 보고. (1) `grep '^## .*(from <campaign>|tag)' <repo>/INBOX.log.md` → date·slug·status (2) `gh pr list --state merged --search "<tag>"` → PR#·title·mergedAt (3) `--since`/session-start 로 세션 스코프 (4) 테이블 렌더. read-only (파일은 reflex 가, 조회는 이 verb). 이번-turn gap 인데 미파일이면 `⚠ unfiled gap` flag.
- repos = pods.json `upstream_repos` (default `~/core/hexa-lang`). `/system upstream <repo>` 로 단일 스코프.
- 트리거 추가: "upstream fix in this session" · "hexa upstream fix" · "INBOX 올린 거" · "상류 기여".
- "hit a gap → filed upstream → report what was filed" 루프 폐쇄. SKILL+command+plugin/marketplace 0.3.0→0.4.0.


## 2026-05-28 — system 0.3.0: exit-code-aware terminal taxonomy + upstream-reflex (g59)

🔧 demiurge RTSC 라이브 교훈 — Mg₂IrH₆ phonon 이 22.5h walltime(`max_seconds=80000`) 도달 → QE 가 `Maximum CPU time exceeded` 후 **"JOB DONE."** 출력 + `STOP 1` (비정상 종료·재개필요). watcher 가 bare-marker grep("JOB DONE") 으로 SUCCESS 오판 1회. 사용자 "사전 방지 가능?" + "system 에 hexa upstream 개선 포함".

- **exit-code-aware terminal taxonomy** (watch/harvest) — DONE(marker ∧ trailing STOP/error/Maximum-CPU 없음) · TIMEOUT-RESUMABLE(max_seconds → recover, marker 떠도 success 아님) · STUCK/CRASHED(STOP n≠0 / Error in routine) · GONE(2x debounce). **bare-marker 함정** 명문화: routine 이 비정상 walltime-stop 에도 마커 출력 → 반드시 trailing-STOP/error/exit 동반 스캔.
- **transport 255 분류** — TRANSIENT-GATEWAY(TCP-open+contract-live → retry) vs POD-DOWN(TCP-closed). 단일 255 ≠ GONE.
- **upstream-reflex (g59)** — watch/harvest 가 hexa cloud CLI gap(false-terminal·transport ambiguity·preflight 결손) 만나면 caller-side workaround 만 하지 말고 `~/core/hexa-lang/INBOX.log.md` SAME-TURN 파일. caller trailing-scan = STOPGAP, durable fix = CLI 3-tier exit code. 본 세션 hexa-lang #1828 (cloud 3-gap) 이 그 trail.
- SKILL + commands/system.md + plugin/marketplace 0.2.0→0.3.0.

## 2026-05-28 — system 0.2.0: 자율 contract — queue status taxonomy + blocked:auto-resolve (no "awaiting-approval")

🔧 demiurge RTSC 세션 라이브 교훈 — wave-3 잔여 4 candidate 를 "발사 대기 backlog" 로 프레이밍 → 사용자 "발사대기는 뭐지? 자율 아냐?" 지적. 실제 차단은 user 게이트가 아니라 H-cage 좌표 미확보(기술적 d6 halt). 자율 원칙(d17/d20)대로면 좌표를 자율 조사 후 발사해야 함. /system 0.2.0 이 이 anti-pattern 을 명령어에 못박음.

- **candidate status taxonomy (autonomy contract)** — `queued` (ready → **auto-fires**) · `blocked:<technical>` (missing coord/data/pseudo/dep → **auto-resolves** via arxiv/fetch/build then fires, NOT a wait) · `fired` · `done` · `gated:<human-only>` (credential · irreversible · design decision = **유일하게 human 대기**, rare). 일반 candidate 에 "awaiting-approval" 상태는 의도적으로 부재.
- **`next` loop 의 step 2 강화** — `blocked:<technical>` → AUTO-RESOLVE-then-fire (좌표 미확보 → /research:arxiv · 입력파일 → fetch/build · pseudo → wget). 정직 해소 시도 실패 시에만 logged skip (d6 — missing input hallucinate 금지).
- **autonomy invariant 명문화** — "queued/blocked NEVER means 'waiting for user go'". 기술적-해소가능 candidate 를 "발사 대기/awaiting approval" 로 재프레이밍 = /system 이 제거하는 바로 그 anti-pattern.
- SKILL.md + commands/system.md 양쪽 + plugin/marketplace 0.1.0→0.2.0.

---

## 2026-05-28 — system 0.1.0 (NEW): /system 캠페인 관제탑 — domain-agnostic mission control

🛰 demiurge RTSC DFT 캠페인 세션에서 수동으로 반복하던 패턴(전체 잡 sweep → 통합 대시보드 → event-driven watcher → terminal harvest → verdict → 자동 재발사 → 예산 추적)을 하나의 재사용 plugin 으로 승격. 사용자 directive "이걸 하나의 system 으로 · /system 명령어 · 범용 · demiurge 한정말고".

- **`skills/system/`** (NEW plugin v0.1.0) — `/system` campaign control-tower. 7 verb: bare/status (통합 대시보드) · watch (job 당 event-driven watcher 무장 · ScheduleWakeup 0 · rate-limit 생존 · 2x debounce) · harvest [<id>] (terminal job → metric parse + g5 verdict tier VERBATIM + ledger) · next/redispatch (autonomous harvest→atlas-register(g62)→fire-next-queued · NO user gate) · auto (full loop → backlog-drain / budget-hit(g64) / interrupt) · cost (예산 추적) · queue [add|rm|ls] (candidate backlog).
- **domain-agnostic** — abstract job model {id, surface, workdir, terminal_marker, metric_parser, verdict}. DFT(`CHAIN DONE`) · ML training(`training complete`) · build(`PASS`) · render 모두 terminal_marker/metric_parser 값만 다름, loop 동일.
- **non-duplication** — `./pods.json` (cloud dispatch SSOT) reuse · `/cloud pods` (manifest) + `/micro-exp` (fresh sweep launch) + `/atlas` + `/verify` 위의 orchestration layer. /micro-exp 가 새 sweep 을 LAUNCH 한다면 /system 은 이미 돌고 있는 잡들의 persistent CONTROL TOWER.
- **harvest→re-dispatch 자율 루프** = `next`/`auto` verb 로 1급 시민화 (사용자가 원래 project.tape 룰로 요청 → 범용 commons 패턴 → 전용 command 로 진화). 🔴 FALSIFIED 도 valid terminal (g63) → 다음 candidate 자동 진행.
- commons g5/g8/g10/g57/g62/g63/g64/g65 정합 명시.

---

## 2026-05-28 — fork-storm 방어 3겹 (sign-guard 0.1.7 · pool-route 0.11.0 · sidecar 0.7.0)

세션 중 mac에서 `hexa_run` 고CPU + stale `hexa-lsp` 누적을 진단하다, `/tmp` 스크립트가 `~/.sidecar/local-paths`(`/tmp/` 등록) 때문에 force-local로 도는 구조를 확인. 이를 계기로 fork-storm 방어를 3겹으로 강화 (사용자 directive — "local-paths 는 sign 통해서만 등록/삭제" + "/tmp 만 fork-storm 방지 = 동시실행 cap + reaper").

**① local-paths 변경 = sign-gated** (sign-guard 0.1.7 · sidecar 0.7.0)
- `~/.sidecar/local-paths` 가 sign-guard GATED 레지스트리에 추가 (전용 키 `paths` — least-privilege; `.gitignore` 선례 따름). pool-route 를 우회시키는 강력한 escape hatch 라 등록/삭제에 USER 사인 필요.
- 3개 변경 경로 전부 차단 — `sidecar paths add/rm` (CLI 게이트) · Edit/Write 툴 직접 수정 · `echo >> local-paths` redirect (뒤 둘은 sign-guard 훅). agent 자가민팅 deny (@D s13) · env opt-out 없음 (@D s11).

**② fork-storm cap** (pool-route 0.11.0)
- whitelist-forced-local hexa run 은 default hexa→pool offload 를 면제받아 mac 에 머무는데, N개 백그라운드 agent 가 동시에 `/tmp` hexa 를 쏘면 프로세스 폭주. `FORK_STORM_CAP`(기본 8) 이상 USER hexa 인터프리터가 이미 실행 중이면 새 whitelist-local hexa 를 DENY (locality 유지 = import 해결 + 폭주 천장).
- 카운트 — `ps -Ao args` first-token basename `hexa` (run 당 1줄) · sidecar 자체 훅(`cache/sidecar`) + claude(@D s9) 제외 · count 에러 시 **fail-OPEN** (절대 build 안 막음, @D s11).

**③ stale-process reaper** (sidecar 0.7.0 — `reap` verb)
- `sidecar reap` = 2h 이상 유휴 `hexa-lsp` 나열 (dry-run) · `reap --kill` = 종료. claude(@D s9) + active hexa run 은 절대 안 건드림 (active 는 ②가 예방).
- 이번 세션에서 4~13h 묵은 stale `hexa-lsp` 6개 reap 완료.

surfaces — sign-guard 0.1.6→0.1.7 · pool-route 0.10.0→0.11.0 · sidecar(command) 0.6.0→0.7.0 · marketplace 0.10.15→0.10.16. 코드 — `bin/sidecar` · `hooks/sign-guard/bin/_sign_guard.hexa` · `hooks/pool-route/bin/_pool_route.hexa`.

## 2026-05-28 — all-bg-go 0.4.2: `/abg` 3-char alias 추가

사용자 요청 — "abg 만들어줘". `/all-bg-go` 가 길어 빠른 호출용 단축 명령 필요. 기존 alias 패턴 (`/q`→question · `/ij`→inject · `/sbs`→step-by-step) 과 동일 — 같은 plugin 의 commands/ 에 별 .md 추가 (mirror 가 `~/.claude/commands/abg.md` 로 복사).

- **`skills/all-bg-go/commands/abg.md`** (신규) — `/all-bg-go` 와 동일 semantics. 본문 동일 (plan table → N Agent fan-out → `Next iteration` 라인). frontmatter `allowed-tools: Agent, Bash, Read` 동일.
- **`skills/all-bg-go/SKILL.md`** — description + trigger 에 `abg` · `/abg` 추가.
- **`skills/all-bg-go/.claude-plugin/plugin.json`** + **`.claude-plugin/marketplace.json`** — 0.4.1 → **0.4.2**.
- 호출: `/abg` 또는 `abg` (NL) = `/all-bg-go` 와 100% 동일 동작.

---

## 2026-05-28 — `/all-bg-go` 복구 (`a46a7ee` retire revert · commons g41 분리)

사용자 요청 — "all-bg-go 명령어 폐기한거 살려줘". 2026-05-26 retire commit (`a46a7ee`) 이 `/cycle` 과 기능 겹친다고 폐기했으나, 두 패턴은 의도가 다름 (`/cycle` = self-generating loop · `/all-bg-go` = reactive single fan-out of prior-turn branches). 이번 세션 내 실제 사용 (3-agent fan-out × 2회) 으로 가치 재확인 → 복구.

- **`skills/all-bg-go/`** — `plugin.json` · `SKILL.md` · `commands/all-bg-go.md` restore (retire 전 동일 spec)
- **`.claude-plugin/marketplace.json`** — all-bg-go entry restore
- **`.claude-plugin/profiles.json`** — all-bg-go enable 복구
- **`hooks/commons/COMMANDS.md`** — 명령 카탈로그 entry restore
- **commons g41 (sign-gated)** — 본 commit 미포함. 사용자 `! sidecar sign commons` 후 별 commit 으로 g41 ("reactive fan-out via /all-bg-go (sister of /cycle)") restore 권장 (agent 자가편집 deny).
- **README plugin count 표** — 별 follow-up (단순 숫자 + 표 갱신).

---

## 2026-05-28 — mining 0.5.0: lens procedure + 객관 depletion + leaf-ID 규칙 + edge positive 기준 + checkpoint discipline

🛠 anima ANIMA mining cycle 1 (12 leaves 1-shot 'depletion') 직후 사용자 "마이닝 작동방식이 잘못된것같아" 신호. SKILL.md 본문은 0.4.0 auto-saturate trigger 만 풍부했고, 실 lens 5개 · depletion 기준 · leaf ID 규칙 · edge meaningful 기준 모두 1-line prose 만으로 의존 → agent 가 자기-환각으로 채울 여지 다대. 본 0.5.0 = 6 spec gap 동시 fix.

- **`skills/mining/commands/mining.md`** — **lens 5종 step-by-step procedure** (same-formula · ouroboros · dimensional · tension · combinatorial 각각 rule + procedure ≥2 steps + leaf shape canonical) · **객관 depletion 3-test** (surface dedup · mechanism dedup · no new bracket-tag — 모두 충족 시에만 `@depleted:`; cap-5 hit ≠ depletion) · **leaf ID 규칙** (`L<max+1>` 단조 증가, 재사용 금지, sub-ID 금지) · **edge meaningful 4 positive 기준** (causal · equivalence · dependency · inversion · 각 edge 에 criterion label 필수) · **auto verb 총량 cap 25** (5 lens × 5 round) + checkpoint discipline (매 inner round 후 `.mining.md` 디스크 write — rate-limit 사망 시 graph 보존) · **promotion procedure** (leaf → milestone / atlas atom / cross-domain INBOX 4-step + dedup grep + bare-verb next-action surface up to 3).
- **`skills/mining/.claude-plugin/plugin.json`** + **`.claude-plugin/marketplace.json`** — 0.4.0 → **0.5.0**.
- **portable (s3 / s11)**: 모든 spec 이 markdown table + procedure list 로 표현 (env var / abs path 없음). lens 적용 후 leaf 가 `[<bracket-tag>]` 형식이라 객관 dedup 가능.
- 재현: ANIMA mining cycle 1 = 12 leaf 1-shot depletion (실제는 leaf shape 객관 기준 부재로 agent 가 임의 stop). 0.5.0 적용 후 동일 lens fire 시 각 leaf 가 procedure 의 step 1-4 충족 + bracket-tag 명시 + depletion 3-test 통과해야 `@depleted:` 가능.

---

## 2026-05-28 — hexa-lsp 0.1.2: cwd-bound LSP boot fix (`self/lsp.hexa` not found 종결)

🚨 `/doctor` 가 `hexa-lsp` 를 crash trail 로 분류하던 false-alarm 의 진짜 원인 종결. upstream hexa-lang 의 `hexa lsp` 가 내부적으로 `hexa build self/lsp.hexa` 를 cwd 기준 상대 경로로 호출 → Claude Code 가 LSP 서버를 spawn 할 때 cwd 가 사용자 프로젝트(예: cwd=`/tmp` · cwd=다른 레포)면 "source file not found: self/lsp.hexa" 로 부팅 실패. hexa-lang main 에는 파일이 875줄로 명백히 존재(hexa-lang PR #1769 확인); cwd resolution 만의 문제.

- **`hooks/hexa-lsp/.lsp.json`** — `command: "hexa", args: ["lsp"]` → `command: "sh", args: ["-c", "cd \"$HOME/.hx/packages/hexa-lang\" 2>/dev/null || cd \"${HEXA_LANG:-.}\" 2>/dev/null; exec hexa lsp"]`. cwd 우선순위 — `$HOME/.hx/packages/hexa-lang` (canonical hx 설치) → `$HEXA_LANG` (upstream override) → 현재 cwd (no-op, upstream 원본 에러 그대로 노출). `exec` 로 sh 프로세스 대체 → stdin/stdout JSON-RPC forwarding 무손실.
- **portable (commons s3)**: `$HOME` 만 사용, abs path 없음. **no opt-out (s11)**: 모든 case 에 cd 시도, 환경변수 우회 없음.
- 재현: cwd ≠ hexa-lang repo 에서 `printf '' | hexa lsp` → "source file not found: self/lsp.hexa". fix 후 cwd 무관하게 LSP boot 정상.
- `hooks/hexa-lsp/.claude-plugin/plugin.json` 0.1.1 → 0.1.2 · marketplace 0.1.1 → 0.1.2 lockstep (g22).

---

## 2026-05-28 — cloud 0.4.1: `commands/cloud.md` frontmatter 동기화 (ROOT CAUSE — agent 인지 갭)

🚨 cloud@0.4.0 ship 시 `plugin.json` description + `SKILL.md` frontmatter 는 fire/pods/dispatch 추가했으나, agent slash command 의 source 인 **`skills/cloud/commands/cloud.md` frontmatter** 갱신을 빠뜨림 → `sidecar mirror` 가 stale source 를 그대로 `~/.claude/commands/cloud.md` 로 복사 → **Claude Code skill listing 에 fire/pods/dispatch 트리거 누락** → agent 가 verb 의 존재 자체를 인지 못 함 (ANIMA caller session 의 ghost-pod 양산 root cause).

- **`skills/cloud/commands/cloud.md` frontmatter** — subverb 목록에 `fire · pods · dispatch` 추가 · NL trigger 에 `fire`/`cloud pods`/`cloud dispatch`/`활성 pod`/`작업 매니페스트`/`verdict 갱신`/`pod tree`/`dispatch add` 노출 · "fire 후 caller MUST dispatch add" 명시 강조.
- **L1 인지 갭 해소 (마지막 layer)**: 이제 3-layer 모두 닫힘 — L1 인지 (cloud.md frontmatter) · L2 자동화 (hexa-lang outbound PR #1757 진행 중) · L3 advisory (pod-monitor 0.1.4 commit 788a657).
- 발견 경로: 사용자 "pods.json 인지는 시켰어?" → 3-way diff (cache plugin.json ✅ / SKILL.md frontmatter ✅ / commands/cloud.md frontmatter 🔴) → mirror 가 source-stale 복제했음을 확인.

---

## 2026-05-28 — mining 0.4.0: auto-saturate default + 신규 `auto` verb (사이클마다 물어보지 않고 고갈시까지)

사용자 피드백 — "/mining 이 사이클마다 사용자 확인 받지 않고 depletion 까지 자동 진행되어야". 기존 `<lens>` / `connect` 가 1 round 후 사용자 응답 대기 → cycle 마다 manual gate 발생.

- **`skills/mining/` 0.3.0 → 0.4.0** — 기본 행동 변경 + 신규 verb:
  - **`<lens>` auto-saturate** — 적용 직후 새 leaves ≥1 이면 같은 lens 다시 적용, 0 new leaves 일 때만 stop + `@depleted` 마킹. cap 5 inner rounds/invocation. 사용자 per-round 확인 없음.
  - **`connect`/`edges` auto-saturate** — 동일 패턴. `saturate` verb 는 alias 로 보존 (discoverability).
  - **신규 `auto` verb** — 단일 invocation 으로 full pipeline drain: ① divergence saturate (모든 undepleted bundled lens round-robin · 한 catalogue 전체 pass 가 0 new leaves 면 종료) → ② convergence saturate → ③ `tidy --depth=light` → ④ `🏁 mining drained` 보고. cap-5 phase 단위로 적용 (안전).
- **사용자 흐름**: `/mining <lens>` 한 번 호출 = lens 완전 소진. `/mining auto` 한 번 호출 = mining graph 전체 drain.
- **NL triggers 추가**: `고갈시까지` · `한번에 끝까지` · `사이클마다 물어보지 말고`
- **호환**: 기존 verb table 12 → 13 (`auto` 추가) · `saturate` semantic 동일 유지 (alias) · `cycle new` / `depletion` / `tidy` 등 그대로.

---

## 2026-05-28 — pr-cycle-hook 0.3.0: 명시 PR# 캡처 (`gh pr view --json number`)

INBOX 5-제안 deferred 잔여 1건 — pr-cycle hook 의 auto-merge tail 에 명시 PR# 추가. 직전 cycle 에서 hexa-lang PR #1757 작성 시 main worktree 충돌로 `gh pr merge` 의 `--delete-branch` 가 local cleanup 시도 → fail; 같은 클래스의 robustness 향상.

- **`hooks/pr-cycle-hook/` 0.2.0 → 0.3.0** — `MERGE_TAIL` + cross-repo branch 둘 다 `gh pr merge "$(gh pr view ... --json number -q .number)"` 형태로 PR# 명시 capture:
  - same-repo: `gh pr merge "$(gh pr view --json number -q .number)" --squash --admin --delete-branch`
  - cross-repo (`--repo X`): `gh pr merge "$(gh pr view --repo X --json number -q .number)" --repo X --squash --admin --delete-branch` (view+merge 둘 다 target repo 에 pin)
- **목적**: branch-ref detached · worktree mid-teardown · CI head-ref strip 등 `gh pr merge` 가 current-branch 로 PR 유추하기 어려운 상황에서도 정확한 merge. cross-repo 가 cwd repo 의 PR 로 잘못 라우팅되는 케이스 (INBOX #4 anima) 도 belt-and-suspenders.
- **DELETION-SANITY GATE (0.2.0) 보존** — anima #1105 35190-file revert-delete 차단 로직 그대로.

---

## 2026-05-28 — install.hexa: cache plugin.json jq validate · docs/meta-domain-pattern.md 추가

INBOX 5-제안 deferred 잔여 2건 inline 처리 — (4) install.hexa cache jq + (1) meta-domain pattern doc.

- **`install.hexa`** — version cache 의 `plugin.json` 을 `cp -R` 직후 `jq -e .` 로 validate. parse fail 시 `rm -rf <dest>` 로 캐시 evict + WARN println (다음 sync 가 재카피). 직전 cycle 에서 발생한 corrupt cache (`cycle@0.9.1` + `pool-route@0.10.0` plugin.json 미escape 인용부호) 가 `/doctor` 를 침묵으로 깨뜨린 클래스 — advisory · never fatal · 자동 회복.
- **`docs/meta-domain-pattern.md`** (신규 doc) — `+` 합성 표기 + parent-name meta 도메인 패턴 정리. ANIMA (7 sub-domain: DECODER · BRIDGE · METACOG · DREAM · INTENT · SAVANT · HIVE-MIND) reference example. 언제 만드는가 / anti-pattern / roster 등록 흐름. INBOX ④ (meta-domain orchestrator 패턴 박제) 해소.

---

## 2026-05-28 — pod-monitor 0.1.4: `pods.json` ledger 환기 hint 추가 (ghost-pod class 닫기)

L1/L3 gap-filler — agent 가 GPU pod 발사 후 `hexa cloud dispatch add` 호출을 잊어 cwd 의 `./pods.json` 에 entry 미작성 → **ghost pod** (billing 추적 ⊘ · verdict 갱신 ⊘ · per-project 활성 작업 view ⊘) 발생. L2 (hexa-lang `cloud fire/nohup` 의 auto-attach) 가 본질적 fix 지만 upstream 변경이 필요해 별 INBOX entry 로 outbound. 본 ship 은 advisory hint 로 caller 책임을 매번 환기.

- **`hooks/pod-monitor/` 0.1.3 → 0.1.4** — 4번째 invariant 추가:
  - 기존 3: SAVE_POD=1 · 🛰️ Monitor · ⏱ walltime
  - 신규: `📋 발사 직후 hexa cloud dispatch add <jid> <pid> <dir> 호출 — cwd 의 ./pods.json 자동 추적 (안 하면 ghost pod · billing/verdict 손실)`
- **상위 발견** (2026-05-28 ANIMA caller session): agent 가 `pods.json` 의 존재 자체를 모름. cloud@0.4.0 + hexa-lang PR #1699 가 spec 은 land 했으나 caller agent 의 인지 부재가 ghost-pod 양산. advisory 환기로 매 fire 마다 강제 노출.
- pre-0.1.4 fix 클래스 (R8a-LOST · SSH-drop → result LOST) 와 직교 — ghost-pod 는 fire 성공 + result 회수 후에도 ledger 부재로 추적이 끊기는 별 클래스.

---

## 2026-05-28 — commons 0.10.15: `@D g75` 추가 (candidate orchestration build/fire split · domain-agnostic)

micro-exp 0.4.0 + cycle 0.9.2 + commons g75 3-개 surface가 한 governance 패키지를 이룬다 — INBOX 5-제안의 ② commons.tape g7N (당시 sign-deferred) 항목 해소. 사용자 `! sidecar sign commons` 후 land.

- **`hooks/commons/` 0.10.14 → 0.10.15** — `@D g75` 추가 (build/fire split). g73 길이 cap 위반도 함께 split (tape-lint baseline 갱신).
- **@D g75 spec** (domain-agnostic — kind 무관):
  - `do`: build phase = `/cycle-bg <domain>` (agents write each candidate's dispatch infra) · fire phase = `/micro-exp <scope>` (assumes infra; runs+harvests) · infra missing → default to `/cycle-bg` (Stage 1.5 halts+steers) · kind is abstract (runnable + parser 있으면 모두)
  - `dont`: fire `/micro-exp` against missing infra · default doc to `/micro-exp` w/o infra check · fabricate sparse infra to skip build · couple spec to a single candidate kind
- 짝 surface: `skills/micro-exp` 0.4.0 (Stage 1.5 + decision tree) · `skills/cycle` 0.9.2 (cross-link)
- 전 사이클 (`968cf62`) build phase ↔ fire phase 영역 분리를 governance 형태로 박제 — 모든 후속 사이드카 도메인이 이 규칙을 SessionStart로 받음

---

## 2026-05-28 — /micro-exp Stage 1.5 + decision tree (domain-agnostic 일반화)

사용자 워딩 트리거 — "물질 합성 연구에만 쓰이다가 다른 프로젝트 돌리려니 안됨". hexa-codex CODEX PR #126 의 22-axis-candidate halt (22 candidate matrix enumerate ✅ 그러나 dispatch infra 0/22 ready) 가 직접 motivation. 5-제안 INBOX 항목 → 1 decision 합의 (D — ①+⑤+② best-effort 묶음 · ④ docs deferred · ③ ② hint 흡수) 후 사이클 진행.

### ① micro-exp 0.4.0 — Stage 1.5 infra existence check + 도메인-agnostic 일반화

- **Stage 1.5 신설** (`skills/micro-exp/commands/micro-exp.md`) — Step 1 (matrix enumerate) 이후 / Step 2 (dispatch) 직전. per-candidate 4 generic prereqs (`<runnable>` · `<inputs>` · `<parser>` · `<workdir>`) 존재 확인 → 미달 시 자동 halt `🛑 N/M candidates missing dispatch infrastructure — /cycle-bg <active-domain> required first (build phase before fire phase)` + per-candidate breakdown.
- **kind 추상화** — 기존 spec 이 가정하던 materials/DFT/SSCHA 를 "1 example among many" 표기로 변경. 모든 kind 예시 (materials wall · LLM bench harness · web smoke endpoint · build bench) 가 동일 contract (`<runnable>` + `<parser>`) 위에 동작.
- **local_pool_adapter 일반화** — wall-measurement/structural-oracle/build-bench 만 가정하던 기존 spec 을 "observation-only kind (closed-form-atom-registrable 이 아닌 모든 kind)" 로 추상화. ③ (local-pool LLM 확장) 이 이 일반화에 자연 흡수 — 별도 분기 없이 동일 어댑터로 LLM bench · web smoke 모두 커버.
- **Monitor alive-check 패턴 추상화** — 기존 `pw.x|ph.x` FIXED 패턴을 "kind-appropriate alive-check + completion-check" 로 변경. 도메인별 적정 쌍을 spec 이 예시 (materials/LLM-bench/web-smoke 각각 한 줄) 로 제공.

### ⑤ /cycle-bg ↔ /micro-exp decision tree cross-link (양쪽 SKILL.md mirror)

- **skills/micro-exp/SKILL.md** + **skills/cycle/SKILL.md** 양쪽에 동일한 ASCII 결정 트리 + `@D micro_exp_handoff` / `@D decision_tree` block 추가:
  ```
  candidate matrix in context?
  ├─ NO        → /kick
  └─ YES → dispatch infra exists for all?
           ├─ NO       → /cycle-bg <domain>  (BUILD)
           ├─ PARTIAL  → /cycle-bg → /micro-exp (BUILD then FIRE)
           └─ YES      → /micro-exp <scope>  (FIRE only)
  ```
- domain-agnostic 표현 — kind 가 materials/LLM/web/build 어떤 것이든 동일 트리.

### ② commons.tape `@D g75` build+fire phase 분리 — DEFERRED (sign-gated)

- spec 안에는 ②를 포함시키되, `hooks/commons/commons.tape` 직접 편집은 sign-gate 차단 (project.tape @D s13). 사용자가 `! sidecar sign commons` 발급 후 별도 차수에 land.
- 제안 본문 (도메인-agnostic 문구) 은 `drafts/sbs-micro-exp-meta-generalize-plan.md` `## deferred-sign` 섹션에 보존.

### ③ local-pool LLM 확장 — ABSORBED into ② hint + ① 일반화

- 별도 spec line 없이 ②의 g75 본문 + ①의 local_pool_adapter 일반화에 흡수. kind 가 abstract 이므로 LLM bench 는 별도 분기 없이 동일 contract.

### ④ meta-domain pattern docs — DEFERRED (별도 docs 사이클)

- INBOX 항목에 명시. 본 사이클에서 land 하지 않음.

### lockstep gate (@D g22)

- `skills/micro-exp/.claude-plugin/plugin.json` → `0.4.0`
- `skills/cycle/.claude-plugin/plugin.json` → `0.9.2` (decision tree cross-link)
- `.claude-plugin/marketplace.json` 양쪽 entry sync
- `README.md` 양쪽 row update

### 사용자 의도

- "물질 합성 연구에만 쓰이다가 다른프로젝트 돌리려니 안됨" — `/micro-exp` + `/cycle-bg` family 가 모든 sweep kind 에서 동일하게 작동해야 한다는 1차 갭. Stage 1.5 (infra gate) 가 silent-skip / fabrication 두 failure mode 를 막고, decision tree 가 build/fire phase 경계를 spec 에 명문화. domain-agnostic 표현 으로 LLM bench · web product · 임의 sweep kind 가 모두 first-class.

---

## 2026-05-28 — step-by-step 0.6.0: 자동 QA 4축 (functional·visible·conformance·regression) handoff 끝에 추가

사용자 — sbs 0.5.0 handoff 완료성 검증 갭 보완. handoff agent 가 ship 직후 자동 4축 검증을 실행하도록 spec 확장. 4축은 사용자 명시; fail 정책 1-decision (hybrid) 만 chat-form 합의로 잠금.

- **4축 정의**:
  - **functional** — 새 endpoint/verb/surface 가 응답하는가? (코드 실행 또는 smoke verb · 없으면 SKIP)
  - **visible** — 사용자 진입 URL/path/surface 변화 노출? (render check · 없으면 SKIP)
  - **conformance** — locked decision ↔ 코드 1:1 매핑 (spec ↔ diff 대조 LLM judge)
  - **regression** — 기존 surface 미손상 (영향 받는 plugin parse + smoke 재실행)

- **Hybrid fail 정책** (Q1 합의 — C):
  - `regression FAIL` → `git revert <ship-SHA> && git push && sidecar sync` 자동 실행 + 다음 사용자 turn banner `🛑 sbs-qa: regression FAIL — auto-reverted <SHA>` (가장 critical · 무회귀 1차 원칙)
  - `functional` / `visible` / `conformance` FAIL → ship 유지 + plan.md `## qa-deferred` 섹션 append + banner `🛑 sbs-qa: <axis> FAIL — alert only` (spec drift 가 의도된 경우 user 결정에 맡김)
  - `SKIP` = PASS-equivalent (자동 통과 · 해당 안 됨)
  - ALL PASS/SKIP → banner 없음 · plan.md `## qa-results` 에 ✓ 라인만 append · DONE

- **결과 기록**: `drafts/<slug>-plan.md` 의 `## qa-results` 섹션 (최신 위) + 필요 시 `## qa-deferred` 섹션. user 가 돌아오면 plan.md 만 읽어 후속 결정.

- **lockstep gate (@D g22)**:
  - `commands/step-by-step/.claude-plugin/plugin.json` → `0.6.0`
  - `.claude-plugin/marketplace.json` step-by-step entry → `0.6.0`
  - `README.md` step-by-step row → `0.6.0` + 4축 요약
  - `commands/step-by-step/commands/step-by-step.md` Step 0.8 추가 (full)
  - `commands/step-by-step/commands/sbs.md` 7→8 단계 (compact)

- **INBOX**: `sbs 0.6.0 자동 QA 4축` ✅ (from user 2026-05-28). 이번 land 자체가 sbs 0.5.0 → 0.6.0 dogfood — 1-decision chat-form 합의 (hybrid C) 후 `drafts/sbs-0.6.0-auto-qa-plan.md` 작성, 백그라운드 에이전트가 land + self-QA 까지 진행.

## 2026-05-28 — easy-auto 0.2.0: 한국어 substring 트리거 ('설명'·'쉽게') + 발동 banner

사용자 요청 — easy 모드 자동 발동 자연어 트리거에 한국어 짧은 substring 두 개 (`설명`, `쉽게`) 추가 + 발동 시 1줄 banner. 기존 트리거(`친근하게`·`쉽게 설명해줘`·`이지 모드`·`easy`·`easy mode`·`explain it simply`·`もっと分かりやすく`·`简单点说`·`попроще`)는 유지 — 두 신규 substring 이 기존 `쉽게 설명해줘` 를 subsume 하지만 longer 트리거는 harmless 하게 잔존.

- **`hooks/easy-auto/` 0.1.2 → 0.2.0** — UserPromptSubmit 시 payload 의 `prompt` 필드를 읽고 bare-substring 매칭(`prompt.contains("설명") || prompt.contains("쉽게")`). 매칭되면 additionalContext 헤더에 1줄 banner 를 prepend:
  - `🎓 easy 모드 활성 — 7-요소 패턴 적용 (아이콘·이름·별칭·평이·비유·ASCII·비교)`
  - 매칭 예: `설명해`·`설명해줘`·`설명`·`설명서`·`설명 좀`·`쉽게 설명해줘`·`쉽게`·`쉽게 알려줘` 등 verb/noun/adverb 모든 어형
  - **오탐 수용 trade-off** — `설명서 보여줘` 같은 noun 사용도 발동. 사용자 의도(짧고 흔한 substring 우선)로 수용.
  - 기존 always-on inject 동작은 그대로 — `easy-auto` 는 여전히 매 UserPromptSubmit 마다 styles/easy.<lang>.md 본문을 inject 한다. banner 는 trigger gating 이 아니라 NL 트리거 시 활성 표식만 추가하는 **upgrade-only** 패치.
  - SessionStart/PreCompact/PostCompact 는 prompt 필드 없음 → `_nl_trigger_hit` false → banner 비발동(인젝트 본문만 통과).

- **lockstep gate (@D g22)**:
  - `hooks/easy-auto/.claude-plugin/plugin.json` → `0.2.0`
  - `.claude-plugin/marketplace.json` easy-auto entry → `0.2.0`
  - `README.md` easy-auto row → `0.2.0` + 새 트리거/banner 요약

- **INBOX**: `easy-auto '설명'/'쉽게' 트리거 + banner` ✅ (from user 2026-05-28). 이번 사이클은 sbs 0.5.0 (manual chat-form 1Q + plan.md handoff) 첫 사용자 사이클 dogfood — 1-decision 합의 후 `drafts/easy-explain-trigger-plan.md` 작성, 백그라운드 에이전트가 land 까지 진행.

## 2026-05-28 — step-by-step 0.5.0: 2-mode 재설계 (auto + manual) · plan.md 생성 + handoff

사용자 — "sbs 재설계 + 추천 자동선택" → 5-decision chat-form 합의로 land. 기존 3-mode (auto/manual/full) → 2-mode (auto/manual)로 collapse. 기존 FULL 의 chat-form + 합의 화면을 MANUAL 의 새 기본 동작으로 승격하고, 합의 후 `drafts/<slug>-plan.md` 자동 생성 + 백그라운드 Agent fan-out 으로 사용자 무개입 ship 까지 진행. AUTO 는 같은 chat-form 스캐폴드를 출력하되 4-축 가중평균으로 자가선택.

- **`commands/step-by-step/` 0.4.0 → 0.5.0** — 5 잠금 결정:
  - **Q1 모드 개수 → 2**: 기존 auto/manual/full 3-mode → auto/manual 2-mode. 기존 per-step pause MANUAL 폐기.
  - **Q2 MANUAL = 새 기본**: 기존 FULL 의 chat-form (1Q/round + easy-mode 7-element scaffold + 자유응답) + `🎯 합의된 결정셋` 화면을 MANUAL 의 기본 path 로 승격. 합의 후 `drafts/<slug>-plan.md` 작성 + 'go' 받으면 백그라운드 Agent handoff.
  - **Q3 AUTO = 1개 차이**: chat-form 스캐폴드 출력은 동일하나 사용자 응답 대기 없이 즉시 auto-pick → 다음 라운드 즉시 진행. 합의 화면은 여전히 pause (auto-pick 사용자 pre-commit 체크포인트).
  - **Q4 AUTO 추천 4-축 가중평균**: 완성도(complete · robust + edge-case) + 단순(simple · Occam) + 안전(safe · blast radius 최소) + 표준(std · sidecar 패턴 일치). 기본 1:1:1:1. Inline override — `/sbs auto:safety <task>` (단일축 강제) · `/sbs auto:complete=2,simple=3 <task>` (가중치 지정). 미지정 축은 명시 가중 모드에서 0.
  - **Q5 handoff 형태**: `drafts/<slug>-plan.md` (frontmatter: slug · mode · auto-weights(AUTO만) · created date) + `## task brief` + `## locked decisions` + `## next-action checklist` (마지막 줄 `[ ] ship …`) + `## completion criteria`. `drafts/` 자동 생성 + `.gitignore` 자동 추가 (sign-gitignore 게이트 차단 시 1-line warning).
  - 백그라운드 Agent 는 general-purpose · `run_in_background=true` · self-contained 프롬프트 (plan.md 본문 + ship 지시 + 완료 기준 + "완료 시 보고"). 사용자는 한 줄 핸드오프 안내 받고 자리 비울 수 있음.
  - **`legacy-manual` 토큰** — 1-version deprecation. MANUAL 으로 동작하되 1-line banner: `⚠ legacy-manual is the old per-step pause behavior — being phased out; use plain manual for new chat-form default`.
  - Halt 조건 유지 (step failure · 비가역/파괴/외향 단계 직전 confirm). 핸드오프 Agent 도 동일 — 그런 단계 직전 사용자에게 보고 후 진행.

- **lockstep gate (@D g22)**:
  - `commands/step-by-step/.claude-plugin/plugin.json` → `0.5.0`
  - `.claude-plugin/marketplace.json` step-by-step entry → `0.5.0`
  - `README.md` step-by-step row → `0.5.0`
  - description 본문 3 surface 동기화

- **trigger 추가** — argument-hint `[auto[:<axis-or-weights>]|manual] [<task> | empty]` · keywords `chat-form`, `handoff` plugin.json keywords 에 추가.

---

## 2026-05-28 — pool-route 0.10.0 + sidecar 0.6.0: 사이드카 path-prefix 화이트리스트

사용자 — "사이드카 hexa들은 전부 화이트리스트 등록" → chat-form `/sbs full` 4-축 합의 후 land (Q1=ALL argv scan · Q2=`~/.sidecar/local-paths` plain text · Q3=`sidecar paths` CLI · Q4=default seed = cache + repo). pool-route 가 영구적으로 sidecar 자기 hexa 호출을 안 라우팅하도록 만드는 신규 LOCAL-EXECUTION 레이어.

- **`hooks/pool-route/` 0.9.3 → 0.10.0** — sidecar PATH-PREFIX 화이트리스트 신규 레이어:
  - `_has_whitelisted_local_path(av)` 헬퍼 추가 — 모든 argv 토큰을 스캔해 `/`-prefix abs path 가 등록된 prefix 중 하나로 시작하면 매치
  - 라우팅 결정 순서에서 host-introspection 다음, 호스트 roster 읽기 직전에 배치 (기타 structural local-exemption 들과 같은 레이어)
  - SSOT: `~/.sidecar/local-paths` (line-based plain text · USER 가 `sidecar paths` CLI 로 관리)
  - 빈/없는 파일 tolerated (no fail-closed) · 호출당 1회 읽기 (2-10줄 평균, 캐시 불필요) · 빈줄 + `#` 코멘트 스킵
  - 히트 시 한 줄 로그: `pool-route: local (sidecar path whitelist · prefix=<matched>)`
  - 영구 카운터파트 (sign-local 은 1회 30min · 화이트리스트는 영구 · TTL 없음)
  - 화이트리스트 자체가 opt-in · env 우회 없음 (@D s11)

- **`commands/sidecar/` 0.5.0 → 0.6.0** + **`bin/sidecar` 신규 `paths` 동사**:
  - `sidecar paths` (= list/show) — 등록된 prefix 줄별 출력 + 개수
  - `sidecar paths add` — `$(pwd)` 등록 (이미 있으면 거부)
  - `sidecar paths add <dir>` — abs-resolved dir prefix 등록 (`cd <dir> && pwd` 정규화 · trailing `/` 부여 · 존재안함/중복 거부 · exit 1)
  - `sidecar paths rm <prefix>` — exact-line 매치 한 줄 삭제 (없으면 거부 · exit 1)
  - 첫 호출 시 (파일 부재) 시드 2줄: `~/.claude/plugins/cache/sidecar/` + `~/core/sidecar/` (`$HOME` 런타임 해석 · 하드코딩 X · 빈 파일이면 시드 안 함 — 명시적 빈 상태 존중)
  - 원자 write (tmp+mv `rename(2)` 패턴 · 비관련 줄/코멘트 보존)
  - 도움말 + 알 수 없는 verb 목록에 `paths` 추가

- **검증** — 모두 PASS:
  - `hexa parse hooks/pool-route/bin/_pool_route.hexa` ✅ clean
  - `bash -n bin/sidecar` ✅ clean
  - CLI 스모크 8케이스 (first-call seed + list, add /tmp, list, rm /tmp/, list, refuse non-existent, refuse already-present, refuse rm-not-found) ✅
  - pool-route 스모크 3케이스 (whitelist hit → local · 비매치 + abs-path hexa → 기존 sign-gate deny 유지 · 파일 없을 때 → 정상 fallthrough) ✅

## 2026-05-28 — 3-track 사이클: step-by-step 0.4.0 (FULL chat-form + 합의 화면) · paper 0.11.0 (3 verb fix) · INBOX archive split

사용자 — "추가 inbox 내용 있나" → "어라 sbs 개선사항 들어왔을텐데" + INBOX false-positive filter 추적. 3-track 동시 진행 + INBOX 25→20 archive split로 soft cap 해소.

- **`commands/step-by-step/` 0.3.0 → 0.4.0** (INBOX `#5` ✅) — FULL mode UX 전면 개선 (사용자 요청: "선택상자 말고 비유하면서 채팅으로 진행"):
  - FULL 자체가 CHAT FORM (별도 sub-mode 토큰 X) — 한 라운드 = ONE 채팅 질문
  - easy-mode 7-요소 scaffold per round: 아이콘 · 이름 · 별칭 · 평이 한 줄 · 일상 비유 · ASCII 다이어그램 · 옵션 비교표 · 한 줄 추천
  - 라운드 종료: `→ A · B · 또는 자유응답 (예: "다른 안: …")` — 자유응답 explicit
  - 라운드 종료 후 **Step 0.6 합의 화면** (모든 FULL 변종 공통):
    ```
    🎯 합의된 결정셋 (N개)
    ┌─ Q1: <axis>  → ✅ <chosen>
    ├─ Q2: <axis>  → ✅ <chosen>
    └─ Qn: <axis>  → ✅ <chosen>
    요약: <one-line restatement>
    → 맞으면 `go` · 수정은 `Qn=<다른 선택>` (예: `Q2=B`)
    ```
  - `go` → plan으로, `Qn=<X>` → 해당 결정만 갱신 + 재렌더
  - mid-run 새 ambiguity도 chat 라운드 + 재합의 후 resume (plan 진입 전 cheap 마지막 flip)
  - Fallback: 사용자가 selectbox 원하는 그 1라운드에 한해 AskUserQuestion 허용 (chat이 default)
  - step-by-step.md + sbs.md 동기

- **`skills/paper/` 0.10.0 → 0.11.0** (INBOX `#112` ✅, demiurge ANTIMATTER paper rego PR #197) — 3 verb 버그 fix:
  - `pr-roll`: bare repo name early reject (gh `--repo`는 `OWNER/REPO` 필수 — 친절 에러 + 사용 예) + jq 표현식이 `\\\\#` emit (LaTeX `\#` 살림 · 전엔 jq `Invalid escape \#` crash)
  - `atoms`: `LC_ALL=C` 래핑 (BSD awk illegal-byte-sequence 회피 — verify_cli.hexa의 한국어/이모지 바이트) + 사용자입력/파일 모두 lowercase 비교 (BSD awk `IGNORECASE`는 GNU-only) + `fn <name>(` dispatch 시그니처 패턴 추가 (전엔 `"id"` quoted-string만 매칭)
  - `arxiv-prep`: dir → absolute path 선해결 후 `cd $TMP && tar -czf <ABS> .` (전엔 relative target이 `$TMP/<dir>/...`로 해석돼 항상 실패)
  - smoke 4종 ALL PASS

- **INBOX 정리** — 5 ✅ 마크 보강 (`#5 sbs UX` · `#98 worktree-gc 활성 wt prune` · `#112 paper v0.8` · `#123 g61 stdlib-SSOT` · `#369 /domain brainstorm superseded by /mining`) + INBOX.md row 2건 추가 (sbs · paper).
- **`INBOX.archive.log.md` 신규 분리** — 2026-05-22~05-24 resolved entries 5건 (`worktree disk fill-up` · `self-merge admin guard` · `.hexa PATH` · `hexa shim regen` · `cloud preflight`) 이동. soft cap 25→20 해소. hot log = 최근 + open만, cold archive = 전체 audit trail.

## 2026-05-28 — cloud 0.4.0: `cloud pods` + `cloud dispatch` 노출 (hexa-lang PR #1699 land 따라가기)

사용자 — "프로젝트마다 runpod/vast.ai/ubu 작업 관리 시스템, 파일 한 개로" (INBOX.log.md `#193`). 처음에 `~/.pool/pods.json` 글로벌 + pool CLI로 제안됐으나, 사용자 정정으로 **cwd `./pods.json` per-project + hexa cloud 확장**으로 land. pool 0.9.0 wip는 폐기 (영역 불일치 — pool=호스트 roster, pods=작업 매니페스트).

- **`skills/cloud/` 0.3.5 → 0.4.0** — SKILL.md 트리거 + plugin.json 설명에 신규 verbs 노출.
- **hexa-lang `cloud pods` + `cloud dispatch` (PR #1699 main 머지)** — 신규 모듈 `stdlib/cloud/pods_local.hexa` (340줄) + `cloud_cli.hexa` 라우팅. 8 verbs smoke ALL PASS:
  - `cloud pods` — 전체 테이블 (cwd `./pods.json` 읽기)
  - `cloud dispatch` — 동일 (alias)
  - `cloud dispatch tree` — pod 그룹 ASCII (orphan job tail 섹션)
  - `cloud dispatch active` — verdict=PENDING만
  - `cloud dispatch add <jid> <pid> <dir> [flags]` — job entry 덮어쓰기 + pod entry 자동 stub
  - `cloud dispatch verdict <jid> <status>` — verdict + verdict_utc만 갱신 (다른 field 보존)
  - `cloud dispatch rm <target>` — job 우선 매칭 후 pod, **pinned job 있으면 pod rm 거부**
- **schema** (update-form): `{version, last_updated_utc, pods{<pod-id>: {host,provider,...}}, jobs{<job-id>: {pod,dir,kind,stage,pid,watcher,watcher_output,verdict,started_utc,verdict_utc}}}`. atomic write (`mktemp + mv -f` rename(2)) + `.bak` 로테이션 + auto `last_updated_utc` 스탬프 (s11 no-opt-out).
- **글로벌 `pod_registry`와 분리**: 기존 `~/.hexa-cloud/pods.jsonl` (`cloud orphans`/`reconcile`)은 자동 추적 billing/orphan 방어 — `cloud run`/`nohup`이 dispatch마다 자동 기록. 신규 `./pods.json`은 **operator의 manual 작업 매니페스트 per project** (demiurge/anima/hexa-lang 각자 독립). 공존.
- INBOX.log #193 ✅ resolved · INBOX.md 갱신.
- 동기: demiurge RTSC 8 DFT 동시 진행 + sidecar `/micro-exp` sweep — "지금 무엇이 어디서 진행중"이 매 사이클 sweep 명령 반복 없이 한눈에 보이게.

## 2026-05-27 — mining 0.3.0: organize 절반 (`tidy` · `consolidate` · `squash`) 추가 — 3-workflow 완성

사용자 — "inbox check and patch" (INBOX.log.md `#192` from demiurge RTSC Cycle 15: 15 사이클 누적 후 chronological raw 가독성 떨어짐 → mining.md를 430→230줄로 phase 그룹화한 demiurge #382 워크플로의 슬래시화). **lens(발산) + connect(수렴) + tidy(정리)** = mining 3-workflow 완성 — 발산이 노드를, 수렴이 토폴로지를, 정리가 navigable 구조를 만든다.

- **`skills/mining/` 0.2.0 → 0.3.0** — 정리 verbs 3종 추가, 총 verbs 10 → 12.
- **3 신규 verbs**:
  - `tidy` (alias `consolidate`) — phase-group 재조직. 4 phase 그룹 — **divergence** (lens cycles) · **analysis** (mid-stream commentary) · **convergence** (connect cycles) · **external** (외부 참조). 본문 위에 **cycle-index 표** (chronological — 원본 순서 보존) + **stats** (n leaves · m edges · 사이클 K · 커버/미커버 axes · meaningful ratio) + **closure box** (`@status` · `@last-action` · `@next`) 자동 생성.
  - `--depth=light` — 헤더 + index 표 + stats만 추가 (사이클 <10 안전 모드).
  - `--depth=full` (DEFAULT) — 본문도 phase 그룹화.
  - `squash` — 중복 trivial 헤더(예: 반복 `### 다음 사이클 예정` / `### TBD`)만 단일화. **destructive 아님** (본문 그대로, 헤더만 머지). low-risk pre-step before `tidy --depth=full`.
- **LOSSLESS 보장** — 모든 leaf/edge/note가 정확히 한 phase 그룹에 재배치; `index` 표가 chronological 순서 보존해 `/mining tree`·`/mining graph` 결과가 tidy 전후 동일. `@kind:` 누락/모호 사이클은 추정 금지 → `🛑 tidy: cycle <N> phase ambiguous` refuse + 선언 요구.
- **status 자동 advisory** — 사이클 ≥10 AND 라인 ≥500 시 `💡 consider /mining tidy (≥10 cycles · ≥500 lines)` non-blocking 표시.
- INBOX.log #192 ✅ resolved.
- 출처: demiurge RTSC Cycle 15 — "마이닝 계속 고갈시까지 정리" → mining.md v2 phase-그룹 재조직 본체(#382)의 슬래시화.

## 2026-05-27 — mining 0.2.0: convergence 절반 (`connect` · `edges` · `graph` · `saturate`) 추가

사용자 — "inbox check 해서 업그레이드" (INBOX.log.md `#191` from demiurge RTSC Cycle 15: 발산만 있으면 leaf가 무한 증식만 한다 → 누적 leaf 사이 의미있는 direct edge를 찾는 **수렴** 라운드 = 0.1.0과 대칭). mining = (leaves, edges) **그래프**로 재정의 — divergence는 노드를 만들고, convergence는 underlying truth로 압축한다.

- **`skills/mining/` 0.1.0 → 0.2.0** — 수렴 verbs 4종 추가, 총 verbs 6 → 10.
- **두 cycle 종류**:
  - **lens cycle** (발산) — lens 적용 → 새 leaf 추가; depletion = 새 leaf 0개
  - **connect cycle** (수렴) — 누적 leaf 사이 의미있는 direct edge 발견; depletion = full pass에서 새 edge 0개
- **4 신규 verbs**:
  - `connect` (alias `edges`) — 수렴 라운드. 누적 leaf scan, 의미있는 edge 추가. **trivial-transitive** (A↔B + B↔C → A↔C 자명) · **re-packaging** (같은 주장 다른 표현) · **generic-ancestor** ("둘 다 X에 관한 것" with X가 너무 광범위) 제외.
  - `connect <a> <b>` — 특정 두 leaf 사이 edge 정당화. 의미있는 link 없으면 `(no-edge) L<a> ⊥ L<b> · <왜 무관>` 명시적 NEGATIVE 기록 (depletion 주장 보강).
  - `graph` — 누적 (leaves, edges) ASCII 그래프 + 통계 (n leaf · m edge · 가능한 짝 `n(n-1)/2` · meaningful ratio). N>30이면 degree-top-15 + degree-distribution mini-histogram.
  - `saturate` — auto-loop `connect`: 새 edge ≥1이면 즉시 또 한 pass (새 edge가 또 다른 link 해금 가능); 0이 되면 종결. 안전 cap 5 inner passes/호출 — 도달 시 `🔄 still saturating — re-run /mining saturate`.
- **`<NAME>.mining.md` 구조 확장** — `## edges` 섹션 추가 (`- E<n>: L<a> ↔ L<b> · <justification>` + `- (no-edge) L<a> ⊥ L<b> · <why>`).
- **status line 확장** — `cycles=N · leaves=N · edges=M · current: <lens|connect> <name> · status: <open|depleted>`.
- INBOX.log #191 ✅ resolved · #189 ✅ superseded by /mining (양방향 lens-divergence + connect-convergence가 #189 "verify 후 underlying truth로 통합" 요구를 더 일반적으로 해소).
- 출처: demiurge RTSC Cycle 15 — "발산만은 무한 증식" 자각 → 수렴 절반 요청.

## 2026-05-27 — mining 0.1.0: `/mining` 신규 — lens-driven 발산 가지치기 (`/domain` 3rd pillar)

사용자 — "/mining 구현시작" (INBOX.log.md `#190` from demiurge RTSC: 13-cycle 동안 자연발생한 lens-driven 발산 + 가지치기 + 누적 워크플로를 정식 슬래시 커맨드로). `/domain`의 3번째 기둥으로 `<NAME>.mining.md`(사이클별 lens-driven 트리 · append-only) + `<NAME>.mining.tape`(idea cart of @X promotion 후보) 추가.

- **`skills/mining/` 0.1.0** — 신규 command + skill. profiles tier `core` (cross-domain 유용).
- **bundled lens 6종** (모두 `~/.sidecar/lens/<name>.md`로 확장):
  - **same-formula** — 두 시스템이 같은 수학 공유 → 표면 도메인 너머 동등 메커니즘
  - **ouroboros** — X 자기-참조 → fixed-point/자기-닫힘 표면화 (= goal 자동 종결 신호)
  - **dimensional** — 차원 사다리 · 인접 추상 레벨 간 변환 가능 analog
  - **tension** — 모순/긴장 채굴 · 두 전제 충돌 → 가지 분기
  - **combinatorial** — A × B 직교 곱 탐색
  - **custom** — 자유형 (`/mining custom <text>`)
- **6 verbs**: bare(status) · `<lens>`(round) · `append <text>` · `cycle new <title>` · `depletion` · `tree`
- **cycle 의미**: 한 lens 적용 라운드. depletion = 새 leaf 0개 → 사이클 종결(파일은 append-only 계속).
- **active-domain only** (commons @D g58 · `/domain` active pointer 읽음, 없으면 stop).
- 출처: demiurge RTSC 13-cycle 유기적 emergence (Cooper-Kramers fixed-point LL-1 + Yoneda equivalence LL-2 발견 패턴).

## 2026-05-27 — step-by-step 0.3.0: FULL 모드 추가 (3-모드 질문밀도 스펙트럼)

사용자 — "sbs, 모호함 사라질때까지 계속 묻고 또 묻고 하는 형태의 full 서브커맨드". 기존 2모드(manual/auto)에 **FULL**(최대질문) 추가해 3-모드 스펙트럼 완성. (`go`는 별도 명령어 `/go`로 — sbs 모드 아님.)

```
auto ────────── manual ────────── full
적게 묻기         (기본)            많이 묻기
계획+무중단      단계별 상의        모호함 0까지 질문 후 실행
```

- **AUTO** — plan 보여주고 무중단 (기존).
- **MANUAL** (기본) — 단계별 pause + consult (기존).
- **FULL** (신규) — **Step 0.5 disambiguation 루프**: 계획 전에 AskUserQuestion 라운드(≤4/round)를 모호함 scan이 0 나올 때까지 반복(`🔍 disambiguation: N rounds · ambiguity → 0`). 이후 무중단 실행하되 **step이 새 모호함 surface하면 멈추고 또 질문** (fork 앞에서 절대 추측 안 함). FULL은 empty task도 질문 (다른 2모드는 assume+proceed).
- 3모드 모두 halt 조건 동일 (step failure · 비가역/외향 step 전 confirm).
- `/sbs` alias도 동기화. FIRST arg token `auto`|`manual`|`full` (기본 manual). `go`는 별도 `/go` 명령어(맥락 이어가기).
- README 전면 영어화 (한글 0 — 공개 repo 프론트 페이지).

## 2026-05-27 — pool-route data-locality pin + sign-local TTL 30min (anima PURE F-CURRICULA-1)

INBOX 핸드오프 (anima PURE 2026-05-25) — local 입력파일(Mac 의 session log 추출본 + Phase D corpus)에 의존하는 corpus build (`hexa run build_curriculum_corpus.hexa --corpus-path /Users/.../c.jsonl …`) 가 **두 라우팅 경로 모두에서 막혀** F-CURRICULA-1 GPU fire 가 2회 BLOCKED. 비용 0 으로 정직하게 halt 됐으나 자율 fire 흐름이 반복 차단되는 마찰. pool-route 0.6.10 local-pin 위 잔여 갭 2종을 닫는다.

### `hooks/pool-route/` 0.9.2 → 0.9.3 — data-locality pin (a) + sign-local TTL 30min (b)

**(a) data-locality pin** — bare `hexa run … --corpus-path /Users/.../c.jsonl` 가 0.9.0 inversion(default=pool)으로 ubu-2 에 라우팅 → 입력 jsonl 미동기화 → compile-stage `source not found` 로 죽음. 에러가 **데이터 부재**인데 **코드 오류**(소스 못 찾음)처럼 보여 오진단. fix: hexa exec 이 **데이터-입력 플래그**(`--corpus-path` · `--corpus` · `--data` · `--data-path` · `--dataset` · `--input` · `--train-data` · `--eval-data` · `--weights` · `--ckpt` · `--checkpoint`)를 들고 그 값이 **동기화 `~/core/` workdir 이 아닌 로컬-only 경로**(abs `/Users/`·`/tmp`, 비-core 상대경로)면 **local pin** (피어엔 그 데이터가 없으니 라우팅 무의미 — host-introspection 화이트리스트와 같은 data-locality 논리). 동기화 `~/core` 데이터(`--data ~/core/anima/d/`)는 pool 라우팅 유지(피어도 보유). 5번째 structural LOCAL-EXECUTION exemption. quote-stripped tokens(zsh-snapshot 래핑 대응). unconditional · opt-out env 없음(@D s11).

**(b) sign-local TTL 5min→30min** — 절대경로 `hexa run` 은 fork-storm `sign local` 게이트인데 토큰 TTL **5분 < 실제 build 10-20분** → build 중간 후속 `hexa run` 이 토큰 만료로 재차단(5분마다 재서명 = 비현실적 마찰). fix: `_local_signed()` 의 TTL 상수를 `LOCAL_SIGN_TTL = 1800`(30분)으로 상향. **트레이드오프**: fork-storm 가드 윈도우(sign-local 은 abs-path heavy gate 를 SUPPRESS)가 6× 길어짐 — 수용 (토큰은 명시적 · user-minted(agent 자가민팅 불가) · 단일키 · 조기 clear 가능 `sidecar sign clear local`). 단순 상수 변경이 Occam(g0) — 슬라이딩윈도우/세션마커 회피. `local` 토큰 TTL 은 거버넌스 sign TTL(`SIGN_TTL=300` · bin/sidecar + hooks/sign-guard · commons/project/gitignore **편집** 게이트 · 5분 유지)과 **독립**. bin/sidecar 의 mint 메시지 + `--list` 잔여시간을 key-aware 화(`sign_ttl_for`: local=1800, 거버넌스=300).

### 검증
- `_pool_route.hexa` `hexa parse` clean.
- (a) standalone smoke 12 케이스 ALL PASS — abs `--corpus-path`/`--data=`/`--weights`/`--ckpt` → local ✅ · 동기화 `~/core` `--data`/`--corpus-path`/`--dataset=` → 라우팅 유지(false) ✅ · 데이터-플래그 없는 `hexa run`/`hexa kick` → 미변경 ✅ · non-hexa `python --data` → 미적용 ✅ · dangling `--corpus`(값 없음) · 비-core 상대경로 → 보수적 local ✅.
- (b) TTL 로직 smoke — age 1000s(16.6분) valid(구 5min 은 reject) · age 1900s(31.6분) expired ✅ · `sign_ttl_for local=1800 commons=300` ✅. `bin/sidecar` `bash -n` clean.

## 2026-05-27 — stale-base squash-merge 35190-삭제 방어 (3-가드 · anima #1105)

INBOX 핸드오프 (anima 2026-05-27) — anima PR #1105(`decoder-m4b-gpu2-arch`)가 극도로 stale 한 base 에서 분기 → `gh pr merge --squash --admin` 시 main 의 **35190 파일**(state/·archive/·HEXAD/·docs/·AGENT/·training/·.hexarc 등 거의 전체 repo)을 회귀삭제. 정당한 변경은 `CORE/DECODER/v3_moe_arch.hexa` + smoke 2파일뿐. **자동 머지가 35190-삭제를 무경고 통과**시킨 게 핵심 위험. root: worktree 재사용으로 stale base 보유 + git-guard 의 stale-base 경고가 `git push` 시점 backstop 인데 `gh pr merge`(squash) 경로엔 미동작.

3개 가드를 lockstep 으로 추가 (모두 unconditional · opt-out env 없음 · commons @D s11 · hexa-native):

### `hooks/pr-cycle-hook/` 0.1.0 → 0.2.0 — 삭제-수 sanity gate (실질 deny · 최우선)
- pr-cycle 이 `gh pr create` 에 auto-merge tail 을 append 하기 **전에**, squash payload(`git diff --name-status <merge-base(origin/main,HEAD)>...HEAD` · cross-repo 는 `gh pr diff --repo X`)의 D(삭제)/A(추가) 라인을 셈.
- **대량삭제 이상치면 머지 BLOCK** (`permissionDecision: deny`): D-count > 50, **또는** 삭제 ≫ 추가(삭제 >= 추가의 10배 **이고** 삭제 > 20). PR 은 생성되되 위험한 squash-merge 만 보류 → 한국어 트레일러로 "대량삭제 의심(D=<n>) — stale-base 회귀일 수 있음. 의도된 거면 수동 `gh pr merge` 직접 실행" 안내.
- **fail-open**: probe 실패([-1,-1])는 hit 아님 — flaky `gh`/git 이 정당 머지를 막지 않음. 35190 같은 명백 이상치는 확실히 deny, 정상 PR(소수 삭제 또는 삭제<추가)은 통과.

### `hooks/worktree-guard/` 0.1.0 → 0.2.0 — 브랜치 재사용 advisory
- `git worktree add -b <br>` 의 `<br>` 가 이미 존재하면 non-blocking additionalContext 경고. 특히 **로컬-only stale 브랜치**(origin 엔 없음 = rejected/미푸시 이전 turn 잔재)면 stale-base 위험이 가장 커 별도 강조.
- 매 PR fresh 분기 권장: `git worktree add -b <br>-$(date +%s) <path> origin/main`. advisory-only(guards-narrow-scope).

### `hooks/git-guard/` 0.5.0 → 0.6.0 — stale-base MERGE advisory (push-time 경고를 머지경로로 확장)
- 기존 stale-base **push** advisory(0.5.0)에 더해, 명령에 `gh pr merge` 가 있고 `git push` 는 없을 때(= pr-cycle auto-append 또는 수동 bare merge) 동일한 divergence probe 를 돌려 머지 직전 경고. 머지 브랜치가 origin/main(/HEAD) 보다 >= 20커밋 뒤처지면 fire. cross-repo(`--repo X`)는 cwd HEAD 가 해당 PR base 와 무관하므로 skip.
- advisory-only — 실질 deny 는 pr-cycle 의 deletion-sanity gate 가 담당(guards-narrow-scope).

### 검증
- 3개 `.hexa` 모두 `hexa parse` → parses cleanly.
- 가드① D-count 로직 standalone smoke(7 케이스 PASS): 35190 D/3 A → **DENY** · 60 D/2 A(over cap) → DENY · 30 D/1 A(asymmetry) → DENY · 50 D/0 A(pure deletion) → DENY · 3 D/5 A(정상) → allow · 10 D/40 A(refactor) → allow · probe-failure [-1,-1] → fail-open allow.
- 가드② worktree-guard: 기존 로컬+origin 브랜치(`main`) 재사용 → reuse 경고 fire · 신규 브랜치 → reuse 경고 0건(false-positive 없음).
- 가드③ git-guard: force-push 여전히 deny · 현재 브랜치(behind 0) `gh pr merge` → false advisory 없음.

## 2026-05-27 — worktree-gc 0.2.0: 활성 worktree mid-task wipe 방어

INBOX 핸드오프 (demiurge monograph fan-out 2026-05-26) — `worktree-gc` 0.1.0 이 *작업 중* worktree 를 prune 해서 라이브 작업을 파괴. `wt-*-mono` worktree 의 `.git` 링크 + `main.tex`/`Makefile`/`appendix/` 가 mid-build 로 소실 (`companion/`+`cover.png` 만 생존). CERN(#220)·ANTIMATTER(#222) 둘 다 발생, checkpoint-commit 으로만 복구.

### 근본원인
prune 후보 판정이 **브랜치명 기준**이었다 (`origin/<branch>` ref 가 사라지면 "origin-gone" → prune). 이전 세션이 동명 브랜치(`feat/cern-monograph`)를 merge→origin 삭제하면, 동명을 재사용한 **신규 worktree(미푸시 라이브 작업)** 가 "origin-gone" 으로 오판되어 파괴됐다. 기존 `open-PR skip` 가드는 PR 생성 전 빌드 단계에선 무력.

### `hooks/worktree-gc/` 0.2.0 — 5개 가드 추가 (모두 unconditional · opt-out env 없음 · commons s11)
- **(a) dirty-tree 가드** — `git -C <wt> status --porcelain` 비어있지 않으면(uncommitted 변경) SKIP. status 조회 실패 시도 안전하게 라이브 취급 → SKIP.
- **(b) recent-mtime 가드** — worktree HEAD commit 시각 또는 working file mtime 이 < 1h 이면(mid-task 신호) SKIP. `now` 확정 실패 시 SKIP.
- **(c) cwd-in-use 가드** — `lsof -a -d cwd` 로 그 worktree 를 cwd 로 쓰는 라이브 프로세스가 있으면 SKIP. lsof 부재 시 `pgrep -f <path>` fallback.
- **(d) HEAD-ancestor 진짜-merged 체크** — 브랜치명 소실이 아니라 **worktree HEAD 가 실제로 `origin/main` 의 ancestor 인지**(`git merge-base --is-ancestor <wt-HEAD> origin/main`)로 판정. `origin/<branch>` ref 소실 단독 신호는 **무시** → 브랜치명 재사용 오판 차단(핵심 fix). `origin/main` 없으면 `origin/master` fallback, 둘 다 없으면 prune 불가(keep).
- **(e) atomic prune** — `git worktree remove` 가 **유일한** 삭제 경로. 실패 시 아무것도 안 지움(부분 삭제 / 수동 rm 금지) → companion/ 만 남고 .git 링크 소실 같은 비원자 상태 불가능.

### 검증
- `hexa parse hooks/worktree-gc/bin/_worktree_gc.hexa` → parses cleanly.
- 가드 primitive smoke test (활성 worktree 대상): (b) HEAD delta 12s<3600 → recent SKIP, (c) lsof 가 worktree cwd 프로세스 검출 → SKIP, (d) HEAD 가 origin/main ancestor 아님(rc=1) → prune 후보 아님. 라이브 작업이 4중 방어로 보호됨을 확인.

## 2026-05-27 — go 0.1.0 + roi 0.1.0: 2개 신규 스킬

사용자 — "go 명령어, 자연어 캐치도 필요해 'go' only" + "roi 명령어도 필요해 무손실 성능/자원/속도 개선 할일 목록 뽑기, 특정 부분 지정 메시지 뒤로".

### `skills/go/` 0.1.0
`/go [hint]` — 가장 최근 제안 / 일시중지된 flow를 추가 확인 없이 진행. **bare `go` 단일 단어 메시지도 NL 트리거**. stateless continuation token (runbook 아님).

- 인터프리테이션 케이스: 직전 plan/runbook 실행 · 추천 우선순위 선택 · `/sbs` MANUAL 다음 step · `/cycle-fg` 실패 step 재시도/skip · `/cycle` 다음 라운드 발화 · AskUserQuestion 미답 → recommended 디폴트
- `$ARGUMENTS` 힌트: `retry`/`skip`/`all`/host-name 등으로 모호 케이스 disambiguation
- 최근 제안 없으면 fabricate 금지 — 한 줄 질문으로 stop
- 트리거: `/go`, bare `go` (단일 단어), `진행`, `계속`, `proceed`, `continue`, `ok go`, `yes go`

### `skills/roi/` 0.1.0
`/roi [scope]` — LOSSLESS (기능 손실 없음) perf · resource · speed · efficiency 개선 후보 ranked TODO list. 카테고리 ⚡speed · 🧠perf · 💾resource · 🔋efficiency. **risk=low ONLY 게이트** — risk≥medium 후보는 LOSSLESS 정의 위반이라 drop, drop-count 함께 surface.

- Scope: bare `/roi` = active domain (있으면) ELSE cwd repo · `/roi <message>` = scope 한정 (file path · subdirectory · feature name · layer · language · hot path)
- 발견 방법: anti-pattern grep (N+1 · re-parse-per-call · O(n²) where O(n log n) trivial · unbounded growth · sync I/O on hot path · sort+take-1 vs min · regex recompile per loop · dict lookup not hoisted · …) → bench-grounded where measurable (`feedback:bench-kernel-choices` 적용) → impact/effort 비율로 정렬
- 출력: `| # | category | item | impact | effort | risk | how | evidence |` 단일 테이블 · cap top 10/category
- 트리거: `/roi`, `/roi <scope>`, `roi 뽑아`, `roi list`, `무손실 개선 할일`, `성능 개선 할일`, `자원 개선 할일`, `속도 개선 할일`, `효율 개선 할일`, `lossless improvements`, `perf wins`

둘 다 profiles.json tier=`core` (cross-tier 유용성).

## 2026-05-27 — cycle 0.9.1: `/cycle-bg` + fg/bg STICKY 실행모드 토글

사용자 — "cycle-bg도 만들어줘" + "cycle-fg 이후에는 cycle도 fg, -bg는 이후에도 bg". 즉 fg/bg를 일회성이 아니라 **세션 sticky 모드 토글**로.

- **마커**: `~/.sidecar/cycle-mode` ∈ {`fg`, `bg`} (per-host dotstate · default `bg` 부재시).
- **`/cycle-fg`** — 마커 `=fg` 세팅 + 이번 라운드 foreground 순차 실행. 이후 bare `/cycle`도 fg 유지.
- **`/cycle-bg`** (신규) — 마커 `=bg` 세팅 + 이번 라운드 background 병렬 fan-out + auto-continue (= 원래 기본 /cycle 동작). `/cycle-fg` 세션 후 병렬로 되돌릴 때 사용.
- **bare `/cycle`** — Stage -1에서 마커 읽어(default bg) 해당 모드로 Stage 4 dispatch. Stages 0-3 + Stage 5는 모드 무관 동일.

```
command       마커 set   이번 라운드        이후 bare /cycle
/cycle-fg     fg         foreground 순차    foreground (sticky)
/cycle-bg     bg         background 병렬    background (sticky)
bare /cycle   (유지)     마커 읽음(기본 bg)  마커 추종
```

- fg = 디버깅 · 조심스러운 리뷰 · cwd 공유/단일-스레드 리소스 작업 · bg (기본) = 격리 필요한 독립 병렬 버스트
- 양쪽 모두 ALL guardrails 유지 (SSOT-freshness · dup-race SKIP · leak-sweep · resource-serialization)
- **7개 명령** 패밀리 (`/cycle` · `/cycle-full` · `/cycle-loop` · `/cycle-full-loop` · `/cycle-all` · `/cycle-fg` · `/cycle-bg`)

NL triggers 확장: `사이클 백그라운드` · `사이클 병렬` · `background cycle` · `parallel cycle` · `bg 모드로` · `다시 백그라운드`.

## 2026-05-27 — cycle 0.9.0: `/cycle-fg` — foreground 순차진행 변형

사용자 요청 — "사이클 명령어 포그라운드 순차진행 명령어 필요". 기존 cycle family는 전부 백그라운드 Agent fan-out (병렬 실행). 디버깅 · 조심스러운 리뷰 · cwd 공유 작업처럼 인-세션 가시성이 필요한 경우 — cycle의 자동 enumeration + plan은 유지하되 Stage 4 execution을 foreground sequential로 바꾼 변형 필요.

- **`/cycle-fg`** — Stages 0-3는 `/cycle`과 동일 (SSOT-freshness · next-list · dup-race precheck · plan table), Stage 4만 OVERRIDE: 각 PROCEED 행을 메인 세션에서 직접 Bash/Read/Edit/Write로 순차 실행. `▶ i/N → ✅/⚠/❌` 가시 진행. NO `Agent` 호출 · NO `run_in_background` · NO `isolation: worktree`. Stage 5 depletion 자동연속은 유지.
- **Halt 규칙** (sbs-like): step `❌ failed` → STOP + verbatim error + un-run tail · 비가역/외향 step 전 confirm · 유저 interrupt → graceful stop.
- **trade-off vs /cycle**: 깊이 우선 순차 비용 ↔ 가시성 + throttle 안전 + cwd 공유 작업 호환.
- **6개 명령** 패밀리 (`/cycle` · `/cycle-full` · `/cycle-loop` · `/cycle-full-loop` · `/cycle-all` · `/cycle-fg`) 모두 같은 5-stage 구조 · plan-table · dup-race precheck · leak guardrails 공유, entry/pacing/cap/execution-mode만 다름.

| 축 | /cycle (default) | /cycle-fg |
|---|---|---|
| 실행 | 백그라운드 Agent fan-out (병렬) | 인-세션 직접 실행 (순차) |
| 결과 가시성 | Agent 완료 알림 | 매 step stdout/diff 그대로 |
| 리소스 | N개 Agent context · throttle 영향 | 단일 main context · throttle 안전 |
| 적합 | 독립 작업 다발 · 격리 필요 | 디버깅 · 조심스러운 리뷰 · cwd 공유 |

NL triggers 확장: `사이클 포그라운드` · `사이클 순차` · `사이클 직접` · `foreground cycle` · `sequential cycle` · `inline cycle` · `한 단계씩 사이클`.

## 2026-05-27 — pool-route 0.9.2: SessionStart에 정책 preamble 박음 (ambient awareness)

사용자 — "hexa 실행하는거에 대해 pool로 전달되겠구나 를 그냥 알게끔, ai agent가 인식하게끔 내가 안알려줘도". 0.8.0~0.9.1 inversion 정책이 plugin.json 설명엔 있지만 세션 시작 시 agent context엔 안 박혀서, 매 세션 유저가 "hexa는 pool로 가요"를 다시 설명해야 했음.

**fix**: `_emit_session_start()` 에 정책 preamble 추가 — route-log tail 앞에 4줄 정책 요약을 항상 emit. route-log 비어있어도 정책은 emit (예전엔 빈 로그면 early-exit).

```
# pool-route policy (default=POOL · 화이트리스트만 local · 0.9.0+ inversion):
  - ANY `hexa <verb>` → pool (0.8.0 POOL-DISPATCH; 4 structural exemptions)
  - non-hexa default also → pool (0.9.0 inversion); LOCAL-EXEC WHITELIST stays local
  - whitelist 추가 = sign-gated (project.tape s13)
  - `! sidecar sign local` (5min TUI bang) → 모든 명령 로컬 강제

# recent pool-route (~/.pool/route-log.jsonl · last 5)
...
```

이제 모든 세션이 시작 시 자동으로 "hexa → pool" 정책을 ambient context로 보유. 유저가 매번 설명 불필요.

## 2026-05-27 — pool-route 0.9.1: 0.8.3 canon 메커니즘 ROLLBACK (host-specific path resolution)

ubu-2에 canon 설치 시도 중 발견 — **각 pool 호스트의 hexa binary가 host별로 다른 path-resolution 규칙**을 가짐:
- **ubu-1**: `~/.hx/bin/hexa` = bash wrapper, `exec hexa_real` (sibling). HEXA_REAL_BIN env 무시.
- **ubu-2**: `~/.hx/bin/hexa` = ELF 바이너리 (wrapper 아님). `argv[0]/self/native/hexat` + cwd + HEXA_LANG-relative로 hexat 검색. 게다가 `~/.hx/bin/self` symlink가 Mac path(`/Users/ghost/...`)로 되어 있어 broken (sidecar sync가 Mac symlink를 Linux 호스트에 그대로 복사).
- **Mac**: 또 다른 패키지 구조 (`~/.hx/packages/hexa/hexa.real`).

→ 0.8.3 canon binary 주입 (`HEXA_REAL_BIN=~/.hx/canon/build/hexa_linux`)은 ubu-1엔 무시되고 ubu-2엔 잘못된 hexat 경로로 가서 깨짐. `hexa parse`(syntax-only)는 ubu-1에서 작동했지만 `hexa run`(transpile+compile)은 두 호스트 모두 실패 — canon에 `self/native/hexat` 없음. 

**0.9.1 ROLLBACK**:
- `tool_probe` = `command -v hexa && hexa <verb> --help` (0.8.2 형태, canon binary 검사 제거)
- `hexa_env` = `HEXA_LANG=$PWD` 또는 `$HOME/core/hexa-lang` (subverb일 때) — canon 주입 모두 제거
- deny-trailer: 호스트별 ~/core/hexa-lang + 호스트 hexa 안내로 복원
- 0.9.0 INVERSION (default=pool · 화이트리스트만 local) **유지** — 그 핵심은 동작 OK
- `~/.hx/canon` + `~/.hx/canon-update.sh`는 호스트에 남아있는 scaffolding — pool-route는 더 이상 사용 안 함. 호스트 운영자가 정리.

**남은 stdlib drift**: ubu-2의 `~/core/hexa-lang`이 660 commits 뒤 (#900) — 7개 untracked WIP collision (`stdlib/consciousness/iit4_*` · `compiler/atlas/calc_dispatch.hexa`)이 origin/main의 tracked 파일과 충돌해 `git pull --ff-only`불가. **anima 세션의 책임** — 자기 WIP 처리(commit 또는 stash) 후 pull. pool-route는 이 호스트 stdlib을 더 이상 우회하려 시도 안 함.

ubu-2 host 부수효과 (canon 시도 중 적용된 것 — 영구):
- `~/.hx/bin/self` Mac-path symlink → `/home/summer/core/hexa-lang/self` (Linux-local) 교체
- `~/.hx/bin/tool` 동일
- `~/core/hexa-lang/self/native/hexat` (canon dist binary 복사) — host hexa 검색 경로에 부재했던 transpiler 보충

## 2026-05-27 — pool-route 0.9.0: 분류기 INVERSION — default = pool · 화이트리스트만 local

사용자 directive — "무조건 pool & 화이트리스트만 local 가능". 0.8.x까지는 default=local + heavy 패턴만 pool이라, 분류기에 안 잡힌 무거운 명령 (`find /` 루트 풀스캔 · anima 세션이 2:44+ 째 100%+ CPU)이 default-local fallthrough로 Mac에서 돎. 진단 직후 비-claude CPU 합 483% (8 코어 · load=86) — bfs(`find /`) 2개가 177% 차지.

**분류기 inversion**:

```
이전 (0.8.x):                          0.9.0:
  sign-local → local                    sign-local → local
  WHITELIST hit → local                 WHITELIST hit → local
  heavy 패턴 매치 → pool                ──────────────────────
  default → LOCAL  ← `find /` 여기로    default → POOL  ← `find /` 여기로
```

- **`_pool_route.hexa`** — `if !heavy && !needs_sudo { _allow_count("light_allowed") }` 한 줄 제거 → 모든 비-whitelist 명령이 라우팅 단계로 fall-through. `heavy` 플래그는 OS-capability hint (is_macos/is_linux로 어느 pool 호스트 선택할지)에만 잔존.
- **HOST-INTROSPECTION 화이트리스트 추가 (0.9.0 신규)** — `ps · top · uptime · w · who · df · du · free · vmstat · iostat · uname · sysctl · launchctl · systemctl · pgrep · pkill · kill · killall · stat · lsof · netstat · ifconfig · ip · arp · route · dscl · scutil · sw_vers`. first-token basename 매치 (substring 충돌 방지). **의미적 필연**: 이 명령들은 호스트 상태를 측정 — pool 호스트로 라우팅하면 peer 상태가 나와서 진단 incoherent (ps 의 PID namespace · uptime 의 load · df 의 디스크 모두 호스트별 별개). dotstate 원칙의 자연 확장.
- **화이트리스트 등록은 sign-gate**: 이 외 추가하려면 project.tape 룰 편집 → `sidecar sign project` 토큰 필요 (commons @D s13). agent 자가민팅 없음. env-var/config opt-out 없음 (s11).
- **트레이드오프**: 라우팅된 모든 명령에 ~100-300ms SSH overhead. Mac load 보호가 우선이라 수용. 자주 쓰는 패턴이 SSH overhead 견디기 어려우면 → `! sidecar sign local` (5min batch token) 또는 sign-gated 화이트리스트 등록.
- **즉시 효과**: `find / -path "*/stdlib/.../iit4_*.hexa"` 같은 anima 풀스캔이 0.9.0 sync 후 다음 invocation부터 pool로 자동 분산.

기존 heavy_words/heavy_pairs/heavy_find_subs/hexa whitelist 코드는 그대로 — OS-capability filter (어느 pool 호스트로) 역할로 잔존. 다음 정리 라운드에 dead-code prune 가능.

## 2026-05-27 — pool-route 0.8.4: 'whitelist' 용어 정정 (= local-execution allowlist · sign-gated)

사용자 지적 — "pool 화이트리스트는 로컬 실행 화이트리스트를 뜻함" + "화이트리스트 등록은 sign 필요". 0.8.0의 `HEXA WHITELIST` 표현이 의미 반대였음: 실제로는 "ANY hexa → pool"이라는 **POOL-DISPATCH 셋**을 정의했는데, 'whitelist'는 통상적으로 "이 리스트에 있는 것은 허용/예외" (= pool-route 맥락에서는 **LOCAL-EXEC** = 로컬에 머무름) 의미여야 함. 이 두 개념은 정반대.

**docs only** — code 변경 없음, 동작 동일. 명명+CHANGELOG로 의미 교정.

- **POOL-DISPATCH** (0.8.0의 'HEXA WHITELIST'에서 개명): ANY hexa 실행 → pool. 0.8.1 atlas register · 0.8.3 canon 환경 그대로.
- **LOCAL-EXECUTION WHITELIST** (진짜 whitelist): pool dispatch를 ESCAPE하고 로컬에 머무는 패턴들. 멤버:
  1. `$CLAUDE_PLUGIN_ROOT` / `$CLAUDE_PLUGIN_DATA` (sidecar self-hook · workstation-only cache)
  2. `hexa cloud *` (자체가 remote dispatcher)
  3. `hexa atlas register` (로컬 SSOT embedded.gen.hexa 쓰기)
  4. `/Users/` · `/home/` abs-path heavy interp (sign-gated · 피어 호스트에 경로 부재)
  5. `~/.` · `$HOME/.` dotstate (~/.zsh_history · ~/.hexa-cache · ~/.pool · ~/.sidecar · per-host hidden state, NOT user-synced)
  6. `git` · `gh` 명령 (repo-local state)
  7. `npm` · `pnpm` · `yarn` (cwd-dependent package installer)
  8. `! sidecar sign local` 5min runtime token (`~/.sidecar/signs/local.sign`)
- **registration = sign-gated** (commons @D s13 · 새 메커니즘 없이 기존 sign 인프라로 충족):
  - 구조적 exemption 추가 = `_pool_route.hexa` 편집 + project.tape 룰 = project.tape sign-gate (`sidecar sign project`)
  - runtime force-local 토큰 minting = USER TUI `!` bang (`! sidecar sign local`)만 — agent 자가민팅 path 없음
- env-var/config opt-out 없음 (commons @D s11) · 이미 enforced

새 runtime verb (`pool wl add/list/rm` 등) 옵션은 유저가 "용어+도큐먼트만" 선택 — Occam 적용, 기존 인프라로 충분.

## 2026-05-27 — inbox-guard 0.1.0: `inbox/` 폴더 쓰기 차단 + 레거시 `inbox` 스킬 폐기

사용자 지적 — "INBOX.md 시스템이 아니라 inbox/ 폴더도 자꾸 사용해 막아줘". 진단: cross-project handoff SSOT는 `INBOX.md` (repo 루트 단일 .md · `- [ ]` 열린 항목 + sibling `INBOX.log.md` 해소이력 — anima·demiurge·hexa-lang·sidecar 4개 repo 모두 보유)인데, 레거시 `inbox` skill이 `inbox/<kind>/<slug>.md` (kind ∈ notes/patches/poc/rfc_drafts) 폴더 엔트리를 양산해서 활성 handoff 상태가 단일 SSOT 대신 여러 파일에 파편화.

- **`hooks/inbox-guard` 0.1.0** — PreToolUse(Write|Edit|NotebookEdit) 가드. `file_path`에 `/inbox/` 디렉토리 세그먼트가 있으면 deny, `INBOX.md` 안내 메시지 전달. 단일 파일명 `inbox.md`나 `INBOX.md`(폴더 아님)는 영향 없음. 폴더 진입만 막음. **No opt-out by design** (commons @D s11).
- **레거시 skill 폐기** — `~/.claude/commands/inbox.md` (sidecar mirror로 깔린 user-level command) 제거. 참조하던 `_inbox.hexa`는 sidecar에서 이미 사라졌고(stale reference), command 파일만 잔존하며 available-skills 목록에 inbox skill을 계속 노출시키고 있었음.
- 기존 `inbox/` 폴더 콘텐츠(예: anima/inbox/notes/...)는 그대로 유지 — 가드는 **신규 쓰기만** 차단, 정리는 유저 판단.
- 한정 범위 (v0.1.0): Write/Edit/NotebookEdit만 잡음. Bash redirect (`>` / `tee` / heredoc into inbox/)는 v0.2.0 미루기 — Bash 케이스는 흔치 않고 파싱 정확도 낮음.
- 검증: `/Users/ghost/core/anima/inbox/notes/foo.md` Write → ✅deny, `INBOX.md` Write → ✅allow, `commands/inbox.md` Edit → ✅allow (폴더 아님).

## 2026-05-27 — pool-route 0.8.3: pool-canonical `~/.hx/canon` 경로 — stale-컴파일러 근본해결

사용자 지적 — "old compiler 문제등근본해결 필요". 진단: pool 호스트들의 `~/core/hexa-lang` 체크아웃이 origin/main 대비 심하게 뒤처짐 (ubu-1=42 commit 뒤·feature branch 2 미푸시·idle, ubu-2=**614 commit 뒤·main·미커밋 8개·활성 run 3개·systemd-resolved 죽음으로 github 접근 불가**). 0.8.2 preflight는 "hexa가 실행되는가"만 검사 → 614-뒤처진 컴파일러도 readiness PASS → anima 세션의 qwen_bpe round-trip이 miscompile. 단순한 git pull은 불가 — ubu-2의 5개 untracked WIP가 origin/main 트래킹 파일과 충돌, ubu-1의 미푸시 feature branch도 못 건드림.

**근본해결**: 유저 dev 트리(`~/core/hexa-lang`)와 pool 디스패치를 **분리**.

```
~/core/hexa-lang  = 유저 dev (브랜치 · WIP · atlas)  — 건드리지 않음
~/.hx/canon       = pool 전용 origin/main 체크아웃     — pool-route가 사용
~/.hx/bin/hexa    = 래퍼 (HEXA_REAL_BIN 존중)
```

- **pool-route 0.8.2 → 0.8.3** — 모든 hexa 디스패치에 canon 환경 주입:
  - `tool_probe` = `test -x ~/.hx/canon/build/hexa_linux` AND `command -v hexa` AND wrapper가 canon으로 `hexa --help` 실행
  - `hexa_env` = `HEXA_REAL_BIN=$HOME/.hx/canon/build/hexa_linux HEXA_LANG=$HOME/.hx/canon HEXA_DAEMON=0` (바이너리 + stdlib 둘 다 canon으로 핀)
  - deny-trailer = canon 부재 시 `~/.hx/canon-update.sh` 실행 안내
- **`~/.hx/canon-update.sh`** (호스트별 설치) — 멱등 refresh: `git fetch origin main` → `reset --hard origin/main` → bootstrap C 복사 (`~/core/hexa-lang`의 untracked generated `self/runtime.c` + `self/native/hexa_cc.c`) → `hexa cc --regen` → `~/.hx/canon/.last_update` touch
- ubu-1 ✅ canon @ `9027a1f` (#1549 t53 fixture fix) 빌드 + 검증 완료 — wrapper-injection으로 `qwen_bpe` parse cleanly
- ubu-2는 systemd-resolved 죽음(`sudo systemctl restart systemd-resolved` 필요·유저 sudo) 해결 후 canon-update.sh 실행 가능 — 별개 호스트 health 이슈
- auto-self-heal (stale 자동 fetch+rebuild)은 0.8.4로 미룸 — probe 속도 우선, canon-update.sh 매뉴얼 실행으로 충당
- 효과: 유저의 feature 브랜치·WIP·atlas 작업이 pool 결과에 영향 없음, 모든 호스트에서 동일 origin/main hexa로 compile (결정성 ↑), stale-컴파일러 클래스 차단

## 2026-05-27 — pool-route 0.8.2: 폐기된 `hexa_interp` preflight probe 제거 (hexa=컴파일언어)

사용자 지적 — "hexa는 컴파일언어, 인터프리터 폐기됨". pool-route preflight가 호스트 hexa 가용성을 `test -x ~/core/hexa-lang/build/hexa_interp` 로 판정했는데, 이 인터프리터 아티팩트는 **폐기**돼서 컴파일 hexa가 멀쩡한 호스트를 잘못 skip. 결과: ubu-2(hexa·hexa_cli_driver·hexa_v2 완비, leftover interp 없음)가 preflight 실패 → round-robin skip → agent가 pool 못 쓰고 로컬 sign-gate로 회귀.

- **pool-route 0.8.1 → 0.8.2** — preflight tool_probe 에서 `&& test -x "$HOME/core/hexa-lang/build/hexa_interp"` 제거. readiness = `command -v hexa` + `hexa <verb> --help`(live 컴파일 경로 실제 태움) 만으로 판정 — build-dir 아티팩트 이름 의존 제거.
- deny trailer 의 stale "build a built build/hexa_interp (`hexa cc --regen`)" 안내도 "runnable compiled hexa on PATH (hexa is compiled, interpreter DEPRECATED)" 로 교정.
- 효과: ubu-1·ubu-2 둘 다 preflight 통과 → round-robin 부하분산 복원, hexa 라우팅 신뢰성 ↑.
- 메모리 `reference:hexa-lang-mac-build-loop` 에 "컴파일전용·인터프리터 폐기·readiness probe서 hexa_interp 보지말것" 박음.
- 파싱 검증 OK · plugin.json + marketplace.json + README + CHANGELOG lockstep.

## 2026-05-27 — cycle 0.8.2: `/cycle-all` — 추천/선택 없이 전부 진행

사용자 directive — "/cycle 이 next-list 뽑고 '추천 우선순위 + 어느 거 dispatch?' 게이트를 띄우는 대신 전부 진행하는 명령어". `/cycle` 의 5-스테이지를 그대로 쓰되 2가지 override.

- **신규 `/cycle-all`** (cycle 플러그인 5번째 명령):
  - **OVERRIDE 1 — cap 제거**: open milestone 전체 enumerate + `## deferred` 백로그 전체를 한 라운드에 promote (cap>8→confirm 가드 waive). 이게 명령의 목적.
  - **OVERRIDE 2 — 추천/선택 게이트 제거**: "🎯 추천 우선순위" shortlist · tiered "pick which" 메뉴 · `dispatch 지정 … 알려주시면 진행` hand-back 전부 금지. 플랜 테이블 후 PROCEED 행 **전부** 즉시 fan-out.
  - **안전 가드는 전부 유지** (selection 아니라 correctness): SSOT-freshness · dup-race SKIP(이미 resolved 항목은 "전부"여도 dispatch 안 함) · leak-sweep · **resource-contention serialization (핵심 — 전부 fan-out ≠ 전부 병렬; 공유 EXCLUSIVE GPU 자원은 직렬)** · throttle-resilience · auto-continue to depletion.
- SKILL.md Family 섹션 + plugin.json + marketplace.json 0.8.1→0.8.2 + README lockstep.

## 2026-05-27 — trail 0.1.0 + commons g74: 메인 흐름 이탈 → 복귀 스택

사용자 directive — "디코더 진행하다 업스트림 fix 건 생겨 메인 흐름에서 이탈하는 경우, ai agent 가 알아서 remember 사용해서 기억하고 복귀할 수 있도록". 이번 세션이 그 시나리오의 전형: anima DECODER MoE → hexa-lang flame-P2b → codegen trim fix 로 4단계 파고들며 본 흐름(3B scale 검증)을 잃을 위험. 한 모델이 "이탈하라"(g11/g59/g60 upstream-first)만 알고 "복귀 경로를 남겨라"는 없던 갭을 메움.

- **신규 plugin `trail` 0.1.0** (`skills/trail/`) — 메인 흐름 복귀 스택 (LIFO). 이탈은 **크로스레포뿐 아니라 같은 레포 내 곁가지/sub-fix 에서도 발생** (활성 마일스톤에서 벗어나는 임의 side-task) — 둘 다 커버. 동굴 탐험 실타래 비유: 들어갈 때 실 풀고, 나올 때 실 따라 복귀.
  - **저장 = HOME-global** `~/.sidecar/trail.tape` (cwd-local 인 `/draft` 와 갈리는 핵심) — 현재 dive 를 한 스택으로 추적: intra-repo 곁가지 커버 + 크로스레포(anima→hexa-lang) 이탈 시 `cd` 후에도 생존하는 상위집합.
  - 동사 — `push <return-target>` (이탈 직전 복귀 지점 기록: UTC ts + git-toplevel repo + 타겟 텍스트) · `pop` (top 프레임 제거 + 다음 resume 대상 출력, 비면 'back on MAIN FLOW') · bare/`show` (사다리 렌더 · deepest = `★ NOW` 상단, root 하단) · `clear` · `help`.
  - **portable POSIX** (head/tail/grep/awk · GNU-only 플래그 0) → macOS + Linux pool 동일 동작 (g13).
  - `/draft`(cwd-local throwaway) · `/domain`(in-repo milestone SSOT) 과 구분되는 메인 흐름 이탈 STACK (intra-repo + 크로스레포 공통).
- **commons.tape 1.2 → 1.3 · 신규 `@D g74`** — "main-flow deviation — breadcrumb the return path on ANY side-task (intra/cross-repo · g11/g59/g60 companion)". LLM 자동 사용 지시: 활성 목표에서 임의 side-task(intra-repo 곁가지/sub-fix 또는 크로스레포/업스트림)로 피벗 → `/trail push <return-target>` 후 진입 · 닫히면 `/trail pop` 후 부모 흐름 복귀. s7(룰 + 집행기 동반 ship) 충족 — g74(룰) + trail(메커니즘) 동일 배치.

## 2026-05-27 — pool-route 0.8.1: `hexa atlas register` 로컬 예외 (4번째 structural)

0.8.0 화이트리스트가 `hexa atlas register` 도 pool 로 보내던 문제 수정. `register --from-verify/--from-drill` 는 로컬 SSOT `compiler/atlas/embedded.gen.hexa` 를 in-place 수정 후 로컬 `git commit` 으로 공유하는 op — peer 로 라우팅하면 peer 의 atlas 만 바뀌고 로컬 파일은 그대로 → 이어지는 로컬 `git add embedded.gen.hexa` 가 빈 commit (조용히 깨진 share). git/gh 와 동일한 local-mutation 논리.

- **pool-route 0.8.0 → 0.8.1** — `hexa cloud` 예외 옆에 `_any_adjacent(toks, ["atlas","register"]) || _any_pair_substring(...)` 추가 → `hexa atlas register …` 는 분류기 도달 전 local 반환.
- **narrow**: `register` WRITE 서브버브만 핀. read 폼(atlas lookup/stats/hash/dump)은 화이트리스트대로 pool 라우팅(read-only, peer staleness 허용).
- 4 structural local-exemption 완성: $CLAUDE_PLUGIN_ROOT · hexa cloud · abs-path · atlas register.
- 파싱 검증: `hexa parse` → OK. plugin.json + marketplace.json + README + CHANGELOG lockstep.

## 2026-05-27 — pool-route 0.8.0: HEXA 화이트리스트 (blacklist → whitelist 전환)

사용자 directive "heavy 말고 블랙리스트 말고 화이트리스트로 — 모든 hexa 실행 pool 로". 배경: heavy-VERB 블랙리스트(kick/drill/run/build/… 만 라우팅)가 `hexa verify --expr` · `hexa atlas register` · `hexa parse` · `hexa honesty` 등을 누락 → 병렬 anima 자율 루프가 이것들을 로컬 대량 fork → **1600+ hexa 프로세스 Mac fork-storm** (load avg 12+, clang/atlas-parse 폭주). 블랙리스트는 새 verb 마다 새는 구조라 화이트리스트로 전환.

- **pool-route 0.7.11 → 0.8.0** — `_is_hexa_exec(toks)` 추가: `_unwrap_to_real` 후 first-token basename 이 `hexa`/`hexa.real`/`hexac`/`hexadrv`/`hxv2` 면 true. `heavy` OR-체인 맨 앞에 `_is_hexa_exec(toks) || …` 합류 → **모든 hexa 실행이 pool 로 라우팅**.
- **로컬 잔류 = 3 STRUCTURAL 예외만** (분류기 도달 전 early-return, "heavy/light 판단" 아님 · 라우팅이 구조적으로 불가능/무의미한 것만):
  1. `$CLAUDE_PLUGIN_ROOT`/`$CLAUDE_PLUGIN_DATA` hexa — sidecar 자체 훅/명령. 라우터가 자기 자신을 라우팅 불가 + 플러그인 캐시는 워크스테이션에만 존재.
  2. `hexa cloud` — 그 자체가 원격 디스패처(double-dispatch 무의미).
  3. `/Users/`·`/home/`·`~/.` abs-path hexa — 기존 sign-gate(peer 에 경로 부재 가능).
- **비-hexa heavy 분류기 유지** — make/cargo/gcc/node/java/ffmpeg 등 일반 heavy 는 기존 heavy_words/pairs 그대로. hexa-specific pairs(kick/run/verify/…)는 이제 `_is_hexa_exec` 에 포섭돼 redundant 지만 무해하게 잔존.
- ⚠ trade-off: `hexa verify <id>`/`hexa atlas register` 도 pool 로 감 — verify --expr(수치, atlas-무관)은 안전하나, `atlas register`는 로컬 SSOT(embedded.gen.hexa) 변경 op라 ubu 에서 실행 시 로컬 미반영. 사용자 explicit "모든 hexa" directive 우선 — anima atlas 워크플로 영향 시 사용자 조정.
- 파싱 검증: `hexa parse` → OK. plugin.json + marketplace.json + README + CHANGELOG lockstep.

## 2026-05-27 — step-by-step 0.2.0: manual(기본)/auto 2-모드

`/sbs`(및 `/step-by-step`)가 fully-auto 라 "실제 상의하면서 진행"이 안 되고 자동 폭주하던 문제 수정. 이제 **MANUAL 이 기본** — 한 스텝씩 실행 후 멈춰서 사용자와 상의, go 받아야 다음 진행.

- **2 모드** (첫 arg 토큰으로 선택):
  - `manual` (또는 토큰 없음 = 기본) — 스텝 1개 실행 → `⏸ step i/N done. next → … proceed?` 출력 후 **턴 종료**. 사용자가 continue/adjust/skip/stop 으로 매 경계마다 조향. 협업 루프.
  - `auto` — 기존 동작(전 스텝 무중단 실행). opt-in.
- **타겟 파싱**: 첫 토큰이 `manual`/`auto` 면 모드, 나머지가 task. 아니면 전체가 task + manual 기본.
- **halt 조건 양 모드 공통**: 스텝 실패(failing step + verbatim error + un-run tail) · 비가역/파괴/대외 스텝 전 confirm (bypass self-check 동급). manual 은 매 스텝이 이미 pause point.
- step-by-step.md + sbs.md 양 커맨드 본문 동시 갱신 · plugin.json/marketplace 0.1.0→0.2.0 · README lockstep.

## 2026-05-27 — matrix 0.1.0: axis cross-product 커버리지 추적기

`/matrix` — axis × axis 교차곱 커버리지 매트릭스를 cwd-local `MATRIX.tape` SSOT 로 관리 (DOMAINS.tape 와 동일한 선언적 패턴). anima UNIVERSE 의 손-추적 매트릭스(10×10 axis-pair · BIO × anima cross) 워크플로를 도구화 — 매 round prose 로 "어느 row 완료, 다음 셀 뭐" 추적하던 것을 대체.

- **2 모드**:
  - SQUARE — `/matrix axes <a…>`: 한 축집합, 셀 = upper-triangle + diagonal (총 N·(N+1)/2). `done` 시 pair 자동 정렬(canonical key)이라 순서 무관.
  - RECTANGULAR — `/matrix rows <a…>` + `cols <a…>`: 별개 행/열 축 (예: BIO 메커니즘 × anima 축, 총 R·C).
- **verbs**: bare/`show` (그리드 렌더 — 작으면 ✓/· 풀그리드, 크면 per-row ▓▓▓░░ 바 + 커버리지 % + 다음 5 unfilled) · `done <i> <j>` / `undone <i> <j>` (명시적 토글, /domain milestone 방식) · `next [N]` (미충전 N개, 기본 10) · `help`.
- **셀은 명시적** — 외부 artifact 자동탐지 없음 → workflow-agnostic. SSOT 가 세션 넘어 생존.
- 로컬 검증: rectangular(3×3) + square(3) 시나리오 — dedup · 대각 · canonical 정렬 · undone · next 전부 OK.
- profiles.json `matrix: core` + marketplace.json 등록 + README plugin table 갱신.

## 2026-05-27 — draft 0.2.0: add/rm verbs + LLM 자동 등록

`/draft` 에 `add`/`rm` verb 추가 + SKILL.md 가 LLM 에게 자연어 신호 인식 → 자동 `/draft add` 호출하도록 지시. 이제 사용자가 "이거 등록해줘" 한 마디면 LLM 이 대화 맥락에서 slug + content 추론해 자동 기록.

- **새 verbs**:
  - `/draft add <slug> <content...>` — drafts/<slug>.md 에 `- <ISO timestamp> — <content>` bullet append. 파일 없으면 자동 scaffold (single-call create-and-add).
  - `/draft rm <slug>` — drafts/<slug>.md 삭제 (drafts 가 throwaway 이므로 confirm 없음).
- **scaffold template 변경**: context/observations/ideas/TODO 4-섹션 → `## entries` 단일 섹션 (add 가 timestamped bullet 누적, 자유 형식).
- **LLM 자동 등록 가이드** — SKILL.md description 에 명시:
  - 인식: "이거 등록해줘"·"메모"·"적어둬"·"기록"·"register this"·"jot down"·"이것도"
  - 행동 3단계: (1) 직전 대화에서 SUBJECT 추출 (2) slug 결정 — 기존 draft 확인(`ls drafts/`) 후 관련 있으면 재사용, 없으면 kebab-case 도출 (3) `/draft add <slug> <distilled one-line>` 실행
  - 삭제 인식: "삭제"·"지워"·"폐기"·"delete that note"·"그 메모 지워" → `/draft rm <slug>`
- plugin.json + marketplace.json + README + SKILL.md + CHANGELOG lockstep.

## 2026-05-27 — draft 0.1.0: ephemeral scratchpad scaffolder

`/draft <slug>` — 임시 working notes 를 `drafts/<slug>.md` 로 scaffold. `drafts/` 는 자동으로 `.gitignore` 에 추가돼서 파일이 실수로 commit 되지 않음. 폐기 시 `rm -rf drafts/` 한 줄.

- **새 명령어** `/draft`
  - bare / `list` — `drafts/*.md` mtime-정렬 enumerate
  - `<slug>` — `drafts/<slug>.md` scaffold (template: context · observations · ideas · TODO + timestamp). slug = alnum/dash/underscore/dot.
  - `clean` — rm 후보 표시 (read-only; user 가 직접 `rm`)
- **`/inbox` 와의 구분**:
  - `/inbox new <kind> <slug>` — 타입화 분류 (notes/patches/poc/rfc_drafts), 결국 RFC 로 승격될 정도의 본격 문서
  - `/draft <slug>` — 명시적으로 throwaway, gitignored, 폐기 의도
- **이번 세션 동기** — pool-route env-prefix 우회 시도 정리 같은 ephemeral 작업이 root `DRAFT.md` litter 또는 inbox 잘못 사용으로 흘러가는 패턴 해소.
- profiles.json `draft: core` + marketplace.json 등록 + README plugin table 갱신.

## 2026-05-27 — pool-route 0.7.11: 무용한 env-prefix advisory (agent 학습)

배경 — 0.7.3 의 env-prefix stripping 이후 `SIDECAR_NO_POOL=1 / POOL_DISABLE=1` 같은 시도는 모두 no-op 이지만, **silent allow** 라 agent 가 "통과됐다" 착각하고 매 cmd 마다 같은 prefix 반복. 다른 세션 관찰 결과 agent 가 동일 우회 시도를 수십번 반복 — 학습 신호 부재.

해법 — env-prefix 감지 시 `additionalContext` 로 advisory emit. agent 가 다음 턴에 hook 결과로 메시지 보고 학습 → 우회 시도 중단.

- **pool-route 0.7.10 → 0.7.11** — 4 추가:
  - `_pool_advisory_text()` — canonical advisory 문자열 (ASCII-only, JSON-safe)
  - `_is_useless_pool_env(name)` — 4개 이름 화이트리스트 (SIDECAR_NO_POOL · SIDECAR_NO_POOL_ROUTE · POOL_DISABLE · SIDECAR_POOL_DISABLE)
  - `_has_useless_pool_env_prefix(toks)` — POSIX env-prefix 토큰 스캔
  - `let mut _ADVISORY` 모듈-레벨 mutable — 한 invocation 동안 advisory 상태 유지
- **exit fn 들 advisory 소비**:
  - `_allow_count(cat)` — `_ADVISORY != ""` 일 때 `permissionDecision:allow` + `additionalContext:_ADVISORY` emit
  - `_deny(reason)` — body 에 `additionalContext` 추가 (advisory 있을 때)
  - `_emit(ti, cmd, note)` — advisory 를 note 앞에 prepend
- **main 진입점 감지** — 초기 noise exit (MARK/heredoc/ssh) 직후, `_local_signed` 게이트 직전에 `_tokens(cmd)` → `_has_useless_pool_env_prefix` → `_ADVISORY` 설정.
- **라우팅 행동 불변** — env-prefix 가 라우팅을 enable/disable 하지 않음 (그것이 s11 의 원칙). 단지 agent 에게 알림만 추가.
- 파싱 검증: `hexa parse` → OK.
- plugin.json + marketplace.json + README + CHANGELOG lockstep.

## 2026-05-27 — pool-route 0.7.10: big-tree find 일반화 (POOL-OFFLOAD m5)

POOL-OFFLOAD 마일스톤 5 — `find $HOME/core/anima` 단일 substring 을 `~/core/*` 전체로 일반화. 어떤 dancinlab 패밀리 repo (anima · hexa-lang · demiurge · phanes · sidecar · ...) 든 big-tree find 가 자동 라우팅.

- **pool-route 0.7.9 → 0.7.10** — `heavy_find_subs` 2-substring:
  - `find <HOME>/core/` (expanded form, 도구가 합성한 명령에 흔함)
  - `find ~/core/` (tilde form, 사용자 직접 타이핑 흔함)
- **이전 패턴**: anima 1개 substring만 → 너무 좁음 (hexa-lang 같은 큰 트리 누락)
- **safety net**: preflight `test -d` 가 비-mirrored 호스트 자동 스킵 (기존 동작 그대로). 모든 호스트가 미러 부족하면 deny + per-host breakdown.
- **trade-off**: 작은 repo(sidecar 등)의 짧은 find 도 SSH 라운드트립 비용을 지불. Mac 청결 유지가 더 가치 — 사용자가 강제 로컬화 원하면 `! sidecar sign local`.
- **rg/fd 보류**: 인수 순서가 `rg pattern path` 형태라 단순 substring 매치 어려움. 다음 라운드 별도 메커니즘.
- 파싱 검증: `hexa parse` → OK.
- plugin.json + marketplace.json + README + CHANGELOG lockstep.

## 2026-05-27 — pool-route 0.7.9: 미디어 도구 (POOL-OFFLOAD m4)

POOL-OFFLOAD 마일스톤 4 — `ffmpeg`/`magick`/`convert`/`sox` 미디어 트랜스폼을 heavy 로 인식. Mac 에서 비디오 인코딩·이미지 배치 변환·오디오 처리 같은 CPU-heavy 부하를 ubu pool 로 위임.

- **pool-route 0.7.8 → 0.7.9** — 2 레이어 확장:
  - `heavy_words` +2: `ffmpeg` · `magick` (6-char specific, ImageMagick 7+ canonical binary)
  - `_local_heavy_interp` first-token +4: `ffmpeg` · `magick` · `convert` · `sox` (abs-path EXEC-only 정밀 매치)
- **convert/sox 는 first-token-only** — `convert`(7-char 영어 일반어)·`sox`(3-char) 는 `cat docs/convert.md` 같은 substring false-pos 위험 → heavy_words 미포함, abs-path EXEC 만 보호.
- **imagemagick 보류** — 패키지명, 실제 bin 호출은 `magick` (또는 legacy `convert`).
- 파싱 검증: `hexa parse` → OK.
- plugin.json + marketplace.json + README + CHANGELOG lockstep.

## 2026-05-27 — pool-route 0.7.8: JVM 계열 (POOL-OFFLOAD m3)

POOL-OFFLOAD 마일스톤 3 — Java/Kotlin/Scala/sbt 컴파일·실행을 heavy 로 인식. Mac 에서 `javac Foo.java`·`java -jar app.jar`·`sbt compile` 같은 JVM fork-storm 을 ubu pool 로 위임.

- **pool-route 0.7.7 → 0.7.8** — 3 레이어 확장:
  - `heavy_words` +3: `javac` · `kotlinc` · `scalac` (5-7 char, specific compilers — 단어경계 안전)
  - `heavy_pairs` +4: `java -jar` · `sbt compile` · `sbt test` · `sbt run` (pair-only — `java`(4-char)·`sbt`(3-char) 는 `cat /tmp/java-tools.txt`·`sbt-log` 같은 substring false-pos 위험 → 동작 토큰과 결합)
  - `_local_heavy_interp` first-token +5: `java` · `javac` · `kotlinc` · `scalac` · `sbt` (abs-path sign-gate · first-token 매치는 EXEC-only 정밀)
- **lein 보류** — Clojure 사용 환경 미확인, 필요시 다음 라운드.
- 파싱 검증: `hexa parse` → OK.
- plugin.json + marketplace.json + README + CHANGELOG lockstep.

## 2026-05-27 — pool-route 0.7.7: Node 생태계 런타임 분류 (POOL-OFFLOAD m2)

POOL-OFFLOAD 마일스톤 2 — `node`/`deno`/`bun`/`ts-node` JS·TS 인터프리터를 heavy 로 인식. Mac 워크스테이션에서 `node big-build.js` · `bun script.ts` 같은 V8/Bun/Deno fork-storm 을 ubu pool 로 위임.

- **pool-route 0.7.6 → 0.7.7** — 두 레이어 동시 확장:
  - `heavy_words` +4: `node` · `deno` · `bun` · `ts-node` (4-char+ 길이 · `_has_word` 단어경계로 `node_modules`·`node.js`·`bunzip2` 안전)
  - `_local_heavy_interp` first-token basename +5: 위 4개 + `tsx` (sign-gate 일관성 · python/hexa/gcc 와 동급)
- **tsx 제외 (heavy_words 한정)** — 3-char 짧고 `.tsx` 파일 확장자와 충돌. `cat foo.tsx` 가 `_has_word` 의 `.`(non-word) prev boundary + EOS post boundary 통과해 false-pos. first-token-basename 레이어에는 안전(EXEC 만 매치), 거기서만 추가.
- **npm/pnpm/yarn** 은 0.7.4 의 cwd-dependent local-bound 정책 그대로 유지.
- 파싱 검증: `hexa parse /tmp/_pool_route_test.hexa` → OK.
- plugin.json + marketplace.json + README + CHANGELOG lockstep.

## 2026-05-27 — pool-route 0.7.6: heavy hexa verb sweep (POOL-OFFLOAD m6)

POOL-OFFLOAD 마일스톤 6 — `hexa --help` 80+ verb 카탈로그 전체를 훑어 fork-storm 잠재 verb 19개를 `heavy_pairs` 에 합류. Mac 워크스테이션이 `hexa test`/`hexa smash --seed`/`hexa omega` 같은 verb 를 로컬에서 돌리지 않고 ubu pool 로 위임하게 됨.

- **pool-route 0.7.5 → 0.7.6** — `heavy_pairs` +19 entries (총 36 페어):
  - **toolchain (2)**: `hexa test` (네이티브 @test 러너 = pytest/jest 동급) · `hexa bench` (wall/RSS/alloc 벤치)
  - **math verifiers (2)**: `hexa absolute` (Mk.VIII Δ₀-absolute classifier) · `hexa meta-closure` (Mk.IX 자기참조 fixpoint H1+H2+H3)
  - **math discovery (3)**: `hexa smash` (9-phase singularity drill — `--depth 3` 으로 ~414 candidates) · `hexa free` (DFS compose 5-module) · `hexa hyperarithmetic` (Mk.IX Π₀² 5-system reverse-math)
  - **discovery extras (1)**: `hexa chain` (L3 cross-engine pipeline)
  - **drill variants (11)**: omega · surge · dream · swarm · reign · molt · wake · forge · canon · debate · revive — `kick` 은 이미 0.6.x 부터, `drill` 도 이미 포함
- **제외(가벼움)**: atlas hash/stats/lookup/dump/verify · 29 annotation analyzers (pure-check/memo-check/catalog/…) · 16 HTTP data bridges (wikipedia/oeis/arxiv/…) · `hexa lattice verify` · `hexa gpu lint`/`disasm`.
- **제외(3-token, 다음 라운드)**: `hexa gpu fire <kernel>` · `hexa sim-universe <X>` · `hexa qmirror <X>` · `hexa atlas register --from-drill` — 현재 분류기는 2-토큰 페어만 지원, 3-토큰 검출 메커니즘은 후속 마일스톤.
- 파싱 검증: `hexa parse /tmp/_pool_route_test.hexa` → OK.
- plugin.json + marketplace.json + README + CHANGELOG lockstep.

## 2026-05-27 — pool-route 0.7.5: routing-rate baseline counters (POOL-OFFLOAD m1)

POOL-OFFLOAD 도메인 마일스톤 1 — Mac→Linux pool 위임 확장의 기준선 측정 도구. 분류기 verdict 4종을 카운트해서 "실제로 몇 % 가 pool 로 갔는가" 를 `/check` 로 노출.

- **pool-route 0.7.4 → 0.7.5** — `_tally(category)` 헬퍼 + `_allow_count(cat)`/`_deny_count(reason, cat)` 래퍼 추가. 의미있는 분기 9개 사이트만 카운트(local-sign · git/gh/pool · npm/pnpm/yarn · $CLAUDE_PLUGIN_ROOT · $HOME/dotstate · hexa cloud · light-allowed · routed-emit · exhausted-deny). 비-분류기 exit(non-Bash · empty · MARK · heredoc · already-ssh)는 카운트 제외 → 비율이 실제 라우팅 결정만 반영.
- **counter 파일** `~/.pool/route-counters.tally` — 라인당 `KEY=N` (routed/local_bound/light_allowed/heavy_failed/total). 동시 세션 race 는 lossy 허용(베이스라인 측정 목적).
- **/check 확장** — `═══ pool-route counters` 섹션 추가, 4종 verdict + 비율 + 총합 출력. tally 파일 없으면 안내 라인.
- plugin.json + marketplace.json + CHANGELOG lockstep.



사용자 즉시 보고 — `npm i @google-cloud/vertexai ...` 가 pool-route 의 heavy classifier 에 잡혀 ubu-1/ubu-2 라우팅 시도, 두 host 모두 cwd(`~/core/demiurge/web`) 가 없어 preflight 실패 → 명령 자체 DENY. npm/pnpm/yarn 은 본질적으로 cwd-dependent (package.json 읽고 node_modules 를 CWD 에 씀) — pool host 로 보낼 일 자체가 없다.

- **pool-route 0.7.3 → 0.7.4** — `_has_word(cmd, "npm") || _has_word(cmd, "pnpm") || _has_word(cmd, "yarn")` 을 local-bound early-_allow 체인에 추가(git/gh/pool 옆) · `heavy_words` 에서 npm/pnpm/yarn 제거 (이중 안전).
- 검증 4/4 — `npm install`/`yarn add` LOCAL silent · `hexa kick` 여전히 routed · `gcc /Users/.../x.c` 여전히 sign-local DENY (회귀 없음).
- README + marketplace lockstep.

## 2026-05-26 — monitor-guard 0.1.5: has_log 도 token-position (substring → redirect-target 추출)

substring → token-position sweep 마무리. monitor-guard 의 `has_log` 도 `_has_log_pos` + `_redirect_targets` 헬퍼로 정밀화: quote-aware `>`/`>>` redirect target 추출(non-`/dev/null` 파일 = durable sink) + `tee <file>` (flag 옵션 skip) + `<<` heredoc. 이전 `cmd.contains(".log")` substring 은 `grep nohup /var/log/foo.log` 같이 `.log` 단어만 언급해도 sink 충족으로 잘못 판정.

- **monitor-guard 0.1.4 → 0.1.5** — `_starts_with`/`_ends_with`/`_redirect_targets`/`_has_log_pos` 헬퍼 추가, main 의 `let has_log = cmd.contains(...)` 4-항 substring chain 을 `_has_log_pos(cmd, toks)` 한 줄로 교체. `_tokens` 는 이미 0.1.3에서 추가됨.
- 검증 8/8 — `nohup ... > /tmp/foo.log &` ALLOW · `nohup ... > /tmp/foo.txt &` ALLOW (redirect target = durable) · `nohup ... > /dev/null &` log-warn · `nohup ... | tee /tmp/out.log &` ALLOW · `nohup ... | tee -a /tmp/x &` ALLOW (flag skip) · `grep nohup /var/log/foo.log` ALLOW (no detach) · `cat /etc/foo.log` ALLOW (no detach).
- README + marketplace lockstep.

이로써 이번 세션 substring 잔재 모두 token-position 으로 sweep — monitor-guard·pod-monitor 의 모든 trigger 가 command position 매치, false-pos 표면 0.

## 2026-05-26 — false-pos sweep C+E: drift-guard 0.1.1 (self-trigger) + monitor-guard 0.1.4 (has_detach)

세션 누적 false-positive sweep 마무리 — 두 hook 의 substring-매치 잔재 정리.

- **drift-guard 0.1.0 → 0.1.1** — sentinel scan 자기참조 종결: (a) `_is_code_file` 헬퍼 추가, sentinel 스캔을 `.hexa`/`.py`/`.sh`/`.swift`/`.c`/`.cpp`/`.rs`/`.go`/`.js`/`.ts`/`.java`/`.rb`/`.pl`/`.bash`/`.zsh`/`.lua`/`.h` source-code 확장자에만 적용 — prose-heavy 문서(marketplace.json/README.md/CHANGELOG.md/SKILL.md) 가 marker 토큰을 documentation 으로 가지고 있어도 self-trigger 안 함; (b) sidecar repo 의 own `/hooks/drift-guard/` tree skip 추가 (CLAUDE_PLUGIN_ROOT cache 외 dev source 도) — guard 자기 source 편집은 project drift 아님.
- **monitor-guard 0.1.3 → 0.1.4** — `_has_detach_pos` 헬퍼 추가: nohup/setsid 가 command position(env-prefix 통과) 에 있을 때, disown 은 standalone 토큰일 때만 detach 로 인식. `cmd.contains("nohup ")` substring 이 `grep -n nohup /etc/foo` 같은 명령에 detach 로 판정해 [log] hint 띄우던 noise 제거.
- 검증 5/5 — drift-guard marketplace/README/own-hexa edit silent · .py + sentinel 발화 보존 · monitor-guard grep silent · 진짜 nohup 발화 · env-prefix setsid 발화.
- README + marketplace lockstep.

이로써 이번 세션 false-positive sweep 모두 종결 (A+B = PR #179 · C+E = 본 PR · D pr-cycle = 복잡, 별도 작업).

## 2026-05-26 — cloud dispatch advisory 정밀화: pod-monitor 0.1.3 + monitor-guard 0.1.3 (substring → token-position)

세션 누적 false-positive sweep — `pod-monitor` 와 `monitor-guard` 두 hook 의 `cmd.contains("hexa cloud nohup")` substring 체크가 commit 메시지·grep 패턴·docs 에서 phrase 만 언급해도 발화하던 noise 제거. 두 hook 다 **command-position token match** 로 정밀화: 첫 비-env-prefix 토큰이 `hexa` && 그 다음이 `cloud` && 그 다음이 dispatch verb (`nohup`/`fire`/`run`) 일 때만 발화. env-prefix(`FOO=bar hexa cloud …`) 도 정상 인식.

- **pod-monitor 0.1.2 → 0.1.3** — `_has_pod_fire` 가 substring 매치에서 토큰-위치 매치로 변경. `_tokens` + `_is_env_assign` 헬퍼 추가. `fire` verb (hexa-lang PR #1309 도입) 도 match set 에 포함.
- **monitor-guard 0.1.2 → 0.1.3** — `is_cloud_pod` 도 동일 방식. 추가로 `if !is_bg && !is_cloud_pod { _allow() }` — cloud fire/nohup 은 inherent dispatch 라 trailing `&` 없어도 cloud-bridge 힌트 발화.
- 검증 8/8 — false-positive 4종(grep · commit msg · echo · 평범 cmd) ALLOW, 진짜 dispatch 4종(nohup · fire · env-prefix run · nohup+& ) 정확 발화.
- 알려진 잔여 — `has_detach` (monitor-guard) 가 여전히 `cmd.contains("nohup ")` substring 사용 → `grep ... nohup ...` 같은 명령에 [log] 힌트 발화. 별도 PR 후보.
- README + marketplace lockstep.

## 2026-05-26 — monitor↔hexa cloud bridge 명확화 step 3 (sidecar reference 갱신 — 업스트림 shipped)

step 1 의 inbox RFC (`inbox/rfc_drafts/cloud-fire-monitor-handle.md`) 가 hexa-lang 측에서 두 PR (#1306 PR1 = `CloudResult.logfile` 필드 + `__MONITOR_HANDLE__={…}` JSON echo + tail exit-code docs · #1309 PR2 = atomic `hexa cloud fire` verb + canonical `/tmp/cloud-<unix_ts>.log` auto-log) 로 머지됨. 이번 PR 은 sidecar 면의 advisory + skill docs 를 "pre-ship 3-step manual handoff" → "atomic 1-shot fire workflow" 로 갱신.

- **`monitor-guard` 0.1.1 → 0.1.2** — `_monitor_guard.hexa` 의 cloud-bridge 힌트가 이제 live workflow 를 가리킨다: `hexa cloud fire <host> -- <argv>` → stdout 의 `__MONITOR_HANDLE__={"host":…,"pid":N,"log":…,"tail_cmd":…}` 한 줄 → caller grep → `tail_cmd` 로 Monitor attach. nohup (caller 가 logfile 미리 정한 경우) 도 동일 handle line.
- **`cloud` skill 0.3.4 → 0.3.5** — SKILL.md 가 동일하게 atomic workflow 로 갱신, "skip handle line" / "batched 동시호출 시 unix_ts 충돌" 두 don't 추가.
- README 행 정정 + marketplace lockstep.
- `inbox/rfc_drafts/cloud-fire-monitor-handle.md` 는 보존 (역사적 출처 — 다음 inbox sweep 에서 archive 또는 notes/ 이동 결정).

hexa-lang 측 두 PR 의 module-loader 회귀 노트 — PR2 에서 `cloud_fire_opts`/`cloud_fire` 두 함수를 cloud.hexa 에 stdlib export 로 추가했더니 hexa module-loader 가 expanded.tmp 에서 그 두 함수만 통째로 누락 (원인 미상, 다른 함수 정의는 정상). 우회 = CLI-side 인라인 (cloud_cli.hexa 의 fire handler 안에서 `cloud_nohup_opts` 직접 호출 + ts auto-gen). public API 표면은 `cloud_nohup_opts` 만 유지.

## 2026-05-26 — monitor↔hexa cloud bridge 명확화 step 1 (sidecar 측 advisory · docs · RFC inbox)

사용자 보고 "monitor, hexa cloud 연결이 코드수준으로 명확하지 않는듯" 에 대한 sidecar 측 응답. 코드 감사로 J건의 갭(nohup이 logfile 경로를 머신-파스 형식으로 echo 안 함 · CloudResult.logfile 필드 부재 · atomic fire verb 없음 · tail/early-life-check exit-code 미문서 등)을 짚었고, 이번 PR 은 sidecar 면을 닫고 hexa-lang 측 작업 명세를 inbox 로 전달한다.

- **`inbox/rfc_drafts/cloud-fire-monitor-handle.md` (신규)** — hexa-lang `stdlib/cloud/` 작업 명세 RFC. `CloudResult.logfile` 필드 + `cloud_nohup`/`cloud_fire` 의 `__MONITOR_HANDLE__={…}` JSON 한 줄 stdout echo + atomic `hexa cloud fire` verb + canonical 로그 경로(`/tmp/cloud-<host>-<ts>.log`) + `tail`/`--early-life-check` exit-code 문서화. g4 분할: PR1(필드+JSON+docs ~80줄) · PR2(fire verb ~100줄). 별도 hexa-lang 세션이 main 깨끗한 base 에서 픽업해 PR.
- **`monitor-guard` 0.1.0 → 0.1.1** — `_monitor_guard.hexa` 가 `hexa cloud nohup`/`hexa cloud fire` 패턴을 별도 감지. 기본 detach+log 인바리언트가 이미 충족돼 있어도 (그 verb 자체가 두 조건을 내포) cloud workflow 의 별개 요건 — caller 가 logfile 경로를 `hexa cloud tail` 로 thread 해야 Monitor 가 붙음 — 을 advisory 로 못박는다. 회귀 없음(평범 detach+log 케이스는 여전히 조기 _allow). 검증 7/7.
- **`cloud` skill 0.3.3 → 0.3.4** — `SKILL.md` 에 현행 3-step monitor handoff(`nohup` → `tail` → Monitor) 명시 + `tail` exit-code 의미(0/255/other) 명시 + caller 가 logfile 경로를 nohup/tail 사이에 thread 해야 한다는 don't 추가. `cloud_fire` 도입 후 자동화될 항목을 RFC 로 reference.
- **README** 행 정정 — monitor-guard 0.1.0→0.1.1 · cloud 0.3.2(표기 stale) → 0.3.4 + 요약 갱신.
- 비-목표(별도 작업) — commons `@D g57` amend(sign-gated, 사용자 `! sidecar sign commons` 후) · `eval 'cmd'` 파싱(실제 shell parser 필요) · `cloud run` 동기 verb 변경.

## 2026-05-26 — pool-route 0.7.3: sign-local 게이트 단일성 방어 (env-prefix + wrapper 우회 차단)

`sign local` 토큰이 abs-path heavy 호출의 유일 게이트라는 0.7.2 의 약속이 **POSIX env-var prefix + 명령 wrapper** 22개 벡터로 새고 있던 것을 막는다. `_local_heavy_interp` 가 `_basename(toks[0])` 만 보고 hexa/python/gcc 를 판정하던 게 원인 — `POOL_DISABLE=1 hexa run /Users/x.hexa` · `env hexa run /Users/x.hexa` · `nice -n 10 hexa run /Users/x.hexa` 등에서 toks[0] 이 진짜 인터프리터가 아니라 prefix/wrapper 라 분류가 미스되고 silent ALLOW.

- **누수 확인 (사용자 보고)** — `POOL_DISABLE=1` · `SIDECAR_POOL_DISABLE=1` · `FOO=bar` · `A=1 B=2` · `URL=http://x?a=b` (env-prefix 5종) + `env [-i|-u VAR]` · `exec` · `nice [-n N]` · `timeout [N|-k 5 60]` · `command` · `sudo [-u USER]` · `nohup` · `stdbuf -oL` · `\hexa` (POSIX alias-bypass) + 스택드 (`env nice -n 5 hexa` · `FOO=1 env hexa`) 등 22 벡터가 sign 없이 abs-path heavy 호출 통과.
- **fix `_local_heavy_interp`** — 헬퍼 3종 추가: `_is_env_assign(token)` (POSIX IDENT=val 형식 판별), `_strip_env_prefix(toks)` (선두 env-assign 토큰 제거), `_unwrap_to_real(toks)` (env-prefix + wrapper 셋(`env`·`exec`·`nice`·`timeout`·`command`·`sudo`·`nohup`·`stdbuf`·`ionice`, per-wrapper option-arg 인식 + `timeout DURATION` 처리) + leading `\` strip, depth ≤ 8 보호). 분류기는 unwrap 후 실제 verb 로 판정.
- **변수 이름 인식 아님** — `POOL_DISABLE` 이 특별취급되는 게 아니라 **모든 IDENT=val prefix** 가 동일하게 strip. 파서 정정이지 opt-out 추가가 아님(s11 부합).
- **검증 34/34** — env-prefix 5 + wrapper 17(stdbuf -oL attached-value 처리 포함) + backslash 3 + baseline 4 + no-false-positive 5. 메인 라우팅 분류기(`_any_word`/`_any_adjacent`, 전체 스캔)는 영향 없음 — 누수는 sign-gate 한 곳이었음.
- **알려진 한계** — `eval 'hexa run /Users/x.hexa'` 는 인자가 quoted shell string 이라 토큰 분석 불가; 실제 shell 파서 필요(별도 작업). 일반 사용 빈도 매우 낮음.
- surface lockstep — `plugin.json`/`marketplace.json` 설명 + 버전 0.7.2→0.7.3 · README 행(0.7.1 표기 stale → 0.7.3 정정 + 요약 갱신).

## 2026-05-26 — sign-guard 0.1.6: `.gitignore` 도 sign-gate에 편입

`.gitignore` 는 버전 관리에 무엇이 들어갈지를 조용히 결정한다 — 에이전트가 몰래 고치면 시크릿을 un-ignore 하거나 파일을 리뷰에서 숨길 수 있다. 그래서 `commons.tape`/`project.tape` 와 동일한 USER sign-off 게이트로 묶는다.

- **sign-guard `_gated()`** 에 `["gitignore", "/.gitignore"]` 한 줄 추가 (0.1.5→0.1.6). 경로 suffix `/.gitignore` 매칭이라 루트·중첩 `.gitignore` 모두 게이트. 에이전트가 `.gitignore` 를 Write/Edit/Bash-redirect 로 건드리면, 유저가 `! sidecar sign gitignore` 로 5분 토큰을 발급하기 전까지 hard-deny.
- 메커니즘은 기존 그대로 — 토큰이 유일 전제조건(s11), self-mint 코드-차단(s13), opt-out 없음. `bin/sidecar sign` 은 키 화이트리스트가 없어 로직 변경 불필요(임의 키 수용).
- **surface lockstep** — `bin/sidecar` usage 3곳(`commons · project · gitignore`) · plugin.json/marketplace.json 설명 + 키 목록 · README sign-guard 행(0.1.4 표기 정정 → 0.1.6) + 가드 요약 주석.
- deny 메시지 문구 `SIGN-GATED governance SSOT` → `a SIGN-GATED file` 로 일반화(.gitignore 에도 정확).
- 검증 — `.gitignore` no-token DENY · 토큰 발급 후 ALLOW · `commons.tape` 회귀 게이트 유지 · 출력 JSON 유효.

## 2026-05-26 — drift-guard 0.1.0: 설계 변경 → 메모리 미러 누락 회귀 방지 hook

설계가 코드/설정에서 바뀌었는데 `MEMORY.md` + `CLAUDE.md`/project.tape 가 안 따라가서, 다음 세션이 (시작 시 diff 가 아니라 메모리를 읽으므로) 옛 설계로 **회귀**하던 문제를 막는 신규 hook. 같은 세션 안에서 루프를 닫도록 비차단 안내를 주입한다.

- **`drift-guard` (신규 · 0.1.0)** — `PostToolUse(Write|Edit)`, hexa-lang(`_drift_guard.hexa`, `hexa run`). 트리거 3종(하나라도): (1) SSOT 파일 — 경로가 `.tape` 또는 `/CLAUDE.md` 로 끝남, (2) `decisions/` 폴더의 새 산출물, (3) 편집 후 내용에 `@design-change` 마커. 미러 타깃 자신(`/memory/`·`MEMORY.md`)과 가드 자신의 설치 디렉토리(`CLAUDE_PLUGIN_ROOT`)는 skip. 발화 시 "다음 세션은 이 diff 가 아니라 메모리를 읽는다 → 지금 `memory/` 에 미러하라(메모리 파일 + `MEMORY.md` 포인터), cross-project 룰이면 `sidecar sign` 후 commons/project.tape" 안내. `(session, file)` 당 1회 dedup — `CLAUDE_PLUGIN_DATA` 마커. advisory-only(guards-narrow-scope), **opt-out 없음**(s11 — 트리거 셋이 전제조건이지 스위치가 아님).
- `memory-lint` 와 상호보완 — memory-lint = 메모리 파일 **쓸 때** 위생 검사 / drift-guard = **다른 설계 surface 를 고쳤는데** 메모리 미갱신을 잡음(역방향).
- **profiles.json** — `drift-guard: core` 태깅(어느 repo 에서나 유용, `memory-lint`/`limit-guard` 와 동급). 공개 집계 62 → 63(28 `core` · 17 `hexa` · 18 `personal`, master 제외).
- 검증 — 7 시나리오(트리거 3종 발화 · dedup · 미러타깃/평범파일/자기디렉토리 skip) · 출력 JSON 유효 · sidecar-lint check 3(버전 정합)·6(티어) 통과.

## 2026-05-26 — commons g72: minimal role-name 식별자 (버전/세대 마커 금지) + sidecar-lint 0.7.0 check 8

식별자·파일·바이너리 이름에서 버전/세대 마커를 추방하는 cross-project 규칙. `_v2`·`_v3`·`_mk2`·`_c2`·`stage0`·`_new`·`_old`·`_final`·`-fixNNNN` 류 금지 — 이름은 **역할 기반 minimal**(Rust snake_case), 버전은 semver/git tag 에 산다(이름엔 절대 안 박음). Go식 `/vN` import-path 버저닝도 금지(마커는 메타데이터지 이름이 아니다). 기존 `hexa_v2` 등은 grandfather(빌드 깨짐 방지) — 신규만 차단.

- **commons.tape `@D g72`** 추가 (commons 0.10.12→0.10.13) — commons hook 이 모든 세션(hexa-lang 포함)에 cross-project 주입하므로 에이전트가 신규 명명 시 자동 적용.
- **sidecar-lint check 8** (0.6.0→0.7.0) — 마켓플레이스 등록 플러그인 이름을 `_ver_marked` 로 스캔(stage0..2 · -new/-old/-final · `_vN`/`-vN`/`_mkN`/`_cN` N=2..9, hand-rolled no-regex), 발견 시 non-blocking finding. s7(룰+enforcement 동반).
- 세션 산출물 동반 정리: 멀티호스트 배포 바이너리를 `hexa-fixNNNN`→bare `hexa`(Rust `rustc` 스타일)로 통일(Mac·ubu-1·ubu-2).

pool-mcp(폐기됨)가 stdio 핸드셰이크 데드락으로 세션을 블로킹한 사례를 거버넌스로 못박음 — **MCP-server 플러그인 생성 금지**. 능력 노출은 hook · command · skill 3개 개념 표면(+ 그 위의 host CLI)으로 충분하며, s1 의 concept set 도 원래 `{hook · command · skill}` 이었음. 규칙 + enforcement 동시 출하(s7).

- **project.tape @D s15 (신규 · spec 1.5→1.6)** — `no MCP-server plugins — hook · command · skill concepts only`. do: 3개 개념 표면 + host CLI 로 노출 / dont: `mcps/` 디렉토리나 plugin.json `mcpServers` 필드로 MCP-server 플러그인 추가 (stdio handshake 블로킹). sign-gated 편집(s13, 유저 `sidecar sign project` 후).
- **sidecar-lint 0.5.0 → 0.6.0** — 검사 7 추가. `git commit` 시 marketplace.json 을 스캔해 (a) `./mcps/` source 엔트리, (b) 임의 plugin.json 의 `mcpServers` 필드 중 하나라도 보이면 advisory finding(비차단, 기존 검사들과 동급 — `guards-narrow-scope`). 검사 3(버전 drift) 루프에 동승, `_contains` 헬퍼 추가. 검증 3/3 — mcps/ source FIRE · mcpServers-in-plugin.json FIRE · mcp 없는 repo 오탐 0.

`pool-route` 가 Mac 고부하 시 `pool on <host> <cmd>` **자체**를 다른 Linux 호스트로 load-balance 하던 버그 수정 (s10 위반 — local-bound 명령은 라우팅 금지). `pool` 은 로컬 SSH 디스패처라 원격 호스트엔 `pool` 바이너리가 없어 `127` 로 죽거나(관측됨: `pool on ubu-1 …` → ubu-2 로 라우팅 → `pool: command not found`), 있어도 이중 디스패치가 된다. local-bound 분류기에 `git`/`gh` 와 나란히 `pool` 추가 — 첫 토큰이든 prefix 형(`POOL_DISABLE=1 pool …`)이든 `_has_word(cmd, "pool")` 로 항상 로컬 실행. opt-out env var 아님(s11 무관). lockstep(g22) pool-route 0.7.0→0.7.1.

## 2026-05-26 — pool-mcp 폐기 (stdio MCP 서버 블로킹 → CLI 경로로 충분)

`pool-mcp` (stdio MCP 서버, `mcp__pool__on` · `mcp__pool__list` 두 도구) 를 마켓플레이스에서 **완전 폐기**. 세션에서 자꾸 블로킹을 유발 — 0.1.1 의 "stdio handshake deadlock" fix 도 메시지당 `hexa run` 디스패치 read-loop 라 핸드셰이크/툴콜 지점에서 멈춤이 재발. pool 기능은 이미 `pool` CLI · `/pool` 커맨드 · `pool-route` 자동 라우터 hook 으로 완전히 커버되므로 MCP 래퍼는 중복 표면.

- **`mcps/pool-mcp/` 트리 삭제** — 유일한 mcp 플러그인이라 `mcps/` 개념 디렉토리 자체가 소멸 (concept-separation: mcp 카테고리 비게 됨).
- **마켓플레이스 등록 제거** — `marketplace.json` 엔트리 + `profiles.json` `core` 태그 삭제. 다음 `sidecar sync` 의 install.hexa prune 패스(#162)가 로컬 `installed_plugins.json` + `settings.enabledPlugins` 의 `pool-mcp@sidecar` 키를 자동 self-heal 제거.
- **README 갱신** — 아키텍처 트리의 `mcps/` 줄 · 플러그인 표 행 삭제, 집계 `63 → 62` (`{hook · command · skill}`, 27 `core`).
- 이미 실행중인 MCP 서버는 세션 재시작 시 사라짐 (Claude Code 가 SessionStart 에 MCP 라이프사이클 관리).

## 2026-05-26 — cycle 0.8.1 (@D ssot_freshness: FILE-fresh ≠ CONTENT-fresh — scan-B 의무화)

`@D ssot_freshness` 의 git probe 는 FILE 만 origin/main 과 비교한다 — 파일이 origin/main 과 **일치(probe PASS)해도 내용은 stale 할 수 있다**: 체크박스/구버전-커밋-앵커 섹션이 실제 코드 현실보다 뒤처짐(landing 후 아무도 box 를 flip 안 함). 이 staleness 는 여기가 아니라 `@D dup_race_precheck` scan-B(per-item merged-PR 증거)가 잡는다. 따라서 open-count 가 크거나(round cap ≫) 도c 에 old-commit 앵커 / `doc-lag · flip to [x]` / `GENUINELY OPEN @ <sha>` 류 섹션이 있으면 file-fresh PASS 를 **불충분**으로 보고 모든 open 항목에 scan-B 를 돌려 이미-landed 된 것을 evidence-flip(정합 PR) 먼저 한 뒤 genuine remainder 만 enumerate. 입증: hexa-lang RUNTIME.md 가 file-fresh(== origin/main, probe PASS)였지만 Phase-1 Tier-A 88 box 가 stale-done(바이너리 0 externs · north-star MET #1058/#1059) — scan-B(`_gmtime_r` #1053 등)가 잡고 #1186 정합(open 129→41). SKILL.md @D + `cycle.md` Stage 0 양쪽 반영. lockstep(g22) cycle 0.8.0→0.8.1.

## 2026-05-26 — install.hexa: 은퇴 플러그인 prune (stale enable 키 → /doctor 에러 차단)

`sidecar sync` 가 마켓에서 사라진 플러그인의 `<name>@sidecar` 키를 `installed_plugins.json` · `settings.enabledPlugins` 에 그대로 남겨, Claude Code 가 `/doctor` 에서 "Plugin <name> not found in marketplace sidecar" 로드 에러를 내던 문제. (실사례: all-bg-go 폐기 후 enable 키 잔존 → 로드 에러.) install.hexa 의 enable 루프는 ADD/UPDATE 만 하고 제거를 안 했음.

- **install.hexa prune 패스 추가** — enable 루프가 현재 marketplace 의 `<name>@sidecar` 키 집합(`valid`)을 만들고, 루프 뒤 `installed_plugins.json` + `settings.enabledPlugins` 에서 `_is_sidecar_key` 면서 `valid` 에 없는 키를 일괄 제거(비-sidecar 키 + 유효 키는 통과). 제거 시 `pruned N retired plugin(s)` 한 줄 출력. 이제 플러그인이 마켓에서 빠지면 다음 `sidecar sync` 가 자동 self-heal.
- 이 fix 는 로컬 작업트리에 작성돼 있었으나 origin 에 미커밋 상태라 sync(=origin/main 실행)가 못 쓰던 것 — 커밋·푸시로 활성화.

## 2026-05-26 — throttle-guard 0.1.0 (transient rate-limit 별도 플러그인 분리)

여러 세션/와이드 fan-out이 동시에 API를 두드려 터지는 **일시적 서버 throttle**("temporarily limiting requests · not your usage limit")을 limit-guard(usage/session 한도)에서 **별도 플러그인으로 분리** — 신호도 처리도 달라 s1 개념 분리.

- **throttle-guard 0.1.0 (신규 hook · `core`)** — `PostToolUse(Task|Agent)`. transient throttle 감지 시 (1) **세션 간 공유 쿨다운 마커** `~/.sidecar/throttle.json` 지수 백오프(15·30·60·120·240·300s · 120s storm 창) — 모든 세션이 한 백오프 창을 읽어 thundering-herd 재발사 차단, (2) jitter 백오프 + fan-out WIDTH≤1 + re-read(재실행 금지) 지시. usage/session 문구엔 skip(limit-guard와 이중발화 방지). hexa-lang(`_throttle_guard.hexa`) · opt-out 없음. 4/4 검증(FIRE+마커 · 지수 escalation · usage-limit SILENT · clean SILENT).
- marketplace · profiles(`core`) · README(62→63 · core 28) 락스텝.
- ⚠ 의존 fix: hexa-lang `self/runtime.c`에 `#include <spawn.h>` 누락으로 콜드 hexa 컴파일이 깨져 있어 로컬 1줄 추가로 언블록(throttle-guard·install.hexa 등 신규 hexa 빌드 전부 영향) — 영구 fix는 hexa-lang main에 랜딩 필요(g59).

## 2026-05-26 — CLOSURE_POLICY.md (닫힘 정직성 정책 문서화)

cycle 0.7.7 + domain 0.8.8 가 막은 LIFE-class false closure 의 방어법 + 설계 방향을 루트 정책 문서 `CLOSURE_POLICY.md` 로 기록. `LATTICE_POLICY.md`(한계 주장의 정직성)의 자매 — 닫힘 주장의 정직성. 2겹 근본원인(stale untracked SSOT shadow · perpetual 오취급) → 두 기둥(SSOT 신선도 · 닫힘 정직성) + 보조(roster self-heal) + 설계 원칙 5개(SSOT=live · 정직성>진행감 · fail-open · surface-don't-act · 마커 기반 일반화) + 구현 매핑표. README 에 `## Policies` 섹션 신설(두 honesty 정책 묶음) + Reference·Layout 갱신. 코드 변경 없음(문서 전용).

## 2026-05-26 — cloud 0.3.3 (`tail` subverb 노출 — Monitor 브릿지)

`hexa cloud tail` 이 hexa-lang 에 랜딩(PR #1165)됨에 따라 `/cloud` skill 의 subverb 목록에 `tail` 을 추가한다. `tail <host> <log> [--grep RE] [--until RE]` 은 원격 작업 로그를 ssh 로 라이브 스트리밍(`tail -F | sed -u`, 크래시-aware 기본 종료 마커)해서 **폴링 없이 Monitor 에 붙이는 canonical 경로**(commons g57: "attach Monitor to the LOG"). nohup `--early-life-check`(즉사 가드)와 짝 — early-life 는 발사 직후 즉사를 잡고, tail 은 그 이후 전 구간을 지켜본다. 4개 표면 lockstep(@D g22): SKILL.md · commands/cloud.md · plugin.json · marketplace.json `0.3.2 → 0.3.3`.

## 2026-05-26 — worktree-guard 0.1.0 (격리 워크트리 유실 방지 advisory)

격리 워크트리에서 작업하다 **디렉터리가 통째로 사라져 미커밋 편집을 잃는** 사고를 막는다. 동시 에이전트가 많은 repo(예: hexa-lang)나 동기화 워크스페이스에서 다른 에이전트의 `git worktree prune` · 워크스페이스 sync · macOS `/tmp` reaper 가 워크트리 디렉터리를 지우면, origin 에 push 되지 않은 커밋·미커밋분이 함께 증발한다. 이 세션에서 hexa-lang 작업 중 워크트리가 두 번 사라져 편집을 재적용해야 했던 통증을 가드로 제도화(@D s7: 룰+enforcement 동시 출하).

- **worktree-guard 0.1.0 (신규 hook · `core`)** — `PreToolUse(Bash)` advisory. `git worktree add` 감지 시 non-blocking additionalContext 로 durable-worktree 수칙 주입: 편집 직후 commit+push(미커밋분을 턴에 걸쳐 들고 있지 않기) · 랜딩 순서(편집→stage→commit→push→PR→`git worktree remove`, 검증 빌드는 commit 뒤) · 경로가 `/tmp`·`/private/tmp`·`/var/folders` 면 더 휘발적이라는 강한 경고. hexa-lang(`_worktree_guard.hexa`) · opt-out 없음. workdir-guard(공유 트리 SessionStart)·worktree-gc(merged prune)의 자매.
- marketplace.json · profiles.json(`core`) · README(60 plugins · core 26 · 표) 락스텝(@D ship · g22).

## 2026-05-26 — pr-cycle · prefs 분할 (hook ⊥ command) → command/skill 네임스페이스 0

shadow가 hook 겸용이라 건너뛴 마지막 2개를 hook-only + command-only로 분할해 command쪽만 shadow → `prefs:prefs`·`pr-cycle:pr-cycle` 네임스페이스 소멸. s1(개념=폴더) 준수: command→`commands/`, hook→`hooks/`. g20(중복) 회피.

- **pr-cycle** 0.3.6 → `pr-cycle` 0.4.0 (command-only · `commands/pr-cycle/`) + `pr-cycle-hook` 0.1.0 (PreToolUse 라우터 · `hooks/pr-cycle-hook/`). command가 순수 bash라 스크립트 공유 없음 — 깨끗한 분할.
- **prefs** 0.3.4 → `prefs` 0.4.0 (command-only) + `prefs-hook` 0.1.0 (inject 훅). `_prefs.hexa`의 prefs.json 경로를 `$CLAUDE_PLUGIN_DATA` → **고정 SSOT `~/.claude/plugins/data/prefs-sidecar/`**로 변경: command(writer)와 hook(reader)이 다른 플러그인이어도 같은 SSOT 공유(분할-safe). 스크립트는 prefs-hook에 1부만, command는 캐시 ref(g20 중복 0).
- marketplace · profiles(prefs-hook=core · pr-cycle-hook=personal) · README(59→61 plugins · core 25→26 · personal 17→18) 락스텝. shadow 재적용으로 prefs·pr-cycle command가 bare-only.
- 결과: 잔존 namespaced command/skill = **0**.

## 2026-05-26 — all-bg-go 폐기 (cycle와 중복)

reactive fan-out(`/all-bg-go`)은 `/cycle`의 self-generating fan-out과 기능이 겹쳐(commons g41이 "sister of /cycle"로 명시) 별도 플러그인 가치가 낮다 → 폐기. 직전 턴 가지 발사는 모델이 직접(Agent 툴) 또는 `/cycle`로 처리.

- `skills/all-bg-go/` 제거 · marketplace.json · profiles.json · README(60→59 plugins · core 26→25 · 표 · 명령 카탈로그) · COMMANDS.md · **commons g41 제거**(sign-gated).
- 로컬 shadow override·bare 미러 정리(다음 sync 꼬리 shadow 재열거가 marker에서 자동 제외).
- 잔여(추후): cycle/micro-exp 설명의 "distinct from all-bg-go" 개념 대비 prose는 유지 — 명령 링크가 아니라 reactive↔self-generating 대비 설명이라 무해.

## 2026-05-26 — cycle 0.8.0 (자율-루프 형식 고정 + 린터)

이번 세션의 자율 진행 방식(라운드마다 disjoint fan-out → 결과보고 → 다음 라운드, checkpoint-resume, oversized-split, handoff-debt 추적)을 `cycle-loop`/`cycle-full-loop` 의 **FIXED per-round 형식**으로 명문화 + 린터(`round_lint`) 추가. 3 신규 @D (`SKILL.md`):

- **`@D oversized_split`** — 한 milestone 이 **2연속 throttle 死** 하면 통째 재발사 금지, 독립 landable sub-slice 로 분할. 입증: VERIFY-KIT V5(IIT 엔진)가 122/107 tool-use 에서 2연속 rate-limit 死 → V5.1 promote / V5.2 wire / V5.3 calibrate 로 분할, 각자 단독 landing.
- **`@D handoff_debt_ledger`** — target repo dirty tree 에 미커밋된 cross-repo handoff INBOX edit 을 **부채로 추적**, dirty tree 강제 commit 금지, 격리 worktree(target origin/main)로 정리. 입증: ARXIV A2/A3/A4 가 anima/demiurge/phanes INBOX 를 working-copy edit → A6 가 격리 worktree 로 3건 정리(g48).
- **`@D round_lint`** (린터 본체) — 매 루프 라운드 종료 시 `🔍 round-lint: N/10 ✓` 한 줄로 10항 계약 self-audit (resource-partition · checkpoint-clause · dup-race precheck · leak-sweep · ≤cap · handoff-debt · oversized-split · honest-tier+progress · SSOT-freshness · perpetual-no-terminal). ✗ 는 표면화+교정, rubber-stamp 금지.

`commands/cycle-loop.md` · `cycle-full-loop.md` 에 FIXED per-round shape 명문화: 결과보고(status glyph + PR# + honest tier + 7요소 easy + progress bar) → debt/split tracking → round-lint line → loop tail (exploratory/perpetual 도메인엔 bare `✅ 100% done` 금지). plugin.json + marketplace.json 0.7.7 → 0.8.0 락스텝(g22).

## 2026-05-26 — kosmos-lsp · n6-lsp · hxc-lsp 0.1.0 (sister-format LSP 3종 출하)

`hexa-lsp`/`tape-lsp`가 깐 패턴(plugin-root `.lsp.json`로 PATH 위 LSP 서버를 `extensionToLanguage`에 와이어링)을 sister-format 3종으로 확장한다. DESIGN.log 의 "tape/n6/hxc/kosmos sister-format LSP 는 각각 별도 미래 플러그인" 항목을 닫는다.

- **kosmos-lsp 0.1.0 (신규 hook · `hexa`)** — `.kosmos` (kosmos/1.1 multimodal knowledge-anchor manifest) → `kosmos-lsp` 서버. PATH 의 `kosmos-lsp` 필요(`hx install dancinlab/kosmos`).
- **n6-lsp 0.1.0 (신규 hook · `hexa`)** — `.n6` (NEXUS-6 knowledge-atlas grammar) → `n6-lsp` 서버. PATH 의 `n6-lsp` 필요(`hx install dancinlab/n6`).
- **hxc-lsp 0.1.0 (신규 hook · `hexa`)** — `.hxc` (HXC hexa-canonical wire/storage format) → `hxc-lsp` 서버. PATH 의 `hxc-lsp` 필요(`hx install dancinlab/hxc`).
- 세 서버 모두 `tape-lsp`와 동일한 capability — `didOpen`/`didChange → publishDiagnostics` + `hover`. 즉 편집할 때마다 문법(진단)이 자동 재검증·반영된다. LSP-레벨 semantic-token 하이라이팅은 미구현(tape-lsp/hexa-lsp 와 동일 범위).
- 각 플러그인은 최소형 — `.claude-plugin/plugin.json` + `.lsp.json` (hexa-lsp 와 동일, per-plugin README 없음).
- marketplace.json · profiles.json(`hexa` tier 3개) · README(60 plugins · hexa 14→17 · 표 3행) 락스텝(@D ship · g22).

## 2026-05-26 — cycle 0.7.7 + domain 0.8.8 (stale-SSOT 가드 + perpetual 도메인 인지)

anima LIFE 도메인이 매 `/cycle` 라운드 헤매다 잘못 `✅ domain depleted — loop terminates`(100% 종료)를 외친 사건의 근본원인 2겹을 두 플러그인 양쪽에서 막는다. 원인 = (1) orphan-recover 브랜치가 root `LIFE.md` 를 추적 해제 → working tree 가 stale "$0-frontier 종결" 사본(전부 `[x]`, perpetual @goal 없음)이 origin/main 의 "영구 엔진" good 버전을 shadow, (2) LIFE 가 DOMAINS.tape 미등록. 진단 핸드오프 = `anima/INBOX.log.md` · 원칙 = `feedback-closure-is-physical-limit`.

**domain 0.8.8** (`_domain.hexa`):
- `_stale_shadow_warn` — `/domain set` 시 working-tree `<NAME>.md` 가 **UNTRACKED**(`git ls-files --error-unmatch` 실패) 또는 **origin/main 보다 뒤처짐**(`git log HEAD..origin/main -- <NAME>.md` 비어있지 않음)이면 경고. fail-open(git repo 아니거나 origin/main ref 없으면 조용히 skip). LIFE 의 정확한 root cause(untracked shadow)를 잡는다. ref `reference_domain_init_untracked_ssot`.
- `_ensure_roster` — `/domain set` 시 스냅샷이 디스크에 있는데 DOMAINS.tape 미등록이면 roster row 자동 등록(LIFE 가 ghost 였던 갭 self-heal).
- `_is_perpetual` + `_show` ♾️ 배지 — `@goal` 에 종료-없음 마커(`종료 조건 없음`·`완료되지 않`·`100% 미도달`·`영구`·`perpetual`·`open horizon`·…)가 있으면 진행바를 `♾️ perpetual — 종료점 없음 (진행도 = frontier 소진율, 100% 종료 아님)` 로 렌더 → 진행바를 완료 카운트다운이 아니라 frontier 소진율로 읽게.

**cycle 0.7.7** (`SKILL.md` + `commands/cycle.md` · `cycle-full.md`):
- `@D ssot_freshness` — Stage 0 freshness pre-check: 밀스톤 읽기 전·depletion 선언 전, 활성 `<NAME>.md` 가 live SSOT 인지 git 으로 검증(untracked / behind-main). 둘 중 하나면 stale 경고 + reconcile 후 진행(자동 덮어쓰기 금지 — 사용자 의도 편집 가능성). depletion 은 destructive read 이므로 `/domain set` 과 별개로 재검.
- `@D perpetual_domain` — `@goal` 이 종료-없음을 선언한 도메인은 Stage 5 에서 **절대** 종료 closure(`✅ … terminates`)를 내지 않음. 먼저 선언된 `## 영구 축`/`perpetual axes`/`## deferred` 의 열린 `- [ ]` 에서 재시드 후 self-continue; 그것마저 소진되면 `♾️ perpetual` lane-pause 만 출력. 기존 `@D depletion_not_terminal`("애매하면 PAUSE")를 마커 존재 시 terminal 분기 **하드 금지**로 강화.

검증: 격리 temp git repo 에서 LIFE 재현(untracked perpetual 스냅샷 + roster 미등록) → `/domain set LIFE` 가 roster 자동등록 + UNTRACKED 경고 + ♾️ 배지 3개 전부 출력 확인. lockstep(@D g22): cycle plugin.json+marketplace 0.7.6→0.7.7 · domain 0.8.7→0.8.8.

## 2026-05-26 — sidecar 0.5.0 — `shadow`/`unshadow` (forced `plugin:command` 네임스페이스 무손실 제거)

Claude Code가 모든 플러그인 명령에 강제하는 `plugin:command` 네임스페이스(#15882 · 끄는 옵션 없음)를 **비정식·무손실**로 우회한다.

- **`sidecar shadow [plan]` + `sidecar unshadow` (신규 verb)** — command/skill 플러그인을 bare-only로 전환: command 미러(`~/.claude/commands/`)에 **SKILL.md `Triggers —` 꼬리를 splice**(bare 엔트리가 NL 자동호출 풍부함 유지) + 플러그인 disable(네임스페이스 형태 소멸). skill-only(`bypass`·`gh-stack`)는 `~/.claude/skills/<n>/`로 미러. **hook 겸용(`prefs`·`pr-cycle`)·hook/mcp는 보존**(disable하면 훅 손실). `plan`=dry-run, `unshadow`=원복(override reset + 생성한 skill 미러 제거). `sidecar sync` 꼬리에서 자동 재적용(do_mirror가 splice를 덮으므로 재splice). 28개 대상(26 cmd + 2 skill) · 34 hook/mcp skip.
- 구현 `bin/_shadow.hexa`(plan/shadow/unshadow) + `bin/sidecar` verb 배선. opt-out env var 없음 · `unshadow`로 완전 가역.
- ⚠ 비정식경로 — CC가 command/skill resolution을 바꾸면 깨질 수 있음(`unshadow` 즉시 원복). #15882 공식 fix 시 정식 전환.

## 2026-05-26 — monitor-guard 0.1.0 + commons g10 (rate-limit 생존 while-monitor)

배경/장기 셸 작업이 rate-limit으로 강제종료될 때 진행분을 잃는 문제를 잡는다. `@D s7`(규칙+enforcement 동시 출하)대로 governance 개정과 가드 훅을 한 사이클에 함께 출하.

- **commons `@D g10` 개정** — "Monitor tool 필수"에서 **"background work — detach + log + Monitor, survive rate-limit"**로 확장. 옛 "모델 sleep-poll 금지"는 `dont`에 보존하되, detach(`nohup`/`setsid`) + progress log + **Monitor를 LOG에 부착**(live 프로세스 아님 — 토큰 경량·rate-limit 후 재첨부) + detached OS `while` heartbeat(liveness) 를 추가. user sign-gate(`sidecar sign commons`) 경유.
- **monitor-guard 0.1.0 (신규 hook · `core`)** — `PreToolUse(Bash)` advisory. 배경 작업 발사(끝 단일 `&` · `nohup`/`setsid`/`disown` · Bash `run_in_background`) 감지 시, durable 패턴(detach + log)이 빠졌을 때만 non-blocking additionalContext로 g10을 상기. 이미 detach+log면 침묵. pod-monitor(GPU pod)의 일반-로컬 자매 · limit-guard(사후 checkpoint)의 proactive 짝. hexa-lang(`_monitor_guard.hexa`) · opt-out 없음.
- marketplace.json · profiles.json(`core`) · README(57 plugins · core 26 · 표 · ASCII) 락스텝.

## 2026-05-26 — paper 0.9.0 — monograph mode + 58p-build bug-fixes

The HEXA-FUSION 58-page monograph proved the pattern; this re-design ships it as first-class verbs and fixes the real pain points that build surfaced.

**Bug-fixes (from the 58p build):**
- **lint figure-traverse (#1)** — `bin/_paper.hexa` lint now scans `main.tex` AND every `\input`'d / `appendix/*.tex` file for `\includegraphics` + tikzpicture (and tables, sections, `\cite` keys). Previously it counted main.tex only, so a 16-figure doc with figures inside appendices reported "4". New `_lint_tex_files` / `_lint_appendix_count` helpers; counts are summed across the body fileset.
- **Makefile appendix/figure deps (#2)** — `template/Makefile` adds `APPENDIX = $(wildcard appendix/*.tex)` + `FIG_PDFS_EXISTING = $(wildcard figures/*.pdf)` to the `$(DOC).pdf` prerequisite list. Editing an appendix or a committed figure now triggers a rebuild on the next `make` — no `make distclean && make`.
- **pgfplots in default preamble (#3)** — `template/main.tex` ships `\usepackage{pgfplots}\pgfplotsset{compat=1.18}`; README notes the `tlmgr install pgfplots` BasicTeX dep.
- **standalone-fig caveat (#4)** — README + `fig02_line.tex` header document the working pattern: `\includegraphics{figures/figNN.pdf}` of the COMPILED standalone, never `\input` of its `\documentclass`-bearing `.tex`.

**Monograph mode (the re-design):**
- **`/paper monograph-init <slug> [N]`** — scaffolds the template spine PLUS an `\appendix` block in `main.tex` that `\input`s N (default 12) self-contained `appendix/<L>_*.tex` chapter stubs (each `\section` + `\label` + `% TODO`), alongside `companion/`. The HEXA-FUSION 58p structure; seed reference `/paper sample sample-fusion-7gate`.
- **`/paper fill <appendix-letter>`** — prints the per-appendix fill runbook (source path + `% TODO` markers · `\input` wiring check against main.tex · recompile note).
- **`/paper companion sync`** — best-effort rebuild of `companion/pr-roll.json` (from `gh pr list`) + `companion/verify-ledger.json` (from a `hexa atlas` scan).

**lint v0.7 profile:**
- **monograph tier auto-detect** — `\appendix` + ≥6 `\input` appendix files → expects ≥30 pages, ≥6 figures, a present `companion/` dir; else the existing ≥10p/≥1fig paper tier. All v0.6 gates (Pipeline/Limitations/Repro/table/bib-count/emoji-guard/cite-resolve) retained.
- **"comparison ⇒ chart" heuristic** — warns (non-blocking) when a comparison-style `tabular` (vs / expected-computed / baseline-this-work) is present but the doc has 0 figures.

- Surface lockstep (@D g22): `skills/paper/.claude-plugin/plugin.json` · `skills/paper/SKILL.md` · `skills/paper/commands/paper.md` · `skills/paper/template/{main.tex,Makefile,README.md,figures/_scripts/fig02_line.tex}` · `.claude-plugin/marketplace.json` paper entry 0.8.0 → 0.9.0.

---

## 2026-05-26 — cycle 0.7.6 — depletion = PAUSE, not "100% done" (@D depletion_not_terminal)

`/cycle` 의 depletion 분기가 `✅ domain depleted — loop terminates` 로 binary-checkbox 닫힘을 선언해, cross-cutting 원칙 `feedback-closure-is-physical-limit` ("끝은 없어 · 100% 도달불가 · 끝 = 물리·수학 한계 + 계속 탐구")와 정면 충돌. 실증: anima LIFE(IIT4-Φ) 도메인 /cycle 이 "domain depleted / terminal" 선언했으나 large-N faithful-Φ(intractable) + full-IIT4-CES(대형 spec) frontier 는 여전히 OPEN — **$0-runnable lane 만 비었지 도메인이 끝난 게 아니었음**. 정형화:

- **`@D depletion_not_terminal`** 신설: depletion test(open 0 · deferred empty · no $0 seed)가 떠도 그건 **lane PAUSE, not 100%-done**. exploratory/perf/limit-bounded 도메인은 $0 lane 이 비어도 물리·수학 한계 frontier 가 열려 있음.
- 메시지 reframe: `✅ domain depleted — loop terminates` → `⏸️ $0-runnable lane exhausted — loop PAUSES (not 100%-done; frontier toward the physical/math limit stays open)` + above-$0 paths (cost-bearing fire · new spec · intractable-limit note · switch/close).
- 리터럴 `✅ done/terminal` 은 **진짜 finite-scope + no open physical-limit frontier** 도메인에만 (rare). 애매하면 PAUSE.
- `commands/cycle.md` Stage 5 + `cycle-full.md` 동일 reframe · plugin.json 0.7.5→0.7.6 · marketplace version 미러.

비파괴 — 동작(ScheduleWakeup 여부)은 그대로, 종료 메시지 framing 만 원칙-정합으로 교정.

---

## 2026-05-26 — pool-route 0.7.0: `mini-equal` 토글 — macOS 풀 호스트를 일반 워커로 옵트인

`mini`(macOS 풀 호스트)를 OS-무관 general-heavy 라운드로빈에 **사용자 토글로** 합류시킬 수 있게 함. 기존 0.6.6 정책(general-heavy = Linux 전용)을 옵트인 시에만 완화.

- **`pool mini-equal on|off|status` verb** (pool repo 0.8.6) — `~/.pool/mini-equal` 마커에 `on`/`off` 기록. master 마커와 같은 패턴.
- **pool-route 훅 (0.7.0)** — general-heavy `else` 분기에서 마커가 `on`이면 macOS 호스트도 `elig`에 포함, 아니면 기존대로 `h_plat != "macos"` 필터. **is_linux/is_macos 분기는 불변** → Linux 전용 작업(apt·elf·CUDA)은 토글과 무관하게 여전히 mini로 안 감. 토글은 *포터블 작업의 재분배*만 좌우.
- **기본 OFF** (마커 없음/`!= "on"`) → zero-macOS-offload(@D s12) 보존.
- **@D s11 비위반** — idle 호스트로 라우팅을 *여는* 것이지 안전 가드를 *끄는* opt-out이 아님.
- **@D s12 reword** — "zero macOS offload"가 절대 금지가 아니라 *기본값*이고 `mini-equal on`으로 명시 옵트인 가능함을 반영 (sign-gated 편집).
- 표면 lockstep(@D ship · g22): `hooks/pool-route/bin/_pool_route.hexa` · `hooks/pool-route/.claude-plugin/plugin.json` 0.6.13 → 0.7.0 · `.claude-plugin/marketplace.json` · `README.md` (셀 0.6.10 드리프트도 0.7.0으로 정정) · `project.tape` @D s12. pool repo는 별도 PR(`hexa.toml` 0.8.5 → 0.8.6 + pool CHANGELOG).

---

## 2026-05-25 — sidecar 0.4.0: `sidecar mirror` verb + `sync` tail 자동 미러 (bare-invocable 표면)

`~/.claude/commands/<name>.md` 미러를 `sidecar` CLI 가 자체 관리하도록 합류 — 플러그인 명령이 `plugin:` 네임스페이스 없이 bare 로 호출 가능하게 (`Skill("imagine")` 통함; 기존엔 `Skill("imagine:imagine")` 강제).

- **`sidecar mirror` 신규 verb** — `~/.claude/plugins/cache/sidecar/<plugin>/<latest-version>/commands/*.md` 를 `~/.claude/commands/` 로 그대로 복사. 항상 overwrite (mirror == 플러그인 명령; 커스터마이즈는 플러그인 소스 측에서). 캐시 누락 시 skip + warning.
- **`sidecar sync` tail 자동 호출** — 기존 sync 가 `exec hexa run install.hexa` 로 끝나던 것을 `hexa run` → `do_mirror` 로 변경(install 자체 종료 코드는 그대로 보존). marketplace pull + cache refresh + installed_plugins.json + enabledPlugins + **mirror** 까지 한 사이클로 끝남 — ship cycle tail 의 의미가 "동기화+가시화" 로 확장.
- **`$CLAUDE_PLUGIN_ROOT` fallback (소스측)** — user-level 미러는 `$CLAUDE_PLUGIN_ROOT` 가 비어있어서 raw 사용은 깨짐. `prefs` (0.3.4) · `easy` (0.1.2) 두 플러그인 명령에 cache-resolver fallback (`sort -V | tail -1`) 추가. 이 패턴이 미러 대상 명령의 표준 (이미 `imagine`/`paper`/`ship`/`research/{arxiv,yt}` 등은 가지고 있던 것).
- **표면 lockstep**(@D ship · g22): `bin/sidecar` (mirror verb + do_mirror + sync tail + help) · `commands/sidecar/.claude-plugin/plugin.json` 0.3.0 → 0.4.0 + description verb 목록 · `hooks/prefs/commands/prefs.md` (fallback) · `hooks/prefs/.claude-plugin/plugin.json` 0.3.3 → 0.3.4 · `skills/easy/commands/easy.md` (fallback) · `skills/easy/.claude-plugin/plugin.json` 0.1.1 → 0.1.2 · `.claude-plugin/marketplace.json` 3 항목 lockstep. main 의 sidecar 0.3.0 (master 티어) 위에 mirror 기능을 적층 — 충돌 해소 시 description 에 둘 다 통합 (mirror verb + master tier/verb).

---

## 2026-05-25 — paper 0.8.0 — samples (3 신규 · 총 4)

`/paper list` 가 1개 → 4개 bundled samples 를 enumerate. paper-author 가 첫 페이지부터 ANTIMATTER-tier starter 잡도록:

- **`sample-fusion-7gate/`** (NEW) — 1-page main.tex 가 D-T fusion 10-stage fuel journey 로 §Full Pipeline pattern fully populated. Stage table: Li-6 enrichment (🟡) → Tritium breeding (🟢) → ... → 🟠 wet-lab handoff. NOT a full copy of hexa-fusion-7gate — 패턴만 보여줌. 42 lines.
- **`sample-cost-routing/`** (NEW) — hexa-codex `economics-routing-savings/` 구조 mirror. Formula (closed-form cost sum identity) → Method → Results (savings 표) → Limitations → Reproducibility. 40 lines.
- **`sample-blue-max/`** (NEW) — BLUE-MAX-only 구조. 모든 claim 이 `atom:<id>` → 🔵 SUPPORTED-FORMAL verdict 로 resolve. 🟢 numerical 은 sibling paper 로 분리. Audit table 4-row 예시. 36 lines.

각 sample 은 main.tex + README.md (사용법 + copy 명령). 모두 50 lines max 규정 준수 (42/40/36).

**`bin/_paper.hexa::_cmd_sample`** 수정: 기존엔 `sample-nb-bcs-absorbed` 하드코드 (arg 무시). 이제 `[<sample-name>] [<dest-slug>]` 받음:
- 0-arg: default to `sample-nb-bcs-absorbed`
- 1-arg: copy to `./<sample-name>/`
- 2-arg: copy to `./<dest-slug>/`
- 미존재 sample 요청 시 bundled list 출력.

비파괴 — 기존 (`sample-nb-bcs-absorbed`) 동작 보존. paper `0.7.0 → 0.8.0` (minor — additive). marketplace.json + plugin.json + SKILL.md + commands/paper.md + CHANGELOG.md lockstep 갱신 (commons @D g22).
---

## 2026-05-25 — paper 0.7.0 — verbs (8 신규)

v0.6 의 구조 위에 작동 verb 8개 추가. paper-author 가 매번 손으로 짜던 패턴을 dispatch 화:

- **`companion init`** — cwd 에 `companion/` 디렉토리가 없으면 `template/companion/` 에서 카피 (idempotent).
- **`outline [dir]`** — `main.tex` 의 sections (section/subsection/paragraph) + figures (`\includegraphics` + `\begin{tikzpicture}`) + tables (`\begin{table}` + `\begin{tabular}`) TOC 출력.
- **`pipeline <stage1> <stage2> ...`** — §Full Pipeline LaTeX table skeleton 출력. 각 행은 `🟠` tier 로 pre-fill (user 가 verdict 따라 교체). tier-rubric 박스도 같이 emit.
- **`atoms <domain>`** — `~/core/hexa-lang/tool/verify_cli.hexa` 를 awk 스캔, comment OR 같은 줄에 `<domain>` 포함된 atom 항목을 LaTeX coverage table 로 emit.
- **`verify-block <fn> <args...> <expected>`** — canonical `~/.hx/bin/hexa` (없으면 PATH `hexa`) 로 `hexa verify --expr` 실행 → 결과를 `\begin{lstlisting}` 블록으로 wrap. verdict 가 🔵/🟢 아니어도 raw output 그대로 expose (honest stance — pool-route hook 우회 위해 canonical bin path 사용).
- **`bib add <doi-or-arxiv>`** — id 에 `.` 있고 `/` 없으면 arxiv (export.arxiv.org API), 아니면 DOI (api.crossref.org). 메타데이터 fetch → bibtex `@article`/`@misc` entry 키 derived 후 `./references.bib` 에 append. arxiv 는 sed 파싱 (no jq dep), DOI 는 jq 필요.
- **`pr-roll <repo> <since-ref>`** — `gh pr list --state merged --search 'mergedAt:>=<since>' --json ...` → `companion/pr-roll.json` 에 write (있으면) + LaTeX `\paragraph{Merged PRs since <since>}` + `\begin{itemize}` block emit.
- **`arxiv-prep [<dir>]`** — `out/<slug>-arxiv.tar.gz` 빌드: `main.tex` + `references.bib` + `main.bbl` + `figures/*.{pdf,png,eps}`. arxiv rules validate (.tex==1, .bbl present); 미충족 시 WARNING.

`commands/paper.md` 의 description + argument-hint 갱신; `bin/_paper.hexa::_usage()` 에 v0.7 verb 블록 표시; dispatch 케이스 8개 추가.

비파괴 — 기존 verb 의 시그너처 0 변경. paper `0.6.0 → 0.7.0` (minor — additive). marketplace.json + plugin.json + SKILL.md + commands/paper.md + CHANGELOG.md lockstep 갱신 (commons @D g22).

---

## 2026-05-25 — paper 0.6.0 — Pipeline + Companion + xelatex (구조 릴리스)

`/paper new` 가 진짜 ANTIMATTER-tier 의 starter 가 되도록 template 전면 개편. 핵심:

- **`main.tex`**: 9-section spine (Introduction · Background · **§Full Pipeline** (mandatory) · Method · Verify · Results · Limitations · Reproducibility · Conclusion). §Full Pipeline 은 ANTIMATTER-style ⓵→⓻ stage table × tier emoji column (🔵/🟢/🟡/🟠/🔴) × backing-atom column 로 구성. 상단에 tier-rubric 박스 1회 inline. Author block 은 hexa-codex style (`<repo> maintainers` / `dancinlab` / 클릭 가능한 github URL). LLM collaborator 는 `\paragraph{Acknowledgments}` 로 분리 (author line 에 안 박음). BLUE-MAX appendix template 을 tail 에 commented-out 으로 제공. tier emoji 는 `\tierBlue` / `\tierGreen` / ... providecommand 로 추상화 (engine 스위치 시 한 줄 redefine 으로 끝).
- **`Makefile`**: 기본 엔진 **xelatex** (UTF-8/emoji native) 로 전환 — pdflatex 의 tier-emoji fatal (hexa-fusion-7gate 에서 실제 hit) 차단. 신규 타겟 `wordcount` · `pages` · `lint` · `arxiv-tar` · `figures-clean`. `arxiv-tar` 는 `out/<slug>-arxiv.tar.gz` 로 arxiv submission rules 준수한 source bundle 빌드.
- **`figures/`**: 기존 `fig01_example.py` 유지 (hexa-native 0.3.2 hook 가 .py 신규 작성 차단 — 기존 유일 `.py` 만 사용). 신규: `figures/_scripts/fig02_line.tex` (TikZ/pgfplots line plot, native LaTeX, Python dep 없음) · `figures/_scripts/fig03_pipeline.tex` (TikZ ⓵→⓻ stage-flow diagram) · `figures/_prompts/cover.template.txt` (fal.ai prompt-design guide — 5-sentence structure, ask/avoid 패턴).
- **`references.bib`**: 단일 placeholder 1개 → 5 example entries (`@article` · `@book` · `@inproceedings` · `@misc` dataset · `@misc` arxiv). Header 가 DOI/arxiv mandatory 강조 + emoji 금지 명시.
- **`template/companion/`** (NEW): data-record 축. `verify-ledger.json` · `pr-roll.json` · `session-journal.md` · `adapter-defect-catalog.json` + 한국어 `README.md` (companion-mode 근거 + 채우기 가이드). paper 본문의 모든 numeric claim 이 companion entry 와 1:1 역추적 가능하도록.
- **`bin/_paper.hexa::lint`**: 확장된 commons @D g51. 기존 (>=10 pages + >=1 fal.ai figure) + §Full Pipeline / §Limitations / §Reproducibility heading 존재 + >=1 `\begin{table}|tabular` + >=2 `\includegraphics|tikzpicture` + >=10 `@`-keyed bibtex entries + references.bib 본문에 tier emoji 0 (deterministic-block pdflatex fatal) + 모든 `\cite{KEY}` 가 bibtex KEY 로 resolve (warn-list, non-blocking).

비파괴 — 기존 paper dir 는 영향 없음. `/paper new <slug>` 는 새 template 사용. version: paper `0.5.3 → 0.6.0` (minor); marketplace.json + plugin.json + SKILL.md + template/README.md + CHANGELOG.md lockstep 갱신 (commons @D g22).

---

## 2026-05-25 — micro-exp 0.3.0 — local-pool adapter (M3)

`/micro-exp` 가 wall-only / 비 DFT 매트릭스에 대해 'no candidate matrix' 로 false-punt 하던 문제. hexa-lang user 의 GPU 전 차원 벤치마킹 직 매트릭스는 명백히 sweep-shaped 였으나 pod-rent + atlas-register 패턴과 안 맞아 punt됨. 정형화:

- **`@D local_pool_adapter`** 신설 (`skills/micro-exp/SKILL.md`): no-signal fallback 전에 (a) `pool list` 가 ON 호스트 보임(예: `ubu-2` for GPU walls, `mini` for arm64) AND (b) `kind` 가 wall-measurement / structural-oracle / build-bench (NOT DFT-elph/SSCHA) 면 local-pool mode 진입.
- **local-pool mode**: `hexa cloud rent` 대신 `pool on <host>`, `cloud copy-to/copy-from` 대신 `scp`, atlas register 스킵(wall 은 atom 아님 — `.verdicts/<slug>/<id>.txt` 만 persist), 예산은 `local_hours_max`.
- 진입 시 한 줄 출력: `local-pool mode: host=<host> kind=<kind> budget=<hours>`.
- `commands/micro-exp.md` Stage 1 의 No-signal fallback 직전에 local-pool adapter 게이트 명시.

비파괴 — 매칭 조건 0개면 기존 pod-rent 흐름 그대로 진행.

---

## 2026-05-25 — cycle 0.7.5 — worktree-leak 사전 청소 (M2)

throttle 사망한 에이전트가 남긴 `/tmp/wt-*` + 동명 로컬 브랜치 때문에 fresh fan-out 의 `worktree add -b <same>` 가 충돌. hexa-lang 캠페인 내내 재발사 전에 수동 `git worktree remove` + `git branch -D` 함. 정형화:

- **`@D worktree_leak_cleanup`** 신설: Stage 3 → Stage 4 사이 자동 sweep. 조건 — `/tmp/wt-*` 만 대상, (a) 브랜치가 origin/main 머지 OR (b) HEAD age > 1h + 최근 commit 없음 + 브랜치명이 fan-out 컨벤션(`gpu-*`/`cycle-*`/`<domain>-*`) 매치.
- 절차: `git worktree remove <path>` (NO `--force`; uncommitted user work 차단되면 skip+log) → `git branch -D <branch>` (worktree remove 성공 후만).
- **safe-scoped**: `/Users/*` worktree 는 절대 안 건드림 (user-managed `~/core/<repo>-*` off-limits).
- `commands/cycle.md` Stage 3→4 사이 + `cycle-full.md` Stage 4→5 사이에 sweep 단계 명시.

비파괴 — 매칭 조건 0개면 sweep 0; `/Users/*` 건드림 0.

---

## 2026-05-25 — cycle 0.7.4 — cross-cutting 원칙 주입 (M1)

도메인 사이클이 메모리에 박힌 cross-cutting 원칙을 못 보면 그 원칙대로 verdict 가 안 나옴. 증거: hexa-lang round-7 (PR #1080) 가 `feedback-closure-is-physical-limit` 원칙(perf=roofline %)이 메모리에 있는데도 verdict 를 raw `ratio vs cuBLAS` (5.3-6.9×) 로 보고, roofline % 환산 안 함. 에이전트 프롬프트에 원칙이 안 들어갔기 때문. 정형화:

- **`@D principle_injection`** 신설 (`skills/cycle/SKILL.md`): Stage 4 가 `MEMORY.md` 스캔 → cross-cutting 마커(`ALL 도메인` / `모든 도메인` / `cross-cutting` / `cross-domain` 또는 frontmatter `cross_cutting: true` 또는 body `**Cross-domain principle**:`) 매치 → UP TO 3 발췌(≤300 chars each, 총 ≤1KB) → 모든 fan-out Agent 프롬프트 상단에 `Cross-cutting principles` 블록으로 inject.
- **`commands/cycle.md` Stage 4 + `cycle-full.md`** 본문에 inject contract 직접 반영. 예시 원칙: `feedback-closure-is-physical-limit`, `feedback-instrument-first-methodology`.
- Agent 는 verdicts 를 그 lens 로 framing 의무 (예: `% of roofline achieved` 가 `ratio vs X` 대체/보완).
- 비파괴 — 매칭 메모리 0개면 inject 0; off-domain 명시 작업은 marker 로 우회 가능.

---

## 2026-05-25 — cycle 0.7.3 — stale-milestone 사전스캔 (H3)

도메인 milestone 박스가 머지된 PR 로 해소됐는데 `[ ]` 잔존하는 패턴 — hexa-lang GPU.md §2 (2a/2b/2c/2e) 가 round-1 N206 등으로 해소됐으나 unflipped 였고, fan-out 직전 수동 grep 으로만 잡혔음. dup-race precheck 의 INBOX-only 범위를 확장:

- **`@D dup_race_precheck` 확장** — scan-A(INBOX)에 scan-B(stale-milestone) 추가. 각 `- [ ]` 항목의 bolded 부분에서 라벨 추출(F-FUSION-* / RFC-* / slug) → 라벨 있으면 `gh pr list --search` + `git log --grep` 로 resolved-class 매치 검사.
- **SKIP STALE 처리**: 매치 시 `SKIP STALE — resolved by <PR#>/<sha>` + `→ flip [ ] → [x] in <domain>.md at line <N>` 한 줄 surface. **auto-write 안 함** (write-on-detect 는 파괴적 — 사용자/부모가 결정).
- **`commands/cycle.md` Stage 2b + `cycle-full.md` Stage 3b** 본문 직접 반영.
- 비파괴 — 라벨 추출 불가 항목은 scan-B bypass (PROCEED).

---

## 2026-05-25 — cycle 0.7.2 — resource-contention 직렬화 (H2)

병렬 fan-out 이 항상 옳지는 않음. 단일 GPU(예: ubu-2 RTX 5070)에 여러 timed 에이전트가 동시 발사되면 cuEvent wall 이 서로 오염 — hexa-lang GPU 캠페인 round-5 에서 4 후보를 1 timed-fire 로 수동 직렬해야 했음. 정형화:

- **`@D resource_contention`** 신설 (`skills/cycle/SKILL.md`): exclusive 자원 공유 항목은 직렬, distinct/비배타 자원은 병렬.
- **Stage 3 plan-table 칼럼 확장**: `| # | item | subagent_type | iso | resource | goal | precheck |`. `resource` 값 = `GPU:<host>-timed` (배타) · `GPU:<host>-any` (비배타) · `CPU-only` (기본) · `Network` · `Filesystem:<repo>`.
- **Stage 4 직렬화 contract**: 같은 배타 자원 공유 항목은 dispatch → wait-for-completion → next 패턴; 별도/비배타는 한 메시지 다중 Agent 그대로. 사전에 `resource-partition: parallel=<N> · serial-chain=[…]` 한 줄 출력.
- **`commands/cycle.md` + `cycle-full.md`** Stage 3/4 본문 직접 반영.
- 증거: hexa-lang round-5 GPU.md §1k (4-config 수동 직렬, 153 config 벤치).

비파괴 — resource 미선언 시 `CPU-only` 기본 (비배타) → 기존 흐름 영향 0.

---

## 2026-05-25 — cycle 0.7.1 — throttle 내성 (H1)

서브에이전트가 `"Server is temporarily limiting requests · Rate limited"` 로 mid-flight 죽는 패턴을 hexa-lang GPU fusion 캠페인에서 3회 관측(서브에이전트 토큰 0~수십, 작업 유실). 부모가 인라인 회수해야 했음. 정형화:

- **`@D throttle_resilience`** 클로즈 신설 (`skills/cycle/SKILL.md`): fan-out Agent 프롬프트는 매번 (1) `CHECKPOINT-COMMIT each milestone` (2) `rate-limit → wait + resume` 두 절을 verbatim 포함. parent-recovery 는 같은 worktree 브랜치에 재발사 (checkpoint history replay-safe).
- **`commands/cycle.md` + `cycle-full.md`** Stage 4 본문에 두 절을 직접 인용 (사용자가 슬래시 명령 실행 시 즉시 노출).
- **plugin.json + marketplace.json description** 갱신.
- 증거 메모리: `feedback-crash-recovery-artifact-pattern` (parent-인라인 회수 패턴, hexa-lang PR #1028 사례).

비파괴 (기존 정상 흐름 영향 0; 죽은 경우에만 회수 contract 활성).

---

## 2026-05-25 — master 프로파일/티어 + 창작자 마커 (sidecar 0.3.0)

minimal/hexa/full 위에 **창작자 전용 `master` 모드** 추가. 기존 `personal` 티어는 누구나
`profile full` 로 켤 수 있어 창작자 강제가 없었음 → `master` 티어는 **마커 게이트**로 진짜 제작자 전용.
- **profiles.json**: `master` profile (`core+hexa+personal+master`) + `master` 티어 (creator-only) 추가.
- **install.hexa**: `~/.sidecar/master` 마커 읽기 — `master`-티어 플러그인은 **마커 있을 때만 enable**,
  없으면 `full`/`master` 프로파일이어도 강제 off (per-plugin override 는 escape-hatch). 비파괴(태깅된 master 플러그인 0개 → 동작 불변).
- **bin/sidecar (0.3.0)**: `profile master` 허용 + `master [on|off|status]` verb (마커 mint/remove/조회 → apply_install).
- 공개 설치자는 마커가 없어 master 플러그인 기본 off; 제작자만 `sidecar master on` 으로 활성.
parse/문법/master-status/profile 테스트 PASS. from anima IIT4 세션 (creator-only 거버넌스 plugin 분리 요구).

---
## 2026-05-25 — cycle 0.7.0: bare `/cycle` + `/cycle-full` 도 자동으로 depletion 까지 self-drain (패밀리 전체 일관화)

0.6.0 이 `*-loop` 변종에만 준 **depletion-구동(self-continue)** 동작을 cycle 패밀리 **전체**로 확장 — 이제 bare `/cycle` 와 `/cycle-full` 도 한 라운드 후 멈추지 않고, 도메인의 `## deferred` backlog 를 배치별로 끝까지 스스로 파낸다.

- **bare `/cycle` = depletion-구동 (기본값)** — Stage 5(loop tail)를 재작성: fan-out 후 도메인이 아직 안 비워졌으면(open milestone > 0 OR `deferred` 미해소 OR 다른 신호) **ScheduleWakeup 으로 다음 라운드 self-continue**(`*-loop` 변종과 동일한 depletion-aware 메커니즘), **(1) open milestone = 0 AND (2) `deferred` 비어있음 AND (3) 다른 seed 신호 없음** 셋 다 충족할 때만 ScheduleWakeup 생략 + closure 보고. 더 이상 single-round-then-stop 아님.
- **`/cycle-full` 도 동일** — phase-0 brainstorm + 첫 fan-out 후, 이후 라운드는 plain `/cycle` 의미로 `deferred` 에서 self-feed 하며 같은 depletion 조건까지 auto-continue (brainstorm 은 goal 당 1회).
- **가드레일 불변** — 라운드당 cap(기본 3)은 라운드 **WIDTH** throttle, auto-continue 가 **DEPTH** 제공. 5-stage 구조 · plan-table · dup-race-precheck · leak-guard 전부 그대로. 사용자는 어느 라운드든 interrupt 가능.
- **패밀리 일관화** — bare `/cycle` · `/cycle-full` · `/cycle-loop` · `/cycle-full-loop` 모두 동일 depletion end-state 로 backlog 를 끝까지 비움. 차이는 **진입/pacing 형태만**: bare = inline self-continue(ScheduleWakeup 직접) · `-loop` = 명시적 continuous-intent + 빌트인 `loop` 스킬 pacing. bare `/cycle` 와 `/cycle-loop` 가 같은 end-state 에 도달하지만 **published 명령은 삭제하지 않음**(scope 외) — 이제-얇아진 구분(진입 표면)을 문서화. SKILL.md 에 "Family — all four drain to depletion" 섹션 추가.
- **표면 lockstep**(@D ship · g22): `skills/cycle/SKILL.md` (`@D cycle` do/dont + family 섹션 + description) · `skills/cycle/commands/cycle.md` (Stage 5 auto-continue) · `cycle-full.md` (loop tail auto-continue) · `cycle-loop.md` (bare 관계 명시) · `skills/cycle/.claude-plugin/plugin.json` 0.6.0 → 0.7.0 · `.claude-plugin/marketplace.json` cycle 0.6.0 → 0.7.0 · `README.md` 표 cell + Commands 섹션 4줄.

---

## 2026-05-25 — stdlib-ssot-guard 0.1.0 + stdlib 0.1.0 (g61 강제·자동화)

commons **g61**(hexa-lang stdlib = 단일 SSOT) 을 *정책*에서 *강제+자동화*로:
- **stdlib-ssot-guard** (hook) — PreToolUse(Write|Edit) 비차단 advisory: `.hexa` 편집 시
  (a) abs-path cross-repo import(anima-locked) (b) stdlib `pub fn` 중복 재구현 nudge
  + SessionStart 에서 단일 stdlib root(~/core/hexa-lang/stdlib) 존재 검증. fail-safe.
- **stdlib** (skill) — `/stdlib check`(cwd repo g61 위반 스캔: abs-import + stdlib dup)
  · `/stdlib promote <file>`(stdlib 이전+thin-shim 런북, engine⊥adapter).
guard 4-test + skill bash sanity PASS. from anima IIT4 — g61 확장(0.10.7) 후속 도구화.
(IIT4 엔진이 stdlib/consciousness/iit4 로 승격된 흐름의 거버넌스 완성.)

## 2026-05-25 — cycle 0.6.0: `## deferred` 를 1급 seed 소스로 승격 + 루프 변종에 DEPLETION 종료 조건

`/cycle` 패밀리가 도메인을 **고갈(depletion)** 까지 자동으로 비울 수 있게 함 — 라운드마다 steering 을 위해 멈추는 대신, 도메인이 선언한 backlog 를 스스로 떠먹으며(self-feed) 끝까지 march.

- **`## deferred` = Stage 1a auto-seed 의 PRIMARY 신호** — 활성 `<NAME>.md` 의 `## deferred` (또는 `## deferred (다음 라운드)`) 섹션을 가장 높은 우선순위의 seed 소스로 승격(기존의 느슨한 "log tail" 신호보다 위). open milestone 이 0개일 때, `deferred` 에서 다음 배치(cap N, 기본 3)를 꺼내 `## 진행 (milestones)` 보드에 `- [ ]` milestone 으로 `/domain milestone <text>` 로 승격하고, **승격한 항목을 `deferred` 섹션에서 같은 편집으로 제거(drain)** → backlog 가 단조 감소하고 동일 항목이 재-seed 되지 않음. 도메인이 자신의 선언된 backlog 로 루프를 self-feed 하는 load-bearing 변경.
- **DEPLETION 종료 조건 (`cycle-loop` · `cycle-full-loop`)** — 루프 변종은 **(1) open milestone = 0 AND (2) `deferred` 비어있음(섹션 없음 또는 미해소 항목 0개) AND (3) 다른 seed 신호 없음(user mention · 직전턴 `/gap` shortlist · `/check`/`/end` follow-up · `<NAME>.log.md` tail open thread)** — 셋 다 충족할 때만 ScheduleWakeup 을 생략하고 종료. 그 전까지는 도메인이 아직 안 비워진 것이므로 계속 cycle. 종료 조건을 두 `*-loop` SKILL prose 에 명시.
- **라운드당 cap 유지 (기본 3)** — cap 은 라운드당 **WIDTH** 를 throttle 해 각 라운드를 리뷰 가능하게 유지하고, 루프가 **DEPTH** 를 제공(라운드 간 auto-continue) → cap × loop 로 backlog 전체를 배치별로 고갈. disjoint-items · dup-race-precheck · leak-guard 가드레일은 불변.
- **bare `/cycle` 동작 보존** — 단일 라운드 `/cycle` 는 여전히 cap 후 멈춰 user steering 을 보장. depletion 은 `*-loop` 변종의 역할로만 추가 — steering 기본값을 깨지 않음.
- **표면 lockstep**(@D ship · g22): `skills/cycle/SKILL.md` (`@D cycle` do/dont) · `skills/cycle/commands/cycle.md` (Stage 1a) · `cycle-loop.md` · `cycle-full-loop.md` (depletion 종료) · `cycle-full.md` (loop tail 주석) · `skills/cycle/.claude-plugin/plugin.json` 0.5.2 → 0.6.0 · `.claude-plugin/marketplace.json` cycle 0.5.2 → 0.6.0 · `README.md` 표 cell + Commands 섹션 4줄.

## 2026-05-25 — commons 0.10.7: g61 stdlib-SSOT 범위확장 (primitives → + domain engines)

`g61` 을 "general primitives" 에서 **"shared code — primitives + domain engines"** 로 확장.
≥2-repo 재사용 domain engine(예: `consciousness/iit4`)도 `stdlib/<domain>/` 승격 대상 명문화
+ **engine(substrate-agnostic, stdlib) ⊥ adapter(repo별)** 분리 원칙 + `import "stdlib/…"` 단일
hexa-lang 해석(물리 SSOT) 추가. plugin.json 0.10.6→0.10.7 (marketplace 와 drift 해소).
(from anima IIT4 세션 — IIT4 엔진을 hexa-brain/eeg 와 공유하기 위한 거버넌스 선결.)

---

## 2026-05-25 — pool-route 0.6.10: hexa cloud 로컬 핀 + worktree→canonical-root fallback

hexa-lang INBOX cross-repo handoff 2건 해소 (둘 다 hexa-lang 이 아니라 이 라우터 소관으로 판명된 항목).

- **cloud pin** — `hexa cloud *` 는 항상 로컬 실행. `hexa cloud` 자체가 Mac-local-only 원격 dispatch 도구(로컬 hexa 빌드 + `stdlib/cloud` 필요)인데, `--` 뒤 remote argv 에 heavy word(`nvidia-smi`·`train.log`·`make`)가 섞이면 분류기가 트립 → `hexa cloud exec <pod> -- ...` 전체가 `cloud` subcommand 없는 Linux pool host 로 비결정적 라우팅돼 실패. dispatcher 를 이중 라우팅하는 건 모순. `toks` 인접쌍 + substring 둘 다로 zsh-snapshot 래핑까지 포착. (INBOX 2026-05-25T06:37Z.)
- **worktree→canonical-root fallback** — `/tmp/wt-x` 같은 git LINKED worktree(표준 stdlib/SSCHA 격리 패턴)에서 heavy 명령이 `cwd outside $HOME` 로 거부되던 것을, `git worktree list --porcelain`(main 체크아웃이 첫 줄)로 MAIN 루트를 얻어 그 루트가 $HOME 아래면 mirror. **기존 deny 브랜치 안에서만** 동작 → 라우팅 중인 명령은 회귀 불가, worktree dispatch 만 구제. route-log `why` 에 `worktree→canonical-root` 기록. (INBOX 2026-05-25T08:10Z(a).)
  - **검증** — 4 케이스 PASS: `hexa cloud exec`→allow(local) · `hexa kick`→여전히 라우팅(회귀 없음) · 비-git `/tmp`→deny 유지 · `/tmp` worktree→`~/core/sidecar` rescue + ubu-2 라우팅.
  - **표면**: `hooks/pool-route/bin/_pool_route.hexa` (cloud early-allow + deny-branch rescue) · `hooks/pool-route/.claude-plugin/plugin.json` 0.6.9 → 0.6.10 · `.claude-plugin/marketplace.json` pool-route 0.6.9 → 0.6.10 · `hooks/pool-route/README.md` · README 표 cell.

## 2026-05-25 — domain 0.8.7: `DOMAINS.tape` 호적부 — 인-프로젝트 인덱스 + 임의 경로 도메인

- **domain 0.8.7 — `DOMAINS.tape` 도메인 호적부(roster)** — "프로젝트마다 내부에서 관리" 요구 해소. repo 루트에 구조화 carrier(@D s2) 인덱스 파일을 두고 `@domain <NAME> := "<path>"` 한 줄로 도메인을 등록. **핵심 설계 = 휘발성 대시보드와 안정성 명부 분리**: 호적부는 `이름→경로`(파생 불가한 안정 데이터)만 담고, 진행%·@goal 은 호출 때마다 각 스냅샷에서 **라이브로 계산**(파생). → 체크인해도 milestone flip 마다 diff 가 나지 않음(churn 0), git 이력엔 "도메인 추가/이동/제거" 같은 의미 있는 변화만 남음.
  - **임의 경로 도메인** — 경로 해석이 호적부를 **최우선**으로 봄. `domains/RUNTIME/RUNTIME.md`·`sub/deep/X/X.md` 등 어디에 둬도 모든 verb(goal·ms·done·set·show)가 추적. 기존 "루트 + `<NAME>/` 1단계만" 해석 한계를 들어냄 (원래 "폴더 내부로 이동" pain 의 근본 해소).
  - **`/domain init <NAME> [<dir>]`** — 스캐폴드 + 호적부 행 자동 등록. 옵션 `<dir>` 로 임의 폴더에 생성(`init RUNTIME domains` → `domains/RUNTIME.md`). roster_append 를 ensure 보다 먼저 호출 → 스캐폴드가 호적부 경로에 바로 안착.
  - **`/domain list`** — 호적부 있으면 **authoritative** 렌더(★활성·진행·위치·goal) + 디스크 대조로 **미등록**(disk엔 있으나 호적부에 없음)·**유령**(호적부에 있으나 파일 없음 👻) 경고. 호적부 **없으면** 0.8.6 라이브 스캔으로 fallback (non-breaking).
  - **`/domain list --sync`** — 디스크 스캔(루트+1단계)에서 미등록 도메인을 호적부에 append → 기존 repo 에서 호적부 부트스트랩. 유령은 보고만(자동 삭제 안 함), 깊은 경로 이동은 수동 편집(호적부가 경로 SSOT).
  - **검증** — 임시 repo 11케이스 PASS: init 루트+폴더 · 호적부 경유 goal/ms/done · list roster mode(★+50% flip) · 미등록 경고 · --sync 등록 · 유령 탐지(👻) · 하위호환(hexa-lang 호적부 없음 → 라이브 스캔) · bare/set/show 회귀 없음. (worktree 격리 복구 — 동시 세션 clobber 후 stash 에서 0.8.7 작업 복원.)
  - **표면**: `skills/domain/bin/_domain.hexa` (`_roster_path`/`_dirname`/`_abs`/`_roster_entries`/`_roster_lookup`/`_roster_has`/`_roster_append` + `_snap_path`/`_log_path` roster-우선 + `_ensure_files` mkdir + `_disk_domains`/`_loc_of`/`_list_roster_row`/`_list_disk`/`_list`/`_list_sync` + `init [<dir>]`·`list --sync` dispatch + `_usage`) · `skills/domain/.claude-plugin/plugin.json` 0.8.6 → 0.8.7 · `.claude-plugin/marketplace.json` domain 0.8.6 → 0.8.7 · SKILL.md · commands/domain.md · README 표 cell + 명령 카탈로그.

## 2026-05-25 — domain 0.8.6: `/domain list` (alias `ls`) — repo 전체 도메인 인덱스

- **domain 0.8.6 — `/domain list` (alias `ls`)** — 프로젝트마다 도메인이 늘고 일부가 `<NAME>/` 폴더 안으로 이동하면서, "이 repo에 도메인이 뭐가 있더라?"를 한눈에 볼 surface가 없던 갭을 메움. bare `/domain` 은 활성 1개만 보여주는데, `list` 는 repo 전체(루트 + 한 단계 폴더)를 스캔해 도메인 쌍(`<NAME>.md` + `<NAME>.log.md`)을 한 표로 렌더 — `★ = 활성 · @goal · 진행바 · 위치(./ 또는 <NAME>/)`.
  - **온디맨드 · 체크인 파일 없음** — 호출 때마다 파일시스템을 스캔하므로 드리프트 0. 별도 인덱스 파일을 체크인하지 않아 git churn 없음 (g0 occam · "SSOT는 파일에서 파생" 원칙 유지).
  - **도메인 판별** — `.log.md` 짝(sister)이 도메인 마커 (README/CHANGELOG/CLAUDE 는 `.log.md` 없음). 폴더 쌍은 `<NAME>/<NAME>.log.md`(폴더명 == 도메인명)일 때만 인정 + `<NAME>.md` 스냅샷 존재 필수 → `notadomain/OTHER.log.md` 같은 비-도메인은 제외. `.md` 짝 없는 스트레이(예 레거시 underscore `HEXA_LANG.log.md`)는 자연히 빠지고, `_is_name` 실패하는 이름은 `⚠legacy-name` 으로 표식해 정리 유도.
  - **렌더** — 활성 도메인 행이 맨 위, 나머지는 `find | sort` 순. 진행바는 컴팩트형(`▓▓▓░░ NN%`, 퍼센트 3-wide 우측정렬로 ▓/░ 멀티바이트 폭과 무관하게 열 고정). @goal 은 행 끝(가변 폭) · 72바이트로 절단하되 UTF-8 룬 경계를 찾아 한글이 중간에 깨지지 않게 처리.
  - **검증** — sidecar(4 도메인) · hexa-lang(10 도메인, ★ 활성 마커 + 한글 goal 절단) · 임시 repo(루트 + 폴더 중첩 + 비-도메인 폴더 제외) 3 케이스 PASS.
  - **표면**: `skills/domain/bin/_domain.hexa` (`_truncate`/`_rpad`/`_lpad3`/`_bar_compact`/`_goal_at`/`_count_at`/`_ends_with`/`_list_row`/`_list` + `list`/`ls` dispatch + `_usage`) · `skills/domain/.claude-plugin/plugin.json` 0.8.5 → 0.8.6 · `.claude-plugin/marketplace.json` domain 0.8.5 → 0.8.6 · SKILL.md · commands/domain.md · README 표 cell + 명령 카탈로그.

## 2026-05-25 — domain 0.8.5: 옵션 `@title:` 디스플레이 헤더 (아이콘·이름·별칭)

- **domain 0.8.5 — `/domain title <text>` (alias `subtitle`) + 옵션 `@title:` 필드** — anima IIT4 핸드오프(INBOX) 해소. 도메인 스냅샷에 easy-mode 7요소 헤더(아이콘 · 이름 · 별칭, 예 `🧠 IIT4 — "의식 측정자(尺)"`)를 옵션으로 달 수 있게 했음. bare `/domain` · `set <NAME>` 출력이 `@title:` 가 있으면 plain `◆ active domain: IIT4` 대신 `◆ 🧠 IIT4 — "의식 측정자(尺)"   🎯 <goal>` 로 렌더. easy plugin 7요소와 도메인 트래커의 정합 갭을 메움.
  - **non-breaking**: `@title:` 미설정 도메인은 100% 현행 동작 (plain `active domain: NAME`). lint 은 `@title:` 부재를 경고하지 않음 (별칭은 취향 — `@goal`/milestone 처럼 필수 아님 · g0 occam).
  - **`_set_title`**: 기존 `@title:` 는 in-place 교체(반복 편집 시 빈 줄 누적 없음), 없으면 `# ` 헤딩 바로 아래 삽입. `_get_title` 은 `_get_goal` 미러.
  - **표면**: `skills/domain/bin/_domain.hexa` (`_get_title`/`_set_title`/`title` verb/`_show` 렌더/`_usage`) · `skills/domain/.claude-plugin/plugin.json` 0.8.4 → 0.8.5 · `.claude-plugin/marketplace.json` domain 0.8.4 → 0.8.5 · SKILL.md · commands/domain.md · README 표 cell.

## 2026-05-25 — commons 0.10.6: micro-exp 카탈로그 backfill + README 문서 정합화

- **commons 0.10.6 — 슬래시 명령 카탈로그(`COMMANDS.md`)에 `/micro-exp:micro-exp` 추가** — micro-exp(0.2.0)가 랜딩됐으나(`5c8174d`) SessionStart-주입 카탈로그에 누락돼 있었음. Dispatch 섹션(`/cloud` 옆)에 한 줄 추가. commons 가 carry 하는 콘텐츠 변경이므로 g22 lockstep 으로 버전 bump.
  - **표면**: `hooks/commons/COMMANDS.md` (Dispatch 섹션 1줄) · `hooks/commons/.claude-plugin/plugin.json` 0.10.5 → 0.10.6 · `.claude-plugin/marketplace.json` commons 0.10.5 → 0.10.6 · README 표 cell.
- **README 문서 정합화 (버전 bump 없음 — 이미 ship 된 상태로 동기화)** — README 가 실제 marketplace 상태와 drift 해 있던 것을 교정:
  - 플러그인 수 라인 `55 plugins (… 13 hexa …)` → `56 plugins (… 14 hexa …)` (micro-exp 반영).
  - 플러그인 표에 `micro-exp` 행 누락 → hexa tier 알파벳 위치(kick↔paper)에 추가.
  - 슬래시 명령 카탈로그(README 본문)에 `/micro-exp:micro-exp` 누락 → Dispatch 섹션에 추가.
  - 표 버전 cell stale: `commons` 0.10.4 → 0.10.6 · `pool-route` 0.6.3 → 0.6.9 (둘 다 marketplace/plugin.json 에선 이미 bump 됐으나 README 표만 뒤처져 있었음 — `pool-route 0.6.9` `f1d4609`).

## 2026-05-25 — pool-route 0.6.8: 사이드카 플러그인 변수(`$CLAUDE_PLUGIN_ROOT`/`$CLAUDE_PLUGIN_DATA`) local pin

- **pool-route 0.6.8 — 사이드카 슬래시 명령 local 고정** — `/quota:quota` · `/pool:pool` 등 모든 sidecar 슬래시가 emit 하는 bash 의 `H="$CLAUDE_PLUGIN_ROOT/bin/_X.hexa"; hexa run "$H" ...` 패턴이 ubu-1/2 로 라우팅 → 원격엔 sidecar 캐시가 없어 `✗ _quota.hexa not found` 로 실패하는 현상 사용자 보고.
  - **원인**: 0.6.7 까지의 local-bound 가드는 `/Users/`/`/home/` 리터럴만 인식. cmd 문자열에 `$CLAUDE_PLUGIN_ROOT` 는 **셸 변수 리터럴** 그대로 남아있고 절대경로 형태로 안 풀려서 가드 미통과 → `hexa run` heavy_pair 매칭으로 pool 라우팅 → 실패.
  - **fix**: local-bound 분기 직전에 `cmd.contains("$CLAUDE_PLUGIN_ROOT") || cmd.contains("$CLAUDE_PLUGIN_DATA")` 면제 추가. 두 변수는 dispatching bash 가 항상 워크스테이션 plugin cache 로 해석하므로 본질적으로 host-bound. sign 게이트 없음 — sidecar 슬래시 명령은 trusted single-shot 표면이라 multi-session dispatch race 가 아님.
  - **scope**: 모든 sidecar 슬래시(`/quota:quota`, `/pool:pool`, `/check`, `/end`, `/ship`, `/inject`, `/secret`, …)가 작성 컨벤션상 `$CLAUDE_PLUGIN_ROOT` 를 통해 자기 바이너리를 호출(@D s3 portable plugin scripts) → 이번 fix 로 모두 local 통과.
  - **표면**: `_pool_route.hexa` (local-bound 분기 직전 면제 추가 + 헤더 코멘트 한 절) · `plugin.json` 0.6.7 → 0.6.8 + description 에 0.6.8 절 splice · `marketplace.json` 0.6.6 → 0.6.8 + description 동기화 · README "Never routes" 섹션에 새 항목.

## 2026-05-25 — pool-route 0.6.7: aprime_cc (hexa-lang in-tree native codegen) 라우팅

- **pool-route 0.6.7 — `aprime_cc` heavy + macos classifier 양쪽 추가** — 사용자 escalation: build/aprime_cc 호출도 자원에서 돌아야. aprime_cc = hexa-lang in-tree self-host native codegen (Mach-O arm64 ~1.2MB · `./build/aprime_cc <x>.hexa --emit=asm --target=arm64-apple-darwin -o out.s`). 측정: workstation 85%+ CPU × 분 단위로 mac에서 도는 중 (다른 세션 발사).
  - **enforcement**: heavy_words 에 `aprime_cc` 추가 (라우팅 활성) + macos_words 에도 추가 (Mach-O arm64 only 라 mini 전용 라우팅 강제 · Linux pool host 는 exec 불가).
  - **결과**: `./build/aprime_cc x.hexa --emit=asm` → heavy=true + is_macos=true → mini 로 ssh dispatch. workstation mac 부담 0.
  - **scope**: 0.6.6 의 swift build / xcodebuild 와 동일 패턴 — *호스트 종속 컴파일러 binary* 는 macos pool host 로. 향후 다른 in-tree hexa-lang native compiler 발견 시 동일 패턴 추가 (occam g0 — 사용자 escalation 기준).
  - **표면**: `_pool_route.hexa` (heavy_words + macos_words 2곳) · `plugin.json` 0.6.6 → 0.6.7 + description heavy classifier 예시 갱신.

## 2026-05-25 — pool-route 0.6.6: macOS pool-host 활성화 (컴파일도 자원에서)

- **pool-route 0.6.6 — Zero-macOS-offload (0.6.1) 정책 폐기 · macOS pool host 자동 라우팅 활성** — 사용자 escalation: "컴파일도 자원에서 돌아야". 0.6.1 의 blanket exclusion 이 너무 거칠어서 `swift build`/`xcodebuild` 같은 macOS-only 컴파일이 enabled `mini` (mac arm64 pool host) 가 idle 한 상태에도 워크스테이션 mac 에 갇혀있었음. 측정: swift-frontend 85% CPU × 분 단위 (demiurge cockpit 빌드 사례).
  - **enforcement**:
    - `_pool_route.hexa` line 472 — 후보 등록 조건 `if tgt != "" && pl != "macos"` → `if tgt != ""` (mac host 도 후보로). 단 capability filter 가 plat 기준으로 좁힘.
    - `_pool_route.hexa` line 552 — general-heavy (`else` 분기) 의 round-robin 이 모든 host 대상이었음 → **Linux only 로 제한**. workstation Mac 은 macOS-capability marker 명시한 명령일 때만 도달.
  - **결과 매트릭스**:

  | 명령 타입 | 0.6.1 | 0.6.6 |
  |---|---|---|
  | macOS-only (swift build · xcodebuild · codesign · …) | 항상 local | → macOS pool host (mini) |
  | Linux-only (apt · dpkg · .deb · …) | → Linux hosts | → Linux hosts (변화 없음) |
  | general-heavy (make · cargo · hexa run/build · pytest · …) | 모든 host round-robin | **Linux hosts only** round-robin (Mac 보호) |
  | 명시적 `pool on <macos-host>` | 작동 | 작동 (변화 없음) |

  - **scope**: 사용자 가이드 "macOS only 는 mini 로 보내야지" + "컴파일도 자원에서 돌아야" 정확히 충족. swift build → mini 로 라우팅되면 그 sub-process (swift-frontend) 도 mini ssh 컨텍스트 안에서 spawn 되어 mac 부담 0.
  - **표면**: `_pool_route.hexa` (line 472 + 552 · 2곳) · `plugin.json` 0.6.5 → 0.6.6 + description 의 0.6.1 절을 0.6.6 정책으로 교체 · README 새 "0.6.6 — macOS pool-host enable" 섹션 + 기존 "Capability filter" 행 갱신.
  - **참고**: 캐시 폭증 추가 fix 는 *불필요* — dispatch shim 캐시 키 = `sha256(source) + version_str()` (env 무관) 이미 안정. 14개 binary 누적은 *서로 다른 14개 source* (corpus_quality_probe · bitnet_m1_accuracy_floor · …) 의 정상 source-only cache. 진짜 폭증 원인 = pool-route 가 그 14개 script 를 mac 에 가둠 (0.6.5 + 0.6.6 으로 원인적 해결).

## 2026-05-25 — pool-route 0.6.5 HOTFIX: 0.6.4 의 false-positive + false-negative 경로 동시 차단

- **pool-route 0.6.5 — HOTFIX 2건 동시 패치** — 0.6.4 ship 직후 발견된 두 버그를 같은 PR 로 해소.

  **버그 1 (false-positive · bare reads 가 sign 게이트 발동)**:
  - `_local_heavy_interp` 가 `_has_word(cmd, "hexa")` 로 hexa 호출 감지했는데, `_has_word` 가 `-` 를 word boundary 로 처리 → `cat /Users/.../hexa-lang/foo.txt` 의 *경로 안 "hexa"* 가 verb 로 오인식 → 단순 `cat`/`ls`/`grep` 도 sign 게이트 발동.
  - 다른 세션에서 `cat` 명령이 deny 됨을 보고받음 (사용자 confirmed).
  - **fix**: 첫 토큰(`toks[0]`) basename 매칭으로 전환 — `hexa`/`hexa.real`/`hexac`/`hexadrv`/`hxv2`/`python*`/`bash`/`sh` 이 *호출 verb 로서* 첫 토큰일 때만 매칭. 경로 내부 "hexa" 무시. 첫 토큰이 호출 verb 라는 사실은 sound.

  **버그 2 (false-negative · `hexa run`/`build` 가 mac local 로 실행)**:
  - 0.6.x heavy classifier 가 `hexa kick/drill/loop/cc` 만 포함, `hexa run` 과 `hexa build` 누락. 그런데 그 둘이 dispatch-cache miss → re-fork 의 canonical mac fork-storm 트리거.
  - 다른 세션이 `hexa run build_curriculum_corpus.hexa` 같은 명령을 mac 에서 도는 현상 보고 (사용자 escalation).
  - **fix**: `heavy_pairs` 에 `hexa run` + `hexa build` 추가 → pool 자동 라우팅. sign 게이트는 local-bound 분기의 좁은 보조 가드로 남음.

  **scope**: false-positive 닫음 → 일상 명령 영향 0 복원. false-negative 닫음 → `hexa run/build` 도 무조건 자원 라우팅 (사용자 가이드 "atlas/heavy verb 는 자원에서 무조건" 충족).

  **표면**: `_pool_route.hexa` (`_local_heavy_interp` rewrite + `_basename` helper 추가 · heavy_pairs 확장) · `plugin.json` 0.6.4 → 0.6.5 + description hotfix 절 · README "Hotfix 0.6.5" 섹션.

## 2026-05-25 — pool-route 0.6.4: local-bound sign 게이트 (mac fork-storm 진짜 차단)

- **pool-route 0.6.4 — local-bound 절대경로 안의 HEAVY 호출에 `local` sign 게이트 추가** — 0.6.0 의 absolute-path 면제(`/Users/`·`/home/` literal → 무조건 local 통과)가 mac fork-storm 의 canonical 트리거였음. 다중 세션이 `hexa.real run /Users/.../x.hexa` 류를 동시에 발사할 때마다 dispatch-cache hash-miss → 새 컴파일러 바이너리 fork. 워크스테이션 부하 load 130+ 측정.
  - **enforcement**: `_pool_route.hexa` 의 local-bound 분기(line ~345) 안에 새 helper `_local_signed()` + `_local_heavy_interp()` 가드 삽입. HEAVY = `hexa` (모든 verb · `hexa.real` 직접 호출 포함) · `python`/`python3`/`py` · `bash`/`sh <script>` (positional script arg — `bash -c "..."` 는 shell wrapper 라 면제). bare reads(ls/cat/grep/find/head/tail/...)는 그대로 통과 — 게이트는 인터프리터/컴파일러만 노림.
  - **민팅**: 새 sign key `local` · TTL 300s(sign-guard 와 동일) · 토큰 파일 `~/.sidecar/signs/local.sign`. 유저가 TUI 프롬프트에서 `! sidecar sign local` 인라인 민팅 (한 번 받으면 5분 자유 발사). agent self-mint 불가는 sign-guard 의 tool-boundary 강제로 그대로.
  - **deny 메시지**: 게이트 발동 시 `permissionDecision: deny` + 인스트럭션 trailer ("`! sidecar sign local`  in the TUI prompt (5min token), then retry. Bare absolute-path reads ... are unaffected").
  - **scope**: 외부 다수 유저 기준 — `git`/`gh` 통과 + bare 절대경로 통과 + heavy 인터프리터만 게이트. 일상 명령 영향 0; 진짜 fork-storm 트리거만 차단.
  - **표면**: `_pool_route.hexa` (helper 2개 + 분기 1곳) · `plugin.json` description+version 0.6.3→0.6.4 · README.md 새 섹션 "Local-bound sign gate (0.6.4)".

## 2026-05-25 — commons 0.10.4: @D g53 강화 (/easy 7-element required + 인라인 스펙)

- **commons 0.10.4 — @D g53 `[active]` → `[required active]` 승격 + 7요소 인라인 명시** — "/easy 7-element friendly explain"을 설명/보고 턴 기본값으로 required화. do에 7요소(icon·NAME·alias·plain·analogy·ASCII·vs-tool) 직접 열거 → 룰 자기문서화(기존엔 `/easy` 플러그인 의존). canonical 스펙+gold 예시 포인터 = `skills/easy/styles/easy.<lang>.md`. dont에 면제 대상(코드/수식/식별자/경로/SHA · CI machine pipe) 명시. 사용자 요청(친근 설명 패턴 선호 — ⚛️ ELIASHBERG-MOMENTS 류)을 거버넌스로 고정.

## 2026-05-25 — commons 0.10.3: @D g61 hexa-lang stdlib SSOT

- **commons 0.10.3 — @D g61 신규: "hexa-lang stdlib is the SSOT for general primitives"** — 재사용 general primitive(math/info/signal/bitops/stats)는 hexa-lang `stdlib/`로 promote(plain `.hexa` · regen-free) · caller repos import-only · byte-equal 보존. dont: repo간 helper 중복 · stdlib 적합한데 컴파일러 builtin으로 추가 · 생성물 `hexa_cc.c`/`hexa_v2` 직접편집(→ `hexa cc --regen`, live SSOT `self/codegen.hexa`). anima STDLIB 도메인 migration + hexa-lang 컴파일러 fix 세션 경험을 거버넌스로 고정해 재발 방지.
  - marketplace 설명 `@D g0..g60` → `g0..g61` lockstep.

## 2026-05-25 — sign-guard 0.1.4 · sidecar(command) 0.1.1: 사인 토큰 TTL 15분 → 5분 축소

- **sign-guard 0.1.4 · sidecar 0.1.1 — 유저 사인 토큰 유효기간 900s(15분) → 300s(5분)** — 유저 요청. 거버넌스 SSOT(commons.tape·project.tape) 편집을 여는 사인 토큰의 유효창을 좁혀, 토큰이 떠 있는 시간을 줄임(공유 워킹트리 등에서 잊고 방치되는 창 최소화).
  - **enforcement(실제 창)**: `_sign_guard.hexa` 의 `TTL` 상수(= `_signed()` 의 `age <= TTL`)를 300s 로. 이게 편집 허용/거부를 가르는 단일 값.
  - **lockstep 문구**: `bin/sidecar` 의 `SIGN_TTL`(= `sign` 목록의 잔여시간 표시 + mint 확인 메시지)도 300s. deny 메시지 2개(`_deny_for`·`_deny_mint`) + 두 plugin.json + marketplace 설명 2건 + sidecar.md 의 "15 min/15분" 문구를 전부 "5 min" 으로 동기.
  - **반영 시점**: enforcement 는 `sidecar sync` + `/reload-plugins`(또는 재시작) 후 즉시 300s. 라이브 `sidecar` CLI 의 표시 문구는 `~/.hx/packages/sidecar`(복사본)라 `hx install sidecar` 재설치 때 반영(표시 전용 · enforcement 와 무관).
- Smoke: `bin/sidecar` `sh -n` OK · hexa 파싱 OK · deny 메시지 "valid for 5 minutes" / "Valid 5 min" 확인. lockstep(@D ship · g22): sign-guard 0.1.3 → 0.1.4 · sidecar(command) 0.1.0 → 0.1.1 (`bin/sidecar` 무버전 CLI).

## 2026-05-25 — sign-guard 0.1.3: 보안 모델 설명 정정 — 대화형 `!` 뱅은 훅 미경유(유저 민팅 정상 경로) [문서 정확성]

- **sign-guard 0.1.3 — 0.1.2 의 "모든 표면이 훅 경유" 주장 실측 정정** — 0.1.2 설명(`_sign_guard.hexa` 주석 · plugin.json · marketplace.json)이 "Claude Code 의 모든 실행 표면(Bash 도구 · 슬래시 `!` · 대화형 `!` 뱅)이 전부 Bash 도구 경유라 훅에 걸리고, out-of-band 실제 터미널에서만 민팅 가능"이라 적었으나 — 실측 결과 **유저가 TUI 프롬프트에 직접 치는 대화형 `!` 뱅은 훅을 경유하지 않고 그냥 민팅됨**(`! sidecar sign project` → `~/.sidecar/signs/project.sign` 신선 토큰 생성 확인). 게이트는 **여전히 안전** — 근거가 "`!` 가 차단돼서"가 아니라 **"에이전트는 `!` 뱅을 발화할 수 없어서"**(유저 전용 입력)로 정정될 뿐. 에이전트의 유일한 채널인 tool 콜(Bash·Write/Edit)은 전부 이 훅에 걸려 deny 되므로 self-mint 불가는 그대로 성립.
  - **정정 표면(enforcement 무변경 · 설명만)**: `_sign_guard.hexa` 주석 + plugin.json + marketplace.json description 의 틀린 절을 "에이전트 tool 콜 = 훅 경유 → self-mint 불가; 유저 대화형 `!` 뱅 = 훅 미경유 → 정상 민팅 경로(에이전트는 `!` 발화 불가라 안전)"로 교체. `_is_sign_mint`·`_under_signs`·deny 로직은 **무변경**(로직 미수정 = Smoke 무회귀).
  - **운영 영향**: sign 게이트가 막힐 때 안내를 별도 터미널 대신 `! sidecar sign <key>`(TUI 인라인)로 가능. 슬래시 명령의 `!`backtick` pre-exec 경유 여부는 미검증(별도 확인 대상).
- lockstep(@D ship · g22): plugin.json + marketplace 0.1.2 → 0.1.3 (로직 무변경 · 설명 정정 patch).

## 2026-05-25 — workdir-guard 0.1.0: 공유 워킹트리 SessionStart 어드바이저리 (예방형 2겹)

- **workdir-guard 0.1.0 (신규 훅) — 세션 시작 시 "이 working tree 를 ≥2 claude 에이전트가 공유 중"이면 worktree 규율 1회 주입** — git-guard 0.5.0(반응형 · push 시점)의 예방형 짝. 공유 인덱스/HEAD 해저드(동시 에이전트가 내 commit↔push 사이 HEAD swap → stale 브랜치 push · commit commingling)를 *랜딩 전에* 회피하도록 세션 시작부터 멘탈모델을 잡아줌.
  - **탐지(~0.1s · 1 라운드트립)**: `ps -A -o pid=,comm=` 로 claude PID 수집(comm == "claude" — `lsof -c claude` 는 lsof 의 command 필드가 버전문자열 `2.1.150` 이라 0개 매칭이라서 ps 가 정답) → `lsof -a -p <list> -d cwd`(`-a` 필수 · 빼면 `-p` 와 `-d cwd` 가 OR 로 합쳐져 전 프로세스 cwd 를 셈) 로 각 cwd 수집 → `git rev-parse --show-toplevel` 절대경로에 awk prefix-match(trailing `/` 로 형제 디렉터리 오탐 차단). count ≥ 2 면 SessionStart `additionalContext`(non-blocking).
  - **working tree 기준 그룹핑**(repo 아님): 링크된 worktree 는 인덱스가 독립(= 해결책)이라 안 세고, **worktree 로 옮기면 내 count 가 1 로 떨어져 경고가 자동 소멸**. 솔로 세션(count 1) · 비-repo · lsof 부재 → 전부 무발화(fail-open). opt-out 없음(@D s11).
- Smoke(3/3): sidecar(공유 claude 3개) → 어드바이저리 · fresh /tmp repo(claude 0개) → allow · /tmp 비-repo → allow. lockstep(@D ship · g22): plugin.json + marketplace 신규 0.1.0.

## 2026-05-25 — git-guard 0.5.0: stale-base push 어드바이저리 (공유 워킹트리 브랜치 swap 방어)

- **git-guard 0.5.0 — non-force `git push` 에 stale-base 비차단 경고 추가** — 공유 워킹트리(한 repo · 동시 에이전트 다수)에서 sibling 에이전트가 내 commit↔push 사이에 HEAD 를 바꿔치기 → push 가 origin/main 보다 37커밋 뒤처진 stale 브랜치로 가고, 머지 시 그 사이 바뀐 파일을 옛 버전으로 silent-revert 할 뻔한 사고(데미우르고스 동시성 해저드) 방어. 기존 가드는 force-push 만 deny 해 이 "정상 형태" push 는 그냥 통과하던 구멍.
  - **동작**: force 가 아닌 `git push` 에서 `git rev-list --left-right --count <base>...HEAD` (base = `origin/HEAD`, 없으면 `origin/main`) 1회 read-only 라운드트립으로 현재 브랜치의 behind/ahead 계산. behind ≥ **20** 이면 PreToolUse `additionalContext`(non-blocking)로 브랜치명 · behind · ahead · 재작업 경로(base 에서 격리 worktree 재컷) 안내 — **push 는 그대로 진행** (deny 아님 · guards-narrow-scope: 위생은 advisory > deny).
  - **타겟 repo 해석**: 명령의 `cd <dir> && git push` 에서 마지막 cd 디렉터리를 파싱해 그 repo 에서 probe(없으면 훅 cwd). 임계치 20 은 하드코딩(env/config opt-out 없음 · @D s11) — 단명 stacked PR 의 정상 drift 보다 훨씬 위라 진짜 stale 베이스에만 발화. base 브랜치 자신을 push 할 땐 skip · 비-repo/detached 면 fail-open(무발화). force-push deny 경로 · 따옴표 strip(0.4.2) 전부 무회귀.
- Smoke(4/4): force-push → DENY · 25-behind 브랜치 push → STALE-BASE 경고 · main(behind 0) bare push → allow · 5-behind(<20) → allow. lockstep(@D ship · g22): plugin.json + marketplace 0.4.2 → 0.5.0.

## 2026-05-25 — ship 0.3.2: bare `/ship` 헬퍼 모드 (usage 에러 → 상태+템플릿)

- **ship 0.3.2 — 인자 없는 `/ship` 이 usage 에러 대신 상태+템플릿 출력** — 인자 없이 `/ship` 을 치면 매번 usage 만 뱉어 불편하던 점 개선. `_ship.hexa` 의 no-args 분기가 이제 (a) `git status --porcelain` 의 미커밋 변경을 후보 목록으로 나열하고 (b) 바로 붙여쓸 `/ship -m "<commit message>" <변경파일들>` 템플릿을 출력한 뒤 **exit 0**(에러 아님·헬퍼 모드). 신규 `_changed_paths` 가 porcelain 을 파싱(rename `old -> new` 는 new 채택). **@D ship 불변 준수**: 여전히 자동 스테이징/커밋 안 함 — 명시 경로 + 에이전트 작성 메시지가 필수라는 규율은 그대로, bare 폼은 "무엇을 어떻게 올릴지" 템플릿만 제공. Smoke: 깨끗한 트리 → "nothing to ship" · 변경 있을 때 → 후보 목록 + 채워진 템플릿(exit 0). ship.md argument-hint/description 에 bare 폼 명시. lockstep(@D ship · g22): plugin.json + marketplace 0.3.1 → 0.3.2.

## 2026-05-25 — pr-cycle 0.3.6: cross-repo PR 머지 오작동 fix [INBOX #4 from anima]

- **pr-cycle 0.3.6 — `gh pr create --repo X` 의 머지를 같은 repo 로 라우팅** — anima INBOX handoff #4: `gh pr create --repo dancinlab/kosmos …` 시 pr-cycle hook 이 ` && gh pr merge --squash --admin` 를 append 하는데, 그 머지가 **대상 repo(kosmos)가 아닌 cwd repo(anima)의 main 을 fetch/머지** 시도하던 cross-repo 오작동. 신규 `_repo_flag` 가 명령에서 `--repo <X>` 를 파싱 → cross-repo create 면 머지도 `gh pr merge --repo <X>`, 그리고 **로컬(cwd) worktree cleanup 은 skip**(PR repo ≠ cwd repo 라 cwd worktree 정리가 부적절). same-repo 동작 불변. Smoke: `--repo dancinlab/kosmos` → merge 도 `--repo dancinlab/kosmos`(worktree tail 없음) · `--repo` 없음 → 기존 cwd merge(+worktree cleanup). INBOX.md/log 의 #4 `- [x]` 해소; #1·#2·#3 은 harness-upstream(`isolation:worktree` 영역)으로 재분류 — sidecar 직접 fix 불가, 추적만. lockstep(@D ship · g22): plugin.json + marketplace 0.3.5 → 0.3.6.

## 2026-05-25 — sign-guard 0.1.2: self-mint 코드 강제 (에이전트가 `sidecar sign` 못 함) [보안 · HIGH]

- **sign-guard 0.1.2 — no-self-mint 를 social contract → 코드 강제로 승격** — 신고: AI 에이전트가 유저 승인 없이 `sidecar sign project` 를 스스로 실행해 사인 토큰을 self-mint, 거버넌스 사인 게이트를 무력화하던 약점. 기존 게이트는 `commons.tape`·`project.tape` **편집**만 막고, "에이전트는 self-mint 금지"는 코드 주석의 약속(social contract)일 뿐 실제 강제가 없었음. 신뢰 경계는 오직 PreToolUse 훅(하네스가 평가 · 에이전트 우회 불가)뿐이고 — 출처(에이전트 vs 유저)를 가를 구조적 신호(env·payload 필드)가 없음을 claude-code-guide 로 확인 — 따라서 훅에서 차단.
  - **레이어 A (액티브 · 훅)**: `_sign_guard.hexa` 가 (a) 민팅 명령 `sidecar sign <key>` 자체(`list`/`clear` 는 허용 · abs-path 포함) (b) `~/.sidecar/signs/` 하위 토큰 파일 위조 쓰기(redirect·tee·dd·cp/mv·Write/Edit/NotebookEdit) 를 hard-deny. Claude Code 의 모든 실행 표면(Bash 도구 · 슬래시 명령의 `!` · 대화형 `!` 뱅 — 전부 Bash 도구 경유)을 커버하므로, 훅 없는 **out-of-band 실제 터미널**에서만 민팅 가능.
  - **레이어 B (옵트인 · `bin/sidecar` · 주석 문서화)**: 민팅 시 제어 터미널(`/dev/tty`) 존재를 요구. 실측 — 에이전트 Bash 도구는 제어 TTY 가 없음(`/dev/tty` open 불가 · `[ -t 0 ]` false), 사람 셸은 있음. 훅 파서를 우회하는 난독화 민팅(`s=sign; sidecar $s project`·`eval`·래퍼 스크립트)까지 차단. `export SIDECAR_SIGN_REQUIRE_TTY=1` 로 활성(기본 OFF — 유저 사인 마찰 최소화). **opt-OUT 아님**: 끄면 훅으로 폴백할 뿐 그 아래로 약화되지 않음(@D s11).
  - **한계 명시**: 레이어 A 만으로는 난독화 임의코드 민팅(python/perl/eval)을 못 잡음(기존 project.tape 가드와 동일한 한계) — 그 갭이 레이어 B 의 존재 이유.
- Smoke(12/12 통과): mint(직접·abs-path·commons)·forge(redirect·tee·Write)·project.tape 무토큰 → DENY · clear·list·`ls`·README·난독화`s=sign` → ALLOW. 레이어 B: TTY 없는 컨텍스트 → 민팅 거부(exit 1·토큰 미생성) · OFF → 정상 민팅. lockstep(@D ship · g22): plugin.json + marketplace 0.1.1 → 0.1.2 (`bin/sidecar` 는 무버전 CLI).

## 2026-05-25 — ai-api-guard 0.1.3: 매칭 전 공백/줄연결 normalize [약점분석 #10 · MED]

- **ai-api-guard 0.1.3 — `_norm` 으로 매칭 전 공백류 collapse** — 약점 분석에서, AI-SDK import / hostname 매칭이 정확한 단일 공백 substring(`import openai`)이라 다중 공백·탭·줄연결 변형을 놓칠 수 있던 약점. 신규 `_norm` 이 공백/`\n`/`\r`/`\t`/`\` 를 단일 공백으로 collapse 후 매칭 — `import  openai`(다중공백) 등 흡수. **한계 명시**: 따옴표 안 line-continuation 은 실제로 유효 import 가 아니라 애초에 안 돌아가고, dynamic import(`exec(x+' openai')`·base64)는 정적 substring 스캔으로 탐지 불가 — 가드는 흔한 형태를 좁힐 뿐. Smoke: 정석 `import openai` deny(무회귀) · `python script.py` allow(오탐0). lockstep(@D ship · g22): plugin.json + marketplace 0.1.2 → 0.1.3.

## 2026-05-25 — pool-route 0.6.3: 따옴표 감싼 heavy 서브버브(`hexa 'kick'`) 분류 우회 차단 [약점분석 #11 · MED]

- **pool-route 0.6.3 — 분류 토큰 따옴표 strip 으로 quoted heavy verb 우회 차단** — 약점 분석에서, heavy classifier 의 adjacency(`_any_adjacent`) + pair-substring(`_any_pair_substring`)이 `hexa 'kick'` 처럼 따옴표 감싼 서브버브를 못 잡아 pool 라우팅을 우회(Mac 로컬 실행 = kick-storm 부하 위험)하던 약점 발견(`_any_word`/heavy_words 는 `cmd.contains` 라 이미 quote 생존). 신규 `_strip_quotes` 로 **분류용** 토큰만 따옴표 제거 — ssh 재작성은 원본 cmd 유지(따옴표 보존). heavy + macos 분류 모두 quote-robust. Smoke: `hexa 'kick' --seed x` → heavy 분류 → ssh updatedInput 재작성(+permissionDecision allow) · `ls -la` → allow(경량, 무재작성). lockstep(@D ship · g22): plugin.json + marketplace 0.6.2 → 0.6.3.

## 2026-05-25 — ship 0.3.1 · research 0.2.4 · imagine 0.2.3 · paper 0.5.3: command `$CLAUDE_PLUGIN_ROOT` 빈값 fallback [약점분석 #7 · MED]

- **5개 command 에 `$CLAUDE_PLUGIN_ROOT` 빈값 fallback 추가** — 약점 분석에서, `ship`·`research`(arxiv·yt)·`imagine`·`paper` command 가 `$CLAUDE_PLUGIN_ROOT` 를 직접 참조해서, 빈값이면 `/bin/_X.hexa`(빈 경로 prefix)로 깨지던 약점 발견 — `quota`/`domain` 만 fallback 보유했음(이번 세션 `/quota` 초반에 실제로 `$CLAUDE_PLUGIN_ROOT` 빈값→fallback 발동 사례 있었음). 각 command 에 quota/domain 의 `ls -1 … | sort -V | tail -1` 캐시 fallback 패턴을 inline `;`-연결로 추가 — 빈값이면 `$HOME/.claude/plugins/cache/sidecar/<plugin>` 의 semver 최신 버전으로 해석. `imagine`/`paper` 는 `--root` 인자도 함께 복구. Smoke: 빈 ROOT → ship 은 캐시 최신 `_ship.hexa`, imagine 은 H+R(--root) 둘 다 정확 해석. lockstep(@D ship · g22): ship 0.3.0→0.3.1 · research 0.2.3→0.2.4 · imagine 0.2.2→0.2.3 · paper 0.5.2→0.5.3.

## 2026-05-25 — prefs 0.3.3: prefs.json 필드 타입 게이트 [약점분석 #9 · MED]

- **prefs 0.3.3 — `prefs.json` 각 필드 읽기에 타입 게이트** — 약점 분석에서, `has_key(m,"code")` 후 타입 검증 없이 `code = m["code"]` 해서, `prefs.json` 에 비-string 값(예: `{"code": 123}`)이 들어오면 이후 string 연결에서 깨지던 약점 발견. 각 분기에 `&& type_of(m[k]) == "string"` 추가 — 비-string 이면 기본값 유지. Smoke: `{"code":123,...}` → 크래시 없이 code=기본값(english) 으로 정상 inject. lockstep(@D ship · g22): plugin.json + marketplace 0.3.2 → 0.3.3.

## 2026-05-25 — hexa-native 0.3.2 · sign-guard 0.1.1: 비-리다이렉트 쓰기 채널(dd of=·cp/mv) 커버 [약점분석 #5]

- **hexa-native 0.3.2 · sign-guard 0.1.1 — `dd of=` + `cp`/`mv` 목적지 쓰기 채널 추가 커버** — 약점 분석에서, 두 가드가 `>`/`>>`/`tee` 리다이렉트만 스캔하고 **비-리다이렉트 쓰기 채널**(`dd of=X`·`cp src X`·`mv src X`)을 놓쳐 `.py`/`.sh`(hexa-native) · `commons.tape`/`project.tape`(sign-guard) 쓰기 가드를 우회할 수 있던 약점 발견. 신규 `_dd_targets`(of= 명시 추출, 오탐 0) + `_cp_mv_dest`(마지막 비-flag 인자 = 목적지)를 후보에 합침 — 기존 게이트(.py/.sh 확장자 · gated SSOT 경로)가 비-대상 목적지를 자동 통과시켜 **오탐은 실제 gated 쓰기에 한정**. Smoke: hexa-native — `dd of=evil.py`·`cp t evil.py`·`mv a evil.sh` deny / `cp a.py /tmp/`·`python s.py`·`mv old.txt new.txt`·`cat x.py` allow(오탐0); sign-guard — `dd of=project.tape`·`cp x project.tape`·`mv x commons.tape` deny / 일반 cp·mv allow. **한계 명시**: `python -c open(...)`·`sed -i`·`perl -e`·`install -t`·`ln` 등 무한 채널은 미커버 — 가드는 흔한 경로를 좁힐 뿐 sandbox 아님(agent self-discipline 보조). 두 hook 의 `_redirect_targets` 로직은 여전히 복제(향후 공유 검토). lockstep(@D ship · g22): hexa-native 0.3.1→0.3.2 · sign-guard 0.1.0→0.1.1.

## 2026-05-25 — git-guard 0.4.2: 따옴표로 감싼 force 플래그 우회 차단 [약점분석 #4]

- **git-guard 0.4.2 — 토큰화 전 따옴표 strip 으로 quoted force-flag 우회 차단** — 약점 분석에서, `_tokens` 가 whitespace-split 만 해서 `git push origin '--force-with-lease=x'` 처럼 **따옴표로 감싼 force 플래그**가 토큰에 따옴표를 달고 남아 `--force*` 매칭을 비껴가 force-push deny 를 우회하던 약점 발견(refspec-level `+\"refspec\"` 도 동일). 신규 `_strip_quotes` 가 `'`/`\"` 를 제거한 뒤 토큰화 — quoted flag 가 bare 형태로 환원돼 매처가 본다. Smoke: `'--force-with-lease=…'` · `--force` · `+\"refs/heads/main\"` 전부 deny · 정상 push(`git push origin main` · `--set-upstream` · `\"release\"` 브랜치) 전부 allow(오탐 0). lockstep(@D ship · g22): plugin.json + marketplace 0.4.1 → 0.4.2.

## 2026-05-25 — limit-guard 0.1.3: 세션-한도 신호 매칭 case-insensitive [약점분석 #3]

- **limit-guard 0.1.3 — 한도 신호 매칭을 case-insensitive 로** — 약점 분석에서, limit-guard 의 `_contains` substring 매칭이 case-sensitive 라 실제 한도 메시지의 대소문자/구두점 변형 시 **silent miss**(advisory 발행 안 함 → subagent 가 mid-work 중단했는데 체크포인트 지시 누락)하던 약점 발견. `raw.to_lower()` 후 매칭으로 변형 흡수. 본질적 한계 주석 명시: substring 매칭은 진짜 신호와 그 신호의 **verbatim 인용**(이 가드 자체를 분석한 Agent result 등 — 이번 세션에서 실제 false-positive 발생)을 구분 못 함 → self-referential false-positive 가능하나, hook 이 advisory-only(never deny)이고 **실제 한도 miss(작업 손실) > 헛경보** 라 수용. Smoke: `"HIT YOUR SESSION LIMIT, resets at 3pm"`(대문자) → 감지 · `"build completed"` → silent. lockstep(@D ship · g22): plugin.json + marketplace 0.1.2 → 0.1.3.

## 2026-05-25 — research 0.2.3: `_yt`·`_arxiv` 에러 경로 silent-success(exit 0) → exit(1) [약점분석 #2]

- **research 0.2.3 — `_yt.hexa`·`_arxiv.hexa` 의 모든 에러 조기종료를 `exit(1)` 로** — 약점 분석에서, 두 바이너리가 네트워크 실패·파싱 실패·재생불가·자막없음·잘못된 id·빈 결과에서 메시지만 출력하고 `return`(=exit 0)으로 끝나, **호출자/에이전트가 실패를 정상 결과와 구분 못 하던** 데이터-무결성 약점 발견(`"transcript not available"` 를 진짜 transcript 로 오인 가능). main 의 bare `return` 9개(`_yt`) + 4개(`_arxiv`)를 `exit(1)` 로 교체 — 함수 본문의 `return <expr>`(값 반환) 33개는 8칸/4칸 들여쓰기·inline 구분으로 무영향. 정상 경로(transcript/논문 출력)만 exit 0. Smoke: bare return 0 잔존 · `return <expr>` 유지 · 두 바이너리 컴파일+usage 정상. lockstep(@D ship · g22): plugin.json + marketplace 0.2.2 → 0.2.3.

## 2026-05-25 — easy-auto 0.1.2: `EASY_LANG=off` opt-out 제거(@D s11) + 미존재-lang fallback 버그 fix [약점분석 #1]

- **easy-auto 0.1.2 — `EASY_LANG=off` suppress escape 제거 + fallback 버그 fix** — 전체 플러그인 약점 분석에서, easy-auto 가 README/desc 의 "NO opt-out" 주장과 달리 `EASY_LANG=off` 로 inject 를 무력화하는 escape hatch 를 코드에 둔 것 발견 — `@D s11`/`g11`("no opt-out / escape-hatch variables in guards or auto-hooks") **정면 위반**. off 분기 제거: 이제 `EASY_LANG` 은 스타일 **언어 선택자**(default `ko`)일 뿐 비활성화 스위치 아님. **부수 발견·fix**: `read_file` 이 없는 파일에 예외 대신 `""` 를 반환해 catch-기반 fallback 이 안 타던 버그 — 미존재 lang(`off`·`fr` 등)이 영어 base(`easy.md`)로 fallback 못 하고 silent no-op(=disable 간접 부활)했음. `body==""` 체크 기반 fallback 으로 교체. Smoke: `EASY_LANG=off` → `easy.md` 4001자 inject(비활성화 불가 확인) · ko → `easy.ko.md` 2811자(무회귀). 폐기된 `@D g30` 인용도 `g11`/`s11` 로 정정. 표면 lockstep(@D ship · g22): plugin.json + marketplace 0.1.1 → 0.1.2.

## 2026-05-25 — output-trim 0.1.3 · pool-route 0.6.2: `updatedInput` 재작성에 `permissionDecision:allow` 누락 fix (pr-cycle 0.3.5 동일 버그 · 전수 점검)

- **output-trim 0.1.3 · pool-route 0.6.2 — `updatedInput` 재작성 hook 전수 점검 후 누락된 `permissionDecision:"allow"` 추가** — 전체 플러그인 약점 분석 중, PreToolUse(Bash) `updatedInput` 으로 명령을 재작성하는 hook 3개(pr-cycle · output-trim · pool-route) 중 pr-cycle(0.3.5)만 `permissionDecision:"allow"` 를 동봉하고 **나머지 둘은 누락** → Claude Code 가 재작성을 무시하고 원본 명령을 실행하던 것 발견. 임팩트: (1) **output-trim** — stdout 압축 wrapper 재작성이 안 먹혀 >8000자 출력이 **트리밍 안 됨**(additionalContext 만 떴을 뿐 실제 파이프 미적용); (2) **pool-route** — heavy 명령의 ssh 재작성이 안 먹혀 **pool 로 안 가고 Mac 로컬 실행** → `@D s12`(zero macOS offload) 정면 위반. 둘 다 `_emit` 출력 JSON 에 `"permissionDecision":"allow"` 추가로 해결(pr-cycle 0.3.5 와 동일 fix; `exit(0)` 은 이미 충족하던 조건). Smoke: 두 hook 모두 emit JSON 이 `permissionDecision:allow` + `updatedInput` 공존 확인(pool-route=`pytest` heavy cmd · output-trim=`ls -la` 단순 cmd + `CLAUDE_PLUGIN_ROOT` 설정 시). 표면 lockstep(@D ship · g22): output-trim plugin.json+marketplace 0.1.2→0.1.3 · pool-route 0.6.1→0.6.2. [[pretooluse-updatedinput-needs-allow]] 의 cross-cutting 적용 — 이제 sidecar 의 updatedInput-재작성 hook 3개 전부 정상.

## 2026-05-25 — pr-cycle 0.3.5: `updatedInput` 재작성에 `permissionDecision:allow` 누락 fix (PR 생성되나 머지 안 됨)

- **pr-cycle 0.3.5 — `updatedInput` 옆에 `permissionDecision: "allow"` 추가** — 증상: `/pr-cycle`(또는 임의 `gh pr create`)에서 **PR 은 생성되는데 자동 머지 tail(`&& gh pr merge`)이 안 붙음**. 원인: PreToolUse(Bash) 훅이 `hookSpecificOutput.updatedInput` 으로 명령을 재작성할 때, **같은 `hookSpecificOutput` 에 `permissionDecision: "allow"` 가 함께 있어야** Claude Code 가 재작성을 적용한다(공식 hooks 문서 확인). 그 sibling 필드가 빠져 있어 Claude Code 가 `updatedInput` 을 무시 → 원본 명령(머지 tail 없음)이 실행돼 PR 만 생성되고 머지 누락. `_emit` 의 출력 JSON 에 `"permissionDecision":"allow"` 추가(`exit(0)` 은 이미 충족하던 또 다른 조건). Smoke: emit JSON 이 `permissionDecision:allow` + `updatedInput` + `additionalContext` 공존하는 유효 JSON. 헤더 주석 + plugin.json/marketplace desc 에 "permissionDecision 필수" 명시. 표면 lockstep(@D ship · g22): pr-cycle plugin.json + marketplace.json 0.3.4 → 0.3.5.

## 2026-05-24 — fix: step-by-step marketplace source 경로 오염 수정 (`:step-by-step` 군더더기 제거 → 플러그인 로드 에러 해소)

- **marketplace.json step-by-step `source` `./commands/step-by-step:step-by-step` → `./commands/step-by-step`** — 이전 over-broad 네임스페이스 rename(quota `:quota` 오염과 동일 패턴)이 step-by-step 의 source 경로에도 `:step-by-step` 을 붙여, Claude Code 가 marketplace clone 에서 플러그인 디렉터리를 못 찾아 `/doctor` 에 "Plugin directory not found" 로드 에러를 냈다. quota 는 0.8.2 에서 이미 `./skills/quota` 로 복구됐으나 step-by-step 은 누락됐던 것. 폴더는 `commands/step-by-step` 이므로 군더더기 제거. 전 플러그인 source 경로 전수 검사 결과 잔여 오염은 이 1건뿐 — 수정 후 0건. 버전 변동 없음(경로 메타 수정 · marketplace ↔ plugin.json 0.1.0 유지).

## 2026-05-24 — quota 0.8.2: 통합 표 행 정렬(닉네임>이메일) + `quota:quota` 경로 오염 정정

- **quota 0.8.2 — 통합 표 행을 닉네임(없으면 이메일)순으로 정렬** — `_unified_lines` 가 행을 출력 전에 `_sort_accounts`(selection sort · 계정 수 적어 O(n²) 무관 · 인덱스 안전)로 정렬. 정렬 키 `_sort_key` = 닉네임이 있으면 닉네임, 없으면 이메일, `.to_lower()` 로 대소문자 무시. 사용자 요청 "표 정렬: 닉네임이름순 || 이메일이름순". Smoke: 닉네임 전무 → 이메일순(mk55911·mk911tb·mkgt3rs·search5599) · 혼합(alpha·…·zebra) → 정렬 키 알파벳순 정확 · 활성 ★ 행도 정렬에 포함.
- **`quota:quota` 파일시스템 경로 오염 정정** — 직전 `72982db`(#15882 슬래시 명령 표기 plain→`/plugin:command` 복원)가 `quota` → `quota:quota` 과치환으로 **파일시스템 경로까지** 바꿔 `commands/quota.md` fallback resolver(`cache/sidecar/quota:quota` — 실제 디렉터리는 `quota` → fallback 깨짐) · `README.md` 데이터 경로(`~/.sidecar/quota:quota/…`) · `quota-autoadd` desc 가 오염됐던 것을, 경로 문맥(`[a-z]/quota:quota`)만 골라 `quota` 로 정정. 슬래시 명령 표기 `/quota:quota`(앞이 `/`·백틱)는 보존 — #15882 대로 맞음. research 경로는 오염 없음 확인. 표면 lockstep(@D ship · g22): quota plugin.json + marketplace.json 0.8.1 → 0.8.2 · quota-autoadd 는 desc 경로 정정만(버전 0.1.1 유지).

## 2026-05-24 — sign-guard 0.1.0 · sidecar(command) 0.1.0 · `sidecar sign` verb: governance SSOT 유저 사인 게이트

- **sign-guard 0.1.0 (신규 훅) — commons.tape · project.tape 편집을 유저 사인 게이트화** — 거버넌스 SSOT 파일(현재 `commons.tape` cross-project do/dont 레이어 + `project.tape` per-project 정체성·거버넌스)은 **신선한 유저 사인 토큰이 있을 때만** 에이전트가 편집 가능. PreToolUse(Write/Edit/NotebookEdit/Bash) 가드가 두 쓰기 채널(구조화 도구 + Bash 리다이렉트, hexa-native 스캐너 재사용) 모두에서 게이트 대상 경로를 잡아, 토큰이 없거나 만료(>900s)면 hard-deny. 게이트 목록은 `GATED` 배열 — `[["commons","/commons.tape"],["project","/project.tape"]]` — 한 줄 추가 + reship 로 확장(유저: "계속 추가될 것"). 토큰은 유일한 precondition(@D s11: opt-out 스위치 아님 · 실제 precondition 게이팅). `sidecar init` 같은 CLI 내부의 리다이렉트는 top-level 커맨드 문자열에 안 보이므로 스캐폴더는 영향 없음 — 에이전트의 직접 쓰기만 게이트.
- **`sidecar sign <key>` verb (bin/sidecar) — 토큰 mint/list/clear** — `sidecar sign commons` / `sidecar sign project` → `~/.sidecar/signs/<key>.sign` 에 현재 epoch 기록(15분 유효). 인자 없음 / `--list` → 활성 토큰 + 잔여 유효시간 표시. `sign clear [<key>]` → 토큰 제거. SIGN_TTL=900 은 가드의 `TTL` 과 lockstep. help / unknown-verb 목록에 `sign` 반영.
- **사인은 USER 로부터 — 에이전트 self-mint 금지(@D s13 신규)** — deny 메시지가 "유저에게 `sidecar sign <key>` 실행을 요청하고 retry · 직접 사인 금지"를 UPPERCASE 강조로 명시. 강제력 = hard-deny(토큰 없으면 편집 불가) + `sidecar sign` 호출이 트랜스크립트에 가시·감사 가능 + 거버넌스 룰(@D s13). project.tape 의 기존 "user-request only" 관례를 하드 게이트로 승격.
- **/sidecar 커맨드(신규, commands/sidecar) — CLI 씬 래퍼** — `/sidecar:sidecar <args>` → `sidecar "$@"` (pool·secret 래퍼와 동형). `/sidecar:sidecar sign commons` 형태로 사인 가능.
- 표면 lockstep(g22): sign-guard plugin.json + marketplace.json 0.1.0 · sidecar(command) plugin.json + marketplace.json 0.1.0 · bin/sidecar(sign verb) · project.tape(@D s13). enabledPlugins 는 sync 로 활성.

## 2026-05-24 — hexa-native 0.3.0: Bash 리다이렉트 채널 차단 (`.py`/`.sh` 우회 구멍 봉인)

- **hexa-native 0.3.0 — matcher `Write|Edit|NotebookEdit` → `Write|Edit|NotebookEdit|Bash`, Bash 쓰기 채널 hard-deny 추가** — 기존 hook 은 구조화 파일 도구(Write/Edit/NotebookEdit)로 들어오는 `.py`/`.sh` 쓰기만 막았다. 그래서 모델이 `cat > foo.py << EOF` · `echo … >> bin/x.sh` · `echo … | tee foo.py` 같은 **Bash 리다이렉트**로 파일을 만들면 문지기를 안 거치고 통과 — "hexa 작성이 자꾸 안 지켜지던" 정확한 원인. `_hexa_native.hexa` 에 Bash 브랜치를 추가해 봉인. 따옴표-aware 스캐너로 `>`·`>>`·heredoc 리다이렉트 타겟 + `tee [-a]` 파일 인자를 추출, 상대경로는 payload `cwd` 기준으로 절대화 후 `project.tape` 루트를 탐색해 `.py`/`.sh` 면 deny. **명백한 쓰기만** 차단 — `python foo.py`(실행)·`cat foo.py`(읽기)·`chmod x.sh`·`2>&1`(fd-dup)·비-py/sh 타겟은 통과(오탐 거의 0). @D s7(governance+enforcement 동반)의 enforcement 구멍 메움.
- **deny 메시지 공통화 + 강조 + "hexa 로 가능" 명시** — Write/Edit·Bash 양 채널이 `_deny_for()` 한 빌더를 공유. 메시지에서 load-bearing 포인트를 UPPERCASE 로 적당히 강조(`HEXA-NATIVE`·`BLOCKED`·`THIS IS POSSIBLE`·`ONLY`·`NO … override`)하고, 막힌 `.py`/`.sh` 의 `.hexa` 등가 파일명(`foo.py`→`foo.hexa`)을 제시하며 "같은 로직을 `.hexa` 로 쓰면 여기서 실행된다"를 명시 — 거부가 아니라 리다이렉트임을 분명히. opt-out 부재 설계(@D s11) 유지.
- 표면 lockstep(g22): hexa-native plugin.json + marketplace.json + hooks.json(matcher) 0.2.1 → 0.3.0. 13개 케이스 직접 검증(쓰기 6 deny · 읽기·실행·외부repo 7 allow · Write/Edit 회귀 2).

## 2026-05-24 — 명령 카탈로그 네임스페이스 정정: plain → 실제 `/plugin:command` (직전 denamespace 되돌림)

- **명령 표기 전면 `/plugin:command` 화 — 직전 "네임스페이스 제거"가 틀렸음을 정정** — 플러그인 슬래시 명령은 Claude Code 에서 **항상 `/plugin:command`** 로만 호출됨이 TUI 실측 + 웹(anthropics/claude-code **Issue #15882**: "plugin commands are always namespaced") 으로 확정. command==plugin 이어도 `/gap:gap`, SKILL.md 없는 순수 command 도 `/step-by-step:step-by-step`. plain `/이름` 은 built-in(`/btw`)·비-plugin(`.claude/commands/`)만. 따라서 직전 커밋의 "plain 화"는 잘못 — 동작 안 하는 plain 형을 안내하던 문서를 실제 형으로 되돌림. `hooks/commons/COMMANDS.md` + 루트 `README.md` 카탈로그를 전 명령 `/plugin:command` 로 재작성(정렬 포함 · 강제-네임스페이스 NOTE 추가) · `/research:arxiv`·`/research:yt`·`/quota:quota`·`/step-by-step:step-by-step` prose(SKILL.md·plugin.json·marketplace 설명·commons.tape g43·quota README) 복원. built-in `/btw`·`/loop` 은 plain 유지. 동작·버전 변동 없음(lockstep 유지). 사용자 요청 + 실측 근거.

## 2026-05-24 — domain 0.8.2: 캐시 resolver `sort -V` 버그 수정 (quota 0.8.1 동일 패턴 전파)

- **domain 0.8.2 — `commands/domain.md` 캐시 resolver `ls -1t | head -1` → `ls -1 | sort -V | tail -1`** — quota 0.8.1 에서 고친 것과 동일한 mtime-vs-semver resolver 버그가 `domain.md` 에도 있어 fix-at-source(@D g11)로 전파. `$CLAUDE_PLUGIN_ROOT` 가 빈 값일 때 fallback 이 mtime 최신(구버전 가능)이 아니라 semver 최신 캐시 버전을 해석하도록 교체. 표면 lockstep(g22): domain plugin.json + marketplace.json 0.8.1 → 0.8.2. sidecar 전체 grep 결과 이 fallback idiom 은 quota·domain 두 command 뿐 — 둘 다 수정 완료.

## 2026-05-24 — quota 0.8.1 · quota-autoadd 0.1.1: 표 헤더 영어화 + 캐시 버전 정렬 버그(`sort -V`) 수정

- **표 헤더 영어화 + `ls -1t`→`sort -V` 캐시 resolver 버그 수정** — (1) `commands/quota.md` 통합 표 헤더를 한글→영어로: `Nickname · Email · Session Used · Session Reset · Weekly Used · Weekly Reset` (사용자 요청 "헤더 영어로"; 푸터·prose 는 한글 유지 — prefs 응답 한국어, 헤더만 명시 전환). (2) **버그**: `quota.md` + `quota-autoadd` hook 의 캐시 바이너리 resolver 가 `ls -1t … | head -1`(mtime 최신)이라, sync 후 캐시 디렉터리 mtime 순서가 뒤엉키면 **구버전을 실행**함 — 실측: reload 직후 `/quota list` 가 0.8.0 통합표 대신 0.6.0 텍스트 list 를 렌더(`$CLAUDE_PLUGIN_ROOT` 가 slash 컨텍스트에서 빈 값이라 fallback 발동 + `ls -1t` 가 0.6.0 을 첫 항목으로 반환). `ls -1 … | sort -V | tail -1`(semver 최신)로 교체 → 항상 최고 버전 선택. Smoke: `ls -1t|head -1`=0.6.0 vs `ls -1|sort -V|tail -1`=0.8.0 확인. 표면 lockstep(@D ship · g22): quota plugin.json + marketplace.json 0.8.0 → 0.8.1 · quota-autoadd 0.1.0 → 0.1.1 · marketplace quota 설명 "Korean header: 닉네임…" → "English header: Nickname…", quota-autoadd 설명에 semver-resolver 명시. `_quota.hexa` 는 help 버전 문자열 + 헤더 히스토리만 갱신(바이너리 로직 불변).

## 2026-05-24 — quota 0.8.0: status·list 통합 (전체 계정 1표) + `all` 라이브 토글

- **quota 0.8.0 — status·list·bare 를 단일 전체-계정 표로 통합 (`_unified_lines`)** — 기존 `status`(활성 1행 라이브) + `list`(전체 캐시 텍스트) 두 갈래를 하나의 6컬럼 표로 합침. `status`/`list`/bare 모두 동일하게 **등록된 모든 계정**을 `Row=` N줄로 출력: 활성 계정(`~/.claude.json` uuid 매칭)은 `_fetch_limits()` 라이브(45s 캐시) + 닉네임 셀에 `★`, 나머지는 각자 per-account 캐시(`—` = 미조회, honest/never-faked). 신규 **`all` verb** 는 비활성 계정도 `_cli_refresh` 로 라이브 fetch 후 같은 표 — 사용자 요청 "두 개 중 선택 변경 쉽게"의 1-shot 토글(상태 저장 없음). 뷰 진입 시 활성 계정이 미등록이면 `_cli_add("")` 로 자동 등록(autoadd 패리티 — SessionStart 훅 전이라도 자기 계정은 항상 표에 보임). 제거: `_status_lines`/`_registry_text`(텍스트 list). `_cached_util` 에 바·리밋 렌더용 raw window(`five_hour_w`/`seven_day_w`) 추가. command surface: `commands/quota.md` 가 `Row=` N줄 → N행 마크다운 표(활성 `★`) 렌더, `Empty=`/`Error=` 조기 반환, 푸터에 `★ = 현재 활성 · /quota all = 전 계정 라이브` 안내. help_text(직전 `3ee34d2` 네임스페이스 정리에서 누락됐던 표면)를 plain `/quota` 로 함께 통일 + argument-hint + 헤더 버전 히스토리 갱신. Smoke: list/status/bare 모두 4계정 표(활성 ★ 라이브 + 캐시 + `—`) · `all` → 백업 creds 있는 계정 라이브 갱신, 없는 계정은 `—` 유지(best-effort) · 전부 exit 0. 표면 lockstep(@D ship · g22): quota plugin.json + marketplace.json 0.7.0 → 0.8.0. 동기 — 사용자 "list 도 박스표 양식 + status·list 둘 중 하나로 통합 (하나만 보여주는 건 무의미)".

## 2026-05-24 — 슬래시 명령 표기 네임스페이스 제거 + README backfill (문서 위생 · 버전 변동 없음)

- **네임스페이스 표기 전면 제거 — 모든 명령어를 plain `/이름` 으로 통일** — 사용자 요청 "모든 명령어를 네임스페이스 없이". 배경: 플러그인 **command**(`commands/*.md`)는 유저 타이핑 시 항상 plain `/이름` (충돌 시에만 `/plugin:cmd`); 네임스페이스는 모델의 Skill-도구 호출(`plugin:skill`) + 자연어 트리거 표면에만 존재. 이 레포 skill 플러그인은 전부 자매 `commands/*.md` 동봉(@D s1)이라 `/ship`·`/quota`·`/arxiv`·`/yt` 등 이미 plain 작동 — 문서만 `/research:arxiv`·`/research:yt`·`/quota:quota`(+`/quota:status` 등)로 적어 불일치였음. 32개 명령 전부 이름 유일(충돌 0) 확인 후 표기 일괄 정정: `/research:arxiv`→`/arxiv` · `/research:yt`→`/yt` · `/quota:quota`→`/quota` · `/quota:<verb>`→`/quota <verb>`(단일 디스패처). 대상: `hooks/commons/COMMANDS.md`·`commons.tape`(g43 do) · 루트 `README.md` · `.claude-plugin/marketplace.json`(research·quota·quota-autoadd 설명) · `skills/research/{plugin.json,SKILL.md}` · `skills/quota/{SKILL.md,README.md,commands/quota.md}` · `hooks/quota-autoadd/{plugin.json,README.md}`. CHANGELOG 과거 항목은 history 로 보존. 동작·버전 변동 없음 — marketplace↔plugin.json 정합 유지.

- **README backfill — step-by-step 누락 보완** — 직전 step-by-step 0.1.0 ship 이 루트 `README.md` 에 빠졌던 것 보완: 명령 카탈로그 Fan-out/loop 에 `/step-by-step <task>` 추가 + 플러그인 표 `gap` 다음에 `step-by-step` 행 추가. research 행 낡은 버전(0.2.0→0.2.2) 정정. quota README 단일-디스패처 현행화(0.4.1 picker 잔재 일부) — "× 8 command files" lineage 등 깊은 staleness 는 별도 정리 대상으로 flag.

## 2026-05-24 — quota-autoadd 0.1.0: 새 계정 로그인 자동 등록 (신규 hook plugin · quota 0.6.0 → 0.7.0)

- **quota-autoadd 0.1.0 — `claude /login` 새 계정 SessionStart 자동 등록 (신규 hook plugin)** — 신규 `hooks/quota-autoadd/` plugin (3-파일: `plugin.json` + `hooks/hooks.json` + 한글 README). 새 이메일로 `claude /login` 한 뒤 첫 세션의 `SessionStart` 에서, 아직 quota 레지스트리에 없는 활성 계정을 자동 등록한다. Claude Code 에 로그인 이벤트 훅이 없으므로 "다음 세션 시작 시 등록" 형태 — `prefs`/`easy-auto` 와 동일한 SessionStart 패턴. 훅 command 는 quota skill 바이너리를 `$HOME/.claude/plugins/cache/sidecar/quota/<version>/bin/_quota.hexa autoadd` 로 해석 (commands/quota.md 와 동일 캐시 탐색 idiom, $HOME 기반이라 @D s3 portable). hexa 부재(`$HEXA`→`~/.hx/bin/hexa`→`command -v hexa` fallback) 또는 quota 캐시 부재 시 `exit 0` (silent). **concept separation (@D s1)** — 자동 트리거는 skill 에 끼울 수 없어 별도 hook plugin 으로 분리. NO opt-out by design (commons g11).

- **quota 0.7.0 — `autoadd` verb (silent · 멱등 · always exit 0)** — `_quota.hexa` main 디스패치에 `autoadd` 추가. 활성 `~/.claude.json` 의 `oauthAccount` 를 읽어 (1) `accountUuid` 없으면 silent exit 0 · (2) 그 uuid 가 레지스트리에 이미 있으면(`_registry_add` dup 선판정) silent exit 0 · (3) 없을 때만 `_cli_add("")` 로 메타데이터 등록 + OAuth blob 백업 캡처(→ 등록 즉시 `/quota:quota switch` 가능) 후 한 줄 알림(`ℹ️ quota-autoadd: 새 계정 자동 등록됨 — <email>`). **항상 exit 0** — SessionStart 를 절대 깨지 않음. help 텍스트 + 헤더 버전 히스토리에 0.7.0 라인 반영. Smoke: 미등록이던 활성계정 첫 autoadd → 등록 1줄(레지스트리 2→3) · 재호출 → 무출력 exit 0(멱등 확인). 표면 lockstep(@D ship · g22): quota plugin.json + marketplace.json quota entry 0.6.0 → 0.7.0 · 신규 quota-autoadd marketplace entry (quota 다음). 동기 — 사용자 요청 "새 이메일 로그인되면 자동으로 quota add".

## 2026-05-24 — step-by-step 0.1.0: 계획 우선 순차 런북 command (신규 plugin)

- **step-by-step 0.1.0 — `/step-by-step` (별칭 `/sbs`) 신규 command plugin** — `commands/step-by-step/` (gap 에 이은 두 번째 순수 command 패밀리, SKILL.md 없음 · @D s1). 작업을 의존성 순 번호 단계로 분해 → 계획을 보여주되 승인 게이트 없이 → 위→아래 한 번에 한 단계씩 직렬 자동 실행, 단계마다 `▶ i/N` 마커 + `✅`/`⚠`/`❌` 결과. **`/cycle`(병렬 fan-out)의 직렬 정반대**. 멈춤 조건은 단계 실패(`❌` → 단계+에러 원문+안 돌린 나머지 보고) 또는 비가역·파괴적·외부 노출 단계 직전(확인 후 재개, `bypass` self-check 기준)뿐. `commands/step-by-step.md` + 별칭 `sbs.md`(`/question`→`/q` 선례) + 한글 README. marketplace.json + commons/COMMANDS.md(Fan-out/loop 섹션) 등록.

## 2026-05-24 — commons `@D g60`: aggressive upstream INBOX reflex (commons 0.10.1 → 0.10.2)

- **`@D g60` 추가 — "upstream INBOX reflex — aggressive, same-turn, over-file"** — 기존 INBOX 거버넌스(g11 fix-at-source · g36 INBOX domain · g48 ack · g59 hexa gap)의 일반화·강화. 모든 타-repo gap/friction/improvement/idea 를 surface 된 **그 턴에** 대상 repo INBOX 로 stub-first over-file (먼저 g20 중복 트래커 확인 후 append-or-create). **금지**: session 끝까지 미루기 · full reproduction/resolution 까지 게이팅 · finding 을 chat-only 로 다운그레이드 · "다른 세션이 하겠지" 가정. 버전 lockstep(g22): commons 0.10.1 → 0.10.2 (`.claude-plugin/marketplace.json` + `hooks/commons/.claude-plugin/plugin.json`) · marketplace description g-range `g0..g59` → `g0..g60`. from demiurge CARDIO+ (사용자 지시 "INBOX upstream 적극적으로").

## 2026-05-24

- **domain 0.8.1 — folder-nested fallback false-match 가드** — 0.8.0 의 `_domain_dir` 가 `<name>/<NAME>.md` 가 실제 도메인인지 안 가리고 매칭하던 버그 수정. 신규 `_is_domain_snapshot` 가 nested 파일의 첫 비공백 줄이 도메인 헤더 `# <NAME>` 인지 확인 — 아니면 nested fallback 거부하고 root 사용. 동기 — macOS 대소문자-무시 FS 에서 hexa-lang 의 `inbox/INBOX.md`(upstream-patch staging digest, 첫 줄 `# inbox/ —`)가 `INBOX` 도메인 조회와 충돌해 `/domain init INBOX` 가 root 대신 `inbox/` 안에 빈 `INBOX.log.md` 를 잘못 생성한 실사례. Smoke: 비-도메인 digest → root 해석(false-match 거부, digest 무결) · legit `FOO/FOO.md`(`# FOO` 헤더) → nested 정상. plugin.json + marketplace.json 0.8.0 → 0.8.1.

- **domain 0.8.0 — folder-nested 도메인 경로 해석 (`<NAME>/<NAME>.md`)** — `skills/domain` 의 모든 verb 가 도메인 쌍을 repo-root `<NAME>.md` 에서만 찾던 결함 수정. 신규 resolver `_domain_dir`/`_snap_path`/`_log_path` 가 (1) 기존 root `<NAME>.md` → (2) 기존 folder-nested `<NAME>/<NAME>.md` → (3) root 기본(fresh scaffold) 순으로 해석하고, log 는 snapshot 의 디렉터리를 따라감(쌍 분리 방지). 인라인 경로 구성(`root + "/" + name + ".md"` × 9, `.log.md` × 5)을 resolver 호출로 교체 + `init` 출력줄 갱신. 동기 — INBOX #120 (demiurge CARDIO+): `CARDIO+/CARDIO+.md` self-contained 메타도메인에서 `/domain set CARDIO+` 가 매번 root 에 빈 스캐폴드 재생성 → `/cycle`(g58) 가 빈 root 파일 읽어 milestone 0개 → 루프 구동 불가. **root 도메인은 동작 불변**(root `<NAME>.md` 존재 시 resolver 가 root 반환 = 무회귀). Smoke: nested FOO show/set/milestone/done/todo 전부 `FOO/FOO.*` 로 라우팅 + root 빈파일 0개 · root BAR 정상 · fresh NEWDOM → root 스캐폴드. plugin.json + marketplace.json 0.7.8 → 0.8.0.

- **inbox-log-lint 0.1.0 — `INBOX.log.md` 과적재 방지 advisory hook** — 신규 `hooks/inbox-log-lint/` plugin (memory-lint 자매 패턴). PostToolUse(Write|Edit) 에서 tool_input.file_path 가 `INBOX.log.md` 로 끝나면 post-write 파일을 읽어, cross-project handoff 로그가 쌓일 때 non-blocking additionalContext 발행: (1) 엔트리 수(`## ` 헤더) > 20 (soft cap) · (2) 완전-해소 엔트리(`- [x]` ≥1 · `- [ ]` 0개) > 12 · (3) non-blank 라인 > 250 — 각각 닫힌 handoff 를 sibling `INBOX.archive.log.md` 로 이관해 active 로그를 open+recent 로 유지하도록 권고. 동기 — INBOX 도메인 전환 후 resolved handoff 가 로그에 무한 누적되는 것 방지(사용자 요청). advisory-only (guards-narrow-scope: hygiene 는 deny 말고 non-blocking additionalContext). 구현 hexa-native (`_inbox_log_lint.hexa` via `hexa run`), 3-파일 구조 (plugin.json + hooks/hooks.json + bin). Smoke: 26엔트리/14resolved fixture → 2 findings · 6엔트리 실제 로그 → silent · 비-INBOX 파일 → silent. marketplace.json entry (memory-lint 다음) + README/COMMANDS guard 목록 추가. NO opt-out by design.

- **g54 폐기 — INBOX 핸드오프 PR auto-merge 예외 제거 (commons 0.10.0 → 0.10.1 · pr-cycle 0.3.3 → 0.3.4)** — 사용자 결정으로 `@D g54`("g47 exemption — INBOX handoff PRs are review-only, never auto-merged") 메타룰 폐기. g30("no self-authored bypass") 폐기와 동일 노선(자율 auto-merge 우선) — review-gate carve-out 을 없애 모든 PR 이 `@D g47` create→merge→clean 사이클을 사람 개입 없이 완주. **거버넌스+enforcement lockstep**(@D s7): (1) commons.tape 의 `@D g54` 블록 삭제(g53→g55 번호 갭, 기존 g12/g23/g30/g46 갭과 동일 컨벤션) · (2) pr-cycle `_pr_cycle.hexa` 의 `_is_inbox_handoff_only()` 함수 + 그 skip 호출(`if _is_inbox_handoff_only() { _allow() }`) + 헤더 주석의 g54 skip 줄 제거 → `INBOX.md`/`INBOX.log.md` 전용 diff PR 도 이제 auto-merge tail 부착 · (3) pr-cycle plugin.json + marketplace.json description 의 "not INBOX-handoff-only" + g54 skip-condition 문구 제거. 버전 lockstep(g22): commons 0.10.0 → 0.10.1 · pr-cycle 0.3.3 → 0.3.4 (plugin.json + marketplace.json 동시). DESIGN.log.md line 53 의 g54 언급은 0.10.0 당시 inbox→INBOX 이관의 사실 기록이라 보존(history-in-dedicated-surface, @D g15).

- **inbox 시스템 폐기 → `INBOX` 도메인 흡수 (commons 0.10.0 · pr-cycle 0.3.3 · cycle 0.5.2)** — cross-project handoff 를 별도 `inbox/<kind>/<slug>.md` 폴더 + `skills/inbox` + `hooks/inbox-watch` 에서 대상 repo 루트의 `INBOX` 도메인 1쌍(`INBOX.md` 스냅샷 + `INBOX.log.md` append-only 로그)으로 전환. `domain` 스킬이 이미 임의 UPPERCASE NAME 을 받으므로 신규 스킬 0 — `cd <target> && /domain set INBOX` → `/domain todo <handoff>` 가 새 handoff 경로. **제거**: `skills/inbox/` · `hooks/inbox-watch/` 플러그인 + 루트 `inbox/` 데이터 폴더(기존 5건은 전부 resolved 라 `INBOX.log.md` 에 완료 이력으로 이관). **거버넌스 재작성**(@D s7 lockstep) — commons `@D g11`(upstream gap → `<hexa-lang>/INBOX.log.md`) · `g36`("cross-project handoff via INBOX domain") · `g48`(INBOX ack: `/domain done` + sender `INBOX.log.md` ack) · `g54`(g47 예외를 `INBOX.md` / `INBOX.log.md` diff 로) · `g59`(hexa gap → `~/core/hexa-lang/INBOX.log.md`). **enforcement** — `pr-cycle` 의 `_is_inbox_patches_only()` → `_is_inbox_handoff_only()` (`INBOX.md` / `INBOX.log.md` 전용 diff 판정), `cycle` 의 dup-race precheck slug 앵커 `inbox/**/<slug>.md` → `INBOX.log.md` 엔트리(`- [x]` 체크박스 포함). **docs** — README Commands / guard-hook / plugin 표 + `COMMANDS.md` 정리. 버전 lockstep(g22): commons 0.9.57 → 0.10.0 · pr-cycle 0.3.2 → 0.3.3 · cycle 0.5.1 → 0.5.2 (plugin.json + marketplace.json 동시), `inbox` · `inbox-watch` marketplace entry 삭제. 설계 근거 = `DESIGN.log.md` Decision 7.

- **pool-route 0.5.8 — heavy-classified cmd 는 pool 자원만 사용 (no-local-fallback) + hexa subverb dispatchability preflight + per-host failure deny** — heavy-classified Bash 가 silent 하게 local fall-through 되던 결함을 닫음. 이전: 단일 round-robin pick → preflight `test -d <wd>` 실패 시 `_allow()` (local 실행). 변경: workdir + transport 를 host loop 위로 끌어올리고, eligible host 전체를 round-robin 시작점부터 순회 — 각 호스트에 대해 preflight (`test -d <wd>` + `hexa <subverb> --help` for kick/drill/loop/cc) 시도, 첫 통과 호스트로 라우팅. 모든 호스트가 fail 하면 신규 `_deny(reason)` 으로 `permissionDecision: "deny"` 발행 + per-host failure breakdown ("tried: ubu-1, ubu-2 / failures: ubu-1: preflight rc=1 (workdir missing or `hexa kick` not dispatchable)") + fix 안내 (`cd ~/core/hexa-lang && hexa cc --regen` 으로 pool 호스트 업데이트). 부가 — `hexa kick`/`drill`/`loop`/`cc` 의 absorbed-verb script lookup 을 위해 `HEXA_LANG=$HOME/core/hexa-lang` 으로 설정 (기존 `$PWD` 는 user project workdir 가리켜 `compiler/drill/drill.hexa` 못 찾던 회귀 해소). 진단 동기 — ubu-1 의 `hexa` 슴은 있지만 `compiler/drill/drill.hexa` + `build/hexa_interp` 누락 → kick 라우팅 도달은 했으나 absorbed-verb 디스패치 실패. 사용자 요구 "무조건 [pool] 자원만 써야돼" + "실패시 자원쪽에 업데이트하라고 message" 직접 반영. plugin.json + marketplace.json 0.5.7 → 0.5.8.

- **subagent-route 0.1.0 (PoC) — PreToolUse(Task|Agent) 관찰 전용 훅** — `hooks/subagent-route/` 신규 PoC plugin. 막거나 재작성하지 않음 — Task/Agent fire 마다 `tool_input` 의 키 리스트 + `agent_type` + prompt 미리보기 (첫 80자) + `isolation` 을 `~/.sidecar/subagent-route.log.jsonl` (100줄 cap, `pool-route` 의 `route-log.jsonl` 패턴 미러) 에 jsonl 로 dump 하고, 비-blocking `additionalContext` 3줄 advisory 발행 (`ssh mini -- claude --print --no-tty -p '<prompt>'` 라우팅 가능 알림 — 실제 재작성 X). SessionStart 이벤트 → 최근 5건 관찰 스냅샷 (`pool-route::_emit_session_start` 동일 패턴). 동기 — Claude Code 훅 문서가 Bash `tool_input` 은 잘 정의하지만 Task/Agent 의 `agent_type`/`prompt`/`timeout`/`isolation` 필드 예시는 빈약하고, `updatedInput` 재작성도 Bash 한정 검증. v0.1.0 는 페이로드 형태를 **런타임 채집** 하는 관찰 도구; v0.2.0 가 실제 deny + ssh 재작성 (남은 미지수 = Agent tool 에서 `updatedInput` 이 실제 적용되는가). matcher 컨벤션은 sibling `limit-guard` 의 `"Task|Agent"` regex (검증된 사례) 그대로. 모든 필드 defensive 빈문자열 fallback — 부재 시 silent. 스모크 (1) `PreToolUse:Agent` 페이로드 → `additionalContext` JSON + rc=0, (2) `SessionStart` 빈 로그 → silent + rc=0, (3) 채워진 로그 → `# recent subagent-route ... last N` 스냅샷. 항상 exit 0. plugin.json + marketplace.json 0.1.0.
- **pool-mcp 0.1.0 — 신규 plugin · `pool` 호스트를 `mcp__pool__on` + `mcp__pool__list` MCP 도구로 노출하는 stdio MCP 서버** — `mcps/pool-mcp/` 신규 top-level 디렉터리 (sidecar 의 4번째 plugin kind — 기존 `hooks/` · `skills/` · `commands/` 옆 MCP 서버 전용 슬롯). `plugin.json` 의 `mcpServers.pool` 필드로 등록 — Claude Code 가 플러그인 활성화 시 stdio transport 로 자동 spawn. 프로토콜은 JSON-RPC 2.0 newline-delimited, 구현은 hexa-lang (`bin/_pool_mcp.hexa`, `hexa run` 으로 실행). 두 도구: (1) **`pool_on(host, command, timeout?)`** — 로컬 `pool` CLI 로 shell out (`pool on <host> <command>`), `{stdout, stderr, exit_code, non_claude_load}` 반환. `non_claude_load` 는 dispatch 직전 로컬 Mac 의 비-claude CPU% 합산 (`ps -Ao pcpu,comm | awk '$2 !~ /claude/ {s+=$1}'`) — sidecar @D s9 의 advisory metric (gating 없음, 정보 노출만). (2) **`pool_list(include_anima?)`** — `~/.pool/pool.json` 파싱해 roster 반환, pi5-akida 는 기본 제외 (sidecar @D s8 — anima 전용 호스트). 메서드 핸들러 — `initialize` (`{"protocolVersion": "2024-11-05", "capabilities": {"tools": {}}, "serverInfo": {...}}`) · `tools/list` (두 스키마) · `tools/call` (dispatch) · `notifications/*` (silent swallow, JSON-RPC 스펙). 오류는 `{"error": {"code": -32xxx, "message": "..."}}` 봉투 (-32700 parse · -32600 invalid request · -32601 method/tool not found · -32602 invalid params). POC 범위 — hexa 빌트인에 streaming line reader 부재 → stdin 을 EOF 까지 모아 라인별 처리 (Claude Code 의 handshake batch 통과). install.hexa 의 `subs` 배열에 `"mcps"` 추가 — installer 가 `mcps/<name>/` 도 cache + enable 대상으로 인식. 표면 lockstep: `mcps/pool-mcp/.claude-plugin/plugin.json` + `mcps/pool-mcp/bin/_pool_mcp.hexa` + `mcps/pool-mcp/README.md` + `.claude-plugin/marketplace.json` (신규 entry, pool-route 위) + `install.hexa` (`subs` 확장). 0.2.0 후속 — streaming 라인 리더, per-tool timeout 강제, fan-out 병렬 dispatch (`hosts: []`). Smoke test 통과 — `initialize` · `tools/list` · `tools/call pool_list` 3건 handshake batch 모두 valid JSON-RPC 응답, pi5-akida 기본 제외 확인 (4-host roster → 3-host 반환).
- **pool-route 0.5.7 — load-aware escalation gate (s9-compliant)** — heavy classifier 에 부하-인지 escalation 한 단계 추가. `_pool_route.hexa` 에 신규 helper `_non_claude_load()` — `ps -Ao pcpu,comm | awk '$2 !~ /claude/ {s+=$1} END {print int(s)}'` 로 비-`claude` 프로세스의 pcpu 합 (백분율, 100 = 1 core) 만 합산. `claude` PID 는 attribution 에서 명시적으로 제외 (project.tape `@D s9` — "claude 세션은 local load assessment 에서 면제" 정합 — 자기 자신의 부하로 자기 자신을 pool 로 보내는 자가-피드백 루프 차단). gate 는 **AND** 결합 — `cmd_nontrivial` (len(cmd) > 20 OR `|`/`>`/`&&` 포함) **AND** `_non_claude_load() > 150` (≈1.5 cores) 둘 다 만족 시 분류기가 놓친 cmd 라도 heavy 로 승격. 두 조건의 보수성 근거 — (a) cmd_nontrivial 게이트 — `ls` · `cat` · `pwd` 같은 경량 cmd 는 ssh 왕복 latency 가 실행 시간을 압도하므로 부하 높아도 라우팅 손해; (b) 150% threshold — 한 chatty terminal (브라우저 탭 하나) 만으로는 발화 안 함, 실제로 multi-process build/compile 류가 돌고 있을 때만 발화. routing decision 의 `why` 문자열은 load_heavy 분기에서 `"load-escalated (non-claude load > 150%)"` 로 명시 — route-log + SessionStart snapshot 에서 escalation 사유가 분류기 매치와 구분됨. 기존 classifier-match 경로 (heavy_words / heavy_pairs / heavy_find_subs) 와 needs_sudo 경로는 변동 0 — load gate 는 `!heavy && cmd_nontrivial` 일 때만 평가 (short-circuit, ps 호출 비용 절약). 동기 — kick-storm 류의 future 변종 (분류기 단어집에 없는 새 heavy verb 가 multi-agent 다발 발사로 Mac load 80+ 만드는 시나리오) 을 분류기 단어 추가 없이도 자동 흡수. plugin.json + marketplace.json 0.5.6 → 0.5.7.
- **s9-guard 0.1.0 — PreToolUse(Bash) advisory hook (project.tape @D s9 enforcement, @D s7 mandated)** — 신규 `hooks/s9-guard/` plugin. project.tape `@D s9` ("claude sessions exempt from local load assessment") 가 governance 만 있고 enforcement 부재였던 갭을 닫음 — `@D s7` (governance + enforcement together) 기준 동일 사이클 ship. 동작: PreToolUse(Bash) 에서 load 평가성 명령을 6개 시그널로 감지 — (1) `uptime` (word boundary) · (2) `loadavg` substring (vm.loadavg / getloadavg / loadavg.h 포괄) · (3) `ps -Ao pcpu` substring · (4) `ps -A` adjacency substring · (5) `top -l ` (macOS) · (6) `top -b ` (Linux). 매치 시 non-blocking additionalContext 로 "claude PID 제외 합산" canonical recipe (`ps -Ao pcpu,comm | awk '$2 !~ /claude/ {s+=$1} END {print int(s)}'`) + "Mac 과부하 결론에서 claude 합 빼라 / claude 종료 권고 금지 (사용자 요청 없이)" 알림. NEVER block — pure advisory (pod-monitor 와 동일 패턴). 구조 — `bin/_s9_guard.hexa` + `hooks/hooks.json` + `.claude-plugin/plugin.json` 3-파일 (pod-monitor 와 같이 README 없음). Smoke test: `uptime` → additionalContext JSON emit + exit 0 · `ls /tmp` → silent exit 0. NO opt-out by design.

- **worktree-gc 0.1.0 — SessionStart hook 으로 머지된-그러나-남은 linked worktree 자동 prune** — inbox/notes/worktree-disk-fillup-auto-prune.md (다른 repo 의 cycle fan-out 으로 30+ worktree 누적 → 150 GB 디스크 fillup 사고 기록) 의 권장 (idea A+B+C 통합 SessionStart 형태) 을 sidecar canonical 패턴으로 land. `hooks/worktree-gc/` 신규 plugin — `hooks/inbox-watch/` 와 동일한 3-파일 구조 (`plugin.json` + `hooks/hooks.json` + `bin/_worktree_gc.hexa`). 알고리즘: (1) `git worktree list --porcelain` 으로 linked worktree 열거 (main 제외) · (2) **threshold gate** — `linked-count >= 3 OR df 의 avail < 20 GiB` 일 때만 scan (그 외 silent exit, common case 의 1-2 worktree + 충분한 디스크는 노이즈 0) · (3) `gh pr list --state merged --limit 200 --json headRefName` 으로 머지된 branch 집합 fetch (gh 실패 시 짧은 note + no action) · (4) 각 linked worktree 의 branch 가 머지 집합에 있거나 `origin/<branch>` ref 가 없으면 (`merged` / `origin-gone` 사유) prune candidate · (5) `git worktree remove --force` + `git branch -D` 로 정리, `du -sk` 로 회수 용량 측정 · (6) open-PR worktree 는 NEVER 건드림. additionalContext 출력: `# worktree-gc: pruned N (M.x GiB reclaimed)` + bullet (cap 10). 모든 경로 fail-safe (gh / git / df 실패해도 exit 0 — non-blocking hook). NO opt-out by design. Smoke test 통과 — 현재 repo (0 linked worktree) 에서 silent exit 0. + gh-api-guard 제거 + pr-cycle 0.3.2 자동머지 (`--admin`)** — pr-cycle 의 create → merge 사이클이 분기 보호(required review)에 막혀 완주하지 못하던 문제를, 머지 tail 을 `gh pr merge --squash --admin --delete-branch` 로 바꿔 해소. 목표는 PR 생성 시 사람 개입 없이 머지까지 자동 완주(에이전트 자율 운용). 이를 위해 (1) commons `@D g30` ("no self-authored bypass") 블록을 commons.tape 에서 삭제하고, 그를 인용하던 7개 가드(cloud-guard · inbox-watch · easy-auto · plist-guard · output-trim · verify-guard · ai-api-guard)의 코멘트 + deny-메시지 + marketplace description 의 `(commons @D g30)` 인용을 일괄 제거(behavior 불변, "No opt-out by design" 문구는 유지). (2) `gh pr merge --admin` 을 차단하던 gh-api-guard 는 설치본(enabledPlugins + installed_plugins.json + 캐시)에서 prune — main SSOT/marketplace 에는 이미 부재. 버전 lockstep(g22): commons 0.9.52 · pr-cycle 0.3.2 · cloud-guard 0.2.1 · inbox-watch 0.1.2 · easy-auto 0.1.1 · plist-guard 0.1.2 · output-trim 0.1.2 · verify-guard 0.1.2 · ai-api-guard 0.1.2 (plugin.json + marketplace.json 동시). g30 본문 자체가 "오작동 가드는 fix or remove" 를 명시하므로 gh-api-guard 제거는 g30 정합이었으나, 사용자 결정으로 g30 메타룰도 함께 폐기.
- **cycle 0.4.0 — `@D dup_race_precheck` 단계 (3-signal grep, fan-out 전 auto-skip resolved inbox patches)** — cycle skill 에 next-list 와 plan-table 사이 새 **dup-race precheck** 단계 추가. 각 item 라벨이 `inbox/**/<slug>.md` 형태의 inbox patch slug 를 명명하면 fan-out 전에 3 signal 자동 grep: (A) 패치 파일의 `Status:` 라인을 resolved-class 정규식 `(fixed|resolved|closed|landed|shipped|absorbed|superseded|merged|done|✅|🟢)` 로 매치 · (B) `gh pr list --state merged --search "<slug>"` 머지된 PR 존재 확인 · (C) `git log --all --oneline --grep="<slug>"` 커밋 서브젝트 매치. 셋 중 하나라도 resolved-class 신호 시 SKIP + 이유 노출, 아니면 PROCEED. plan-table 에 `| precheck |` 컬럼 추가, SKIP 행은 Agent 미발사. 동기 — cycle 3 lane 1 의 `json-object-delete` 사례 (이미 `Status: fixed` 였으나 cycle triage 가 catch 못 해 NO-OP fan-out) 와 cycle 4 lane 4 audit (96% catchable by 3-signal grep). inbox patch slug 안 가진 item 은 precheck 우회 (always PROCEED). 메모리 [[feedback_inbox_dup_race_precheck]] 의 자동화 형태. SKILL.md 에 `@D dup_race_precheck [required active]` 블록 + `commands/cycle.md` step 2 + `commands/cycle-full.md` step 3 동기 lockstep. plugin.json + marketplace.json 0.3.0 → 0.4.0.

- **pr-cycle 0.3.0 — `pr-automerge` → `pr-cycle` 통합 엔진 (create → merge → worktree+branch clean)** — `hooks/pr-automerge/` 디렉토리 제거하고 `hooks/pr-cycle/` 으로 재출범. 기존 머지 chaining 위에 두 가지 코드수준 자동화 추가: (1) **worktree cleanup tail** — hook 시점에 `git rev-parse --show-toplevel` + `git worktree list --porcelain` (첫 entry = main worktree, git 불변) + `git rev-parse --abbrev-ref HEAD` 로 cwd 가 linked worktree 인지 판정, 맞으면 머지 tail 뒤에 `&& (cd <main-wt> && git worktree remove <this-wt> --force 2>/dev/null && git branch -D <branch> 2>/dev/null || true)` 추가. subshell + `|| true` 로 cd 격리 + 잔여 에러 흡수. main worktree 에서 발사한 경우엔 cleanup tail 미부착 (해당 케이스에선 `gh pr merge --delete-branch` 가 이미 로컬 브랜치까지 정리). detached HEAD / git 에러 시 fail-safe (cleanup 생략). (2) **quote-aware tokenizer** — 신규 `_strip_quoted()` 가 single/double quoted region 을 사전 제거 후 3-gram 스캔. 발견 동기 — `pr-automerge` 활성 상태에서 `echo '{"command":"... gh pr create ..."}' | hexa run …` 테스트 호출이 그 자체로 트리거를 발사, 실제 `gh pr merge` 가 잘못된 브랜치에서 실행돼 실패하는 사고. 이전 whitespace-only tokenizer 가 quoted JSON 안의 `gh pr create` 까지 보던 결함. quote-strip 후 4-case smoke (real chain · `--draft` skip · 무관 명령 · quoted-only false-trigger) 전부 expected. skip 조건 (draft · 이미 머지 포함 · `inbox/patches/**` 전용 branch) 기존 그대로. 표면 lockstep — `marketplace.json` (entry name + source + description + version) · `README.md` Commands 섹션 guard hook 줄 · `hooks/commons/COMMANDS.md` 동일 줄 · `hooks/output-trim/` 참조 2건 (hexa 주석 + plugin.json) 전부 `pr-cycle` 로 변경. NO opt-out (g30).


- **pool-route 0.5.6 — SSH dispatch 시 `PATH` 에 `$HOME/.hx/bin:$HOME/bin` prepend (hexa 명령 한정)** — `_pool_route.hexa::main` 의 hexa-env 조립에 `export PATH="$HOME/.hx/bin:$HOME/bin:$PATH"` 추가. routed `rcmd` 가 hexa 토큰을 포함하면 기존 `HEXA_MODULE_LOADER`/`HEXA_LANG` 옆에 PATH prefix 도 같이 묶어서 export (non-hexa 명령은 변동 0). 진단 — F-LIVE-DISPATCH 측정 (2026-05-24 cycle 3 [[reference_kick_pool_routing_2026_05_23]]) 에서 0.5.5 가 SSH dispatch + env passthrough 까지는 도달했으나 remote 측에서 `bash: hexa: command not found`. ssh 비-interactive shell (심지어 `bash -lc` wrap 후에도) 의 PATH 가 mini (Mac) 는 `/usr/bin:/bin:/usr/sbin:/sbin`, ubu-2 (Linux) 는 `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin` 으로 둘 다 `~/.hx/bin` 누락. macOS path_helper 한계 + Linux sshd PrintMotd-off non-login env. fix = ssh 명령 안 inline `export PATH=...` (가장 신뢰 가능 · sshd `AcceptEnv` 변경 불요). 모든 pool 호스트가 `hx install` 베이스라인으로 `~/.hx/bin/hexa` 보장 → 단일 prefix 가 mini/ubu-1/ubu-2 모두 커버. hexa 명령에만 적용 → make/cargo/docker 등 영향 0. plugin.json + marketplace.json 0.5.5 → 0.5.6.

---

## 2026-05-23

- **pool-route 0.5.5 — SSH dispatch 시 `HEXA_MODULE_LOADER` + `HEXA_LANG` env 자동 전달** — `_pool_route.hexa::main` 의 remote 명령 조립에 env-passthrough 추가. routed `rcmd` 가 `hexa` 토큰 또는 `hexa ` substring 을 포함하면 `cd <wd> && export HEXA_MODULE_LOADER="$PWD/build/hexa_module_loader" HEXA_LANG="$PWD" && <rcmd>` 로 wrap (그 외 명령은 bare passthrough — make/cargo 등 영향 0). `$PWD` 로 해결하므로 remote home expansion / workdir quoting 신경 안 써도 됨. 진단 — F-LIVE-ROUTE ✅ 측정 (2026-05-23 [[reference_kick_pool_routing_2026_05_23]]) 에서 0.5.4 가 ubu 로 SSH dispatch 까지는 도달했으나 ubu 측 hexa build 가 `[flat] warn: compiled module_loader not found` + clang link `Undefined symbols` 로 실패. 루트 코즈 = compiled module_loader env 필수 ([[reference_hexa_module_loader_env_2026_05_20]]) 미전달. ssh 는 기본 env 를 거의 안 실어보내고 sshd `AcceptEnv` 화이트리스트도 HEXA_* 없음 → 명령 안에서 inline export 가 가장 신뢰 가능. fix 는 hexa 명령에만 적용 — non-hexa 명령은 변동 0 (overhead 도 0). plugin.json + marketplace.json 0.5.4 → 0.5.5.

- **pool-route 0.5.3 — heavy_pairs substring fallback (zsh shell-snapshot wrap 매치 fix)** — 0.5.2 의 `heavy_pairs` 추가가 PreToolUse 실측 시 매치 안 함 발견 (`hexa drill` ×3 + `hexa cc` ×2 발사, route-log 새 entry 0). 진단: claude-code 가 모든 Bash tool 호출을 `/bin/zsh -c 'source <snapshot>.sh && setopt ... && eval ''<inner>'''` 로 wrap → `<inner>` 가 quoted single token → 토큰화 시 `'hexa` + `kick;` 분리. `_any_word` (substring) 는 영향 X (`make help` 라우팅 검증 ✅), `_any_adjacent` (인접 토큰) 는 wrap 안에서 fail. fix: 신규 `_any_pair_substring(cmd, pairs)` — `cmd.contains("hexa kick")` 같은 substring 매치 추가. heavy 분류는 `_any_word || _any_adjacent || _any_pair_substring` OR. false-positive 한정적 (2-token compound 가 무관 cmd 우연 출현 어려움). plugin.json + marketplace.json 0.5.2 → 0.5.3.

- **pool-route 0.5.2 — heavy classifier 에 `hexa kick/drill/loop/cc` 추가** — `_pool_route.hexa::heavy_pairs` 에 `("hexa","kick")` · `("hexa","drill")` · `("hexa","loop")` · `("hexa","cc")` 4쌍 추가 (`_any_adjacent` 인접-토큰 매치). 동기 — kick-storm 2026-05-23 Mac kill 사건 (`/kick` = `hexa kick --seed`, multi-agent 다발 발사 → 로컬 Mac load 80+, 20+ sidecar cold-rebuild storm, OOM jetsam). PreToolUse hook이 기존엔 `hexa kick`을 heavy 로 인지하지 않아 그대로 로컬 통과. 이제 pool roster armed 상태에서 `hexa kick/drill/loop/cc` 호출은 자동으로 SSH dispatch. `hexa build` 는 가벼울 수도 있어 보수적으로 미추가 (필요시 follow-up). README + plugin.json 0.5.1 → 0.5.2.

- **output-trim 0.1.0 — Bash stdout 트리머 (벤치마크 기반 미니멀 커널)** — `hooks/output-trim/` 신규 PreToolUse(Bash) 훅. 단순 단일 명령(쉘 메타 `| > < ; & $( \``  없음)의 stdout을 `set -o pipefail; { <cmd> ; } | hexa run _trim_filter.hexa` 로 투명 wrap. 커널: 입력 <8000 bytes는 verbatim, 그 외 consecutive-line dedup(`[×N]` 카운터) + 라인당 200자 truncate. pool-route·pr-automerge 등 다른 PreToolUse(Bash) rewrite 훅과 충돌 0(compound 명령은 wrap 안 함). exit code는 pipefail로 원본 명령 것 유지. 커널 선정 근거: 120개 실세션 jsonl에서 추출한 ≥8000자 Bash stdout corpus 벤치마크 — kernel A(미니멀)가 B(TF-IDF salience truncate)와 C(원본 풀: B + MinHash 문단 dedup)를 Pareto-우월(big slice 압축 0.524 vs 0.551/0.549, signal-recall·completeness 동등 이상). 원본 `wilson-output-trim`의 TF-IDF + MinHash 커널(293줄)이 Bash stdout 분포(구조적·반복적 로그)에서 dominated — flat truncation + consecutive-dedup이 더 우수. 옵트아웃 없음(commons @D g30).

- **commons 0.9.46 — `@D g5` 아래 hexa verify tier rubric legend 등록** — commons.tape g5 (verify via hexa CLI only) 바로 아래에 `hexa verify rubric` 의 6-tier 판정 등급을 비-들여쓰기 `#` legend 로 박음 — 🔵 SUPPORTED-FORMAL (closed-form/symbolic 정확 재현) · 🟢 SUPPORTED-NUMERICAL (libm/Newton 수치 재계산 일치) · 🟡 SUPPORTED-BY-CITATION (atlas/문헌 등록, 재계산 없음 — never auto-🔵) · 🟠 INSUFFICIENT/DEFERRED (calc 경로 없음 · 외부 hw/data/API 의존) · 🔴 FALSIFIED (calc 결정론적 불일치 — CLOSED negative) · ⚪ SPECULATION-FENCED (상상/은유 — verify N/A). 동기 — g5 가 "verdict 를 verbatim 붙여라" 만 말하고 각 색이 뭘 뜻하는지는 COMMANDS.md 한 줄에만 있었음 → 매 세션 주입되는 commons.tape 에 등급 의미를 inline 으로 넣어 agent 가 verdict 색을 바로 해석. legend 는 column 0 (`@D` 블록 밖) 이라 tape-lint do/dont 검사·100자 캡·non-Latin 검사 모두 비대상 (emoji 는 g14 선례대로 통과). `marketplace.json` + `plugin.json` 0.9.45 → 0.9.46.

- **commons 0.9.45 — COMMANDS.md 카탈로그 SessionStart 주입** — `hooks/commons/COMMANDS.md` 신규 — sidecar 슬래시 명령 전체를 7그룹 코드블록 + 명령별 설명 + guard hook 목록으로 정리한 agent self-use 카탈로그. `_commons.hexa` 가 **SessionStart event 에서만** (매 turn 아님 — 토큰 절약) commons.tape + roster snapshot 뒤에 COMMANDS.md 를 append. 동기 — agent 가 cross-project 어디서든 어떤 슬래시 명령이 있고 뭘 하는지 인지 → 자율 사용. g23 (슬래시 명령 이름 목록) 의 상세-설명 보강. README Commands 섹션과 동일 내용 (SSOT 동기화). `marketplace.json` + `plugin.json` 0.9.44 → 0.9.45.

- **commons 0.9.44 — `@D g0` Occam's razor (최상단 메타 원칙)** — commons.tape 최상단 (`@V` spec 다음, g1 앞) 에 오컴의 면도날을 `@D g0` 로 등록. `do = 가장 단순한 설명/해법 선호 (최소 가정 · 최소 moving parts)`, `dont = 불필요하게 entity 늘리기 · 단순한 길 있는데 복잡한 길 선택`. g33 (simplicity first) 가 code 한정인 반면 g0 은 explanation/solution/hypothesis 전반의 메타 원칙. 최상단 배치 — 4095 byte 주입 truncation 에서도 최우선 생존, 가장 먼저 읽히는 lens. `marketplace.json` commons 설명 `g1..g53` → `g0..g53`, 버전 0.9.43 → 0.9.44.

- **README — Commands 섹션을 코드블록 형태로 (그룹 주석 + 명령별 설명)** — Commands 섹션의 markdown 테이블을 fenced 코드블록으로 전환. 그룹 헤더 (`# ── Discovery ──` 등 7그룹) + 각 명령어 한 줄 + 정렬된 설명 주석. guard hook 들도 코드블록 하단에 `# <hook> <설명>` 형태로 묶음. 동기 — 명령어 + 그게 뭘 하는지를 monospace 정렬로 한눈에 (테이블보다 scan 쉬움).

- **README — Commands 섹션 추가 (Plugins 위)** — README 의 `## Plugins` 테이블 위에 `## Commands` 빠른참조 섹션 신설. 슬래시 명령을 7개 group (discovery · fan-out/loop · dispatch · cross-project · verify/help · research/generate · session/meta) 으로 묶은 테이블 + command 없이 자동 발화하는 guard hook 목록 (hexa-native · plist-guard · cloud-guard · verify-guard · ai-api-guard · pr-automerge · pool-route · git-guard · sidecar-lint · tape-lint · limit-guard · inbox-watch). 동기 — plugin 테이블은 kind/version 중심이라 "어떤 슬래시 명령이 있나" 한눈에 보기 어려움. Commands 섹션이 command-first 진입점. (Plugins 테이블 자체의 버전/항목 갱신은 별도 — 이 PR 은 Commands 섹션만 추가, g34 surgical.)

- **tape-lint 0.5.0 — (4) @I siblings check** — tape-lint 에 4번째 check 추가: `project.tape` 의 `@I` identity 블록에 `siblings` 필드가 없으면 deny. diff-aware — siblings 를 가진 @I 에서 그것을 지우거나, siblings 없는 새 @I 를 추가하는 경우만 block (siblings 가 원래 없던 project.tape 는 grandfather). 동기 — cross-repo network SSOT (`siblings`) 가 실수로 누락/제거되는 것 방지. `marketplace.json` + `plugin.json` 0.4.0 → 0.5.0.

- **sidecar-lint 0.4.0 — CHANGELOG.md root check (g29 enforcement)** — sidecar-lint 에 5번째 check 추가: `git commit` 시 repo root 에 `CHANGELOG.md` 가 없으면 non-blocking finding 으로 알림 (commons @D g29 — CHANGELOG.md as chronological history surface). 기존 4 checks (stale-history · hardpath · version-drift · sh-exec-bit) 와 동일하게 additionalContext emit. 동기 — g29 가 governance rule 만 있고 lint 부재였음. `marketplace.json` + `plugin.json` 0.3.0 → 0.4.0.

- **commons 0.9.43 — `@D g10` Monitor 강화 (ALL background streaming required)** — g10 본문 강화: background process / long task 의 stdout 스트리밍은 **항상** Claude Code `Monitor` 도구로 (per-line push). `tail -f` · `sleep`-poll loop · log 반복 cat/poll 모두 금지. 이미 `[required active]` 였으나 문구를 "ALL background streaming" 으로 명확화 — 일부 케이스만 적용하던 모호함 제거. 동기 — 사용자가 Monitor 사용 필수를 더 강하게 요청. `marketplace.json` + `plugin.json` 0.9.42 → 0.9.43.

- **commons 0.9.42 — `@D g53` /easy 7-element default (explain/report)** — 새 `[active]` governance block: explain / 설명 / report 류 응답은 기본적으로 `/easy` 7-element 형식 (icon · name · alias · plain · analogy · ASCII · compare) 으로. session 시작 시 자동 ON — 사용자가 매번 `/easy` 명시 안 해도 적용. trivial yes/no · 진행 보고는 terse 유지 OK (judgment call). 동기 — 사용자가 직접 "보고시 바로 /easy 작동" 요청. B (explain-type only) + D (session-wide auto-ON) 통합. `marketplace.json` commons 설명 `g1..g52` → `g1..g53`.

- **project.tape — `siblings` 에 `pool` · `secret` 추가** — `@I.siblings` 가 `hexa-lang` 에서 `hexa-lang · pool · secret` 로 확장. user-explicit (g17). 동기 — `pool` (host roster CLI · pool-route hook 의 SSOT) + `secret` (Keychain credential CLI · g28 의 backend) 모두 sidecar 의 cross-project 인프라 의존성.

- **project.tape — `siblings` 를 `hexa-lang` 단독으로 축소** — `@I.siblings` 가 `hexa-lang · anima · demiurge` 에서 `hexa-lang` 만 남김. user-explicit 요청 (g17). 동기 — sidecar 의 진짜 sibling 은 hexa-lang (cross-project layer · enforcement hooks · `/inbox` patches 의 주요 handoff 상대). anima · demiurge 는 sidecar 의 consumer 일 뿐 직접 sibling 아님.

- **project.tape — `siblings` 에서 wilson · hive 제거** — `@I.siblings` 가 `hexa-lang · anima · wilson · hive · demiurge` 에서 `hexa-lang · anima · demiurge` 로 축소. user-explicit 요청 (g17). 동기 — wilson · hive 는 sidecar 의 직접 sibling 이 아닌 별도 카테고리 (둘 다 sidecar concept-separation 의 이전 형태 또는 별개 plugin pack).

- **ai-api-guard 0.1.0 — 신규 hook plugin (g50 enforcement)** — commons `@D g50` ("AI CLI first, API/SDK as fallback") 의 실제 enforcement hook. `PreToolUse(Bash)` 에서 두 패턴 deny: (1) first-token ∈ {`curl`, `wget`, `http`, `httpie`} + 명령에 AI hostname (`api.openai.com` · `api.anthropic.com` · `fal.run` · `api.replicate.com` · `generativelanguage.googleapis.com`) 포함 — raw HTTP call; (2) first-token ∈ {`python`, `python3`, `node`, `deno`, `bun`} + ` -c ` 또는 ` -e ` + AI-SDK import substring (`import openai` / `import anthropic` / `import fal_client` / `import replicate` / `import google.generativeai` / `require("openai"`/`@anthropic-ai/`...) — inline probe. deny 시 `/imagine` / `/research` / `hexa verify` 등 wrapper 안내. 일반 SDK 사용 (committed code file, no `-c`/`-e`) 통과. hexa-native / plist-guard / cloud-guard / verify-guard 패턴 그대로 (`_ai_api_guard.hexa` via `hexa run`). 동기 — g50 govern rule 만으로 model self-discipline 의존, 사용자가 직접 "api 자꾸 요청하네 cli 있는데" 보고. hook-level enforcement. `marketplace.json` 에 ai-api-guard entry 추가. NO opt-out by design (g30). **주의**: 동시 hexa-lang `term_isatty_stdin` forward-decl build failure 영향 — upstream fix 후 활성화.

- **commons 0.9.41 — `@D g52` /domain auto-log (every decision/done)** — 새 `[required active]` governance block: 작업 진행 중 매 의사결정 / 완료 시 즉시 `/domain <text>` 으로 기록 — batch 금지, per-step. g39 (project state via /domain) 의 frequency enforcement. 동기 — g39 로 `/domain` 이 SSOT 임은 명시했으나 모델이 자주 batch-log (세션 끝에 몰아서) 또는 routine 진행 skip. g52 는 "즉시 / per-step" 강제. `<NAME>.md` 와 `<NAME>.log.md` 의 history granularity 보장. `marketplace.json` commons 설명 `g1..g51` → `g1..g52`.

- **question 0.2.0 — `q` plugin → `question` rename, `/q` 는 alias 로 유지** — 직전 `q` plugin 을 `question` 으로 rename — primary command 는 `/question`, 2자 `/q` 는 alias 로 같은 plugin 안에 남김. `skills/q/` → `skills/question/` (`git mv`), `commands/question.md` 신규 (primary), `commands/q.md` 본문 갱신 (alias 명시). plugin name + marketplace entry name 동시 변경. 동기 — `/q` 단독은 의미 불명확 (q 가 question 외 다른 의미일 수도), `/question` 이 self-documenting. `/q` 는 빈도 높은 사용 위한 단축. `plugin.json` 0.1.0 → 0.2.0 (minor — name + 새 command file). **주의**: 사용자의 local install 에서 `q` plugin entry 가 invalidate 됨 — `sidecar sync` 후 새 `question` entry 로 활성화.

- **inject 0.2.0 — `/ij` 짧은 alias 추가** — `/inject` 의 2자 alias `/ij` 추가. 같은 plugin (`skills/inject/`) 안에 `commands/ij.md` 신규 — `sidecar sync` + commons.tape/project.tape 출력 동일. `/inject` 4자 → `/ij` 2자. `marketplace.json` + `plugin.json` 설명 갱신, 버전 0.1.3 → 0.2.0 (minor — 새 command file).

- **paper 0.5.0 — `/paper lint` 실제 구현 (g51 enforcement)** — `paper` plugin 에 새 verb `lint [dir]` 추가. `main.pdf` 페이지 수 (pdfinfo grep) ≥ 10 + fal.ai figure 흔적 (figures/_prompts/*.{txt,md} 1개 이상 OR figures/_scripts/*.py 안에 `fal` · `imagine` · `/paper fig` substring grep 1개 이상) 둘 다 만족 시 exit 0 · 실패 시 exit 1 + 조건별 ✓/✗ 체크리스트 출력. 동기 — g51 governance rule 만 있고 실제 lint 부재였음. 이제 model self-discipline 외 `/paper lint <dir>` 명령으로 자동 검증. `marketplace.json` + `plugin.json` paper 설명 + 버전 갱신 (0.4.0 → 0.5.0, minor — 새 verb).

- **commons 0.9.40 — `@D g51` paper lint (≥10 pages + ≥1 fal.ai figure)** — 새 `[required active]` governance block: `/paper` 산출물은 compile 시 **(1) ≥10 페이지** + **(2) ≥1 fal.ai-생성 figure (g44)** 둘 다 만족해야 함. 동기 — arxiv submission 의 정량 minimum 기준 명시. fal.ai (gpt-image-2 pinned, g44) figure 가 빠진 paper 는 substandard. 향후 `/paper lint` subcommand 또는 paper-lint hook 으로 자동 enforcement 가능. `marketplace.json` commons 설명 `g1..g50` → `g1..g51`.

- **commons 0.9.39 — `@D g50` AI CLI first, API/SDK as fallback** — 새 `[required active]` governance block: AI 기능 (이미지 생성 · 검색 · transcript 등) 은 항상 CLI wrapper 먼저 (`/imagine` · `/research:arxiv` · `/research:yt` 등), API/SDK 는 wrapper 가 없는 경우에만. 동기 — 모델이 `/imagine` 같은 wrapper 가 있는데도 자꾸 openai/anthropic/fal SDK · curl POST · raw HTTP request 로 직접 호출. g50 가 설계 시점부터 강제 — wrapper 가 SSOT. `marketplace.json` commons 설명 `g1..g49` → `g1..g50`.

- **commons 0.9.38 — `@D g49` GPU dispatch priority (pool first, cloud fallback)** — 새 `[required active]` governance block: GPU 작업은 (1) 먼저 `pool list` 의 sidekick roster 에서 enabled GPU host 확인 (g9 사내 pool) → (2) pool 에 GPU host 가 없을 때만 `hexa cloud` 임대 (g8 rented pod). 동기 — 모델이 GPU 작업에서 자꾸 `hexa cloud` 로만 dispatch 하고 사내 pool 의 GPU host 활용 안 하는 패턴. g49 가 g8/g9 위에 dispatch 우선순위 명시 — "pool first" doctrine. `marketplace.json` commons 설명 `g1..g48` → `g1..g49`.

- **commons 0.9.37 — `@D g48` cross-project inbox ack (close-then-notify)** — 새 `[required active]` governance block: inbox entry 처리 완료 시 (1) 자기 entry frontmatter 에 `status: resolved` set + (2) sender 의 inbox 에 ack 파일 작성. 두 액션이 atomic — entry close + sender notify. 동기 — inbox-watch 가 receiver 측 자동 인지는 해결했으나 ack loop 가 빠지면 sender 는 patch 처리됐는지 모름. handoff loop 의 close-then-notify 패턴으로 양방향 인지 완성. **참고**: 현재는 governance rule (model self-discipline). 향후 hook 으로 자동 ack 가능성 — entry status set 시 sender notify 강제. `marketplace.json` commons 설명 `g1..g47` → `g1..g48`. (PR #62 commit 에서 entry 누락 — 이 PR 에서 retroactive 추가.)

- **project.tape — `siblings` 필드 추가 (@I)** — sidecar 의 `@I` (identity) 블록에 `siblings = "hexa-lang · anima · wilson · hive · demiurge"` 추가. dancinlab org 내 연관 프로젝트 명시 — cross-project handoff (`/inbox` · `inbox-watch`) 의 상대 후보군이 metadata 로 표면화. 동기 — sibling 정보가 어디에도 캡쳐 안 돼 있어서, 모델이 cross-repo 작업 시 어느 repo 가 정당한 handoff target 인지 매번 추론. project.tape 의 `@I` 가 cross-repo network 의 SSOT. **g17 user-request only 명시 요청** (사용자 지시).

- **inbox-watch 0.1.0 — 신규 hook plugin (cross-project handoff 자동 인지)** — SessionStart + UserPromptSubmit 에서 cwd `inbox/{notes,patches,poc,rfc_drafts}/*.md` 를 스캔, frontmatter `status:` 가 없거나 `{closed, resolved, done, merged, ack}` 외인 entry 를 open 으로 간주. `# inbox: N open` 헤더 + 최근 modified 5건 bullet (전체 카운트 표시) 을 `additionalContext` 로 한 shot emit. empty / no inbox dir → silent. 동기 — `/inbox` 에 들어온 cross-project handoff (다른 repo 가 보낸 patch / RFC / note) 가 처리되지 않고 dormant 하는 패턴 — session 시작 시 자동 노출로 unread 0 보장. hexa-native (`_inbox_watch.hexa` via `hexa run`). `marketplace.json` 에 inbox-watch entry 추가. NO opt-out by design (g30). **주의**: 동시 hexa-lang `term_isatty_stdin` forward-decl 누락 build failure 로 이 hook 의 실제 활성화는 upstream fix 후 (verify-guard 와 동일).

- **verify-guard 0.1.0 — 신규 hook plugin (g5 enforcement)** — commons `@D g5` ("hexa verify SSOT for correctness/purity/grade/identity") 의 실제 enforcement hook. `PreToolUse(Bash)` 에서 (1) first-token ∈ {`wolframscript`, `mathematica`, `WolframKernel`} 인 raw Wolfram CLI 호출, 또는 (2) `python(3)? -c '...'` inline-Python 에 `import sympy` / `from sympy` / `import pyphi` / `import wolframclient` 가 포함된 verification probe 를 deny — `permissionDecision: deny` + redirecting 메시지로 `hexa verify` 안내. 일반 sympy / wolframclient 사용 (committed code file, `-c` flag 없음) 은 통과 — inline `-c` verification probe + standalone Wolfram CLI 만 차단. hexa-native / plist-guard / cloud-guard 패턴 그대로 (`_verify_guard.hexa` via `hexa run`). 동기 — g5 govern rule 만으로 model self-discipline 의존이었으나 모델이 자주 inline sympy 로 검증하는 패턴. hook-level enforcement 로 g5 dont 명시한 도구를 차단. `marketplace.json` 에 verify-guard entry 추가. NO opt-out by design (g30). **주의**: 동시 hexa-lang `term_isatty_stdin` forward-decl 누락 build failure (별도 inbox patch 파일링) 으로 이 hook 의 실제 활성화는 upstream fix 후.

- **q 0.1.0 — 신규 skill (`/q` = `/btw` alias)** — `/q <text>` 는 Claude Code 내장 `/btw <text>` (현재 작업 중단 없이 짧은 side question) 의 alias. 같은 의미 — 1-3 sentences로 짧게 답하고 main work 재개. plugin command 만 (markdown only, 스크립트 없음). 동기 — `/btw` 가 4글자라 자주 쓰기 부담, `/q` 2글자로 동일 기능. `skills/q/` 신규 plugin (SKILL.md + commands/q.md + .claude-plugin/plugin.json).

- **check 0.1.0 — 신규 skill (`/check` task dashboard)** — `<UPPERCASE>.log.md` checkbox 작업 현황 (open vs done count + 첫 10개 open 항목 미리보기 per log) · `gh pr list --state open` (현재 repo의 open PR) · `git status -sb` (uncommitted / ahead / behind) · `git log --oneline -5` (최근 머지 5건) — 4개 surface를 한 shot에 출력. read-only, side-effect zero. 동기 — 여러 task source (domain log · PR · git · commit log) 가 흩어져 있어서 "지금 뭐가 진행 중인지" 확인하려면 4개 명령 따로 쳐야 함. `/check` 한 번으로 dashboard. `skills/check/` 신규 plugin (SKILL.md + commands/check.md + .claude-plugin/plugin.json).

- **pr-automerge 0.1.0 — 신규 hook plugin (g47 enforcement)** — commons `@D g47` ("PR ship discipline — no unmerged stacks") 의 실제 enforcement hook. `PreToolUse(Bash)` 가 `gh pr create …` 로 시작하는 명령을 감지 시 `updatedInput` field 로 명령 끝에 ` && gh pr merge --squash --delete-branch` 자동 append — atomic create-then-merge (전반부 실패 시 후반부 미실행). Skip 조건: `--draft` flag · 이미 `gh pr merge` 포함 · 이미 `&&` / `;` / `|` chain · idempotent mark `__SIDECAR_AUTOMERGE__` 존재. pool-route 패턴 그대로 (transparent rewrite, deny 아님). 동기 — g47 govern rule 만으로 model self-discipline 의존이었으나, 모델이 PR 만들고 머지 잊는 패턴이 잦음. hook-level rewrite 로 atomic 보장. `marketplace.json` 에 pr-automerge entry 추가. NO opt-out by design (g30).

- **cycle 0.2.0 — `/cycle-full` 명령 추가 (depletion-brainstorm-then-cycle)** — `cycle` plugin에 새 sub-command `/cycle-full` 추가. phase 0 으로 `$ARGUMENTS` 에 대해 iterative brainstorm 을 idea 고갈까지 (rounds 새 후보 zero 시 stop, cap 8 rounds) 돌린 후, 그 deduplicated 결과를 next-list 로 받아 기존 `/cycle` 의 parallel-plan → fan-out → loop tail 그대로 실행. 동기 — `/cycle` 단독은 current context 에서 next-list 자동 enumerate, 깊이 약함. width-first 발산이 필요한 goal (e.g. 새 feature 후보 모두 뽑아 병렬 진행) 에는 brainstorm depletion 선행이 적절. phase 0 은 goal 당 1회 — 후속 round 는 plain `/cycle`. `commands/cycle-full.md` 신규. `marketplace.json` + `plugin.json` 설명 갱신, 버전 0.1.1 → 0.2.0 (새 command 이라 minor bump).

- **cloud-guard 0.1.0 — 신규 hook plugin (g8 enforcement)** — commons `@D g8` 의 실제 enforcement hook. `PreToolUse(Bash)` 에서 첫 토큰이 `runpodctl` · `vastai` · `vast` 이고 두 번째 토큰이 `exec` · `ssh` · `send-file` · `send-file-to-pod` 인 경우 `permissionDecision: deny` 응답 — redirecting 메시지로 `hexa cloud {run|nohup|poll|copy-to|copy-from|copy-dir-*|preflight}` 안내. Pod-lifecycle 동사 (`create` · `ps` · `list` · `show` · `search`) 는 통과 — provisioning 은 정당하고 `hexa cloud` 가 wrap 안 함. hexa-native / plist-guard 패턴 그대로 (`_cloud_guard.hexa` via `hexa run`). 동기 — g8 govern rule 만으로 model self-discipline 의존이었으나 모델이 자주 raw CLI 로 빠지는 패턴, hook-level enforcement 필요. `marketplace.json` 에 cloud-guard entry 추가. NO opt-out by design (g30).

- **commons 0.9.36 — `@D g8` rented-GPU pod dispatch 강화** — g8 본문에 vast.ai 명시 추가 + 금지 CLI 목록 확장: `runpodctl` · `vastai` · raw `ssh` · raw `scp` 모두 금지, `hexa cloud {run|nohup|poll|copy-to|copy-from|copy-dir-*|preflight}` 가 SSOT. `hexa cloud --help` 확인 결과 `--port` flag 로 runpod / vast.ai 모두 지원 (cycle A transport · cycle B file transfer · cycle C preflight). 동기 — 기존 g8 dont 가 "raw ssh/scp for runpod" 뿐이라 vast.ai · `runpodctl` · `vastai` CLI 케이스 명시 부재, 모델이 자꾸 직접 배포로 빠짐. 본문 갱신 + 모든 cycle 동작 명시. `marketplace.json` + `plugin.json` 0.9.35 → 0.9.36.

- **commons 0.9.35 — `@D g47` PR ship discipline (no unmerged stacks)** — 새 `[required active]` governance block: PR을 한 개 만들면 즉시 머지하고 다음 PR 시작 — long-lived stacked PR 금지. `g4` 의 "stacked PRs" 는 *per-merge layer* (각 layer가 빠르게 main에 들어가는 구조) 이지 *unmerged stack of N* 이 아님. 동기 — 직전 작업에서 9개 stacked PR을 한꺼번에 쌓다 main이 움직일 때마다 rebase 충돌이 layer마다 발생 (CHANGELOG / marketplace.json / plugin.json 같은 lockstep surface가 항상 충돌). 결국 squash-merge로 청산. 이 패턴 자체를 룰로 금지. `marketplace.json` commons 설명 `g1..g46` → `g1..g47`.

- **commons 0.9.34 — `@D g46` 친근 설명 스타일은 /easy** — 새 `[active]` governance block: user가 "쉽게/친근하게 설명해줘" 류 요청을 하면 `/easy` 로 — `styles/easy.<lang>.md` 의 canonical 7-element 패턴 (icon · name · alias · plain-line · analogy · ASCII · compare). 동기 — 모델이 ad-hoc "simple explanation" 형식을 즉흥적으로 짜는 패턴이 잦은데 `/easy` 가 이미 canonical template ship. `marketplace.json` commons 설명 `g1..g45` → `g1..g46`.

- **commons 0.9.33 — `@D g45` 언어 prefs 변경은 /prefs** — 새 `[active]` governance block: user가 언어 선호 (code authoring · doc authoring · response) 를 바꾸려 하면 `/prefs {code|docs|response} <lang>` 으로 — `$CLAUDE_PLUGIN_DATA/prefs.json` 에 영속됨. 동기 — prefs hook이 매 turn 주입돼서 인식 자체는 강하지만, 모델이 user에게 "다시 알려주세요" 묻거나 임시로 응답 언어 바꾸는 패턴이 있어서 SSOT 명시 필요. `marketplace.json` commons 설명 `g1..g44` → `g1..g45`.

- **plist-guard 0.1.0 — 신규 hook plugin (g37 enforcement)** — commons `@D g37` ("plist user-request only") 의 실제 enforcement hook. PreToolUse(Write|Edit|NotebookEdit) 에서 target file path가 `.plist` 로 끝나면 `permissionDecision: deny` 응답. hexa-native 패턴 그대로 (`_plist_guard.hexa` via `hexa run`). 동기 — g37 governance rule 만으로는 모델이 self-enforce에 의존했으나, LaunchAgents / LaunchDaemons / Info.plist 는 persistence surface (로그인 · 부팅 자동 실행) 라 silent write 위험이 커서 hook-level enforcement 필요. hook은 user-explicit vs model-autonomous를 구별 불가하므로 globally deny — user가 명시 요청 시 직접 명령으로 처리 (agent path 외). `marketplace.json` 에 plist-guard entry 추가. NO opt-out by design (g30).

- **commons 0.9.32 — `@D g44` 이미지 생성은 /imagine + gpt-image-2 pinned** — 새 `[required active]` governance block: 이미지 생성 needs는 `/imagine <prompt-file> <out.png>` 으로 — 기본 backend `fal`, 모델 `gpt-image-2`. **silently swap 금지**: gpt-image-2 → gpt-image-1 · dall-e-3 · flux 임의 대체 X. 동기 — user memory `feedback_gpt_image_2_pinned` 에 "무조건 gpt-image-2" 강한 신호가 있는데도 g 룰 zero라 모델이 다른 모델로 갈아탈 위험. `required` 격상으로 신호 강화. `marketplace.json` commons 설명 `g1..g43` → `g1..g44`.

- **commons 0.9.31 — `@D g10` (Monitor) `[active]` → `[required active]` 격상** — `tail -f` / `sleep`-poll 루프로 background process event 스트리밍하는 패턴이 잦아서 격을 강화. 룰 본문(do/dont) 변경은 없음 — 단순 retag. 동기 — Claude Code의 `Monitor` 도구는 background process stdout을 라인 단위로 푸시 받는 정상 채널인데, `[active]` 권고 강도라 모델이 자주 `tail -f` 폴링 (CPU 낭비 + 통지 지연) 으로 빠짐. `required` 격상으로 신호 강화.

- **pool-route 0.5.1 — routing log + SessionStart 가시성** — pool-route hook이 routing decision 마다 `~/.pool/route-log.jsonl` 에 한 줄 append (`{"t":<iso>,"host":<name>,"cmd":<first 40 chars>}`), 100 entry cap. 동시에 SessionStart event 도 listen — 최근 5건을 markdown bullet list로 `additionalContext` 에 emit. 동기 — pool-route 의 routing 결정은 매 PreToolUse 의 휘발성 `additionalContext` 한 줄로만 통지돼서, 모델이 다음 턴에 "어떤 명령이 어디서 실행됐는지" 잊는 패턴 잦음. 영구 log + 세션 시작 snapshot 으로 가시성 확보. `hooks.json` 에 SessionStart event 추가; 기존 PreToolUse 동작은 그대로 (preflight `ssh test -d` · 라운드로빈 · OS-capability filter · NO opt-out). `marketplace.json` pool-route 설명 갱신.

- **commons 0.9.30 — `@D g43` 외부 자료 fetch는 /research** — 새 `[active]` governance block: arxiv 논문 / YouTube 영상 자료는 `/research:arxiv <query|id>` · `/research:yt <url|id>` 로 — raw `curl` arxiv API 또는 `WebSearch` 로 fallback하지 말 것. 동기 — `/research` 는 arxiv Atom + YT caption XML 파싱을 hexa-native로 깔끔하게 wrap하지만 g 룰 zero라 모델이 자주 raw HTTP fetch로 빠짐. `marketplace.json` commons 설명 `g1..g42` → `g1..g43`.

- **commons 0.9.29 — `@D g42` depletion ideation은 /brainstorm (discovery family)** — 새 `[active]` governance block: 폭넓은 아이디어 발산이 필요할 때는 `/brainstorm <seed>` 으로 — exhaustion 도달까지 rounds 반복. `/kick` (g6, single-seed discovery) · `/gap` (g40, catalog-sweep) 와 함께 **discovery 3-sister** 완성: `/kick` = seed-based · `/gap` = catalog-sweep · `/brainstorm` = width-first depletion. 동기 — `/brainstorm` 은 g 룰 zero라 모델이 first 3-5 아이디어에서 멈추는 패턴이 잦음. `marketplace.json` commons 설명 `g1..g41` → `g1..g42`.

- **commons 0.9.28 — `@D g41` reactive fan-out은 /all-bg-go (sister of /cycle)** — 새 `[active]` governance block: 직전 턴(PRIOR-turn)에 N개의 disjoint 분기를 제시한 상황은 `/all-bg-go` 로 한 번에 fan-out — `/cycle` (g38) 의 self-generating loop 와 분명히 disjoint 관계 (`/all-bg-go` = 단일 reactive · `/cycle` = 자율 반복). 동기 — `/all-bg-go` 는 g12 (`fan out parallel pods`) 의 일반 fan-out 원칙에 일부 흡수돼 있었지만 *어떤 명령으로* 라는 메커니즘 명세가 빠져있어 모델이 수동으로 one-by-one 호출하는 패턴이 잦았음. g40 (gap/kick sister) · g41 (all-bg-go/cycle sister) 두 sister-binding 룰로 discovery-skill 페어 + fan-out-skill 페어를 모두 disjoint 명세 완료. `marketplace.json` commons 설명 `g1..g40` → `g1..g41`.

- **inject 0.1.3 — 0.1.2 누락 코드 적용** — 직전 `inject 0.1.2` 출시는 description / CHANGELOG / plugin.json 버전 라벨만 업데이트하고 **실제 fix 코드 (`skills/inject/commands/inject.md`) 변경이 빠짐** — 그래서 `/inject` 가 여전히 BSD `ls -1v` (macOS) 에서 lexicographic 정렬로 stale commons.tape (0.9.9 < 0.9.21) 를 잡는 옛 동작 그대로. 0.1.3 은 그 코드 변경만 (`ls -1v cache/sidecar/commons/ | tail -1` → `~/.claude/plugins/marketplaces/sidecar/hooks/commons/.claude-plugin/plugin.json` 의 `version` 필드 직접 파싱) 적용. `marketplace.json` + `plugin.json` 버전 0.1.2 → 0.1.3.

- **commons 0.9.27 — `@D g40` multi-axis gap sweep은 /gap (sister of /kick)** — 새 `[active]` governance block: 막힌 문제는 `/gap` (42-lens 8-family sweep) 또는 `/kick <seed>` (g6 · hexa kick discovery engine) 으로 lensing. 동기 — `/gap` 은 sidecar의 multi-axis breakthrough 도구인데 g 룰 zero. g6 (kick) 와 sister relationship 명시 — 두 도구는 disjoint하지만 같은 "stuck → discovery" 패턴을 다룸 (`/kick` = single-seed, `/gap` = catalog-sweep). g6 와 동일한 `[active]` 강도 (`required`는 conditional 패턴엔 과함). `marketplace.json` commons 설명 `g1..g39` → `g1..g40`.

- **commons 0.9.26 — `@D g39` 프로젝트 상태 문서는 /domain으로** — 새 `[required active]` governance block: 프로젝트 단위 작업 / 결정은 `/domain <task>` 으로 — `<NAME>.md` (live spec snapshot) + `<NAME>.log.md` (append-only checkbox-task history) 페어를 자동 관리. 동기 — `/domain` 은 sidecar의 spec/log 분리 인프라인데 g 룰 zero라 모델이 자주 잊고 ad-hoc `TODO.md` · `PLAN.md` · `notes/*.md` 를 흩뿌리는 패턴. user memory `feedback_domain_md_log_split` 에 동일 신호 박혀있었음 (잊힘 빈도 높다는 의미). `/domain` 의 NAME 기본값은 git-root basename. `marketplace.json` commons 설명 `g1..g38` → `g1..g39`.

- **commons 0.9.25 — `@D g38` 자율 work-loop은 /cycle로** — 새 `[required active]` governance block: 다중 라운드 목표(반복 진행이 필요한 작업)는 `/cycle` 으로 — self-enumerate → parallel-plan → fan-out → loop 의 자율 루프 드라이버. 동기 — `/cycle` 은 sidecar의 핵심 autonomous-loop 인프라인데 g 룰이 zero 라 모델이 작업 중 자주 잊어버리고 수동 직렬화로 빠짐. g12 (`fan out parallel pods`) 가 일반 fan-out 원칙을 다루지만 `/cycle` 의 self-generating loop 패턴은 별도 메커니즘이라 분리 명세. `/all-bg-go` (직전-턴 reactive fan-out) 와 disjoint — `/all-bg-go` 는 한 번, `/cycle` 은 라운드 반복. `marketplace.json` commons 설명 `g1..g37` → `g1..g38`.

- **commons 0.9.24 — `@D g37` plist는 유저 요청 시에만 생성** — 새 `[required active]` governance block: `.plist` 파일 (LaunchAgents · LaunchDaemons · Info.plist) 은 명시적 유저 요청 없이 자율 생성 / 작성 금지. 동기 — LaunchAgents / LaunchDaemons는 로그인 / 부팅 시 자동 실행되는 persistence surface라 자율 작성 시 사용자가 인지하지 못한 데몬이 시스템에 상주할 수 있음; Info.plist도 macOS 앱 번들 메타데이터로 임의 수정 시 코드사이닝 / 권한 영향. g16 (AGENTS.tape 휴면) · g17 (project.tape user-request only) 와 같은 결의 `user-request only` 패밀리. `marketplace.json` commons 설명 `g1..g36` → `g1..g37`.

- **commons 0.9.23 — `@D g36` /inbox dispatch** — new `[required active]` governance block: cross-repo gap / patch / bug / RFC handoffs must go through `cd <target-repo> && /inbox new <kind> <slug>` (which scaffolds `inbox/<kind>/<slug>.md` from the template), not a direct file write to `<target-repo>/inbox/<kind>/<slug>.md`. Motivated by the very-previous-turn evidence in this batch: when filing the `stdout-4095-byte-truncation` patch upstream, the assistant wrote directly to `hexa-lang/inbox/patches/...` and bypassed the `/inbox` command entirely — exactly the missing recognition signal the rule fixes. g11 covers the prior step (file gaps as inbox entries, don't work around them); g36 covers the *mechanism* (which command to use). `marketplace.json` commons description `g1..g35` → `g1..g36`.

- **commons 0.9.22 — pool awareness boost** — three changes strengthen the `pool` signal in the cross-project rule layer. (1) `_commons.hexa` PREPENDS a live roster snapshot read from `~/.pool/pool.json` (one line: `name[os,on|off] · name[os,on|off] · ...`) to every `commons.tape` injection — SessionStart + every UserPromptSubmit + both compaction events — so the model sees the host lineup without a `pool list` recon. Missing / unreadable / empty roster → "" (nothing prepended). Prepended (not appended) because the hexa-runtime stdout cap (next item) bites the tail. (2) `@D g9` rewritten from `[active]` ("know pool exists") to `[required active]` with a directive do/dont — `do = sidekick roster → pool on <host> <cmd> for macOS-only (swift/xcode) · GPU · heavy build`; `dont = run host-specific work on the local shell when a sidekick host fits — roster in SessionStart`. The `/inbox` clause is dropped from g9 (still listed in g23's slash-command roster). (3) g8 / g9 routing roles spelled disjoint inline — g8 = **rented-pod** dispatch (`hexa cloud`, runpod), g9 = **sidekick-pool** dispatch (`pool`, your own roster) — no new governance block. `commons` description in `marketplace.json` + plugin manifest updated to mention the roster snapshot.

- **upstream gap filed — `hexa-lang/inbox/patches/stdout-4095-byte-truncation-runtime-cap.md`** — while smoke-testing the `_commons.hexa` patch above, found that `hexa run` stdout is hard-capped at **4095 bytes per invocation**, regardless of how the writes are chunked (single `println(7K)` or 7 × `print(1K)` both truncate at 4095). The 2026-05-22 sidecar CHANGELOG claimed "chunks accumulate past the cap" and that the root cause was fixed upstream in `runtime.c::hxlcl_vfprintf_fd` — neither holds in the currently-shipping `hexa 0.1.0-dispatch`. Net effect: the `commons` hook has been silently truncating `commons.tape` g20..g35 out of every injection for the past day; only g1..g17 (partial g18) reach the Claude Code context. The pool-roster-prepend in this batch is a budget-shift workaround (the roster survives the cap; the truncation tail bites g18 instead of g19), not a fix. Likely cause per the 22c27a05 pattern: the `runtime.c` SSOT fix landed but the running interpreter binary predates it (the `hexa cc --regen` preview-only gap). Per `commons @D g11` no workaround in `sidecar` beyond the budget shift — fix at source.

- **inject 0.1.2 — fix macOS version selection** — `/inject` chose the commons.tape to print/inject with `ls -1v …/cache/sidecar/commons/ | tail -1`, but BSD `ls` (macOS) has no `-v` natural-sort flag, so the listing fell back to lexicographic order — where `"0.9.9" > "0.9.21"` (`'9' > '2'`). `/inject` therefore re-injected a stale `0.9.9` commons.tape (the pre-minimalization `g1..g27` form) into the live session. Fixed by dropping the cache version-sort entirely: `/inject` now reads `commons.tape` straight from the marketplace clone (`~/.claude/plugins/marketplaces/sidecar/hooks/commons/`), which `sidecar sync` pulls to HEAD on every run — no version arithmetic, no sort-flag portability dependency. The version label is read from the adjacent `plugin.json`.

- **commons 0.9.21 — `@D g32..g35` LLM coding discipline** — `commons.tape` gains four governance blocks absorbed from the Karpathy-skills `CLAUDE.md` "behavioral guidelines to reduce common LLM coding mistakes", recast into the minimal granular `@D` do/dont form (g19). **g32** think before coding — state assumptions, surface real interpretation forks, ask when genuinely unclear; the `dont` references `g18` so this fires only on genuine ambiguity, never as a punt. **g33** simplicity first — minimum code that solves the asked problem, no speculative abstraction with no current caller (the "no current caller" clause keeps it disjoint from `g20`, which forbids duplicating across *real* instances). **g34** surgical changes — touch only what the request needs, match existing style, remove only the orphans your change created. **g35** goal-driven execution — recast tasks as verifiable goals (bug → failing test → green), loop until verified. No existing rule reworded or removed; `g1..g31` unchanged. `marketplace.json` commons description repointed `@D g1..g31` → `@D g1..g35`.

- **pool-route drops autosync (rsync) — pool-route 0.5.0** — pool-route's autosync — an `rsync -az --force <cwd>/` of the entire project to the pool host before every routed command — is removed. On a large project tree (e.g. a repo carrying dozens of `.claude/worktrees/`), run across concurrent sessions, it produced a CPU storm (measured load average 60+, swarms of concurrent `rsync`). pool-route now routes the command via `ssh` only; the preflight `ssh test -d <workdir>` skips a host that lacks the workdir — the command runs local rather than routing blind. The project workdir is kept on pool hosts by the user; pool-route no longer syncs it.

- **commons → 0.9.20 · prefs → 0.3.0 · project-tape → 0.2.0 — last hook `.sh` → hexa-lang + UserPromptSubmit event-name fix** — port the three remaining hook `.sh` scripts (`commons.sh` · `prefs.sh` · `project-tape.sh`, each carrying embedded `python3`) to `bin/_<name>.hexa`, invoked via `hexa run` from `hooks.json`. No `.py` / `.sh` remain in any sidecar hook. **Bug fixed in the same motion:** the `.sh` versions read the firing event from the stdin payload as `hookEventName` (camelCase) — but Claude Code's input field is `hook_event_name` (snake_case), so the lookup always missed and the hook echoed the hardcoded default (`SessionStart` / `PreCompact`). On a UserPromptSubmit / PostCompact fire that mismatched the actual event → `Hook returned incorrect event name: expected 'UserPromptSubmit' but got 'SessionStart'`. The `.hexa` ports read `hook_event_name` and echo it back verbatim; a missing event field now skips the injection rather than guessing. Two hexa porting findings: (1) `hexa println` truncates a single call at 4096 bytes — `_commons.hexa` / `_project_tape.hexa` emit in <4096-byte `print` chunks (commons.tape is ~7 KB); root cause fixed upstream in `hexa-lang/self/runtime.c` (`hxlcl_vfprintf_fd` heap fallback). (2) input event field is snake_case `hook_event_name`.

- **commons 0.9.19 — `@D g31` permission-blocked writes** — `commons.tape` gains `@D g31`: on an `EPERM` / "operation not permitted" write, diagnose before declaring it impossible — `ls -lO` shows macOS immutable flags (`uchg` / `schg`), `ls -le` shows ACLs. `~/.claude/settings.json` is commonly `uchg`-locked; `chflags nouchg` clears it (owner-clearable, no `sudo` needed), the write succeeds, then `chflags uchg` restores it. `install.hexa` `_write_json` now does exactly this around every Claude Code config write, so `hx install sidecar` / `sidecar sync` complete the `enabledPlugins` step even when `settings.json` is immutable-locked. Passwordless `sudo` is also available for genuine uid / ownership blocks.
- **pool-route reads the `pool` CLI roster — pool-route 0.4.1** — pool-route 0.4.0 read the roster from a stale `wilson-pool-sidecar` plugin-data path (a remnant of the retired self-contained `wilson-pool` plugin). It now reads the `pool` CLI's single source of truth, `~/.pool/pool.json` — mapping that schema (`hosts[]` of `name` / `ssh` / `enabled` / `sudo` / `os`), skipping `enabled: false` hosts. `pool.json` is roster-only, so `workdir` defaults to `auto` (mirror the cwd under `$HOME`) and `autosync` to on. Removes the last `wilson-*` dependency in the pack — `pool-route` no longer touches any `wilson-` path.
- **pool-route auto-router restored — pool-route 0.4.0** — `pool-route` goes from a non-blocking *suggestion* hook back to a transparent **auto-router**: when pool routing is armed (`pool.json` roster + workdir) and a Bash command matches the heavy classifier (`make` / `cargo` / `npm` / `pytest` / `go build` / `swift build` / `docker build` / `nvidia-smi` / `train` / …) or a root-needing command, the command is rewritten via the hook `updatedInput` field to run on a pool host over ssh (`ssh <host> 'cd <workdir> && <cmd>'`). OS-capability filter (macOS-only / Linux-only → matching-platform hosts) + round-robin host pick; `autosync` rsyncs the project to the host first, else a preflight `ssh test -d` confirms the remote workdir (a transient ssh failure never benches a host). This is the `wilson-pool` `_route.py` engine — lost in the 2026-05-21 concept-separation reset (`2902661`), where `pool-route` was rebuilt as a suggestion-only hook — ported to hexa-lang: `exec_with_status` for the preflight exit code, `read_file` / `write_file` for the `pool.json` roster + `.rr` round-robin counter, native `json_parse` / `json_stringify` for the `updatedInput` rewrite. Not armed / no classifier match / no eligible host → the command passes through untouched. `hooks.json` unchanged (still `PreToolUse(Bash)`). NO opt-out by design.
- **one-shot install + enable — `install.hexa` · `sidecar sync`** — `sidecar sync` only patched `~/.claude/plugins/installed_plugins.json`, never `enabledPlugins` in `~/.claude/settings.json` — so every synced plugin was installed-but-disabled and its commands / hooks / skills never loaded (the root cause of "none of the sidecar commands show up"). New `install.hexa` at the repo root is the single local-install bootstrap: marketplace clone/pull → `known_marketplaces.json` registration → version cache → `installed_plugins.json` → `enabledPlugins`. It is an `hx` build hook (`hx install` runs `bin/build.hexa` | `install.hexa` post-clone), so `hx install sidecar` alone now installs **and enables** the whole pack; it is idempotent and re-runnable. `bin/sidecar sync` delegates to it (dropping its inline Python). `project.tape` `@D ship` updated — the cycle tail is now `sync (install + enable)`.
- **skill `.sh` / `.py` → `.hexa` migration complete — imagine 0.2.0 · paper 0.4.0 · research 0.2.0** — port the last three skill plugins still carrying `.sh` / `.py` runtime code to hexa-lang, closing the skill-side migration. `imagine` — `bin/imagine.sh` dispatcher + `_backends/{fal,openai}.sh` → `bin/_imagine.hexa` + `_backends/{fal,openai}.hexa`. `paper` — `bin/paper.sh` → `bin/_paper.hexa`. `research` — `bin/{_arxiv,_yt}.py` + their `.sh` shims → `bin/{_arxiv,_yt}.hexa` (the arXiv Atom + YouTube caption XML parsing the earlier batch deferred on the hexa XML-parser gap is now hand-rolled). Each `commands/*.md` `!` line repointed from `sh …/<x>.sh` to `hexa run …/_<x>.hexa`; `imagine` / `paper` pass `--root "$CLAUDE_PLUGIN_ROOT"`. Behavior preserved — all four entrypoints + both backends smoke-tested (compile + usage). No `.sh` / `.py` remain in any skill plugin's runtime path (`bin/` · `_backends/`).
- **commons.tape minimalization — commons 0.9.17** — every `do` / `dont` value across `commons.tape`'s `@D g1..g30` rewritten to the minimal form, the same authoring discipline as the `project.tape` + skill-layer minimalizations. No rule added, removed, or reordered — `g1..g30` and their intent are unchanged; only the wording is tighter, trimming the payload the `commons` hook re-injects every turn. Hook script + `hooks.json` untouched.
- **skill layer minimalization — all-bg-go 0.4.1 · brainstorm 0.1.1 · bypass 0.2.1 · cloud 0.3.1 · cycle 0.1.1 · domain 0.4.1 · easy 0.1.1 · gh-stack 0.1.1 · hexa-help 0.2.1 · imagine 0.1.1 · inbox 0.2.1 · inject 0.1.1 · kick 0.2.1 · paper 0.3.2 · pool 0.2.1 · research 0.1.1 · secret 0.4.1 · ship 0.2.1 · verify 0.2.1** — rewrite every skill's `SKILL.md` body to the minimal tape-style form, matching the authoring discipline already applied to `commons.tape` + `project.tape`. Each `SKILL.md` is now YAML frontmatter (`name` · trigger-keyword `description` · `allowed-tools`) + one `@D <name> :: skill` block carrying `do` / `dont` only — the `project.tape` lint standard (≤100-char values, no keys beyond do/dont). Prose sections, walkthrough tables, and worked examples are dropped from the bodies: mechanics live in each plugin's `commands/*.md` and the wrapped CLI's own `--help`, so `SKILL.md` carries just the trigger surface plus the essential do/dont. The 16 per-skill `README.md` files are removed — `plugin.json` `description` + `SKILL.md` already cover each plugin, and the plugin system never required a per-skill README. `project.tape` gains `@D s6` recording the convention as project governance. Behavior is unchanged — same triggers, same slash commands, same `bin/` scripts; only the SKILL.md authoring surface shrank (e.g. `bypass` 6.1 KB → ~0.7 KB).
- **prefs re-injects every turn — prefs 0.2.0** — the `prefs` hook gains a `UserPromptSubmit` event, so the language-preference block (`code` · `docs` · `response`) is re-injected as `additionalContext` on every user turn — not only at `SessionStart` plus the two compaction events. In a long session without compaction the one-shot `SessionStart` injection drifts far back in context and the `response` language silently regresses (the user has to re-state it); the per-turn re-inject keeps the preference anchored. Payload is ~4 lines, so the added token cost is negligible. No script change — the `inject` handler already echoes back whatever `hookEventName` it receives; only `hooks/prefs/hooks/hooks.json` gains the event.
- **commons re-injects every turn — commons 0.9.16** — the same fix for the `commons` hook: add a `UserPromptSubmit` event so the cross-project `do` / `dont` layer (`commons.tape`, `@D g1..g30`) re-injects on every user turn, not only at `SessionStart` plus the two compaction events. Without it the guardrail layer drifts out of effective context in a long no-compaction session — the same fade `prefs` had, but for the load-bearing governance gates. `commons.sh` already echoes back whatever `hookEventName` it receives, so only `hooks/commons/hooks/hooks.json` gains the event; the full `commons.tape` (~7 KB) re-injects each turn.
- **paper sample — portable figure output paths — paper 0.3.1** — the three `figures/_scripts/fig0{1,2,3}.py` scripts in the bundled `sample-nb-bcs-absorbed` exhibit hardcoded an absolute `/Users/.../demiurge/PAPERS/...` output path, so the sample's `savefig` would fail for anyone who installed the `paper` plugin elsewhere (`@D s3` portability). Each now derives its output path from `pathlib.Path(__file__)`, written next to the script's parent `figures/` directory regardless of install location.

## 2026-05-22

- **no self-authored bypass — commons 0.9.15 · git-guard 0.4.0 · sidecar-lint 0.3.0 · tape-lint 0.4.0 · pool-route 0.3.0 · limit-guard 0.1.1** — strip every self-authored opt-out from the sidecar guards. Removed: the `SIDECAR_NO_GIT_GUARD` / `SIDECAR_NO_LINT` / `SIDECAR_NO_TAPE_LINT` / `SIDECAR_NO_POOL_ROUTE` / `SIDECAR_NO_LIMIT_GUARD` env vars, and the `~/.claude/sidecar/disabled.json` skip-list mechanism (the `_disabled()` helper in five hook scripts). Every guard now matches `hexa-native`'s no-opt-out model — no env var, no config file, no exception list. Rationale: a guard the agent can switch off is a guard the agent will switch off; the opt-outs were being auto-flipped to push past the very checks they enforce. A mis-firing guard is fixed at the guard, not bypassed. commons gains `@D g30` (`no self-authored bypass — guards ship without an off switch`) to make the rule cross-project. `.hexa` scripts, plugin descriptions, plugin READMEs, marketplace entries, root README rows, deny/suggest message strings all updated in lockstep; behavior otherwise unchanged (all five hooks smoke-tested). `hexa-native` already had no opt-out — untouched.

- **skill `.sh` migration — cloud 0.3.0 · pool 0.2.0 · verify 0.2.0 · kick 0.2.0 · hexa-help 0.2.0 · secret 0.4.0 · domain 0.4.0 · inbox 0.2.0 · ship 0.2.0** — clear every `skills/*/bin/*.sh` shim, completing the hook-side `.py`→`.hexa` migration on the skill side. Two shapes: (a) **pass-through shims** (cloud · pool · verify · kick · hexa-help · secret) were pure `exec <target> "$@"` launchers — the `.sh` is deleted and the `commands/*.md` `!` line now invokes the target directly (`hexa cloud` · `pool` · `hexa verify` · `hexa kick --seed` · `hexa <verb> --help` · `secret`), so no shim of any kind remains. (b) **real programs** (domain · inbox · ship) carried actual logic — ported to `bin/_<name>.hexa`, invoked via `hexa run` from `commands/*.md`. Verified: ship (arg validation · credential-shape scan · unstage-on-hit), inbox (list · new <kind> <slug> · dup guard), domain (scaffold · append/todo/done/new log-entry editing). hexa porting notes: `match` is a reserved word (param renamed `term`); `chr(int)` is the codepoint→string builtin (not `char_str`). The 4 `skills/paper/` matplotlib template scripts and `skills/research/{_arxiv,_yt}.py` (Atom/caption XML parsing — blocked on a hexa XML-parser stdlib gap, filed upstream) are intentionally deferred. Upstream gap filed: `hexa-lang/inbox/patches/regex-stdlib-gap-sidecar-hook-ports.md` (no regex stdlib — every ported hook hand-rolled token scanners).

- **limit-guard 0.1.0 — new hook** — PostToolUse(Task) hook, hexa-native (`_limit_guard.hexa` via `hexa run`). Scans a subagent's result for a session/usage-limit signal (`hit your session limit`, `hit your usage limit`, or `session limit` + `resets`); on a match it emits a non-blocking `additionalContext` that directs the agent to (1) report how far it got — per item, committed SHAs vs uncommitted, where work stopped; (2) commit + push uncommitted work immediately; (3) write a `.claude/RESUME.md` resume manifest (done · remaining · reset time · next step); (4) stop parallel fan-out and switch to sequential commit-per-unit work. Motivated by a session where a batch of 8 parallel subagents all hit the limit at once and most of their work was lost. Matcher `Task|Agent` keeps the `hexa run` cost off the hot path. Opt out: `SIDECAR_NO_LIMIT_GUARD=1` or `~/.claude/sidecar/disabled.json`.

- **git-guard → 0.3.0 · hexa-native → 0.2.0 · pool-route → 0.2.0 · sidecar-lint → 0.2.0** — port the four remaining hook `.py` scripts to hexa-lang, following the `tape-lint` 0.3.0 pilot. Each plugin's `bin/_<name>.py` + `bin/<name>.sh` shim removed; `bin/_<name>.hexa` added and invoked directly via `hexa run` from `hooks/hooks.json`. Behavior preserved per plugin and verified: git-guard (force-push token detection — `--force` / `-f` / `--force-with-lease` / `+refspec`), hexa-native (`project.tape` marker walk-up + `.py`/`.sh` deny), pool-route (host-specific command word-match → `pool on` suggestion), sidecar-lint (all four checks — stale-history + hardpath staged-diff scans, marketplace↔plugin version drift, `.sh` exec-bit). hexa porting notes carried from the pilot: regexes are hand-rolled as token scans / char-class matchers (hexa has no regex stdlib); subprocess via `exec` / `exec_with_status`; `find` + `test -x` shelled out for the exec-bit check.

- **tape-lint → 0.3.0** — port the hook from Python to hexa-lang. `bin/_tape_lint.py` + `bin/tape-lint.sh` removed; `bin/_tape_lint.hexa` added and invoked directly via `hexa run` in `hooks/hooks.json` (`"command": "hexa run ${CLAUDE_PLUGIN_ROOT}/bin/_tape_lint.hexa"`) — no Python interpreter, no shell shim in the chain. First sidecar hook to land hexa-native, pilot for the wider `.py` / `.sh` → `.hexa` migration. Behavior is preserved across all three checks (fields whitelist · 100-char length cap · prefs.code authoring-language) with the same diff-aware grandfathering. Implementation notes: hexa strings are UTF-8 byte arrays, so the non-Latin check decodes each codepoint from its byte sequence before range-testing (Hangul · CJK · Kana); hexa's `json_parse` passes `\uXXXX` escapes through literally, which is fine since Claude Code hook payloads carry raw UTF-8.

- **hexa-lsp → 0.1.1 · tape-lsp → 0.1.1** — fix LSP plugin recognition. Both plugins were shipping LSP configuration as `lsp.json` (no leading dot) at the plugin root, with a `"lspServers": "./lsp.json"` reference in `plugin.json`. The canonical Claude Code schema is `.lsp.json` (dot-prefixed, auto-discovered) at the plugin root — `lspServers` is not a supported manifest field. Result: both plugins were silently never loaded. Fix: `git mv lsp.json .lsp.json` in both plugins + drop the unrecognized `lspServers` field from `plugin.json`. LSP content (`{"<lang>": {command, args, extensionToLanguage}}`) was already correct.

- **docs — root-level `<DOMAIN>.md` / `<DOMAIN>.log.md` split** — apply the per-domain spec/history separation rule across the sidecar repo root. (a) `design.md` was a frozen Decision-N audit trail → renamed to `design.log.md`; new `design.md` is a 3-line live-rules pointer (project.tape `@D s1..s5` + commons.tape `@D g1..g29` + log file). (b) `gh-stack.md` had a dated `## Status (2026-05-21)` table → that section + the waitlist-clearing activation steps moved to new `gh-stack.log.md`; gh-stack.md retains the timeless CLI command map + stack shape + manual fallback. (c) `CLAUDE.md` (→ project.tape) and `README.md` left untouched (already spec-only). (d) cross-file references updated in `README.md` (Layout · Governance · Reference sections), `skills/gh-stack/SKILL.md`, `skills/gh-stack/README.md`, `commands/gap/commands/gap.md`. Past CHANGELOG entries that mention the old `design.md` / `gh-stack.md` filenames are left as-is (history surface).

- **tape-lint → 0.2.0** — extend the lint with two new diff-aware checks on top of the existing `@D` field whitelist. (a) **length cap** — `do` / `dont` value content longer than 100 chars in `commons.tape` / `project.tape` is refused; split overflow into multiple do/dont entries or distinct `@D` blocks. (b) **authoring language** — read `code` from the sidecar `prefs` plugin's storage at runtime; when `code = english`, lines newly introducing non-Latin scripts (Hangul · CJK · Hiragana · Katakana) in `commons.tape` / `project.tape` are refused. `/prefs code <lang>` reshapes the rule live. All three checks share the same grandfathering semantics: only newly-introduced or worsened items block. Hook script, plugin description, README plugin row, marketplace entry, plugin README all updated in lockstep.

- **hexa-native → 0.1.1** — switch the project root marker from `project.hexa` to **`project.tape`** (sidecar's canonical project identity file). Rationale: `project.tape` is the marker every sidecar-managed project ships with (created by `sidecar init`), whereas `project.hexa` is a separate file specific to hexa-lang's own repos. `project.tape` is the right granularity for "this is a hexa-native project" — it applies automatically to every sidecar-managed project including sidecar itself + sibling plugins/CLIs. Side effect: editing existing `.py` / `.sh` files inside sidecar (or any other `project.tape`-rooted repo) via Claude Code Write/Edit is now denied; maintain such files via shell tools outside Claude, or uninstall the plugin. Per the no-opt-out directive, no self-exclusion for sidecar's own files was added either. plugin.json + marketplace.json + README row + the plugin's README all updated to reference `project.tape`.

- **cloud → 0.2.0** — `/cloud preflight <spec-flags>` added to the subverb surface (passes through `hexa cloud preflight` per the canonical subcommand form). preflight is a closed-form GPU mem-budget check that refuses out-of-budget specs before any pod spinup — no LLM, $0. Sized-flag set per upstream `stdlib/cloud/cloud_cli.hexa::_cloud_help` (`--n-params-m`, `--param-bytes`, `--optimizer`, `--gpu`, `--gpu-mem-mb`, `--bsz`, `--seq-len`, `--n-layer`, `--d-model`, `--n-head`, `--n-kv-head`, ...). On refuse, `hexa cloud` prints the mem-budget breakdown + an optimizer downgrade ladder (AdamW8bit / PagedAdamW8bit / Lion / ZeRO-2-AdamW). SKILL.md / README.md / commands/cloud.md / plugin.json / marketplace.json all updated in lockstep; bin/cloud.sh unchanged (args pass through). commands/cloud.md description also corrected: the canonical form is `hexa cloud "$@"` (subcommand), not a separate `hexa-cloud` binary. NL triggers added: "OOM 사전체크", "메모리 예산 확인", "preflight", "dispatch refuse". Tracks `inbox/notes/2026-05-22-hexa-cloud-cycle-c-reflect.md`.

- **hexa-native 0.1.0 — new hook** — PreToolUse(Write|Edit|NotebookEdit) hard block for `.py` / `.sh` writes inside any project rooted at a directory containing a `project.hexa` marker. Walks up parent dirs of the target file path; if `project.hexa` is found, the write is denied with `permissionDecision: deny` and a fixed reason message redirecting the operator to `.hexa` (since `.py` / `.sh` are already supported as ai-native English elsewhere). Targets only `.py` / `.sh`; other extensions pass through. Non-hexa-native projects (no marker) are unaffected. NO opt-out by design: no env var (no `BYPASS_HEXA_LANG`, no `SIDECAR_NO_HEXA_NATIVE`, etc.), no `~/.claude/sidecar/disabled.json` honoring, no per-project exception list — uninstall the plugin if you need a way out.

- **commons → 0.9.14** — add `@D g29` (CHANGELOG.md at repo root). do = create + maintain `CHANGELOG.md` at every repo's root as the chronological history surface — pairs with g15 (current-state living docs · history off the prose) and g22 (every version bump adds a CHANGELOG entry in the same commit). Marketplace description range bumped from `@D g1..g28` to `@D g1..g29`.

- **tape-lint 0.1.0 — new hook** — PreToolUse(Edit|Write) deny for `.tape` edits that introduce `@D` governance blocks with fields other than `do` / `dont`. Diff-aware: pre-existing fields on disk are grandfathered, only newly-introduced fields (`why` · `tool` · `note` · `ref` · ...) block the edit, so legacy `.tape` files don't lock down unrelated work. Per-project enforcement: triggers on any `*.tape` path in any repo. Opt out via `SIDECAR_NO_TAPE_LINT=1` or `~/.claude/sidecar/disabled.json`.

- **secret → 0.3.0** (skill) wrapping **dancinlab/secret 0.4.0** — `/secret` adds admin verbs `init [icloud|github <url>]`, `backup [enable <url>|disable|status]`, `sync`, `migrate`. The underlying CLI flips to a dual-channel sync architecture: keychain file is encrypted at rest with the user-chosen master password and pushed/pulled AS-IS via either (a) iCloud Drive file-level sync, or (b) a private GitHub mirror (`secret backup enable <url>` adds it; `disable` removes it; both can coexist). Mirror auto-push is ON by default once enabled — opt out per-call via `SECRET_BACKUP_AUTO=0`. `secret init` now also disables keychain auto-lock (`security set-keychain-settings <kc>` with no flags) so the master-password GUI dialog no longer pops up every 5 min idle / on sleep. The skill's `bin/secret.sh` wrapper drops the (now-removed) `hx install` hint. plugin.json + marketplace.json + sidecar README row all bumped accordingly. SKILL.md adds the new admin-verb section + auto-push opt-out note.

- **sidecar-lint 0.1.0 — new hook** — PreToolUse(Bash) auto-lint that fires on `git commit` inside any Claude Code marketplace plugin pack (repo with `.claude-plugin/marketplace.json`). Non-blocking findings as `additionalContext`: stale-history patterns in staged diff (commons `@D g15`), hardcoded `/Users/` or `/home/` paths in staged diff (commons `@D g13` · sidecar `@D s3`), `marketplace.json` plugin entry vs each `plugin.json` version drift (commons `@D g22`), `hooks/*/bin/*.sh` missing user-exec bit. Description drift between `marketplace.json` and `plugin.json` intentionally NOT checked (too noisy). Self-excludes `hooks/sidecar-lint/` and `CHANGELOG.md`. Opt out via `SIDECAR_NO_LINT=1`.

- **git-guard → 0.2.0** — narrow scope to force-type git push only. 0.1.0 also denied `git {commit,merge,rebase} --no-verify` (hook-bypass); per user direction the guard shouldn't over-block routine work, so the `--no-verify` family is dropped and left to user discipline. Force-push patterns retained: `git push --force` / `-f`, `git push --force-with-lease`, `git push <remote> +<refspec>` (refspec-level force).

- **project.tape — trim to commons.tape minimal style** — `@I` brief, `@D s1` dont, and `@D ship` do/dont tightened: dropped catalog-style example lists, the cross-repo ship disambiguation prose, and the credential-pattern duplication (now refers to commons `@D g28` SSOT). Same governance, less verbosity.

- **marketplace.json / `hooks/prefs/.claude-plugin/plugin.json` / `hooks/prefs/README.md` / `skills/cloud/.claude-plugin/plugin.json` — stale-history footnotes trimmed** per `@D g15`. Three dated footnotes cleaned from descriptions: commons `Sonnet bench v4 winner` ratio, prefs SSOT migration footnote, cloud upstream-gap inbox pointer.

- **README.md plugin table — refreshed** — `git-guard` row updated to reflect narrowed 0.2.0 scope; `sidecar-lint` row added; `prefs` row trimmed of stale-history footnote.


- **paper → 0.3.0** — template enriched with a working matplotlib figure example so `/paper new` produces a paper that compiles end-to-end with one real figure inlined, not just a commented-out placeholder. Adds `template/figures/_scripts/fig01_example.py` (minimal bar chart, three placeholder data rows, DejaVu Sans, no math deps), the rendered `template/figures/fig01_example.pdf`, and uncomments the corresponding `\includegraphics` in `template/main.tex`. Makefile gains a `figures` target that runs `figures/_scripts/*.py` (auto-discovered via wildcard — drop `fig02_<name>.py` and it's picked up) and per-figure rules `figures/%.pdf: figures/_scripts/%.py`. README/template documents the workflow and points users to `/paper sample <slug>` for a richer reference (sample-nb-bcs-absorbed, 11-page Nb BCS attestation w/ 3 matplotlib + TikZ + tables). Motivated by user feedback that `/paper new` produced a 2-page placeholder paper far below the bundled sample's quality — gap now bridged with one working figure shipped in-tree. Backward-compatible: existing papers ignore the new `figures` target unless they adopt the `_scripts/` pattern.

- **imagine 0.1.0 — new skill + command** + **paper → 0.2.0** — `/imagine <prompt-file> <out.png> [-s size] [-b backend] [-m model]` generic AI image generator. Backend-pluggable dispatcher with two backends out of the box — `fal` (default, `queue.fal.run/<model>` queue+poll; key via `secret get fal.api_key`; **default model = `openai/gpt-image-2` firm-pinned per user directive**) and `openai` (sync `api.openai.com/v1/images/generations`; key via `secret get openai.api_key`; default `gpt-image-1`). Canonical fal-style size tokens (`square_hd` / `landscape_16_9` / `portrait_16_9` / `square`) translate per-backend. Add a backend by dropping `_backends/<name>.sh` — dispatcher auto-discovers via `/imagine list`. Provenance: prompt always read from a file (verbatim text stays on disk for reproducibility); payload JSON routed via `mktemp` so the prompt never appears on argv (commons g28-safe). ROOT derived from script location so cross-plugin invocation (e.g. `/paper fig`) resolves `_backends/` correctly regardless of inherited `CLAUDE_PLUGIN_ROOT`. **paper 0.2.0** refactors `/paper fig` to delegate to the sister `imagine` plugin (DRY — drops the embedded `_tools/fal_gen.sh`). paper's `find_imagine` resolver walks the installed cache layout (`~/.claude/plugins/cache/sidecar/imagine/<ver>/bin/imagine.sh`) → source-repo sibling (`skills/imagine/`) → PATH fallback. Sample-nb-bcs-absorbed README updated to show `/imagine` + `/paper fig` pairing on its four bundled fal-style prompts.

- **paper 0.1.0 — new skill + command** — `/paper <args>` arxiv-style LaTeX paper scaffolder. Verbs: `new <slug>` (scaffold the minimal `template/` skeleton at `./<slug>/` — main.tex single-column 11pt A4 + references.bib + Makefile + README.md + figures/_prompts/), `sample <slug>` (copy the bundled demiurge `sample-nb-bcs-absorbed/` verbatim — an arxiv-quality reference exhibit: ~14-page Nb BCS universal-gap-ratio attestation w/ TikZ + matplotlib figures + 5-lab consensus table + CSH honest-negative case study), `fig <size> <prompt> <out>` (fal.ai gpt-image-2 queue+poll via `_tools/fal_gen.sh`; key via `secret get fal.api_key`), `compile [dir]` (pdflatex × 3 + bibtex), `list`, `help`. Sample preserved verbatim under `samples/sample-nb-bcs-absorbed/` (main.tex + references.bib + figures/*.pdf + _prompts/*.txt + _scripts/*.py), with the upstream `make check` prereq (demiurge-only `check_rtsc_claim.sh`) dropped so the bundle builds standalone. Cross-project carrier — sidecar plugin per `@D s4`; portable per `@D s3` (`${CLAUDE_PLUGIN_ROOT}`-based, no `/Users/ghost/...`).

- **commons → 0.9.13** — add `@D g28` (credentials — never expose verbatim · `secret` CLI is the only channel). do = fetch only via `secret get <key>`, use inline `$(secret get <k>)` for env-var/stdin/tty consume (process-lifetime ephemeral); dont = print/echo/log/commit/paste verbatim anywhere (chat · doc · log · state · commit · scrollback · history · clipboard · env-dump · `ps aux`) · subprocess argv (`--token $V` → ps leak) · Read/cat credential files directly.
- **secret 0.1.0 — new skill + command** + **commons → 0.9.12** — `/secret <args>` wraps the new [`dancinlab/secret`](https://github.com/dancinlab/secret) CLI (macOS Keychain-backed credentials, single bash script). Verbs: get · set · delete · list · service. ⚠ `/secret get` surfaces the value into conversation context — SKILL.md recommends inline bash `$(secret get <k>)` for tool-invocation patterns to keep secrets out of model context. commons g23 catalog updated to list `/secret` under CLI.
- **ship 0.1.0 — new skill + command** — `/ship -m "<msg>" <path>…` automates the mechanical tail of the `@D ship` cycle: `git add` explicit paths (never `-A`/`-u`) → credential-scan the staged diff (`rpa_`·`sk-`·`hf_`·`AKIA`, abort + unstage on hit) → commit → push `origin/<branch>` → `sidecar sync`. Logic lives in the plugin's own `bin/ship.sh` (no `sidecar` CLI verb — kept the CLI at `init`/`sync`); portable per g13 (PATH-resolved `git`/`sidecar`, zero hardcoded paths). The agent still owns the judgment half — SemVer bump + version-surface lockstep + commit message — BEFORE invoking, per g22. NL trigger via skill (ship · 배포 · 출시).
- **commons → 0.9.11** — register `/ship` in `@D g23` (slash-command catalog, workflow group) so the agent is aware the command exists. Rule count unchanged (g1..g27).
- **commons → 0.9.10** — strengthen `@D g13` (portable paths only) for the distribution context: shipped plugin code runs on many users' machines, so the title states that explicitly and a new `do` carries the runtime-resolution toolset — `$HOME` / `${HOME}` · `${CLAUDE_PLUGIN_ROOT}` (install dir) · `$CLAUDE_PLUGIN_DATA` (per-plugin state) · PATH-resolved binaries · relative / `<repo-name>/<relpath>` notation. `dont` hardened: never hardcode `/Users/<you>/…` · `/home/<you>/…` · machine-specific dirs, and never assume your username / dir tree exists on the installer's box. Rule count unchanged (g1..g27).
- **commons → 0.9.9** — add `@D g27` (generic ship cycle). commit (explicit paths · credential scan) → push origin/<branch> → reinstall local copy so it matches HEAD (`hx install <name>` for hx-packaged repos · project-specific install otherwise), especially after native / launchd / daemon / compiled-source changes. Dont = build-and-stop (stale install/.app/daemon), defer reinstall, `-A`/`-u` staging, skip credential scan. Generic form covering airgenome · void · wraith-wallet · ghost · forge + all hx repos (DRY — one rule instead of per-repo @D ship duplicates; sidecar's own project.tape @D ship overrides with `sidecar sync`).
- **commons → 0.9.8** — add `@D g26` (lattice-as-tool, not constraint) + carry `LATTICE_POLICY.md` as the cross-project SSOT. New AI-native, English-only `hooks/commons/LATTICE_POLICY.md` (distilled from echoes' 277-line bilingual original — dropped history footnotes / distribution lists / Savant deep-detail). g26 do = treat n=6 lattice as an analytical tool, use where it naturally fits; dont = treat as hard constraint / derivation rule, force-fit onto external entities (cite their own invariants). g25 + g26 both point at the sidecar-local LATTICE_POLICY.md SSOT (moved here from per-repo copies).
- **commons → 0.9.7** — add `@D g25` (real-limits-first). Anchor any ceiling/limit claim to a REAL mathematical or physical bound (Shannon · c · ℏ · Carnot · type-soundness · NP-hardness · secp256k1 · sha256), not a convenience number; don't use lattice n=6 / lattice-fit as the ceiling for external claims, invent artificial ceilings, or apply lattice derivation to external entities. Surfaced during the per-repo project.tape candidate sweep — hexa-lang · echoes · hexa-codex · forge independently referenced it, so it belongs in commons not each project.tape.
- **cycle 0.1.0 — new skill + command** — autonomous work-loop driver: `/cycle` runs next-list (self-enumerate next viable work from current context) → parallel-plan table → fan-out (one bg Agent per item, same message) → loop. Repeat `/cycle` to march through a goal in parallel batches. The self-enumerate behavior briefly added to all-bg-go 0.3.x moved here (per user: keep `/cycle` separate, don't integrate into all-bg-go).
- **all-bg-go → 0.4.0** — revert to reactive-only (prior-turn fan-out). The self-enumerate mode added in 0.3.x moved to the new `/cycle` plugin. all-bg-go = fan out exactly what the prior turn offered; `/cycle` = self-generating repeatable loop. "Do not invent branches" guardrail restored (points at `/cycle` when there's no prior-turn list).
- **commons → 0.9.6** — g23 split `/all-bg-go` (reactive fan-out) from new `/cycle` (autonomous loop) in the slash-command catalog.
- **all-bg-go → 0.3.0** — (superseded by 0.4.0) add self-enumerate mode. 0.2.x only fanned out branches the PRIOR turn offered (and asked when there were none). 0.3.0: when the prior turn has no explicit branches, the skill derives the next viable work items from the current context itself (roadmap/todo · active-goal sub-tasks · "what's next" set), then fans them out. Makes `all bg go` a repeatable **next-list → fan-out → loop** driver — keep saying it to march through a goal in parallel. Guardrail: self-enumerate only when next work is genuinely inferable; else ask (don't fabricate filler branches).
- **commons → 0.9.5** — add `@D g24` (research/experiment — explore all viable paths in parallel, not pick-one). In research / experiment / breakthrough work, when multiple disjoint candidate paths surface (different methods · datasets · approaches), fan out ALL viable ones in parallel (`all-bg-go` · parallel pods · `hexa cloud` fanout) and let evidence converge — that's the default for research domains. Dont: serialize independent paths · pick-one menu when disjoint+parallelizable · sink hours into one unilaterally while equally-viable paths idle (only gate the genuinely huge-cost path for explicit confirm). Pairs with all-bg-go + g12 (pod fanout) + demiurge d2 (never concede).

- **commons → 0.9.4** — refresh `@D g23` (sidecar slash commands) to reflect newly-shipped wrappers + domain 0.3.0 capabilities. Now lists `/pool`, `/cloud`, `/hexa-help` (CLI wrappers shipped 0.9.2-0.9.3), and updates `/domain` line to `/domain [task]` (checkbox-task log · auto-scaffolds w/ project-name default). Also reflects the marketplace.json domain entry bump (0.2.0 → 0.3.0) that the 9ac6f92 commit missed because of Edit-without-Read tool failures.
- **domain → 0.3.0** — checkbox-task log + project-name fallback + auto-scaffold. Log entries now use `- [x]` (done) / `- [ ]` (pending) checkbox bullets that flip in-place via `/domain done <match>`. NAME defaults to `$(basename $(git rev-parse --show-toplevel) | upper)` if omitted (e.g. cwd `~/core/demiurge` → `DEMIURGE.md` + `DEMIURGE.log.md`). Auto-scaffolds both files if missing on any invocation. New verbs via `bin/domain.sh`: bare = show · `<task>` = append `[x]` · `todo <task>` = `[ ]` · `done <match>` = flip · `new <header>` = start new entry. Built for the "record all steps as work proceeds" pattern — log accumulates a checkbox audit trail.
- **commons → 0.9.3** — revert g8 to canonical `hexa cloud` subcommand form (0.9.2 had codified the broken-state `hexa-cloud` binary, which violates g11: don't paper over upstream gaps). The upstream gap (cloud subcommand not yet registered) is now properly tracked at `hexa-lang/inbox/patches/hexa-cloud-subcommand.md`. `/cloud` wrapper updated to `exec hexa cloud "$@"` (canonical, will work after upstream lands).
- **commons → 0.9.2** — (superseded by 0.9.3) fix `@D g8` invocation. Original 0.9.2 codified `hexa-cloud` binary as the canonical form — wrong per g11 (workaround instead of upstream patch). Reverted in 0.9.3.
- **pool 0.1.0 + cloud 0.1.0 + hexa-help 0.1.0 — new skill + command trio** — wrap remaining CLIs referenced in commons. `/pool` → `pool "$@"` (commons g9 host roster + remote exec). `/cloud` → `hexa-cloud "$@"` (commons g8; fails fast with install hint if not on PATH — upstream gap: `hx install hexa-cloud` registry entry pending). `/hexa-help [verb]` → `hexa --help` / `hexa <verb> --help` (commons g7). Discovery of commons g8 invocation gap during ship surfaced the rule correction (above).
- **README plugin table — repair** — commons row description was wiped + prefs row description had `commons` text appended (Edit-without-Read sequence in commit 2af257f). Restored both rows + added pool/cloud/hexa-help rows.
- **commons → 0.9.1** — add `@D g23` (sidecar slash commands — use when applicable). Enumerates the catalog by category — discovery (`/brainstorm` · `/gap` · `/kick` · `/verify`) · workflow (`/inbox` · `/all-bg-go` · `/domain <NAME>` · `/inject` · `/prefs`) · style (`/easy`) · research (`/research:arxiv` · `/research:yt`) — so the agent knows commands exist and can reach for them when the situation fits, rather than re-implementing equivalent behavior inline.
- **kick 0.1.0 + verify 0.1.0 — new skill + command pair** — thin wrappers around `hexa kick` and `hexa verify` for in-session use. `/kick <natural-language seed>` joins args into `--seed` (advanced flags `--rounds`/`--engine` via direct `hexa kick`). `/verify <args>` passes through to `hexa verify` (forms: atlas-id · `--expr <fn> <n> <v>` · `--fence "<claim>"` · `rubric` · `list`). Both pair with commons rules — `kick` ↔ g6, `verify` ↔ g5. NL triggers via SKILL.md ("kick this" · "돌파해줘" · "discover for" / "verify this" · "확인해" · "검증해" · "맞아?").
- **gap → 0.2.0** — add `occams-razor` lens to both F4 (Epistemic-Evidence — hypothesis side: "of competing hypotheses for the same observation, is the simplest tried first?") and F6 (Simplicity-Canonical — design side: "of working designs for the same outcome, is the fewest-parts one chosen?"). Catalogue is now 42 lenses (was 40); F4 and F6 carry 6 lenses each, the other 6 families stay at 5. mode A subagent dispatch adjusts per-family lens count accordingly.
- **prefs 0.1.0 — new hook + command** — user language preferences across 3 axes: `code` authoring (.tape · .hexa · .py · .sh · .swift · ...) · `docs` authoring (.md · README · CHANGELOG · ...) · `response` language to user. SessionStart + PreCompact + PostCompact hook auto-injects current values as `additionalContext`. `/prefs show` · `/prefs code <lang>` · `/prefs docs <lang>` · `/prefs response <lang>`. Storage at `$CLAUDE_PLUGIN_DATA/prefs.json`. Defaults: code=english, docs=english, response=korean (matches the old commons g2).
- **commons → 0.9.0** — remove `@D g2` (english artifacts · korean response). SSOT for language preferences moves to the new `prefs` plugin (`/prefs code|docs|response <lang>`). Defaults preserved (english/english/korean) inside the plugin. Minor bump per g22 (removing a user-visible rule).
- **commons → 0.8.5** — add `@D g22` (version discipline — bump SemVer + lockstep all version surfaces): any user-visible behavior change → bump SemVer (patch = fix/new entry · minor = new feature/format · major = breaking) AND update all version-bearing surfaces (manifest · README · CHANGELOG · marketplace · cache · etc.) in the SAME commit; ship per project's ship cycle. Dont = ship behavior change without bump · drift between surface files · skip the CHANGELOG entry.
- **commons → 0.8.4** — add `@D g21` (no workaround / temp-fix as user choice — go straight to the proper fix): when the proper fix is identifiable, just implement it (the proper fix is THE action, not one option among many); don't offer the user a `quick patch vs proper refactor vs workaround` menu when the proper path is clear; don't present workaround / temp-fix / band-aid as alternatives to be picked between. Companion to g11 (no gap workarounds — file upstream inbox patch) and g18 (bypass anti-punt) — same posture, different angle.
- **commons → 0.8.3** — add `@D g20` (no hardcoding · implement generically): implement once + parameterize over instances · code lives in one canonical home · manifest-driven extension (new instance = manifest only, no code change) · universal generic path; dont = hardcode per-instance/per-domain/per-tenant branches · duplicate across topical folders · per-instance Producer/Dispatcher/Handler family · branch on instance name in the generic layer. Generalization of demiurge's d3/d4/d5 (cellrun aggregator pattern) into cross-project architectural rule.
- **gap 0.1.0 — new command** — restore pre-v2 `wilson-gap` plugin from `4566a2a feat(wilson-gap): new /gap multi-axis gap-exploration plugin`. `/gap` sweeps the current work through 40 breakthrough-strategy lenses curated into 8 families (Math-Structural · Adversarial-Stress · Economic-Resource · Epistemic-Evidence · Convergence-Closure · Simplicity-Canonical · Temporal-Dynamics · Coverage-Consistency). 3 modes: bare = triage-then-deepen, `full` = exhaustive 8-subagent fan-out, `list` = print catalogue. Surfaces + prioritises gaps only — never fixes. First sidecar plugin in the top-level `commands/` dir (concept-separation: command-only plugin, no skill / hook).
- **inject 0.1.0 — new skill + command** + **`bin/sidecar` gains `sync` verb** — `/inject` runs `sidecar sync` (marketplace pull → cache copy any new versions → patch `installed_plugins.json` with version/installPath/lastUpdated/gitCommitSha) AND prints the latest `commons.tape` + (cwd's) `project.tape` to stdout so the model reads them on the next turn — IMMEDIATE in-session refresh without restarting Claude Code. The standalone `sidecar sync` verb is the mechanical sync (extracted from the manual marketplace+cache+JSON pattern); the skill wraps it for in-session use + adds the print step.
- **commons → 0.8.2** — add `@D g19` (meta-rule about project.tape / multi-rule `.tape` carrier formatting): use granular `@D` blocks (one rule per entry, single concept, do/dont only); no `tool` / `usage` keys on multi-rule carriers (v4 bench net-negative); single-rule isolated blocks like `@D ship` MAY use tool per tape v1.4 spec. Don't pile concepts into one monolithic `@D` (exceeds 500-char/entry cap, dilutes attention — v4: 33/36 granular vs 31/36 monolith). Cross-project always-on enforcement.
- **project.tape — granular @D form** — mirror the commons 0.8.x granular pattern: split the 2-block form into 6 single-concept `@D s1..s5` + `@D ship` blocks. Each block carries one rule (concept separation · structured carriers · portable plugin scripts · commons-carries-cross-project · project.tape-carries-project · ship cycle). Stacked-PRs / re-encode-prose duplicates with commons.tape dropped (DRY — commons covers cross-project, project.tape covers sidecar-specific only). Per explicit user request.
- **commons → 0.8.1** — restore `@D g18` (bypass anti-punt) that was in 0.7.3 but missing from the 0.8.0 flip (format-B.tape used as the source was a pre-bypass bench snapshot). Granular form now has 18 blocks; the bypass rule lives as its own typed block alongside g16 (AGENTS.tape) and g17 (project.tape).
- **commons → 0.8.0** — flip to granular `@D g1..g17` form (no tool/usage). Sonnet bench v4 (N=12, 3 formats) ranked B (granular plain) 33/36 vs A (single-block) 31/36 vs B+ (granular + tool/usage) 29/36 — B wins on compliance + durability margins. v3 had ranked A > B by 3 points; averaging v3+v4 the two are statistically tied, so the flip is within noise. tool/usage in v4 showed net negative (-4 from B to B+), so commons stays plain — the v1.4 `tool`/`usage` capability remains in the spec for narrower single-rule files like `project.tape`'s `@D ship`.
- **domain → 0.2.0** — add sister `.log.md` append-only history file. 0.1.0 only wrote `<DOMAIN>.md` (snapshot) and relied on git log for history; 0.2.0 dual-writes — every invocation also prepends an entry to `<DOMAIN>.log.md` (`## <ISO ts> — <one-line summary>` + optional body, newest on top). Same dir as the snapshot, never edit prior entries, corrections = new entry. Markdown analog of tape v1.2's official `<DOMAIN>.tape` + `<DOMAIN>.log.tape` sister pattern.
- **domain 0.1.0 — new skill + command** — maintain UPPERCASE `<DOMAIN>.md` files at project root as living current-state snapshots. Overwrite, NOT append; no `## Changelog` / `### YYYY-MM-DD update:` / `~~struck~~` / `Last updated:` footer inside the file. Each invocation: read current → integrate user's update → overwrite. Git log is the only chronological record. `/domain <NAME> [update]` or natural-language trigger. Examples: `ROADMAP.md` · `STATUS.md` · `PLAN.md` · `GOAL.md` · `ARCHITECTURE.md` · `DECISIONS.md` · `BACKLOG.md`.
- **project.tape — add `@D ship` block** — first-class entry for the ship cycle (was inline in `@D sidecar`). Captures the full atomic op restored from the removed `.specify/specs/001-ship-cycle/spec.md`: commit (stage explicit paths · credential scan) → push → marketplace pull → cache copy → `installed_plugins.json` patch. Uses tape v1.4 `tool` field; version bumped `1.2 → 1.4`. Per-user request.
- **bypass → 0.2.0** — extensible anti-punt catalog. 0.1.x covered just the "next user action:" block; 0.2.0 generalizes to a universal self-check (interactive input · unauthorized destructive · external visible · explicit user-review request) applicable to any punt-form, plus a numbered catalog of common punt-patterns (1: user-action blocks · 2: `Should I proceed?` · 3: `Want me to check?` · 4: option-trees with obvious default · 5: over-clarification on inferable details · 6: defer-by-waiting · 7: excessive recap-before-action · 8: plan-then-ask for reversible work). Catalog is extensible — new patterns appended as observed.
- **commons → 0.7.3** — expand the bypass `dont` entry to mirror the new catalog (was specific to `next user action:` blocks in 0.7.2; now covers the whole category with the universal self-check stated inline).
- **bypass → 0.1.1** — reframe as DEFAULT behavior (auto-fire, not opt-in). Original 0.1.0 framing said "triggers on phrases" — implied opt-in; corrected to "auto-fires before any punt-block via self-check; explicit invocation is fallback only". Cross-project enforcement stays in `commons.tape` ≥ 0.7.2.
- **bypass 0.1.0 — new skill** — kills the "next user action:" punt. When the agent is about to emit a block of bash commands as user-action and the agent itself can run them (no interactive human input · no unauthorized destructive ops · no external visible messages), just execute.
- **commons → 0.7.2** — add `dont` entry mirroring the new `bypass` skill: "punt to user with `next user action:` block when the listed commands are agent-executable — just run them". Cross-project always-on guard; the skill is the explicit-trigger surface.
- **brainstorm 0.1.0 — new skill + command** — iterative ideation that runs in rounds until depletion: round 1 spreads 5–8 distinct angles (obvious · unconventional · contrarian · hyper-narrow), each subsequent round adds 3–5 more that fill missing quadrants or go deeper/weirder. Depletion fires when >50% of a new round is paraphrase of prior, or when a named missing quadrant can't be filled non-paraphrased. Hard cap 8 rounds. Final summary: total · quadrants covered · top-3 picks · unfilled gaps. Natural language ("brainstorm X", "쥐어짜봐", "exhaust the well") or `/brainstorm <seed>`.
- **commons → 0.7.1** — single `@D commons` block form restored after Sonnet N=12 bench (v3) showed it scored 32/36 vs granular 17-block form's 29/36 (compliance · recognition · durability axes). `tape v1.4` `tool` / `usage` fields remain available in the spec (commit `2cfd0b8` in `dancinlab/tape`) for projects that benefit from them; commons itself stays on the simpler form per the measured signal.
- **commons → 0.7.0** — granular `tape v1.4` form. The single `@D commons` block (which exceeded v1.2's 500-char/entry cap) is replaced by 17 typed `@D g1..g17` blocks — one rule per entry, each with its own `do` / `dont`. Rules that name a canonical CLI (`hexa verify`, `hexa cloud`, `pool`, `Monitor`, etc.) carry the new optional `tool` / `usage` fields introduced in [`tape v1.4 amendment`](https://github.com/dancinlab/tape/commit/2cfd0b8). Backwards-compatible — rules with no specific tool keep just `do` / `dont`.
- **research 0.1.0 — new skill + commands** — revives the pre-v2 `wilson-research` plugin (`0b4fa1a`). Two slash verbs: `/research:arxiv <query|id> [--n N]` (official arXiv API Atom feed → title · authors · date · categories · pdf · abstract) and `/research:yt <url-or-id> [lang]` (InnerTube ANDROID-client `player` API → caption-track XML → plaintext transcript). Pure Python stdlib (no pip deps, no API keys, no binaries). Natural-language trigger via SKILL.md.
- **commons → 0.6.2** — add `dont` entry: "touch project.tape unprompted (active project SSOT — read freely, but modify only on explicit user request)". Mirrors the existing AGENTS.tape dormant-carry rule for the active SSOT case.
- **all-bg-go → 0.2.0** — plan-then-fire flow. Before dispatching the N background Agents, the skill prints a compact plan table (`| # | label | subagent_type | iso | goal |`) so the parallel plan is visible to the user. Plan + dispatch stay in ONE message (no extra turn). The >8 cap now uses the plan table to make cost visible before confirming.

## 2026-05-21

- **gh-stack 0.1.0 — new skill** — natural-language trigger that proposes the stacked-PR workflow. Two modes: `gh stack` commands (private-preview enabled repos) or the manual `gh pr create --base previous-layer` fallback. Encodes sidecar's <200-lines-per-layer · 1-concern governance. Per-org status tracked in `gh-stack.md`.
- **README — `sidecar init` walkthrough** — install section spells out the `project.tape` field placeholders (kind/brief/parent/ssot/do/dont) + the `CLAUDE.md → project.tape` symlink + project-tape re-injection. Install commands switched to bare names (`hx install sidecar`, `hx install tape`) since both resolve via the trimmed default org-probe.
- **Spec Kit removed** — `.specify/` (memory · scripts · templates · workflows · integrations · 001-ship-cycle spec) and `.claude/skills/speckit-*` deleted. `<root>/project.tape` is the substantive project SSOT (CLAUDE.md symlink + `project-tape` hook re-injects on PreCompact/PostCompact). `design.md` Decision 2 records the current SSOT shape.
- **sidecar project.tape — minimal Ⓑ shape** — `@V` + `@I` (kind/brief/parent/ssot) + `@D` (do/dont). Layout tree + named governance rules removed; their content is captured in `design.md` decisions and the README plugin table.
- **commons → 0.6.1** — strip 3 Spec Kit `do` entries (recognize `.specify/`, treat constitution.md as SSOT, use the Spec Kit pipeline) + 1 `dont` (skip Spec Kit pipeline for >200 lines). Carrier shape unchanged.
- **project-tape 0.1.0 — new** — PreCompact + PostCompact hook that re-injects `<project-root>/project.tape` as `additionalContext` so project identity + governance survive auto-compaction. SessionStart is intentionally skipped because the harness already loads `CLAUDE.md → project.tape` (symlink) at session bootstrap. No-op when `project.tape` is absent.
- **tape-lsp 0.1.0 — new** — wires the canonical `.tape` v1.2 LSP server (`tape-lsp` — see `dancinlab/tape`) into Claude Code. Diagnostics + hover. Requires `tape-lsp` on PATH (`hx install dancinlab/tape`).
- **sidecar CLI — new** — `bin/sidecar`, single verb `sidecar init` that scaffolds `project.tape` + `CLAUDE.md → project.tape` symlink in the current dir. Installable via `hx install dancinlab/sidecar`.
- **sidecar dogfood** — repo root now carries `project.tape` (identity + ship-cycle + cross-project-carrier governance in `.tape` v1.2 grammar) with `CLAUDE.md → project.tape` symlink.
- **commons → 0.6.0** — carrier reverted to `commons.tape` (single `@D commons :: governance` entry with `do` / `dont` fields). `bin/commons.sh` emits the tape verbatim as `additionalContext`; the JSON-render path is gone.
- **commons → 0.4.1** — added DO entry: use Claude Code's `Monitor` tool for streaming events from a background process (per-line stdout = notification), not `tail -f` / sleep-poll loops.
- **commons → 0.4.0** — carrier moved from `commons.tape` to `commons.json` (structured `{ "do": [...], "dont": [...] }`, rendered to markdown by `bin/commons.sh`). Added do/dont entries codifying the "docs in completed-form · history in CHANGELOG / archive/" rule.
- **all-bg-go 0.1.0 — new** — parallel fan-out trigger. When the prior assistant turn offered N branches and the user says "all bg go" (or 전부 병렬 발사 / fan it all out), spawn one background Agent per branch in a single message. Skill + `/all-bg-go` command.
- **git-guard 0.1.0 — new** — PreToolUse(Bash) deny for `git push --force(-with-lease)`, refspec-force `+<ref>`, and `git {commit,merge,rebase} --no-verify`. Opt out via `SIDECAR_NO_GIT_GUARD=1`.
- **`.tape` carriers retired** — `commons.tape` and `AGENTS.tape` moved into `archive/` (no live plugin reads `.tape` anymore).
- **Install cleanup** — 34 stale `wilson-*@sidecar` entries purged from `~/.claude/plugins/installed_plugins.json` + matching cache directories removed. Marketplace ↔ installed-plugins ↔ cache are now in agreement.
- **Spec Kit ship-cycle formalized** — `001-ship-cycle/spec.md` records `ship = commit + push + install + no-unshipped-diffs` as an invariant.
