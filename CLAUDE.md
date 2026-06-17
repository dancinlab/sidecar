# harness

Project-agnostic AI coding harness — guards, injects, and runbooks that wire a single `harness`
CLI into any agent (Claude Code, etc.) via hooks. Config-driven, zero domain hardcoding; ships as a
global command (`~/.harness/cli` + `~/.local/bin/harness`) and as a Claude Code plugin (`/plugin`).

> 📍 거버넌스/규칙 SSOT: [config/commons.md](config/commons.md) (always-on c1–c17) · 설계 SSOT:
> [ARCHITECTURE.md](ARCHITECTURE.md) · 이력: [CHANGELOG.md](CHANGELOG.md). This file = project map only.

## 구조 (tree)

```
harness/
├─ bin/harness          — launcher (autodetects tsx; npx fallback)
├─ cli/index.ts         — command dispatcher (L0) — registers every module
├─ lib/                 — engine core: config · paths · exec · log · json · lockdown (L0)
├─ modules/             — 41 commands: pre/post hooks · lint/verify · guards (git/tmp/scatter/docs)
│                         · injects (commons/claudemd/recommend/prefs/easy) · pr-cycle · ing(+cross-repo --to)
│                         · imagine · research · watch · secret · lsp · worktree · pod/dojo/demi/micro-exp …
├─ config/             — bundled rule SSOTs: commons.md · recommend.tape · enforcement/keywords/severity.json
├─ templates/          — runbook bodies (sbs · bypass · go · brainstorm · pod · dojo · demi · micro-exp …)
├─ styles/             — easy.{md,ko,ja,zh,ru} friendly-response style
├─ plugin/             — Claude Code plugin (.claude-plugin/plugin.json + hooks/hooks.json)
├─ .claude-plugin/marketplace.json — local marketplace ("harness") for `claude plugin install`
├─ docs/               — auxiliary guides (install · extending · languages)
├─ scripts/            — helper scripts (운영/스캐폴드용)
├─ state/              — 실험·벤치·검증(verdict/claim)·스크래치 단일 산출물 루트 (c5 · git-tracked)
├─ harness.config.json — this repo's harness config (+ .example)
├─ ARCHITECTURE.md     — final-architecture SSOT (update-in-place)
├─ CHANGELOG.md        — change history (append-only)
└─ ING.jsonl           — in-progress board + cross-repo 인계 (c6·c11 · `ing add [--to <repo>]` · done=scrub)
```

## 작업 규칙 (this repo)
- 매 사이클: 문서(CHANGELOG + 설계변경 시 ARCHITECTURE) → `harness pr-cycle` 검증 머지 (commons c14).
- 새 명령: `modules/<name>.ts` + `cli/index.ts` 등록 + help 라인 + CHANGELOG. 런북형이면 `templates/<name>.md`.
- 엔진 변경 후 검증: `npx tsx cli/index.ts help` 로드 + 관련 스모크. 전역 반영: `harness self-update`.
