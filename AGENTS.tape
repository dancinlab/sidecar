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

@D g_ship_syncs_install := "ship 은 로컬 install 도 즉시 갱신" :: governance [required d=2026-05-19 active]
  rule  = "version bump + push 와 같은 작업에서 설치본도 갱신; /plugin 대기 금지"
  apply = "marketplace clone pull → cache 재생성 → installed_plugins.json patch (ver·path·sha·ts)"
  scope = "모든 sidecar 플러그인 · wilson-sdlc:ship 8단계"
  note  = "새 버전은 다음 세션부터 로드"
