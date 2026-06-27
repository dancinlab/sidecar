# sidecar

> 프로젝트 무관(project-agnostic) **AI 코딩 사이드카** — 어느 repo 에든 드롭인.
> 실행·파일·프롬프트 단계에 끼어들어 규칙을 강제하고, 모든 결과를 append-only JSONL 로 남긴다.

🔧 **사이드카 = "AI 코딩 보안검색대"** — AI 에이전트(Claude Code / Codex 등)가 명령을 실행하거나 파일을 고치기 직전·직후에 게이트를 통과시켜, 위험한 동작은 막고(block) 잠금 파일 수정은 경고(warn)하며 검증·인계를 자동화한다. ESLint 가 "코드 문법"만 본다면, 사이드카는 **작업 흐름 전체**(명령 실행·파일 잠금·검증·세션 인계)를 단속한다.

이 저장소는 dancinlab 의 모든 repo(edge · anima · …)가 공유하는 **엔진**이다. 프로젝트마다 달라지는 것은 `harness.config.json` + `.harness/*.json`(규칙 데이터)뿐이고, `.ts` 엔진 코드는 전부 공유한다.

> 🌐 **언어 무관**: 웹뿐 아니라 Python · Rust · C/C++ · Go · Swift · hexa 로컬/모바일 앱에도 쓴다. `init` 이 스택을 감지해 검증 명령(cargo/pytest/swift build/…)과 다국어 우회패턴(`# type: ignore`·`#[allow]`·`swiftlint:disable`…)을 자동 적용. 엔진 실행에 개발머신 Node 1개만 필요(타깃 빌드와 무관). → [docs/languages.md](docs/languages.md)

```
[ edge repo ]──┐
[ anima repo ]─┼──▶ 같은 .ts 엔진 (이 repo)
[ 다른 repo  ]──┘        ▲
                         │ 각자 harness.config.json + .harness/*.json 으로
                         └─ 규칙만 다르게 주입
```

---

## 설계 원칙 (H1–H5)

| # | 원칙 | 의미 |
|---|------|------|
| H1 | **성공은 조용, 실패는 시끄럽게** | 통과 시 stdout 침묵, 실패만 stderr (JSON) |
| H2 | **자동 수정 안 함** | 제안·차단·경고만. 고치는 건 사람/에이전트 |
| H3 | **bitter-gate** | 새 규칙 추가 전, 안 쓰는(dormant) 규칙 먼저 폐기 |
| H4 | **config 주도** | 모든 프로젝트 색채는 데이터(JSON)로. 엔진 코드는 불변 |
| H5 | **AI-native** | 모든 산출물 JSONL append-only (`.harness/logs/*.jsonl`) |

---

## 구조

```
sidecar/
├── bin/sidecar          실행 입구 (bash — tsx 런타임 자동탐색)
├── cli/index.ts         디스패처 (sidecar lint → lint.ts)
├── lib/                 공용 부품
│   ├── paths.ts         repo-root 자동탐색 (harness.config.json / .git 상향 탐색)
│   ├── config.ts        harness.config.json 로드 + 기본값 머지
│   ├── lockdown.ts      L0(잠금) 파일 목록 (config + 🔴 마크다운 블록 파싱)
│   ├── log.ts json.ts exec.ts
├── modules/             기능 12종 (아래 표)
├── config/              번들 기본 규칙 (도메인-무관)
│   ├── enforcement.json   실행/쓰기 차단 규칙 + 프롬프트 힌트
│   ├── keywords.json      프롬프트 키워드 트리거
│   └── severity-map.json  오류 severity 분류
└── harness.config.example.json
```

### 명령 (modules)

