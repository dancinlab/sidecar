# harness

Project-agnostic AI coding harness — guards, injects, and runbooks that wire a single `harness`
CLI into any agent (Claude Code, etc.) via hooks. Config-driven, zero domain hardcoding; ships as a
global command (`~/.harness/cli` + `~/.local/bin/harness`, bootstrapped by `harness install`) and as a
Claude Code plugin (`/plugin`).

> 📍 거버넌스/규칙 SSOT: [config/commons.md](config/commons.md) (always-on · slug-keyed do/dont rules) · 설계 SSOT:
> [ARCHITECTURE.md](ARCHITECTURE.md) · 이력: [CHANGELOG.md](CHANGELOG.md). This file = project map only.

## 구조 (tree)

```
harness/
├─ bin/harness          — launcher (autodetects tsx; npx fallback)
├─ cli/index.ts         — command dispatcher (L0) — registers every module
├─ lib/                 — engine core: config · paths · exec · log · json · lockdown (L0)
├─ modules/             — 45 commands: pre/post hooks · lint/ci(+ci-track remote-CI verdict) · guards (git/tmp/scatter/docs/mem-OOM/naming)
│                         · injects (commons/claudemd/recommend/prefs/easy) · pr-cycle · ing(+cross-repo --to)
│                         · install(global bootstrap)/init/self-update/install-hooks/shadow
│                         · imagine · research · watch · secret · lsp · worktree · pod/dojo/demi/micro-exp …
├─ config/             — bundled rule SSOTs: commons.md · recommend.md · enforcement/keywords/severity.json
├─ templates/          — runbook bodies (sbs · bypass · go · brainstorm · pod · dojo · demi · micro-exp …)
├─ styles/             — easy.{md,ko,ja,zh,ru} friendly-response style
├─ commands/           — slash-command delegator set. Source that `harness shadow` mirrors into ~/.claude/commands/ as BARE `/cmd` (user-scope). NOT loaded as plugin commands — plugin.json sets `commands: []` so the picker shows bare `/fleet` only, never a `/harness:fleet` duplicate.
├─ hooks/              — plugin hooks (hooks.json → run.sh dispatcher → bundled CLI via ${CLAUDE_PLUGIN_ROOT})
├─ .claude-plugin/     — plugin.json + marketplace.json. SELF-CONTAINED plugin: marketplace source=`.` (repo root IS the plugin), so bin/cli/lib/modules ship inside it → `/plugin update`+reload refreshes CLI+hooks+commands as one unit (no separate self-update)
├─ docs/               — auxiliary guides (install · extending · languages)
├─ scripts/            — helper scripts · install.sh (전역 부트스트랩 SSOT — `harness install`/curl 가 위임)
├─ state/              — 실험·벤치·검증(verdict/claim)·스크래치 단일 산출물 루트 (c5 · git-tracked)
├─ harness.config.json — this repo's harness config (+ .example)
├─ ARCHITECTURE.md     — final-architecture SSOT (update-in-place)
├─ CHANGELOG.md        — change history (append-only)
└─ ING.jsonl           — in-progress board on a dedicated `ing` git ref (worktree 아님 · plumbing+push 공유) + cross-repo 인계 (c6 · `ing add [--to <repo>]` · done=scrub)
```

## 작업 규칙 (this repo)
- 매 사이클: 문서(CHANGELOG + 설계변경 시 ARCHITECTURE) → 검증 → **구현 후에는 항상 `harness ship`** (commons `cycle-docs-pr`).
- **`harness ship` = 모든 설치 surface 에 한 번에 전파**: pr-cycle(검증 머지) → self-update(전역 CLI) → shadow(슬래시 미러). `pr-cycle`+`self-update` 만 돌리고 `shadow` 를 빠뜨리면 새 슬래시 명령이 picker 에 안 떠 "반영 안됨" 이 재발한다 — 그래서 셋을 한 명령으로 묶었다. config/data-only 변경은 `harness ship --no-doc`.
- 새 명령: `modules/<name>.ts` + `cli/index.ts` 등록 + help 라인 + CHANGELOG (+ 런북형이면 `templates/<name>.md`, 슬래시 노출이면 `commands/<name>.md`). 검증: `npx tsx cli/index.ts help` 로드 + `harness toolkit write`(카탈로그 100% 유지) + 관련 스모크 → `harness ship`.
