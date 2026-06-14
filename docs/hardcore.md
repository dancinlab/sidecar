# hardcore 프로파일

> 🥋 **최대 강도 거버넌스 프로파일.** main 의 모든 기능 + "막을 수 있는 건 다 막고 탈출구를 좁힌" 설정.
> `harness-hardcore` 브랜치에서 관리하며, main 업데이트는 계속 흘러들어온다(아래 동기화).

## default vs hardcore

| 항목 | default | hardcore |
|------|---------|----------|
| enforcement action | 대부분 `warn` | 대부분 `block` |
| severity fallback | `defer` | `block` (unknown_threshold 5) |
| `--no-verify` 우회 | 가능 | `H-NO-VERIFY` 로 차단 |
| force-push | warn | `H-FORCE-PUSH` block (lease 만 허용) |
| 파괴적 git (reset --hard/clean -fd) | 자유 | `H-RESET-HARD` block |
| main 직접 커밋 | 자유 | `PROTECTED-BRANCH` block (feature 브랜치 강제) |
| 디버그 잔재(console.log 등) | 무검사 | `H-DEBUG-LEFTOVER` warn |
| git hook | pre-commit(lint) | pre-commit(lint) **+ pre-push(verify + errors drain)** |
| ledger staleSec | 3600 | 1800 |

## 적용

```bash
cd your-repo
git submodule add -b harness-hardcore https://github.com/dancinlab/harness .harness-engine
bash .harness-engine/bin/harness init --hardcore --hooks
```

`init --hardcore` 가 default 와 달리:
- `.harness/enforcement.json` ← `config/enforcement.hardcore.json`
- `.harness/severity-map.json` ← `config/severity-map.hardcore.json`
- `harness.config.json` 에 `profile:"hardcore"` + `lint.protectedBranches:["main","master"]`
- `.git/hooks/pre-push` 추가(`harness verify` + `errors drain_check 1`)

## 닫힌 탈출구 / 면제 마커

hardcore 도 정당한 예외는 인정한다 — 같은 줄/명령에 마커:

| 게이트 | 면제 마커 |
|--------|-----------|
| H-NO-VERIFY | `# no-verify-ok <사유>` |
| H-FORCE-PUSH | `--force-with-lease` 또는 `# force-ok` |
| H-RESET-HARD | `# reset-ok` |
| H-CURL-PIPE-SH | `# curl-pipe-ok` |
| H-RM-RF-ROOT | `# rm-ok` |
| H-ROOT-CAUSE / H-SECRET | `@root-cause-ok` / `@secret-ok` |
| H-DEBUG-LEFTOVER | `@debug-ok` |

## prefs — 언어 선호 (3축)

sidecar `prefs` 패리티. 코드 작성어 · 문서 작성어 · 응답어를 repo 단위로 고정하고, 매 턴 에이전트에 주입한다.

```bash
harness prefs show                 # 현재값
harness prefs code english         # 코드/주석 언어
harness prefs docs korean          # 문서(.md) 언어
harness prefs response korean      # 사용자 응답 언어
harness prefs inject               # UserPromptSubmit hook — # prefs 블록 주입 (init --hooks 가 자동 배선)
```

- 저장: `.harness/prefs.json` (`{code,docs,response}`). hardcore `init` 기본값 = code:english · docs:korean · response:korean.
- **hardcore 강제**: `code=english` 인데 코드/주석에 한글이 들어가면 `post edit` 가 `🌐 prefs` 경고(UI 텍스트는 locale 파일로, 정당하면 `// @lang-ok`). 문서축은 주입(soft)만 — 오탐 방지.

## 규칙 추가 (이 브랜치에서 한 건씩)

hardcore 규칙은 **이 브랜치의 `config/enforcement.hardcore.json` / `config/severity-map.hardcore.json` 에만** 추가한다(main 의 default 규칙은 건드리지 않음). 새 규칙은 `pre_bash` / `pre_write` / `prompt_hints` 에 append.

## main 업데이트 동기화 (필수)

hardcore 는 main 의 superset 이다. main 의 코어 개선을 주기적으로 흡수한다:

```bash
git checkout harness-hardcore
git fetch origin
git merge origin/main        # 충돌 거의 없음 — hardcore 는 새 파일 위주(additive)
# 충돌 시: config/*.hardcore.json · docs/hardcore.md 는 hardcore 우선, 엔진 파일은 main 우선 후 재확인
git push origin harness-hardcore
```

> 설계상 hardcore 는 **새 파일 추가** 위주라 `merge origin/main` 이 깨끗하게 흐른다. 엔진 파일(lint/config/init)의 hardcore 지원 코드는 default 에서 비활성(config 미설정 시 no-op)이라 main 으로 역병합해도 안전하다.