| 명령 | 역할 | hook 단계 |
|------|------|-----------|
| `pre bash` / `pre write` | **코드레벨 가드**(force-push{blind `--force`/`-f`/`+refspec` 차단 · `--force-with-lease`는 허용 · `# force-ok` 예외} · cloud-raw c11 · commit-lint{`COMMIT-LINT` — agent `git commit` 가로채 sidecar-managed repo(harness.config.json)에서 lint 게이트 실행(`collectViolations`→`lintBlockers`)·block 위반이면 차단 → per-repo git pre-commit 훅과 동일 lint 를 **글로벌 settings.json** 경로로 훅-미설치 repo 까지 강제 · `-a/-am`=tracked-modified 스코프 확장 · `--no-verify`/`# no-verify-ok` escape 공유(danger 가드와 동일)} · danger{`--no-verify`·`reset --hard`·`curl\|sh` 는 상시 always-on · `rm -rf` 루트(`/`·`/*`·`~`·`$HOME`·`*`)는 config `dangerGuard.rmRfRoot` 토글 · **기본 OFF**(opt-out)} · secret-literal c1 · handoff-scatter · naming{버전/복사 접미사 파일·폴더명 `_v2`·`_final`·`_copy`·`foo 2` — **새 생성 BLOCK**(Write/Edit + Bash mv/cp/touch/mkdir) · **기존 비표준 파일 터치는 warn**(Read=preTouch · Edit/Write=기존파일이면 block 대신 warn — 편집 허용해 고치게) → canonical 단일파일 update-in-place 강제 · 이력은 git history · c25 · `@canonical-ok`(write)/`# canonical-ok`(bash) 면제} · state{scatter 디렉토리 `.verdicts`·`bench`·`experiments`·`scripts/scratch` 생성 **BLOCK**(Write/Edit + Bash mkdir/touch/cp/mv) → 단일 `state/` 루트 강제 · `state/`·`build/`·`.harness/` 통과 · `@state-ok`/`# state-ok` 면제 · preserve-state} · single-doc{scatter 파일명 `*-report/summary/notes/plan/guide.md`·`UPPERCASE.md`·날짜접두 생성 **BLOCK**(scope 무관) → ARCHITECTURE+CHANGELOG 통합 · `docs.allow`/`docs.enforce:off` 면제}) → 그다음 config enforcement 정규식. 코드 가드는 config보다 먼저 실행(profile 편집 무력화 방지) · 인라인 `# …-ok`/`// @secret-ok` 마커 + `dangerGuard.rmRfRoot` 토글만 예외 | PreToolUse |
| `post bash <exit>` / `post edit <file>` | 결과 기록, 0≠exit 라우팅, L0 편집 경고 | PostToolUse |
| 컴팩션 생존 재주입 | 세션-스코프 inject(architecture·git-context·toolkit·companions·ing)는 SessionStart 에서만 떠 자동 컴팩션 시 증발 → **PreCompact+PostCompact** 에 그 6개를 재주입해 설계트리·명령카탈로그·ING 보드가 세션 중반 살아남게 함(sidecar `project-tape` 동형) | PreCompact · PostCompact |
| `pre write` skill-desc 가드 | `commands/*.md`·`SKILL.md` 의 `description:` 이 1400자 skill-listing cap 초과면 **쓰기 차단**(`SKILL-DESC-CAP` deny — 초과 시 엔트리가 잘려 명령 인지가 죽음), 그 아래라도 `lint.cmdDescCap`(기본 320) 미니멀 cap 초과면 **차단**(`CMD-DESC-LONG` deny — 하는 일+`Triggers —` 만 두고 플래그표/카탈로그는 `--help`/`argument-hint` 로) · `Triggers —` 절 없으면 warn(`lint` 4f 가 커밋 백스톱). sidecar `skill-desc-guard` s18 이식 | PreToolUse(Write) |
| `prompt <text>` | 키워드 트리거 + 프롬프트 힌트 주입 | UserPromptSubmit |
| `architecture {inject\|show\|search <q>\|stop-check}` | repo-root `ARCHITECTURE.json`(우선)/`.md` 를 컨텍스트로 주입 — CLAUDE.md 처럼 설계 SSOT 상주 (80KB 초과 시 절단, 부재 시 무음). 트리 **뒤**에 턴-마감 게이트. **`stop-check`(Stop 훅 · `decision:block`)** = 설계판 enforce — working tree 에 미커밋 코드/ARCHITECTURE 변경이 있는데 응답에 `🏛️ ARCHITECTURE` 줄(`갱신:…`/`변동 없음`)이 없으면 차단(코드↔ARCHITECTURE drift 방지 · clean tree=no-op · `ing stop-check` 의 조건부판). **`search <q>`** = slug/이름/역할/상세 대소문자무시 substring → 매칭 노드 slug + breadcrumb (각 노드 고유 kebab-case slug = 검색키 · 구 `구분`/type 필드 폐기, 카테고리는 `guard-`/`module-`… slug prefix 로 흡수 · `lint` 가 slug 부재/중복/형식 block) | SessionStart + 매 UserPromptSubmit + Stop |
| `claudemd {inject\|show}` | repo-root `CLAUDE.md`(프로젝트 규칙)를 **매 턴** 재주입 — commons 처럼 salience 유지해 규칙이 묻히지 않게 (선택적 `<!-- enforce:start/end -->` 블록만, 80KB 절단, 부재 시 무음) | UserPromptSubmit |
| `toolkit {list\|inject\|json\|write\|check}` | **명령 카탈로그** — agent 가 전 명령을 인지·사용하게 SessionStart 에 `id — use ⟨triggers⟩` compact 주입(키워드 반응형 사각지대 보완). SSOT=`HELP`(파싱) → `write`=`TOOLKIT.jsonl` 산출, `check`=전 dispatch 명령 카탈로그 수록 **커버리지** + HELP↔파일 drift(`lint` 가 `TOOLKIT-DRIFT` warn) | SessionStart |
| `companions {inject\|list}` | **이웃 CLI 명령 surface** — toolkit 의 자매(toolkit=sidecar 자신, companions=이웃 CLI). DOMAIN-AGNOSTIC: 띄울 CLI 는 데이터(repo `harness.config.json` 의 `companions` + host-wide `~/.sidecar/companions.json`, cmd union·repo 우선)라 엔진엔 hexa 미하드코딩 → 전역 1곳으로 모든 repo 가 `hexa cloud` 존재를 더듬지 않고 인지. 각 companion 의 카탈로그 명령(default `--help`)을 실행·절단해 주입, 부재/실패면 skip·전부 없으면 무음 | SessionStart |
| `load {inject\|show}` | **매턴 자원 readout** — 답변 맨 위에 macOS 부하 한 줄 주입: CPU(load÷cores) · RAM(used%+커널 압박레벨) · swap · wt(추가 worktree 수) 신호등. 어느 축이든 🔴/pressure≥warn 이면 `⚠️` + 무거운 작업 자제 가드. 부하로 죽는 맥은 CPU 아닌 MEMORY(compressor+swap)로 죽으므로 RAM·swap 동시 표시 · worktree 는 격리 agent stranded 누적 가시화(🟢0-2 🟡3-9 🔴≥10). `sysctl`+`vm_stat`+`git worktree list`만(가벼움), 비-macOS 무음 | UserPromptSubmit |
| `recommend {inject\|show\|set-default\|get-default\|stop-check}` | **4축 추천 루브릭**(완성도·단순·안전·표준)을 매 턴 주입 + standing default mode(present/auto/complete/simple/safe/std) 운반. fixed/auto 모드는 박스를 정보용으로만 띄우고 챔피언을 그 턴에 auto-proceed. `stop-check`(**Stop 훅**)는 그 auto-proceed 의 **이빨** — 답변이 **진짜 박스/`🤖 ... auto-pick` 줄로 끝났으면**(`endsOnBox`=마지막 ~2 비어있지않은 줄) `decision:block` 으로 모델을 재호출해 강제 진행. **정밀**: tail=2 라 박스 뒤에 작업/요약이 따라오는 정상 턴은 무발화 → 정상 동작 땐 'Stop hook error' 가 안 뜨고, 진짜 박스에서 멈춘 경우만 강제(에러 ≠ 노이즈). 루프 가드는 네이티브 `stop_hook_active`, 체인당 1회 · present/박스없음/작업수행후는 no-op | UserPromptSubmit + Stop |
| `lint [all\|fast]` | staged-L0 + 신선도 + **CHANGELOG 누락** + **convergence 레코드 위생**(`CONVERGENCE-MALFORMED` block — ARCHITECTURE.json `convergence.records` 의 id+state) + **명령 desc 인지**(`SHADOW-DESC` warn — commands/*.md 가 ≤1400자 cap + `Triggers —` 절 보유) + **명령 desc 미니멀**(`CMD-DESC-LONG` block — commands/*.md description codepoint ≤ `cmdDescCap`(320) · 1400 천장과 별개의 빡빡한 미니멀 선 · 플래그 카탈로그는 `--help`/`argument-hint` 로) + **folder-guide**(`FOLDER-GUIDE-MISSING` block — staged 폴더에 CLAUDE.md) + **commons·CLAUDE 양식**(`COMMONS-PROSE`/`COMMONS-NO-DODONT`/`COMMONS-DODONT-INCOMPLETE` block — **commons.md + 루트 CLAUDE.md** 의 각 `## <slug>` 섹션 = do/dont-only·둘 다 필수·산문금지 · 첫 `## ` 전 preamble 면제 · 서브폴더 CLAUDE.md 는 자유양식) + **do/dont 길이**(`DODONT-LONG` block — **commons.md + 루트 CLAUDE.md** 의 do/dont 줄 >`dodontCap`(200) 신규/증가 · diff-aware · **서브폴더 CLAUDE.md**(folder-docs 로컬 가이드)는 자유양식이라 제외) + **HELP 백틱**(`HELP-BACKTICK` block — cli/index.ts HELP 리터럴 내 이스케이프 안 된 백틱) + **inject별 개별 크기**(`INJECT-OVERSIZED` block — agent 에 주입되는 **각 inject 소스가 자기 cap** 이하인지 · `lint.injectCaps` 맵(recommend.md 7000·styles/*.md 각 9000·prefs.json 2000) · 산문 비대=매 턴 context 세금 → 소스를 lean 하게 트림으로 해결, emit 절단 금지(내용 손실) · commons/CLAUDE/ARCHITECTURE 는 각자 format lint 가 그들의 inject lint) 체크 | commit 전 (git pre-commit hook) |
| `naming audit [path] [--ing] [--gate]` | repo 전수 비-canonical 이름 감사 — git ls-files 트리에서 버전/복사/중복 접미사(`_v2`·`config copy`·`utils_old`…) 스캔. write-guard 가 못 본 **기존 backlog** 용(canonical-naming). 생태계-native 면제: Android res 한정자 `-v<API>`·bare `_version`·`archive/`·`.verdicts/`(native-canonical-first). `--gate`=위반 시 exit 1 · `--ing`=요약을 **그 repo 자기 ING** 보드에 add(cross-repo 없음) | repo 정리·감사 시 |
| `ci [all\|fast\|list\|scaffold [--force]]` | config 의 검증 명령 병렬 실행 (실패 1개라도 → exit 1; 옛 이름 `verify` 별칭 유지, config 키도 `verify.checks`). **`scaffold`** = `.github/workflows/ci.yml` 방출 — checkout → stack setup(config `ci.setup`, 없으면 node/hexa/python 자동감지) → sidecar 설치 → `sidecar ci`(repo verify.checks) + `sidecar lint`. 러너=config `ci.runner`(기본 `ubuntu-latest` · 러너-브랜드 강제 없음, 어떤 `runs-on:` 라벨도 OK). config **`ci.fallback`** 설정 시 cost-free fast 경로 — `pick-runner` dispatch 잡이 self-hosted pool ONLINE+idle 이면 그걸(public repo 무료 12-core), 아니면 `ci.fallback`(무료 github-hosted) 사용. probe 에러→fallback 이라 CI 큐 영구대기 0(pool 선호는 secret `RUNNER_PROBE_TOKEN` admin:read PAT · Blacksmith 불요). config **`ci.cachePaths`** → `actions/cache@v4` warm 재사용. create-if-absent(`--force` 덮어쓰기). `sidecar init` 도 자동 방출 | commit/push 전 · 새 repo CI |
| `ci-track <pr\|branch> [--watch] [--merge-on-green] [-R owner/repo]` | 원격 PR/CI 체크 추적 — `gh pr checks --json` → pass/fail/pending 집계 + 🟢GREEN/🔴RED/🟡PENDING/⚪NONE verdict(exit 0/2/1/0). `--watch` = CLI-내부 폴링으로 terminal 까지 대기(손수 짠 `gh pr checks\|grep` + /tmp monitor sleep 루프 대체), `--merge-on-green` = 그린이면 자동 squash-merge | merge-on-green · CI 대기 시 |
| `worktree {scan\|gc\|guard <cmd>}` | no-pileup 강제 — `scan`=stranded(미커밋/미푸시) 워크트리 적발(exit 1 게이트) · `gc`=agent 워크트리 자동 수거: `[gone]` 머지분 + **age 백스톱**(HEAD>`worktree.maxAgeDays` 기본 3일 → 미푸시 팁은 `refs/reaped/<br>` 보존 후 reap). dirty/locked/recent(<1h)는 절대 안 건드림. squash-merge·no-push 로 `[gone]` 안 뜨는 fleet 워크트리 누적을 막음 | SessionStart |
| `errors {route\|list\|drain_check\|mark_fixed}` | 오류 severity 분류 + 큐 | 상시 |
| `ledger {register\|complete\|list\|gc\|dup_check}` | 백그라운드 에이전트 작업 등록(중복 방지) | Agent 전/후 |
| `bitter-gate audit [window]` | 규칙 히트 빈도 → dormant 규칙 폐기 검토 | 규칙 추가 전 |
| `audit [full\|summary\|json]` | 6축 자가 스코어카드 (/60) | 주기적 |
| `gc [scan\|drift]` | 가이드 마크다운의 깨진 링크 탐지 | 주기적 |
| `folders [scan\|scaffold <dir>]` | 서브폴더별 CLAUDE.md 누락 탐지 + 템플릿 생성 (편집 시 자동 넛지) · **강제**: `lint` 가 staged 파일의 폴더에 가이드 없으면 `FOLDER-GUIDE-MISSING`(block · commons folder-docs) — 존재만 검사, 내용 자유양식 | 주기적/작업 중 · commit |
| `architecture convergence {list\|add\|rm\|edit\|stop-check}` | 재발방지 학습 store CRUD — 학습은 `ARCHITECTURE.json` 의 `convergence.records[]`(id·state·value·threshold·source) 단일 SSOT 에 산다(구 `convergence` 명령·인라인 `@convergence` 마커 폐기). `add`=upsert(id-keyed) · `edit <id>` 부분 패치 · `rm <id>` · value/threshold 셸특수문자는 `--value -` stdin. **`stop-check`(Stop 훅 · 재발 트리거)** — **에이전트 자신의 마지막 응답**(user 입력 아님)을 재발-신호 키워드(`config/convergence-triggers.json` · 또/다시/실패/동일/재발/segfault/panic/🔴… · per-repo `.harness` override)로 스캔 → 매치 시 **stderr warn(non-block)** 으로 SSOT 기록을 넛지(`ing staleness-check` 와 동형 · `decision:block` 아님 — advisory 가 매 턴 'stop hook error' 로 턴을 막던 문제 제거). **키워드=넓은 그물, 정밀도는 에이전트 판단** — 진짜 재발이면 기록·오탐이면 무시(자동 기록 아님). once-가드=**신호별 1회**(transcript+matched 키 · `convergence-nudge.json`) → 오탐 `또` 가 진짜 `segfault` 넛지를 소진 안 함 · 무매치/파싱실패 silent. 파일-터치 시 학습 주입(`convergenceForFile`)은 **현재 비활성**(pre.ts 호출 주석 · store/CRUD/lint·함수 유지, 주석 해제로 재활성) · `sidecar lint` 가 레코드 well-formed(id+state) 강제 · 매-턴 `architecture inject` 는 records 제외(토큰 절감) | 재발 학습 기록 + Stop 트리거 |
| `ing {show\|add\|next\|done\|pod\|inject\|staleness-check\|stop-check}` | 진행보드(`ING.jsonl` · 전용 `ing` git ref) — `add`/`next`/`done`(완료=scrub→CHANGELOG)·`pod` GPU 추적·`inject`(매 턴 보드+턴마감 게이트 주입). **`stop-check`(Stop 훅 · `decision:block`)** — **매 응답에 `🔄 ING` 줄**(`🔄 ING 갱신: …` 또는 `🔄 ING: 변동 없음`)이 없으면 차단해 강제. 코드편집 아닌 **측정·verdict·벤치·에이전트 착륙** 진행도 포착(파일-edit 무관·response-marker 기반 · recommend stop-check 동형) · sidecar-managed repo 한정 · `stop_hook_active` loop-guard 체인당 1회. `staleness-check`(코드 ≥editThreshold 편집인데 보드 무변동 = warn-only)는 보조 신호 | UserPromptSubmit + Stop |
| `changelog {add "<title>"\|list [N]\|render [N]\|prune --keep N\|--older-than D\|autoprune\|migrate}` | 이력 SSOT = **`CHANGELOG.jsonl`**(freeform `.md` 폐기 → newest-first JSONL · `{ts,title,body}`). `add`=append(body=stdin·ts=today) **+ keep-N 자동 트림**(config `lint.changelog.keep`·기본 30) · `list`/`render`(markdown 뷰) · **`prune`**=오래된 엔트리 삭제(`--keep N`/`--older-than D`) · **`autoprune`**=SessionStart 자동 트림(cap 초과시만·옛 엔트리는 git 이력 보존) · `migrate`=md→jsonl 1회. **CHANGELOG-MISSING 게이트**(lint·pr-cycle·commit-gate)가 `CHANGELOG.jsonl` staged 를 요구 | 매 사이클 doc + 이력 정리 |
| `sync {run\|diff}` | (선택) repo 자체 공유파일 sync 스크립트 실행 | 공유파일 변경 후 |
| `pool {list\|add\|rm\|on <h> <cmd>\|status\|specs [h]}` | 호스트 로스터 + 원격 실행. `shared:false` 호스트는 **제한 호스트** — `allow` 프로젝트 컨텍스트 밖에선 `on` 차단(공용 컴퓨트로 못 씀). `on` 은 ssh 를 직접 spawn(argv)해 `cmd` 의 `$`/`$(...)` 가 로컬이 아니라 **원격 셸**에서 전개됨. `specs` 는 호스트별 코어/메모리/GPU 를 ssh 프로브해 로스터에 캐시(`list`·`status` 에 `〈12c · 30G · GPU:…〉` 인라인 표기) — 제한 호스트는 프로브하지 않음. `list` 는 추가로 **라이브 점유율** ⚡뱃지(`CPU 19%·RAM 9%·5.4/30G·GPU 0%·0/12GiB`)를 SSH 병렬 프로브(캐시 안 함 · RAM=total−available) | 원격 실행 · 자원 확인 시 |
| `mem-guard {status\|check\|install\|uninstall}` | OOM(메모리부족 강제종료) 예방. **PreToolUse 프리플라이트**(상시): background-spawn(`… &`/nohup/disown/setsid) 직전 시스템 free RAM 을 `vm_stat` 로 읽어 `warnPct`(기본 15%) 이하 warn · `blockPct`(기본 0=off) 이하 spawn block — 병렬 fan-out 누적이 macOS jetsam 을 트리거하는 근본원인 차단. **launchd 워치독**(`install` 로 opt-in): `watchdogIntervalSec`(45s)마다 메모리 폴링 → 낮으면 macOS 알림(5분 throttle). **알림 전용 · 프로세스 kill 없음** · 다중 Claude 세션 누적을 보는 유일한 층 | 맥이 자꾸 죽을 때 · OOM 예방 |
| `pod` / `dojo [<slug>]` | GPU 클라우드 런북 + dojo 학습잡 스캐폴더. dojo 기본 스택은 `config.dojo`(엔진 무하드코딩)가 운반 — 설정 시 `hexa dojo <delegate>` 위임. 다샤드 배치는 `hexa cloud fire-shards` (손수 launcher.sh 는 `CLOUD-HANDROLLED-FANOUT` warn 으로 리다이렉트) | GPU 디스패치 · 학습 스캐폴드 |
| `imagine <prompt-file> <out.{png\|mp4}> [-i img]` | AI 이미지+영상 생성 — 출력 확장자로 분기: 이미지(.png)=fal `openai/gpt-image-2`(image2 핀) · 영상(.mp4/.mov)=fal Seedance 2.0 핀 — `-i` 없으면 `…/text-to-video`, `-i <이미지>` 면 `…/image-to-video`(이미지 애니메이트). 키는 `secret get` 경유 · 프롬프트는 FILE 로 · `-m` 로 override | 표지·figure·영상 생성 시 |
| `email send --to <a> --subject <s> [--text <f>\|-m <s>] [--html <f>] [--attach <f>] [--dry]` | Postmark 트랜잭션 메일 발송(`POST /email`) — 서버 토큰 `secret get postmark.server_token` · `-K` curl config 로 argv 누출 0 · 본문은 FILE(또는 `-m` 인라인). `history`(Postmark outbound API/`--local`) · `list` · `--dry` | 알림·트랜잭션 메일 발송 시 |
| `paper {new\|build\|cover\|list\|publish\|update\|unpublish\|status}` | demiurge 하우스 논문 도구 — `new` 스캐폴드(NeuroLM 정답지[`templates/paper/_reference_samples/`] 미러: Intro·Background·Method·Experiments·Ablation·Discussion + g5 tier-badge + TikZ/pgfplots 결과그림 · fal.ai 표지 허용) → `imagine` 표지 → `build`(xelatex+bibtex×3 · 하드 2게이트: ≥10p[g51] + ≥9 result figs[=NeuroLM바] · `--min-pages`/`--min-figures` 0=해제 · 미달 exit3). 배포: `publish --to zenodo\|arxiv\|both [--sandbox][--source]`(Zenodo 완전 REST→DOI · arXiv는 제출 API 없음→제출 tarball+가이드) · `update`(Zenodo new-version) · `unpublish`(Zenodo draft 삭제) · `status`(발행원장). 키는 secret(`zenodo.token`). 손 조립 규율을 도구로 박제 | 논문 작성·컴파일·배포 시 |

---

## 슬래시 명령 (플러그인 · 공용셋)

`commands/*.md` — 전체 사용자-대면 명령이 **bare `/cmd` 슬래시 명령**으로 노출된다(`/paper`·`/imagine`·
`/pr-cycle`·`/ship`·`/sbs`·`/fleet`·`/fleet-lab`·`/fleet-abstract`·`/fleet-full`·`/ing`·`/ci`·`/kick` …). 일부는 이웃 CLI **`hexa` 위임자**다(`/hexa`·`/cloud`=`hexa cloud`·`/dojo`=`hexa dojo`·`/deck`=`hexa deck`·`/verify`·`/atlas` — hexa 부재 시 graceful echo; sidecar 자체 훈련잡 스캐폴더는 `/hdojo`). 각 `.md` 는 프런트매터(`description` +
**Triggers** 자연어구 + `argument-hint` + `allowed-tools: Bash`)와 `!`sidecar <cmd> $ARGUMENTS`` 본문의 얇은
위임자 — Claude Code 가 description/Triggers 로 인지한다(한국어·영어 트리거 양쪽).

**노출 경로 = `sidecar shadow` (bare · user-scope)**: Claude Code 는 플러그인 명령을 **무조건 `/plugin:cmd`**
네임스페이스로 띄우므로, 그대로 두면 `sidecar shadow` 의 bare `/fleet` 와 플러그인 `/sidecar:fleet` 가 picker 에
**2줄로 중복**된다. 그래서 `.claude-plugin/plugin.json` 이 **`commands: []`** (기본 `commands/` 스캔을 빈 목록으로
대체)로 플러그인 명령 등록을 끄고, 슬래시 노출은 `sidecar shadow` 가 `commands/*.md` 를 `~/.claude/commands/` 에
bare `/cmd` 위임자로 미러하는 단일 경로만 쓴다(마커 추적 · 손수 작성한 동명 파일은 보존 · `shadow remove` 로 정리)
→ picker 에 bare 1줄. SHADOW_MARKER 추적 주석은 frontmatter 닫는 `---` **뒤**에 삽입한다 — Claude Code 는 `---` 가
1행일 때만 `description:` 을 읽으므로, 앞에 붙이면 picker 가 마커 주석을 설명으로 표시한다. **`shadow --force`** 는
마커-없는 충돌(마커 도입 *전* 생성된 stale shadow)도 source 로 덮어써 heal 한다 — 옛 shadow 가 손수작성으로 오판돼
skip 되면 source 의 `Triggers —` 줄을 잃어 맨-텍스트 명령 인지가 죽기 때문(`sidecar lint` 4f `SHADOW-DESC` 가
desc 의 cap·Triggers 보유를 warn 으로 게이트).

**자기완결(self-contained) 플러그인 · 프로젝트 무관**: marketplace `source: "."` 라 **repo 루트가 곧 플러그인** —
훅뿐 아니라 `sidecar` CLI 본체(`bin/`·`cli/`·`lib/`·`modules/`·`config/`·`commands/`)까지 한 덩어리로 실린다
(`commands/` 는 shadow 가 미러하는 SOURCE 로 실릴 뿐, 플러그인 명령으로 로드되진 않는다). 훅은
`${CLAUDE_PLUGIN_ROOT}/bin/sidecar`(플러그인 자기 번들)를 실행하므로, **`/plugin update` + 리로드 한 번에
CLI·hooks 가 최신화**된다 — 프로젝트마다 복사·갱신도, 별도 `sidecar self-update` 도 불필요(슬래시는 갱신 후
`sidecar shadow` 재실행으로 반영). (전역 `sidecar` on PATH 는 폴백.) 재생성기 = `_tools/gen_commands.py`.
hook-내부 전용(`pre`/`post`/`prompt`)은 슬래시로 노출하지 않는다.
>
> `ing add` 자유텍스트에 셸 특수문자(괄호·따옴표·`$`·`→`)가 있으면 슬래시 `$ARGUMENTS` 무인용 확장이 깨진다 — `printf '%s' "<text>" \| sidecar ing add --stdin` (STDIN 경로)로 안전하게 등록한다.
> ING 보드는 **내 현재 repo 전용**이다 — cross-repo 전달(`--to <repo>`) 기능은 폐기됐다(직접수정 원칙 · commons `upstream-fix`). upstream(hexa/hexa-lang/demiurge) 결함은 그 세션에서 직접 고쳐 그 repo 의 `pr-cycle` 로 머지한다.

---

## 빠른 시작

### 0. 공용(전역) 설치 — `sidecar install` (한 줄)

머신에 사이드카를 **공용 명령**으로 깔고 전역 훅까지 한 방에 배선한다(특정 repo 단독 세팅 아님). 부트스트랩 one-liner:

```bash
curl -fsSL https://raw.githubusercontent.com/dancinlab/sidecar/main/scripts/install.sh | bash
```

하는 일(멱등 — 재실행 = 최신으로 갱신):

```
⬇ clone   dancinlab/sidecar → ~/.sidecar/cli
🔗 link    sidecar 래퍼 → ~/.local/bin/sidecar   (PATH 안내)
🪝 hooks   sidecar install-hooks --global          (모든 Claude Code 세션에 가드/주입)
```

이후 갱신은 `sidecar self-update`, 이미 사이드카가 깔려 있으면 `sidecar install` 로도 동일 동작. 훅 없이 깔려면 `--no-hooks`, 미리보기는 `--dry-run`. 그다음 특정 repo 에 적용하려면 아래 1·2 단계(또는 `sidecar init`).

### 1. (per-repo) 사이드카를 repo 에 둔다 (submodule 권장)

```bash
cd your-repo
git submodule add https://github.com/dancinlab/sidecar .harness-engine
# 또는 그냥 clone / vendor 해도 됨
```

### 2. 스캐폴딩 (한 방)

```bash
bash .harness-engine/bin/sidecar init
```

이 한 줄이 만든다 (기존 파일은 보존, `--force` 만 예외 · `--dry-run` 으로 미리보기):

```
✓ harness.config.json          프로젝트명 자동감지
✓ .harness/enforcement.json    번들 기본 규칙 복사 (repo 가 수정)
✓ .harness/keywords.json
✓ .harness/severity-map.json
✓ .gitignore                   로그 무시 추가
✓ scripts/sidecar              얇은 래퍼
```

> 🪝 **훅은 전역 1벌 전용 (global-only)**: per-repo `.claude/settings.json` 은 쓰지 않는다(전역 설치와 중복돼 컨텍스트가 2~3중 주입되던 버그). 훅 배선은 호스트당 한 번 `sidecar install`(또는 `sidecar install-hooks`) 로 끝낸다 — 그러면 모든 repo 에서 가드/인젝트가 발사된다.

생성 후 `harness.config.json` 의 `verify.checks` · `lockdown.files` 만 repo 에 맞게 채우면 된다.

> 🧪 **연구/설계 캠페인 골격은 `sidecar lab init <dir>`**: lumen/rtsc/carbon-capture 자매-repo 스켈레톤(src·state·ARCHITECTURE+뷰어+serve·HYPOTHESES pre-register→falsify→run→verdict·tool/<slug>.py harness)을 한 방에 방출. 생성 `CLAUDE.md` 는 demiurge 교차-repo 규약을 명시한다 — **구현코드=canonical `hexa-lang` stdlib**(repo 는 docs/manifest 만 consume, d3) + **컴퓨트 기본엔진=`QFORGE`-native**(QE 는 미전환 조각 fallback·≤1% gate, d_qforge_default). `init`(거버넌스 설치)과 별개 · files-only(git init/push 없음).

> 수동 설정도 가능: `.harness/*.json` 을 두지 않으면 번들 기본 규칙(`config/*.json`)이 자동 적용된다.
>
> 제거: `sidecar uninstall` (주입물만 제거, 사용자 콘텐츠 보존 · `--dry-run` 미리보기). 상세 [docs/install.md](docs/install.md#제거-uninstall).

### 3. 동작 확인

```bash
bash .harness-engine/bin/sidecar audit
bash .harness-engine/bin/sidecar ci list
```

### 4. 에이전트 hook 배선 (Claude Code 예시)

`.claude/settings.json`:

```jsonc
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash",       "hooks": [{ "type": "command", "command": "CLAUDE_TOOL_INPUT=\"$CLAUDE_TOOL_INPUT\" bash .harness-engine/bin/sidecar pre bash" }] },
      { "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "CLAUDE_TOOL_INPUT=\"$CLAUDE_TOOL_INPUT\" bash .harness-engine/bin/sidecar pre write" }] }
    ],
    "PostToolUse": [
      { "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "bash .harness-engine/bin/sidecar post edit \"$CLAUDE_FILE_PATH\"" }] }
    ],
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "bash .harness-engine/bin/sidecar prompt \"$CLAUDE_USER_PROMPT\"" }] }
    ]
  }
}
```

> 환경변수 이름(`CLAUDE_TOOL_INPUT` 등)은 런타임 버전에 따라 다를 수 있다. 사이드카는 `CLAUDE_TOOL_INPUT` 와 `CODEX_TOOL_INPUT` 둘 다 읽는다. JSON 형식: `{"command":"...","file_path":"...","content":"..."}`.

> 💡 `sidecar install-hooks [--global|--repo]` 는 hook 배선과 함께 `settings.json` 의 `env` 에 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 도 세팅한다 — 백그라운드 subagent 에 `SendMessage`(agent-teams)를 기본 활성화. 이미 그 키가 있으면 사용자 값을 보존한다(덮어쓰지 않음). 끄려면 그 키를 `"0"` 으로 두면 된다.

---

## 동작 흐름

```
사용자 프롬프트 ─▶ [prompt]  키워드 트리거 + 힌트 주입
에이전트 Bash   ─▶ [pre bash]  ─ 매칭? ─▶ block(stdout JSON) / warn(stderr) / 통과(침묵)
                      │
                      ▼ (실행 후)
                  [post bash <exit>] ─ 0≠exit ─▶ errors 큐 라우팅
에이전트 Edit   ─▶ [pre write] ─ 경로/내용 규칙 ─▶ block/warn
                  [post edit <file>] ─ L0? ─▶ 경고
커밋 전          ─▶ [lint] + [verify]
세션 종료        ─▶ [ing]
```

모든 단계는 `.harness/logs/*.jsonl` 에 한 줄씩 쌓인다 → `audit` 이 이를 읽어 건강도를 점수화한다.

---

## 더 읽기

- [docs/languages.md](docs/languages.md) — 언어/플랫폼 범용성 (Python·Rust·C·Go·Swift·hexa 프리셋 + Node 런타임 요구)
- [ARCHITECTURE.json](ARCHITECTURE.json) — 사이드카 아키텍처 트리 SSOT (컬럼형 노드: 이름·역할·slug·상세 · 각 노드 고유 kebab-case slug=검색키, `sidecar architecture search <q>`). 사람용 뷰어는 [ARCHITECTURE.html](ARCHITECTURE.html) — 로컬은 `python3 serve.py`(서버 + 브라우저 자동 오픈), 원격은 raw.githack.com / GitHub Pages
- [docs/install.md](docs/install.md) — repo 통합 상세 (submodule / vendor / 멀티 repo)
- [docs/extending.md](docs/extending.md) — 규칙 추가, 도메인 모듈 확장 패턴

## self-hosted

이 repo 자체가 사이드카를 쓴다(dogfooding) — `harness.config.json` + `.claude/settings.json` self hooks + pre-commit `bin/sidecar lint`. 코어(`.ts`) 변경 시 CHANGELOG 동시 갱신이 강제되고, 번들 enforcement(root-cause·secret·force-push)가 자기 코드에도 적용된다. 단 `protectedBranches` 미설정으로 자기 개발 흐름(main 직접 push)은 막지 않는다.

매 사이클(`sidecar pr-cycle`)의 doc-gate 는 의미있는 변경에 대해 **CHANGELOG.jsonl(append) + (존재 시) ARCHITECTURE.json·README.md 현행화**를 요구한다 — 셋 중 미갱신이 있으면 머지를 거부한다(`--no-doc` 는 진짜 문서 불필요할 때만). 이 README 도 그 대상이므로 매 사이클 최신 상태로 유지된다. (commons `cycle-docs-pr`)

> 📌 **README = 현재상태 SSOT, 이력 로그 아님** (ARCHITECTURE 와 동급 규율 · commons `single-doc`). README 현행화는 *지금의* 기능·사용법·구조를 **제자리 덮어쓰기(update-in-place)** 하는 것이지, 변경이력을 덧붙이는 게 아니다. README 에 버전 로그·날짜·`이전엔…`/`deprecated`/"v0.x 에서 추가" 식 누적 금지 — 이력은 **CHANGELOG.jsonl + git** 이 SSOT.

> 🌳 **ARCHITECTURE.json 트리 위생 강제** (`architecture lint` · commons `single-doc`): 설계 트리는 **잘게 분해된 딱딱한 노드**로 유지된다 — `상세`/`역할` 셀이 `lint.archCellCap`(기본 **300**자 · config-driven · 0=off)을 넘거나(ARCH-BIG-CELL), ` · ` 로 묶인 항목이 `lint.archPiledMax`(6)를 넘으면(ARCH-PILED), 또는 history 성 키(previous/deprecated/…=ARCH-HISTORY)가 있으면 `sidecar lint`(pre-commit)가 **커밋을 막는다**(severity-map `ARCH-*=block`). 각 노드는 고유 kebab-case slug 도 필수(부재/중복/형식 = ARCH-SLUG-MISSING/DUPE/FORMAT=block). 단, 이 게이트들은 canonical `이름`/`children` 트리만 인식하므로, `이름`-노드가 0인 비-canonical 스키마(예: `sections`/`blocks`/`title`)는 slug 게이트가 **조용히 통과**하던 사각지대였다 — 이제 `ARCH-SCHEMA-UNRECOGNIZED`(warn)가 "slug 게이트 비활성" 을 표면화한다(off-schema 설계문서가 slug 강제를 몰래 우회 못 함). 큰 셀은 산문 leaf 가 아니라 **커널만 남기고**(산문·메커니즘·precedent 는 CHANGELOG/git/코드로) 또는 한 사실당 한 child 노드로 쪼갠다.

`sidecar pr-cycle` 은 검증된 머지 직후 **로컬 base(main) 를 origin/base 로 ff-sync** 한다(feature 브랜치에서 `git fetch origin <base>:<base>` — checkout 전환 없이 로컬 main 뒤처짐 방지, non-ff 거부=안전) → 다음 작업 브랜치는 항상 최신 base 에서 분기된다. (commons `cycle-docs-pr`)

루트 `CLAUDE.md` 는 **진입 포인터**(프로젝트 설명 + SSOT 포인터 + 작업규칙)다 — 디렉토리·모듈 **트리는 `ARCHITECTURE.json` 단일 SSOT** 라 CLAUDE.md 에 중복하지 않는다(`docs.ts` 의 CLAUDE-MD-NO-TREE 검사는 구조 SSOT 존재 시 면제 · 트리 drift 방지).

거버넌스 SSOT `config/commons.md` **와 루트 `CLAUDE.md`** 는 **slug 키 do/dont 형식**이다 — 각 규칙은 `## <slug> — <title>` + `- do:`/`- dont:` 두 줄(번호 ID 없음 · 순서 무관 · 첫 `## ` 앞 preamble 은 면제 · **서브폴더 CLAUDE.md** 는 folder-docs 자유양식이라 제외). 메커니즘·실증은 코드 hook + CHANGELOG·git 이 담고, 규칙은 do/dont 핵심만 운반한다. 형식은 **2층으로 강제**된다(sidecar 동형): ① **write-time** — `pre write` 가 commons.md/루트 CLAUDE.md 전체-문서 Write 가 do/dont-only 아니면(또는 섹션이 do+dont 둘 다 갖지 않으면) **즉시 `permissionDecision: deny`**(산문/한쪽-누락이면 쓰기 자체가 차단) · ② **commit-time** — `sidecar lint` 4g(COMMONS-PROSE/COMMONS-NO-DODONT/COMMONS-DODONT-INCOMPLETE · block · commons.md + 루트 CLAUDE.md 둘 다 스캔)가 backstop. 둘이 `commons.ts:lintCommonsText` 코어를 공유한다.

**do/dont 길이 cap** (archive_sidecar `tape-lint` #2 포팅): `commons.md` + **루트 `CLAUDE.md`**(프로젝트 규칙 SSOT) 의 각 do/dont **엔트리**(=`- do:` 줄 + 뒤따르는 `  ` 들여쓰기 연속줄 전부 합산 — 연속줄로 쪼개 cap 우회 차단)는 codepoint 길이 `lint.dodontCap`(기본 200 · config-driven · 0=off)을 넘으면 안 된다 (**서브폴더 `CLAUDE.md`** = folder-docs 로컬 가이드는 자유양식이라 cap 대상 아님) — 한 규칙은 한 줄로 짧게, 넘치면 별도 rule 로 쪼개거나 디테일은 코드+CHANGELOG 로. **diff-aware**: slug\|kind\|idx 키로 baseline 과 대조해 **새로/더 길어진 줄만** 차단하고 기존 긴 줄은 grandfather(줄이면 통과). write-가드(전체 Write 조기차단 `DODONT-LONG`) + `sidecar lint` 4h(HEAD 와 diff-aware → Write·Edit 모두 커버)의 2층.

이어서 **stale-PR reaper** 가 돈다 — 검증 머지 직후 **내 다른 열린 PR 을 전수 점검**해 머지가능(MERGEABLE)은 자동 squash-머지(자기 PR · admin · delete-branch — 메인 흐름과 동일 신뢰모델), 기계가 안전하게 못 닿는 것(CONFLICTING/blocked)은 조치안(rebase 또는 `gh pr close`)과 함께 **큰소리로 보고**한다. pr-cycle 이 원래 자기 PR 만 다뤄 중단·실패한 머지가 열린 채 썩던 문제를 막는다 — 만들어진 PR 은 매 사이클 처리되거나 경보된다. `--no-reap` 으로 끈다.

같은 doc-gate 가 **pre-commit `sidecar lint` 에서도 발화한다** — pr-cycle 을 안 거쳐도, 의미있는 코드가 staged 인데 CHANGELOG / (존재 시) ARCHITECTURE·README 가 같이 staged 안 됐으면 **commit 을 차단**한다(`CHANGELOG-MISSING`·`ARCHITECTURE-MISSING`·`README-MISSING`, 모두 block). 진짜 문서 불필요한 변경만 `git commit --no-verify`.

## 라이선스

MIT
