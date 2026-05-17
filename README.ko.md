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
| `wilson-guards` | `PreToolUse` (`Bash`·`Write`·`Edit`) | 위험 경로·SSOT append-only·도메인 린트 위반 차단 |
| `wilson-ssot` | `SessionStart` · `UserPromptSubmit` | `AGENTS.md` walk-up SSOT를 컨텍스트로 주입 (wilson `agents-md` 대응) — **작동** |
| `wilson-readme-format` | `PreToolUse` (`Write`·`Edit`) | repo-root `README.md`의 readme-format 위반 차단 (emoji-in-prose / multi-glyph H1 / non-English At-a-glance / `####`) — wilson `guard-readme-format` standalone 포팅, **작동** |
| `wilson-hexa-verify` | `PreToolUse` (`Bash`) | 비-hexa 검증기(sympy/PyPhi/wolframscript/mathematica) Bash 호출 차단 → hexa CLI로 유도 — wilson `guard-hexa-verify` standalone 포팅, **작동**. ⚠ `hexa`가 PATH에 없으면 inert |
| `wilson-dangerous-path` | `PreToolUse` (`Write`·`Edit`) | 보호 시스템 경로(`/etc` `/usr` `/bin` `/sbin` `/System` `/.git` `/.gnupg`)·자격증명 경로(`~/.ssh`·`~/.aws`·gh config·keychain·credentials) 대상 Write/Edit/MultiEdit 차단 — wilson `guard-dangerous-path` standalone 포팅, **작동** |
| `wilson-git-guard` | `PreToolUse` (`Bash`) | force-push 차단 — `git push`에 `--force`/`-f`/`+refspec`(및 `--force-with-lease`, `SIDECAR_ALLOW_FORCE_WITH_LEASE=1` 아니면) 있으면 차단 — wilson `git-guard` standalone 포팅, **작동** |
| `wilson-prefs` | `/wilson-prefs:prefs` 커맨드 + `SessionStart`·`UserPromptSubmit` | 응답 언어 / 코드 언어 / 응답 스타일 설정 → 플러그인 데이터에 영속, 컨텍스트 주입. wilson `prefs` standalone 포팅 — **작동** (설정 전까지 아무것도 주입 안 함) |
| `wilson-output-trim` | `PreToolUse` (`Bash`) | Bash 명령을 재작성(`updatedInput`)해 stdout이 TF-IDF salience + MinHash 중복제거 필터를 거친 뒤 모델에 들어가게 함 — wilson `compaction-prefilter` 정신 포팅, **작동** (작은 출력 verbatim · exit code `pipefail`로 보존) |
| `wilson-pool` | `/wilson-pool:pool` 커맨드 + `PreToolUse`(`Bash`) + `SessionStart`·`UserPromptSubmit` | 무거운 Bash 명령을 원격 호스트로 ssh 라우팅 — wilson `pool` 정신 포팅, **작동**. ⚠ host+workdir 설정 전 OFF · Bash만 라우팅 · 원격 workdir 동기화는 **사용자 책임**(CC hook은 wilson 9P/sshfs처럼 fs 마운트 불가) |
| `wilson-lsp` | `.lsp.json` LSP 서버 (hook 아님) | `.hexa` → `hexa lsp` · `.tape`·`.n6`·`.hxc`·`.kosmos` → 각 포맷 repo의 canonical 서버(`tape-lsp`/`n6-lsp`/`hxc-lsp`/`kosmos-lsp`, `github.com/dancinlab/{tape,n6,hxc,kosmos}` 동봉) 연결. graceful — PATH에 없으면 `/plugin` Errors에 표시. LSP 라이프사이클은 CC 관리(토글은 `/plugin`, `/sidecar` 아님) |
| `sidecar` | `/sidecar` 커맨드 (컨트롤) | 나머지 플러그인 런타임 on/off — `/sidecar status\|on\|off <name>` (이름: ssot readme-format hexa-verify prefs output-trim pool guards, 또는 `all`). 공유 `~/.claude/sidecar/disabled.json`을 각 hook이 확인 · 세션 넘어 영속 · 네이티브 `/plugin` 보완 |
| `worktree-pr` | `/worktree-pr:wt` 커맨드 (워크플로) | 안전한 **worktree → PR → merge → 정리** 워크플로 — `start <name>`(origin 기본 브랜치에서 격리 worktree+브랜치), `ship <name> "<title>"`(push + PR 생성), `finish <name>`(PR merge + worktree 제거 + 브랜치 삭제 + base 갱신), `status`, `abort`. 메인 워킹트리·동시세션 브랜치 무접촉 |

로드맵 후보: `wilson-memory`(SessionStart/SessionEnd 파일 memory) ·
`wilson-recap`(PreCompact/SessionEnd 요약).

## Install

```bash
/plugin marketplace add dancinlab/sidecar
/plugin install wilson-guards@sidecar
/plugin install wilson-ssot@sidecar
```

## Status

**v0.1.0 — 첫 guard 이식.** `wilson-ssot`(AGENTS.md walk-up)와
`wilson-readme-format`(4-lint README 가드, wilson `guard-readme-format`의 충실한
standalone 포팅)은 **작동**합니다. `wilson-guards`는 아직 **스텁**(passthrough —
가짜 차단 안 함). wilson은 단일 정적 바이너리(플러그인 dispatch는 내부 ABI)라,
남은 `wilson-guards` 이식 경로는 두 갈래 중 결정:

1. **harness-rpc 경유** — wilson의 `harness-rpc`(JSONL stdin/stdout) 모드로 특정
   guard plugin action을 호출하는 얇은 래퍼.
2. **standalone 포팅** — guard 술어(위험 경로·SSOT append-only·도메인 린트)만
   떼어 여기서 직접 재구현(wilson 바이너리 의존 제거, 마켓플레이스 단독 동작).

결정 전까지 hook은 deny 없이 통과 — **가짜 차단을 만들지 않음**(정직).

## Repo layout

```
sidecar/
├── .claude-plugin/marketplace.json   # 마켓플레이스 매니페스트
├── plugins/
│   ├── wilson-guards/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse 배선
│   │   └── bin/guard.sh              # 스텁 (TODO: wilson 이식)
│   ├── wilson-ssot/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # SessionStart/UserPromptSubmit 배선
│   │   └── bin/_ssot.py              # AGENTS.md walk-up (작동)
│   ├── wilson-readme-format/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) 배선
│   │   └── bin/_readme_format.py     # 4-lint README 가드 (작동)
│   ├── wilson-hexa-verify/
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) 배선
│   │   └── bin/_hexa_verify.py       # 비-hexa 검증기 가드 (작동)
│   ├── wilson-dangerous-path/
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) 배선
│   │   └── bin/_dangerous_path.py    # 보호 경로 가드 (작동)
│   ├── wilson-git-guard/
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) 배선
│   │   └── bin/_git_guard.py         # force-push 가드 (작동)
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
│   │   ├── commands/pool.md          # /wilson-pool:pool 슬래시 커맨드
│   │   ├── hooks/hooks.json          # PreToolUse(Bash)+SessionStart 배선
│   │   ├── bin/_route.py             # 무거운 명령 → ssh 재작성 (작동)
│   │   └── bin/_inject.py            # ## Pool 블록 (작동)
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
