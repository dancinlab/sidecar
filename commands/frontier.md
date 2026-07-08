---
description: /frontier [show|set|go|swap|clear|inject] — the single north-star objective (최전선) on a dedicated 'frontier' git ref. 지정=set · 진행=go · 교체=swap · 해제=clear (한글 별칭 허용). Triggers — "프런티어", "프론티어", "최전선", "북극성 목표", "지정해줘", "진행해줘", "교체", "해제", "/frontier".
argument-hint: "[show|set <목표>|go [노트]|swap <새목표>|clear|inject]"
allowed-tools: Bash
---

The single **north-star objective** (최전선) the session/repo is pushing — ONE at a time (single-slot, unlike `/ing`'s multi-item board). Stored on a dedicated `frontier` git ref (branch-switch-proof · committed · shared).

- `set <목표>` (지정) — designate the frontier; refuses to clobber an existing one (use `swap`).
- `go [노트]` (진행) — surface a "push THIS now" directive; an optional note appends a progress note.
- `swap <새목표>` (교체) — retire the current frontier (→ CHANGELOG) + designate a new one.
- `clear` (해제) — release the frontier.
- `show` — current frontier + progress notes.

Free text with shell-special chars (괄호·따옴표·$·→): `printf '%s' "<목표>" | sidecar frontier set --stdin`.

!`command -v sidecar >/dev/null 2>&1 && sidecar frontier $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
