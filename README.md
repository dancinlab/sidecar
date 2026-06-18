# harness

> 프로젝트 무관(project-agnostic) **AI 코딩 하네스** — 어느 repo 에든 드롭인.
> 실행·파일·프롬프트 단계에 끼어들어 규칙을 강제하고, 모든 결과를 append-only JSONL 로 남긴다.

🔧 **하네스 = "AI 코딩 보안검색대"** — AI 에이전트(Claude Code / Codex 등)가 명령을 실행하거나 파일을 고치기 직전·직후에 게이트를 통과시켜, 위험한 동작은 막고(block) 잠금 파일 수정은 경고(warn)하며 검증·인계를 자동화한다. ESLint 가 "코드 문법"만 본다면, 하네스는 **명령 실행·파일 잠금·검증·세션 인계까지 작업 흐름 전체**를 단속한다.

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
harness/
├── bin/harness          실행 입구 (bash — tsx 런타임 자동탐색)
├── cli/index.ts         디스패처 (harness lint → lint.ts)
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
| `pre bash` / `pre write` | enforcement 규칙 매칭 → block/warn | PreToolUse |
| `post bash <exit>` / `post edit <file>` | 결과 기록, 0≠exit 라우팅, L0 편집 경고 | PostToolUse |
| `prompt <text>` | 키워드 트리거 + 프롬프트 힌트 주입 | UserPromptSubmit |
| `architecture {inject\|show}` | repo-root `ARCHITECTURE.json`(우선)/`.md` 를 컨텍스트로 주입 — CLAUDE.md 처럼 첫 턴부터 설계 SSOT 상주 (80KB 초과 시 절단, 부재 시 무음) | SessionStart |
| `claudemd {inject\|show}` | repo-root `CLAUDE.md`(프로젝트 규칙)를 **매 턴** 재주입 — commons 처럼 salience 유지해 규칙이 묻히지 않게 (선택적 `<!-- enforce:start/end -->` 블록만, 80KB 절단, 부재 시 무음) | UserPromptSubmit |
| `lint [all\|fast]` | staged-L0 + 신선도 + **CHANGELOG 누락** + 수렴 누락 체크 | commit 전 (git pre-commit hook) |
| `verify [all\|fast\|list]` | config 의 검증 명령 병렬 실행 (실패 1개라도 → exit 1) | commit/push 전 |
| `errors {route\|list\|drain_check\|mark_fixed}` | 오류 severity 분류 + 큐 | 상시 |
| `ledger {register\|complete\|list\|gc\|dup_check}` | 백그라운드 에이전트 작업 등록(중복 방지) | Agent 전/후 |
| `bitter-gate audit [window]` | 규칙 히트 빈도 → dormant 규칙 폐기 검토 | 규칙 추가 전 |
| `audit [full\|summary\|json]` | 6축 자가 스코어카드 (/60) | 주기적 |
| `gc [scan\|drift]` | 가이드 마크다운의 깨진 링크 탐지 | 주기적 |
| `folders [scan\|scaffold <dir>]` | 서브폴더별 CLAUDE.md 누락 탐지 + 템플릿 생성 (편집 시 자동 넛지) | 주기적/작업 중 |
| `convergence {status\|recompute\|by-category}` | (선택) incident 수렴 추적 | 버그 수정 후 |
| `sync {run\|diff}` | (선택) repo 자체 공유파일 sync 스크립트 실행 | 공유파일 변경 후 |
| `pool {list\|add\|rm\|on <h> <cmd>\|status\|specs [h]}` | 호스트 로스터 + 원격 실행. `shared:false` 호스트는 **제한 호스트** — `allow` 프로젝트 컨텍스트 밖에선 `on` 차단(공용 컴퓨트로 못 씀). `on` 은 ssh 를 직접 spawn(argv)해 `cmd` 의 `$`/`$(...)` 가 로컬이 아니라 **원격 셸**에서 전개됨. `specs` 는 호스트별 코어/메모리/GPU 를 ssh 프로브해 로스터에 캐시(`list`·`status` 에 `〈12c · 30G · GPU:…〉` 인라인 표기) — 제한 호스트는 프로브하지 않음 | 원격 실행 · 자원 확인 시 |
| `pod` / `dojo [<slug>]` | GPU 클라우드 런북 + dojo 학습잡 스캐폴더. dojo 기본 스택은 `config.dojo`(엔진 무하드코딩)가 운반 — 설정 시 `hexa dojo <delegate>` 위임. 다샤드 배치는 `hexa cloud fire-shards` (손수 launcher.sh 는 `CLOUD-HANDROLLED-FANOUT` warn 으로 리다이렉트) | GPU 디스패치 · 학습 스캐폴드 |
| heartbeat (c22) | live 장기-진행건(pod·백그라운드 에이전트)을 `poll.maxSilenceSec`(기본 10분) 넘게 안 보면 `post bash`/`ing inject` 에서 방치 경고. c19(과다폴링 차단)의 반대 — 미폴링/idle-burn 방지 | PostToolUse · SessionStart |

---

## 빠른 시작

### 1. 하네스를 repo 에 둔다 (submodule 권장)

```bash
cd your-repo
git submodule add https://github.com/dancinlab/harness .harness-engine
# 또는 그냥 clone / vendor 해도 됨
```

### 2. 스캐폴딩 (한 방)

