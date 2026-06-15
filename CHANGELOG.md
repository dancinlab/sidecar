# CHANGELOG

## docs(commons): add c13 (trail — main-flow return stack)

- commons.md 에 c13 추가 — 곁가지로 샐 때 `harness trail push`, 복귀 시 `pop` (repo-root TRAIL.md, git-tracked). 곁가지 타다 원래 작업 잊는 것 방지, 스택 깊어지면 복귀 우선.

## docs(commons): add c11 (ING in-progress tracking) + c12 (use the harness CLI)

- commons.md 에 c11 추가 — 다단계/장기 작업은 `ING.jsonl`(`harness ing add/next/pod`, done=scrub)에 추적, SessionStart 표면화.
- c12 추가 — 같은 일은 harness 명령으로(imagine·research·watch·pool·lsp·secret·sbs·micro-exp·verdict), raw/우회·폐기된 sidecar/hexa-cloud 습관 대신 harness 우선. (에이전트가 harness 기능을 안 쓰고 우회하던 문제 대응.)

## feat: Claude Code plugin package (marketplace) — reload via /plugin

- harness 를 **Claude Code 플러그인**으로 패키징: `.claude-plugin/marketplace.json`(마켓 "harness") + `plugin/.claude-plugin/plugin.json` + `plugin/hooks/hooks.json`(전역 `harness` CLI 를 guard 와 함께 호출). sidecar 처럼 `/plugin` 으로 reload·enable/disable 관리 가능.
- 설치: `claude plugin marketplace add ~/.harness/cli` → `claude plugin install harness@harness`. settings.json 직접 주입(install-hooks)과 **택일** — 플러그인 쓰면 `harness install-hooks --uninstall` 로 settings 훅 제거(중복발동 방지).
- `harness install-hooks --uninstall` 추가 (settings.json 에서 harness 훅 제거).

## feat: install-hooks (global) + self-update — harness fires everywhere (plugin-equivalent)

- 문제: harness 훅이 repo별 `.claude/settings.json` 에만 있어 (gitignore/미클론/미-init 시) **무시됨**. 이전 sidecar 는 전역 플러그인이라 항상 발동했는데 제거됨 → mini 전역 훅 0개 → 아무것도 안 걸림.
- **`harness install-hooks [--global|--repo]`** — `~/.claude/settings.json`(전역, 기본)에 harness 훅 블록(PreToolUse pre bash/write/askq · PostToolUse post edit · UserPromptSubmit prompt+commons+recommend+prefs+easy inject · SessionStart commons/recommend/worktree gc/handoff/ing inject)을 merge → **모든 세션/repo 에서 발동**(전역 플러그인 등가). 기존 비-harness 훅 보존, 재실행 시 harness 항목 dedup. 전역 `harness` 가 PATH 에 있어야 함.
- **`harness self-update`** — 이 바이너리가 실행되는 CLI clone(예: `~/.harness/cli`)을 최신 main 으로 git-pull. (repo 의 submodule 은 `harness update`.)
- 적용: mini·ghost 전역 훅 설치 + `~/.harness/cli` 최신화 완료.

## feat: commons — always-on cross-project governance SSOT

- **`harness commons {inject|show}`** — 프로젝트-무관 거버넌스 규칙(c1~c10: root-cause·verify·anti-punt·single-doc·preserve·handoff·git-safety·4축추천·honesty·surgical)을 번들 `config/commons.md` 에서 매 턴 inject(UserPromptSubmit) → 컨텍스트에서 안 사라짐. repo override: `.harness/commons.md`.
- 규칙들은 harness 훅(pre write root-cause·docs·tmp-guard·handoff-guard·git-guard·verify·recommend·askq)이 기계적으로도 강제 — commons 는 그 단일 살라이언스 SSOT.

## feat: ing — jsonl board + SessionStart inject (잘 안 쓰이던 ING 개선)

