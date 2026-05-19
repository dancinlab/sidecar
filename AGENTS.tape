#!/usr/bin/env tape
# AGENTS.tape for `dancinlab/sidecar` — agent-harness + governance.
# sidecar = a marketplace plugin pack that bolts guardrails onto Claude
# Code without forking it. This tape pins the conventions an agent must
# NOT re-derive or re-ask each session. Kept minimal (cf. growth's
# minimal-keep) — only what is non-obvious from the repo itself.
# CLAUDE.md is a symlink to this file so Claude Code reads it as the
# project instructions.

@V := "tape" :: spec [active]
  version = "1.2"

# ─── §1 Identity ─────────────────────────────────────────────────────

@I id001 := "sidecar" :: identity-claim [d=2026-05-19 active]
  kind = "Claude Code marketplace plugin pack — guardrails as sidecar plugins"
  brief = "one plugin = one guardrail · ~100 lines Python each · no binaries / telemetry"
  parent = "dancinlab"
  ssot = "~/core/sidecar/ · ships via .claude-plugin/marketplace.json"

# ─── §2 Governance ───────────────────────────────────────────────────

@D g_ship_syncs_install := "ship syncs the local install — do NOT defer to /plugin" :: governance [required d=2026-05-19 active]
  rule = "플러그인을 ship(버전 bump + push)하면, 같은 작업 안에서 현재 시스템의 설치본도 즉시 업데이트한다 — 사용자가 /plugin 을 돌릴 때까지 미루지 않는다."
  apply = "마켓플레이스 클론(~/.claude/plugins/marketplaces/sidecar) git pull → 캐시 ~/.claude/plugins/cache/sidecar/<name>/<ver>/ 를 repo 내용으로 재생성 → installed_plugins.json 의 <name>@sidecar 항목 갱신 (version · installPath · gitCommitSha · lastUpdated)"
  scope = "모든 sidecar 플러그인 — wilson-sdlc:ship 체크리스트의 사실상 8단계"
  note = "새 버전은 다음 claude 세션부터 로드된다 — 현재 세션은 구버전 유지"
