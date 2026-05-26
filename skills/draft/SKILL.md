---
name: draft
description: Ephemeral scratchpad scaffolder — /draft <slug> creates `drafts/<slug>.md` for temporary working notes (designed to be discarded). The `drafts/` dir is gitignored so files never commit by accident. Verbs — bare = list current drafts · `<slug>` = scaffold a new draft · `list` = enumerate · `clean` = list rm candidates (no auto-rm; user runs `rm`). Distinct from `/inbox` (which scaffolds into a typed taxonomy intended for eventual upgrade). Triggers — "/draft", "드래프트", "draft 만들어", "임시 메모", "scratchpad", "정리 노트", "나중에 폐기".
allowed-tools: Bash
---

@D draft := "ephemeral scratchpad — drafts/ is gitignored, designed to be discarded" :: skill
  do   = "`/draft <slug>` scaffolds drafts/<slug>.md for temporary notes · `list`/`clean` for housekeeping · drafts/ in .gitignore"
  dont = "wing a custom DRAFT.md at repo root (litter risk · forgotten in commits) when /draft has one gitignored dir"