- ING.md → **repo-root `ING.jsonl`** (한 줄 1항목, 기계가독·append/scrub). kinds: work·next·pod.
- `done <id|match>` = **scrub**(완료분 제거 → CHANGELOG 로 졸업, ING 은 active 만 보유). 비면 파일 삭제.
- **`ing inject`**(SessionStart): 진행중 작업 + running pod 를 매 세션 표면화 → 패시브 .md 라 안 쓰이던 문제 해결. 비었으면 무음. init SessionStart 와이어.
- verbs: show·add·next·done·pod{add|rm|list}·inject.

## feat: askq-text — deny AskUserQuestion option-box, ask in plain chat (sidecar askq-text parity)

- **`harness pre askq`** (PreToolUse(AskUserQuestion), `config.askqText` 기본 on) — 화살표 옵션-트리 박스(문의선택지) 호출을 deny + 에이전트에게 "질문을 평문 채팅으로 다시 하라(옵션은 인라인 bullet + 추천 표시, 자유 답변 허용)" 지시. FORM 리다이렉트(질문 자체는 허용) — bypass(안 물어봐도 될 걸 안 묻기)와는 구분. ExitPlanMode 는 영향 없음.
- init: PreToolUse 에 `AskUserQuestion` matcher → `pre askq` 와이어링.

## feat: handoff rework — repo-root handoff.jsonl queue + anti-scatter guard (sidecar handoff parity)

