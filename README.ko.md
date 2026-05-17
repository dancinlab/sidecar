<h1 align="center">🏍️ sidecar</h1>

<p align="center"><strong>검증된 Claude Code 가드레일 — hexa-native 에이전트에서 이식.</strong></p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Status" src="https://img.shields.io/badge/status-v0.1.0-orange">
  <img alt="Marketplace" src="https://img.shields.io/badge/claude--code-plugin_marketplace-informational">
  <img alt="Sibling" src="https://img.shields.io/badge/sibling-wilson-blueviolet">
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">中文</a> · <a href="README.ru.md">Русский</a> · <a href="README.ja.md">日本語</a> · <strong>한국어</strong>
</p>

---

> **Claude Code를 안 건드리고 옆에 붙여 가드레일을 입히는 사이드카.**
> 손수 짠 hook 스니펫이 아니라, 프로덕션 hexa-native 에이전트
> [`wilson`](https://github.com/dancinlab/wilson)에서 검증된 가드 세트를
> Claude Code 플러그인 마켓플레이스로 이식한 것.

`sidecar`는 호스트 하네스(Claude Code)는 그대로 둔 채 측면 장착으로 governance만
추가하는 **plugin marketplace repo**입니다. wilson의 `governance` / `guard-*` /
`agents-md` 플러그인 가치를 Claude Code의 hook 프리미티브로 1:1 매핑합니다.

## Why sidecar?

- **검증된 가드의 이식** — 임시 dotfiles hook 모음이 아니라 wilson 번들에서
  실사용·검증된 차단 규칙(위험 경로·SSOT append-only·도메인 린트).
- **호스트 비침습** — Claude Code 설정/코어를 수정하지 않음. 마켓플레이스에서
  설치·활성/비활성만.
- **wilson on-ramp** — Claude Code에서 wilson governance를 맛보고 풀
  `wilson`(hexa-native · plugin-everything)으로 졸업하는 진입로.

## Plugins

| 플러그인 | CC hook | 동작 |
|---|---|---|
| `wilson-guards` | `PreToolUse` (`Write`·`Edit`·`MultiEdit`) | dancinlab 워크플로 가드 3종 번들 — `ssot-lock`(가장 가까운 `AGENTS.md ## Governance`의 `ssot-lock:` 불릿에 매치되는 파일 편집 차단), `tape-append-only`(`.tape` 트레이스는 append-only — 기존 내용 재작성 Edit / 덮어쓰는 Write 차단), `domain-lint`(루트 `UPPERCASE.md` 토픽 로드맵은 `Head + --- + ## Log` 구조여야) — standalone 포팅, **작동**; 각 가드는 해당 규약이 없으면 inert (opt out: `SIDECAR_NO_GUARDS=1`) |
| `wilson-ssot` | `SessionStart` · `UserPromptSubmit` | `AGENTS.md` walk-up SSOT를 컨텍스트로 주입 (wilson `agents-md` 대응) — **작동** |
| `wilson-readme-format` | `PreToolUse` (`Write`·`Edit`) | repo-root `README.md`의 readme-format 위반 차단 (emoji-in-prose / multi-glyph H1 / non-English At-a-glance / `####`) — wilson `guard-readme-format` standalone 포팅, **작동** |
| `wilson-hexa-verify` | `PreToolUse` + `PostToolUse` (`Bash`) | PreToolUse: 비-hexa 검증기(sympy/PyPhi/wolframscript/mathematica) Bash 호출 차단 → hexa CLI 유도. PostToolUse: `hexa verify`가 새 SUPPORTED 방정식(🔵/🟢) 보고 시 `dancinlab/hexa-lang`에 **PR 자동 생성** — 방정식을 binary built-in atlas에 베이크(`hexa atlas promote`의 stub `pr` 단계 보완, PR은 사람 리뷰용·자동 머지 안 함). 자율 PR 불가 시 `worktree-pr` 워크플로 유도로 fallback. wilson `guard-hexa-verify` standalone 포팅+확장, **작동**. ⚠ `hexa`가 PATH에 없으면 inert |
| `wilson-dangerous-path` | `PreToolUse` (`Write`·`Edit`) | 보호 시스템 경로(`/etc` `/usr` `/bin` `/sbin` `/System` `/.git` `/.gnupg`)·자격증명 경로(`~/.ssh`·`~/.aws`·gh config·keychain·credentials) 대상 Write/Edit/MultiEdit 차단 — wilson `guard-dangerous-path` standalone 포팅, **작동** |
| `wilson-git-guard` | `PreToolUse` (`Bash`) | force-push 차단 — `git push`에 `--force`/`-f`/`+refspec`(및 `--force-with-lease`, `SIDECAR_ALLOW_FORCE_WITH_LEASE=1` 아니면) 있으면 차단 — wilson `git-guard` standalone 포팅, **작동** |
| `wilson-secret-guard` | `PreToolUse` (`Write`·`Edit`·`MultiEdit`) + `UserPromptSubmit` | 실제 `.env` 파일 쓰기, 또는 고신뢰 크리덴셜(AWS / GitHub / GitLab / Anthropic / OpenAI / Slack / Google / Stripe 토큰, PEM 개인키)을 담은 내용 차단; 그런 크리덴셜을 붙여넣은 프롬프트 차단 — 고신뢰 패턴만, false positive 거의 없음, **작동** (opt out: `SIDECAR_NO_SECRET_GUARD=1`) |
| `wilson-bash-guard` | `PreToolUse` (`Bash`) | 파괴적 셸 명령 차단 — pipe-to-shell(`curl … \| sh`), 루트/홈 경로 `rm -rf`, fork bomb, 디스크 파괴자(`dd of=/dev/disk`·`mkfs`·`>/dev/sd*`), `/` `~` `.` 대상 재귀 `chmod`/`chown` — 고신뢰 파괴 패턴만, false positive 거의 없음, **작동** (opt out: `SIDECAR_NO_BASH_GUARD=1`) |
| `wilson-prefs` | `/wilson-prefs:prefs` 커맨드 + `SessionStart`·`UserPromptSubmit` | 응답 언어 / 코드 언어 / 응답 스타일 설정 — 언어 값은 `auto`(사용자가 쓰는 언어 미러) 허용 → 플러그인 데이터에 영속, 컨텍스트 주입. wilson `prefs` standalone 포팅 — **작동** (설정 전까지 아무것도 주입 안 함) |
| `wilson-output-trim` | `PreToolUse` (`Bash`) | Bash 명령을 재작성(`updatedInput`)해 stdout이 TF-IDF salience + MinHash 중복제거 필터를 거친 뒤 모델에 들어가게 함 — wilson `compaction-prefilter` 정신 포팅, **작동** (작은 출력 verbatim · exit code `pipefail`로 보존) |
| `wilson-pool` | `/wilson-pool:pool` 커맨드 + `PreToolUse`(`Bash`) + `SessionStart`·`UserPromptSubmit` | 무거운 Bash 명령을 원격 **호스트 roster**로 ssh 라우팅 — 호스트마다 platform 태그가 있어 macOS 전용·Linux 전용 명령은 해당 플랫폼 호스트로, 나머지는 round-robin 분산 — wilson `pool` roster 정신 포팅, **작동**. ⚠ roster에 호스트 1개+workdir 설정 전 OFF (`workdir auto`는 현재 프로젝트를 호스트별 미러링) · Bash만 라우팅 · 모든 호스트의 원격 workdir 동기화는 **사용자 책임**(CC hook은 wilson 9P/sshfs처럼 fs 마운트 불가) |
| `wilson-checkpoint` | `Stop`·`PreCompact`·`SessionEnd`·`SessionStart` | usage limit / 크래시에도 작업 무손실 — 매 턴 `git stash create`로 WIP 스냅샷(dangling commit · 워킹트리/index/브랜치 무접촉), `refs/wilson-checkpoint/`에 고정 + resume 노트; `SessionStart`가 미소비 스냅샷 재주입. `/wilson-checkpoint:checkpoint`로 status/restore/clear (restore는 출력만 · 자동 적용 안 함) — **작동** · git 전용 · 디바운스 (opt out: `SIDECAR_NO_CHECKPOINT=1`) |
| `wilson-gpu` | `/wilson-gpu` 커맨드 + `SessionStart` | RunPod / Vast.ai 렌트 GPU 비용 가드레일 — `SessionStart`가 과금중 인스턴스(업타임 + 누적 추정비용) 노출 → 잊은 pod 비용누수 차단; `down` kill 스위치, `attach`는 인스턴스를 `wilson-pool` roster에 연결. 전략 `watch`/`budget`/`idle-reaper`/`ephemeral`; 과금·자동 down은 별도 기본-OFF 스위치 이중 게이트(`up`은 `provisioning`+`--yes`, 자동중단은 `reaping`); `fanout`은 shardable 작업용 비용허용폭 의사결정 보조. **작동** · `runpodctl`/`vastai` 없으면 inert (opt out: `SIDECAR_NO_GPU=1`) |
| `wilson-lsp` | `.lsp.json` LSP 서버 (hook 아님) | `.hexa` → `hexa lsp` · `.tape`·`.n6`·`.hxc`·`.kosmos` → 각 포맷 repo의 canonical 서버(`tape-lsp`/`n6-lsp`/`hxc-lsp`/`kosmos-lsp`, `github.com/dancinlab/{tape,n6,hxc,kosmos}` 동봉) 연결. graceful — PATH에 없으면 `/plugin` Errors에 표시. LSP 라이프사이클은 CC 관리(토글은 `/plugin`, `/sidecar` 아님) |
| `sidecar` | `/sidecar` 커맨드 (컨트롤) | 나머지 플러그인 런타임 on/off — `/sidecar status\|on\|off <name>` (이름: ssot readme-format hexa-verify dangerous-path git-guard secret-guard bash-guard prefs output-trim pool checkpoint gpu guards, 또는 `all`). 공유 `~/.claude/sidecar/disabled.json`을 각 hook이 확인 · 세션 넘어 영속 · 네이티브 `/plugin` 보완 |
| `worktree-pr` | `/worktree-pr:wt` 커맨드 (워크플로) | 안전한 **worktree → PR → merge → 정리** 워크플로 — `start <name>`(origin 기본 브랜치에서 격리 worktree+브랜치), `ship <name> "<title>"`(push + PR 생성), `finish <name>`(PR merge + worktree 제거 + 브랜치 삭제 + base 갱신), `status`, `abort`. 메인 워킹트리·동시세션 브랜치 무접촉 |

로드맵 후보: `wilson-memory`(SessionStart/SessionEnd 파일 memory) ·
`wilson-recap`(PreCompact/SessionEnd 요약).

## Install

```bash
# 1. 마켓플레이스 등록
/plugin marketplace add dancinlab/sidecar

# 2. 원하는 플러그인 설치 — 각각 독립
/plugin install wilson-secret-guard@sidecar    # 라이브 시크릿 / .env 쓰기 차단
/plugin install wilson-bash-guard@sidecar      # 파괴적 Bash 명령 차단
/plugin install wilson-dangerous-path@sidecar  # 시스템 / 자격증명 경로 보호
/plugin install wilson-git-guard@sidecar       # force-push 차단
/plugin install wilson-readme-format@sidecar   # repo-root README 린트 가드
/plugin install wilson-hexa-verify@sidecar     # 비-hexa 검증기 → hexa 유도
/plugin install wilson-guards@sidecar          # ssot-lock / tape / domain-lint 번들
/plugin install wilson-ssot@sidecar            # AGENTS.md SSOT 주입
/plugin install wilson-prefs@sidecar           # 응답언어 / 코드 / 스타일 설정
/plugin install wilson-output-trim@sidecar     # Bash stdout salience 필터
/plugin install wilson-pool@sidecar            # 무거운 Bash → 원격 호스트 라우팅
/plugin install wilson-checkpoint@sidecar      # 매 턴 WIP 스냅샷 (limit/크래시 안전)
/plugin install wilson-gpu@sidecar             # RunPod/Vast 비용 가드레일 + kill 스위치
/plugin install wilson-lsp@sidecar             # .hexa / .tape / .n6 / .hxc / .kosmos LSP
/plugin install worktree-pr@sidecar            # /worktree-pr:wt 워크플로 커맨드
/plugin install sidecar@sidecar                # /sidecar 런타임 on/off 컨트롤
```

`/plugin`으로 언제든 둘러보거나 토글. 새 릴리스 후 업그레이드:

```bash
/plugin marketplace update sidecar
/plugin update
```

### 한 번에 전부 설치

`/plugin install`을 플러그인마다 치는 대신, `settings.json`(`~/.claude/settings.json`은
모든 프로젝트, `.claude/settings.json`은 해당 프로젝트)에 마켓플레이스와 플러그인을
선언하면 — Claude Code가 다음 시작 시 나열된 플러그인을 한 번에 설치·활성화합니다:

```json
{
  "extraKnownMarketplaces": {
    "sidecar": { "source": { "source": "github", "repo": "dancinlab/sidecar" } }
  },
  "enabledPlugins": {
    "wilson-secret-guard@sidecar": true,
    "wilson-bash-guard@sidecar": true,
    "wilson-dangerous-path@sidecar": true,
    "wilson-git-guard@sidecar": true,
    "wilson-readme-format@sidecar": true,
    "wilson-hexa-verify@sidecar": true,
    "wilson-guards@sidecar": true,
    "wilson-ssot@sidecar": true,
    "wilson-prefs@sidecar": true,
    "wilson-output-trim@sidecar": true,
    "wilson-pool@sidecar": true,
    "wilson-checkpoint@sidecar": true,
    "wilson-gpu@sidecar": true,
    "wilson-lsp@sidecar": true,
    "worktree-pr@sidecar": true,
    "sidecar@sidecar": true
  }
}
```

## Status

**v0.1.0 — 첫 guard 이식.** `wilson-ssot`(AGENTS.md walk-up)와
`wilson-readme-format`(4-lint README 가드, wilson `guard-readme-format`의 충실한
standalone 포팅)은 **작동**합니다. `wilson-guards`는 이제 **standalone 포팅** —
세 가드(`ssot-lock` / `tape-append-only` / `domain-lint`)가 wilson 술어를
바이너리 의존 없이 직접 재구현합니다. 각 가드는 **해당 규약이 프로젝트에 실제로
있을 때만 동작**(`ssot-lock:` 불릿 없음 / `.tape` 파일 없음 / 루트 토픽 로드맵
없음 → 0 동작)하므로, 번들 자체는 범용 설치에 안전하고 dancinlab식 워크플로
안에서만 의미를 갖습니다.

## Repo layout

```
sidecar/
├── .claude-plugin/marketplace.json   # 마켓플레이스 매니페스트
├── plugins/
│   ├── wilson-guards/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) 배선
│   │   ├── bin/guard.sh              # hook 래퍼
│   │   └── bin/_guards.py            # ssot-lock + tape-append-only + domain-lint (작동)
│   ├── wilson-ssot/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # SessionStart/UserPromptSubmit 배선
│   │   └── bin/_ssot.py              # AGENTS.md walk-up (작동)
│   ├── wilson-readme-format/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) 배선
│   │   └── bin/_readme_format.py     # 4-lint README 가드 (작동)
│   ├── wilson-hexa-verify/
│   │   ├── hooks/hooks.json          # PreToolUse + PostToolUse (Bash) 배선
│   │   ├── bin/_hexa_verify.py       # 비-hexa 검증기 가드 (작동)
│   │   └── bin/_verify_watch.py      # 새 방정식 → hexa-lang PR 트리거 (작동)
│   ├── wilson-dangerous-path/
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) 배선
│   │   └── bin/_dangerous_path.py    # 보호 경로 가드 (작동)
│   ├── wilson-git-guard/
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) 배선
│   │   └── bin/_git_guard.py         # force-push 가드 (작동)
│   ├── wilson-secret-guard/
│   │   ├── hooks/hooks.json          # PreToolUse(Write|Edit)+UserPromptSubmit
│   │   ├── bin/secret-guard.sh       # hook 래퍼
│   │   └── bin/_secret_guard.py      # .env + 크리덴셜 토큰 가드 (작동)
│   ├── wilson-bash-guard/
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) 배선
│   │   ├── bin/bash-guard.sh         # hook 래퍼
│   │   └── bin/_bash_guard.py        # 파괴적 명령 가드 (작동)
│   ├── wilson-prefs/
│   │   ├── commands/prefs.md         # /wilson-prefs:prefs 슬래시 커맨드
│   │   ├── bin/_prefs.py             # 설정 set/show (작동)
│   │   ├── bin/_inject.py            # 설정 컨텍스트 주입 (작동)
│   │   └── styles/friendly.{md,*.md} # 응답 스타일 샘플 (5개국어)
│   ├── wilson-output-trim/
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) 배선
│   │   ├── bin/_trim.py              # updatedInput로 명령 재작성 (작동)
│   │   └── bin/_salience.py          # TF-IDF + MinHash 필터 (작동)
│   ├── wilson-pool/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/pool.md          # /wilson-pool:pool 슬래시 커맨드
│   │   ├── hooks/hooks.json          # PreToolUse(Bash)+SessionStart 배선
│   │   ├── bin/_pool.py              # 호스트 roster / workdir 설정 (작동)
│   │   ├── bin/_route.py             # platform 라우팅 ssh 재작성 (작동)
│   │   └── bin/_inject.py            # ## Pool 블록 (작동)
│   ├── wilson-checkpoint/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/checkpoint.md    # /wilson-checkpoint:checkpoint
│   │   ├── hooks/hooks.json          # Stop·PreCompact·SessionEnd·SessionStart
│   │   ├── bin/checkpoint.sh         # hook + 커맨드 엔트리포인트
│   │   └── bin/_checkpoint.py        # git-stash WIP 스냅샷/복구 (작동)
│   ├── wilson-gpu/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/gpu.md           # /wilson-gpu
│   │   ├── hooks/hooks.json          # SessionStart (비용 가드레일)
│   │   ├── bin/gpu.sh                # hook + 커맨드 엔트리포인트
│   │   └── bin/_gpu.py               # RunPod/Vast 어댑터 + 가드레일 (작동)
│   ├── wilson-lsp/
│   │   ├── .claude-plugin/plugin.json
│   │   └── .lsp.json                 # hexa lsp + tape/n6/hxc/kosmos repo LSP 연결
│   ├── sidecar/                      # 컨트롤 플러그인
│   │   ├── commands/sidecar.md       # /sidecar status|on|off <name>
│   │   └── bin/_sidecar.py           # 공유 disabled.json 기록 (작동)
│   └── worktree-pr/
│       ├── commands/wt.md            # /worktree-pr:wt start|ship|finish|...
│       └── bin/worktree-pr.sh        # worktree → PR → merge → 정리 (작동)
└── LICENSE
```

## Sibling

- 🐦 [`dancinlab/wilson`](https://github.com/dancinlab/wilson) — hexa-native AI 코딩 에이전트. sidecar가 이식하는 가드의 원본.

## License

MIT. [LICENSE](LICENSE) 참조.