```bash
bash .harness-engine/bin/harness init --hooks
```

이 한 줄이 만든다 (기존 파일은 보존, `--force` 만 예외 · `--dry-run` 으로 미리보기):

```
✓ harness.config.json          프로젝트명 자동감지
✓ .harness/enforcement.json    번들 기본 규칙 복사 (repo 가 수정)
✓ .harness/keywords.json
✓ .harness/severity-map.json
✓ .gitignore                   로그 무시 추가
✓ scripts/harness              얇은 래퍼
✓ .claude/settings.json        hook 배선 (--hooks 일 때)
```

생성 후 `harness.config.json` 의 `verify.checks` · `lockdown.files` 만 repo 에 맞게 채우면 된다.

> 수동 설정도 가능: `.harness/*.json` 을 두지 않으면 번들 기본 규칙(`config/*.json`)이 자동 적용된다.
>
> 제거: `harness uninstall` (주입물만 제거, 사용자 콘텐츠 보존 · `--dry-run` 미리보기). 상세 [docs/install.md](docs/install.md#제거-uninstall).

### 3. 동작 확인

```bash
bash .harness-engine/bin/harness audit
bash .harness-engine/bin/harness ci list
```

### 4. 에이전트 hook 배선 (Claude Code 예시)

`.claude/settings.json`:

```jsonc
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash",       "hooks": [{ "type": "command", "command": "CLAUDE_TOOL_INPUT=\"$CLAUDE_TOOL_INPUT\" bash .harness-engine/bin/harness pre bash" }] },
      { "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "CLAUDE_TOOL_INPUT=\"$CLAUDE_TOOL_INPUT\" bash .harness-engine/bin/harness pre write" }] }
    ],
    "PostToolUse": [
      { "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "bash .harness-engine/bin/harness post edit \"$CLAUDE_FILE_PATH\"" }] }
    ],
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "bash .harness-engine/bin/harness prompt \"$CLAUDE_USER_PROMPT\"" }] }
    ]
  }
}
```

> 환경변수 이름(`CLAUDE_TOOL_INPUT` 등)은 런타임 버전에 따라 다를 수 있다. 하네스는 `CLAUDE_TOOL_INPUT` 와 `CODEX_TOOL_INPUT` 둘 다 읽는다. JSON 형식: `{"command":"...","file_path":"...","content":"..."}`.

> 💡 `harness install-hooks [--global|--repo]` 는 hook 배선과 함께 `settings.json` 의 `env` 에 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 도 세팅한다 — 백그라운드 subagent 에 `SendMessage`(agent-teams)를 기본 활성화. 이미 그 키가 있으면 사용자 값을 보존한다(덮어쓰지 않음). 끄려면 그 키를 `"0"` 으로 두면 된다.

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
- [ARCHITECTURE.json](ARCHITECTURE.json) — 하네스 아키텍처 트리 SSOT (컬럼형 노드: 이름·역할·구분·상세). 사람용 뷰어는 [ARCHITECTURE.html](ARCHITECTURE.html) — 로컬은 `python3 serve.py`(서버 + 브라우저 자동 오픈), 원격은 raw.githack.com / GitHub Pages
- [docs/install.md](docs/install.md) — repo 통합 상세 (submodule / vendor / 멀티 repo)
- [docs/extending.md](docs/extending.md) — 규칙 추가, 도메인 모듈 확장 패턴

## self-hosted

이 repo 자체가 하네스를 쓴다(dogfooding) — `harness.config.json` + `.claude/settings.json` self hooks + pre-commit `bin/harness lint`. 코어(`.ts`) 변경 시 CHANGELOG 동시 갱신이 강제되고, 번들 enforcement(root-cause·secret·force-push)가 자기 코드에도 적용된다. 단 `protectedBranches` 미설정으로 자기 개발 흐름(main 직접 push)은 막지 않는다.

매 사이클(`harness pr-cycle`)의 doc-gate 는 의미있는 변경에 대해 **CHANGELOG.md(append) + (존재 시) ARCHITECTURE.md·README.md 현행화**를 요구한다 — 셋 중 미갱신이 있으면 머지를 거부한다(`--no-doc` 는 진짜 문서 불필요할 때만). 이 README 도 그 대상이므로 매 사이클 최신 상태로 유지된다. (commons c12)

`harness pr-cycle` 은 검증된 머지 직후 **로컬 base(main) 를 origin/base 로 ff-sync** 한다(feature 브랜치에서 `git fetch origin <base>:<base>` — checkout 전환 없이 로컬 main 뒤처짐 방지, non-ff 거부=안전). origin 만 갱신하고 로컬 main 을 방치하지 않으므로, 다음 작업 브랜치는 항상 최신 base 에서 분기된다. (commons c12)

같은 doc-gate 가 **pre-commit `harness lint` 에서도 발화한다** — pr-cycle 을 거치지 않는 작업이라도, 의미있는 코드 변경이 staged 인데 CHANGELOG / (존재 시) ARCHITECTURE·README 가 같이 staged 안 됐으면 **commit 을 차단**한다(`CHANGELOG-MISSING`·`ARCHITECTURE-MISSING`·`README-MISSING`, 모두 block). 즉 "모든 작업 이후" 문서 현행화가 강제된다. 진짜 문서 불필요한 변경만 `git commit --no-verify`.

## 라이선스

MIT