- handoff 를 **per-project repo-root `handoff.jsonl`** open-work 큐로 재설계 (단일 글로벌 레지스트리 아님 · 커밋 → GitHub 보존 · repo 와 함께 이동).
- verbs: `add <text> [--to <repo>]` · `ls`(기본) · `done <id>` · `inject` · `snapshot`.
  - **`done` = scrub**: done 마커가 아니라 파일에서 항목 **제거**(rewrite) → handoff.jsonl 은 항상 *열린 항목만* 보유. 비면 파일 삭제.
  - **`inject`**(SessionStart): 이 repo 의 열린 handoff 를 additionalContext 로 표면화 → 잊힘 방지. 비었으면 무음.
  - `snapshot [reason]`: 기존 세션-상태 dossier(.harness/handoff/*.md) 보존.
- **handoff-guard** (`config.handoffGuard` 기본 on): Write/Edit 에서 흩어진 핸드오프 마크다운 **차단** — basename `HANDOFF.md`/`INBOX.md`, 또는 `(^|/)inbox/*.md` (임의 깊이) → handoff.jsonl 로 유도. `inbox/queue.json` 같은 비-md 는 통과(false-positive 가드).
- SessionStart 훅에 `handoff inject` 추가(init). inbox 폴더 패턴 폐기, handoff 일원화.

## fix: export runBypass/runGo/runBrainstorm from runbooks (engine load broken since 8675cbd)

- `cli/index.ts` 가 이 3개를 import 했지만 직전 커밋(8675cbd)이 `modules/runbooks.ts` 를 stage 안 해서, 커밋된 엔진이 로드 실패(`SyntaxError: no export named runBrainstorm`) → CLI 전체 비동작이었음. 로컬 working tree 엔 있어 테스트는 통과해 묻혀 있었고, engine-bump agent 들의 sanity gate(`harness help`)가 전파 직전 적발.
- 누락 export 3개를 커밋. (재발 방지 후속: 엔진 로드 스모크를 lint/CI 에 추가 검토.)

## fix: recommend — global default fallback (공용 완성도 auto-pick 미작동 수정)

- 증상: mini 에 "공용 완성도" default 를 걸어도 ★표시·auto-pick 둘 다 안 뜨고 4축 박스만 떠서 punt("어느 쪽으로?").
- 원인: harness 가 default 를 **per-repo `.harness/recommend-default`** 만 읽음 → repo 에 파일 없으면 `readDefault()`=present → `defaultDirective()` 빈값 → FIXED-axis(★+auto-proceed) directive 자체가 주입 안 됨.
- 수정: **global fallback** 추가 — 우선순위 `repo .harness/recommend-default` > `global ~/.harness/recommend-default` > `present`. `set-default <mode> [--global]` / `clear-default [--global]` / `get-default [source: repo|global|none]`. sbs 는 `resolveMode→readDefault` 경유라 자동 상속.
- 검증: clean repo 에서 global complete 상속, `resolve-mode ""`→`auto axis=complete inherited`, sbs bare→auto-pick.

## feat: tmp-guard + bypass · trail · go · brainstorm

- **tmp-guard** (`modules/tmp-guard.ts`, config `tmpGuard` 기본 on) — 진행/작업 데이터를 휘발 tmp(`/tmp`·`/private/tmp`·`/var/folders`·`$TMPDIR`)에 쓰면 `pre bash`(리다이렉트/tee/-o/--output 탐지)·`pre write`(파일경로)에서 경고 → git-추적 `docs.scratchDir`(scripts/scratch)에 쓰고 커밋해 **GitHub 보관** 유도. read-only `/tmp` 참조는 무시. warn-only.
- **`harness trail {push <note>|pop|show|drop <n>|clear}`** — main-flow 복귀 스택(sidecar trail parity). 곁가지로 샐 때 위치 push, 복귀 시 pop. repo-root **`TRAIL.md`(git-tracked·커밋)** 에 저장 → 세션/리부트 넘어 보존. docs.allow 에 TRAIL.md 추가.
- **`harness bypass`** — anti-punt self-check 런북: local+reversible 이면 묻지 말고 진행, outward/되돌리기어려움/유저결정 때만 질문.
- **`harness go`** — 직전 제안 액션 재확인 없이 계속.
- **`harness brainstorm`** — 고갈까지 라운드별 아이디어 발산(breadth) 런북.

## feat: micro-exp — context-driven micro-experiment sweep (sidecar micro-exp parity)

- **`harness micro-exp [<scope>]`** — N개의 작고 검증가능한 실험을 병렬로 돌리는 sweep 런북(런북 프린터 + 배치 산출물). domain-agnostic, `kind` 추상(`<runnable>`+`<parser>` 계약).
  - 흐름: context 에서 후보 self-enumerate(매니페스트 없음) → **Stage 1.5 인프라 존재 게이트**(미비 시 build 우선 HALT) → 예산 선언 → 디스패치(rented `harness pod` / local `harness pool on <host>`) → **Monitor** closed-loop → harvest → parse Agent → 흡수(closed-form=`harness atlas`/`verdict`, observation=verbatim verdict) → `exports/sweep/<batch_id>/ledger.json` 집계.
  - 정직성: FALSIFIED 는 CLOSED-negative 로 보존(skip 금지) · 예산 캡 · pod-cap≠agent-cap · parse Agent verbatim.
  - `<scope>` 주면 `exports/sweep/<batch_id>/{ledger,state}.json` 스캐폴드. `templates/micro-exp.md` 런북.

## feat: research + watch (sidecar research-skill / watch parity)

- **`harness research {arxiv|yt}`** — 외부 연구자료 fetch, **API 키 불필요**.
  - `arxiv <query|id> [--n N]` — arXiv 공식 API 검색/조회 → 제목·저자·날짜·카테고리·PDF·초록 (id 자동 판별, 기본 submittedDate desc).
  - `yt <url|id> [lang]` — YouTube 자막 트랜스크립트. InnerTube `player` API(ANDROID client 20.10.38) → caption track → `fmt=json3` 큐별 1줄(XML fallback) + 연속중복 dedup.
  - 검증: arXiv 1706.03762(Attention Is All You Need) · yt dQw4w9WgXcQ(60줄) 실동작.
- **`harness watch <url|path> [question] [flags]`** — 에이전트가 영상을 실제로 "보게" 함.
  - `yt-dlp` 다운로드(yt-dlp 지원 플랫폼 + 로컬파일) → `ffmpeg` 프레임(길이별 예산, 2fps/100 캡, `--start/--end` 윈도우 기준) + 타임스탬프 트랜스크립트(네이티브 자막 우선 → Whisper Groq/OpenAI 옵션) → 프레임 경로 + 트랜스크립트 출력(에이전트가 Read).
  - 자막은 best-effort(`--ignore-errors`, 429 시에도 영상 진행), Whisper 키 없으면 frames-only 로 graceful degrade(절대 hard-fail 안 함). 키는 env/`secret` CLI.
  - flags: `--start --end --max-frames --fps --resolution --whisper groq|openai --no-whisper --out-dir`.
  - 검증: dQw4w9WgXcQ 8초 윈도우 → 4프레임 + 89줄 트랜스크립트.

## feat: docs — write-time single-doc enforcement (안 지켜지던 규율을 쓰는 순간 강제)

- 문제: 단일문서 규율(ARCHITECTURE SSOT 통합 · 분리 시 quickref 연결)이 **lint/commit 시점에만** 검사돼 사후 → 에이전트가 이미 흩뿌린 뒤라 안 지켜짐.
- 해결: **`pre write`(PreToolUse Write/Edit)에 write-time 검사 추가** — `.md` 를 쓰는 순간 판정.
  - `DOC-SCATTER`: scatter 패턴(`*-report/summary/notes/audit…`, 날짜접두 등) + allow 외 + scope 내 → "ARCHITECTURE(갱신)/CHANGELOG(append)/scratch 로 통합" 안내.
  - `DOC-NO-QUICKREF`: 분리 문서 상단 12줄에 SSOT 링크/포인터 없으면 → quickref 추가 안내.
- `docs.enforce` 노브: `warn`(기본, 즉시 경고) · `block`(쓰기 veto) · `off`. ARCHITECTURE.md 존재 시에만 활성(opt-in), `docs.scopeDirs`/`docs.allow` 그대로 적용.
- 검증: scatter→warn, no-quickref→warn, quickref 있음/allow 파일→무음, block 모드→`{"decision":"block"}`.

## feat: imagine history — past-prompt history (fal provider API + local ledger)

- **`harness imagine history [-b fal|openai] [-m endpoint_id,…] [--start <iso>] [--limit N] [--status success|error] [--local] [--json]`**.
  - **fal**: 공급자 요청 히스토리를 직접 조회 — `GET https://api.fal.ai/v1/models/requests/by-endpoint?expand=payloads` (프롬프트=`json_input.prompt`, request_id, ended_at, status_code). `endpoint_id` 는 fal 필수값이라 기본=imagine fal 기본 모델(`openai/gpt-image-2`), `-m a,b` 로 다중 지정. 기본 윈도우 24h, `--start` 로 확장. auth 는 curl `-K` 로 키를 argv 밖에.
  - **openai / `--local`**: openai 는 list 엔드포인트가 없어 로컬 ledger 로 폴백.
- 생성 시 **로컬 provenance ledger**(`.harness/logs/imagine.jsonl`) 기록 — ts·backend·model·size·out·request_id·status + 프롬프트(280자 truncate). API 없이도 request_id↔출력파일 매핑 확보. 키는 절대 기록 안 함.

## feat: imagine — AI image generator (sidecar /imagine parity)

- **`harness imagine <prompt-file> <out.png> [-s size] [-b backend] [-m model]`** + `list` · `help`.
  - 백엔드: **fal**(기본, fal.ai queue+poll, 기본 모델 `openai/gpt-image-2` — user-pinned, `-m` 로만 변경) · **openai**(`/v1/images/generations` 동기, 기본 `gpt-image-1`, b64_json/url 모두 처리).
  - API 키는 `secret get fal.api_key` / `secret get openai.api_key` (방금 추가한 secret 모듈의 `secretGet` 재사용) — **인라인 금지·로그 금지**. 프롬프트는 **파일**에서 읽음(provenance·argv 유출 방지), payload 는 mktemp JSON.
  - canonical 사이즈: `square_hd · square · landscape_16_9 · portrait_16_9` (openai 는 1024²/1536×1024/1024×1536 으로 변환).
  - 보안 강화(sidecar 대비): auth 헤더를 curl `-K` config 파일로 전달 → **API 키가 process argv 에 남지 않음**. 임시파일은 finally 에서 삭제.
- secret 모듈에 `secretBin()` / `secretGet()` export 추가(DRY 재사용).

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
