#!/usr/bin/env tape
# AGENTS.tape for `dancinlab/sidecar` — agent-harness + governance.
# sidecar = a Claude Code plugin pack with strict concept separation.
# hooks/ = auto-behavior (PreToolUse·SessionStart), commands/ = /slash
# command invoked, skills/ = Skill tool invocable. 1 plugin = 1 concept;
# no mixing. CLAUDE.md is a symlink to this file so Claude Code reads
# it as the project instructions.

@V := "tape" :: spec [active]
  version = "1.2"

# ─── §1 Identity ─────────────────────────────────────────────────────

@I id001 := "sidecar" :: identity-claim [d=2026-05-21 active]
  kind = "Claude Code plugin pack — strict concept-separated guardrails + skills"
  brief = "hooks/ + commands/ + skills/ · 1 plugin = 1 concept"
  parent = "dancinlab"
  ssot = "~/core/sidecar/ · ships via .claude-plugin/marketplace.json"

# ─── §2 Governance ───────────────────────────────────────────────────

@D g_concept_separation := "1 plugin = 1 concept (hook / command / skill)" :: governance [required d=2026-05-21 active]
  do   = "신규 plugin = hooks/<name>/ 또는 commands/<name>/ 또는 skills/<name>/ 중 정확히 1 곳 · marketplace.json source path = `./hooks/<name>` / `./commands/<name>` / `./skills/<name>`"
  dont = "한 plugin 안에 hook + command 또는 hook + skill 혼합 · plugins/ root 디렉토리 신규"
  @> CLAUDE.md

@D g_ship := "ship = commit + push + install" :: governance [required d=2026-05-21 active]
  do   = "commit · push origin · marketplace pull · cache copy to /<version>/ · installed_plugins.json patch (ver·path·sha·ts) — 한 cycle"
  dont = "push 만 하고 install 누락 · /plugin 재로딩 대기 · 3 단계 분리 실행"
  @> CLAUDE.md

@D g_evidence_before_ship := "신규 plugin 은 evidence + measurement 동반" :: governance [required d=2026-05-21 active]
  do   = "신규 hook/command/skill 추가 시 design.md Decision N + fire-rate 측정 (가능한 경우) + 1 test/smoke + README 동반"
  dont = "측정 없이 ship · 기능 중복 plugin (기존 hook 의 sub-feature 가 별개 plugin 으로) · design.md decision log 누락"
  @> CLAUDE.md
