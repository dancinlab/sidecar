---
description: Switch response style to "easy" — friendly 7-element pattern (icon · name · alias · plain-line · analogy · ASCII · compare). Reads styles/easy.<lang>.md matching the user's response language.
argument-hint: "[language-hint]"
allowed-tools: Read
---

Engage the `easy` skill: detect the user's response language, Read
`${CLAUDE_PLUGIN_ROOT}/styles/easy.<lang>.md` when invoked as a plugin
command, else the latest cached copy at
`$HOME/.claude/plugins/cache/sidecar/easy/<version>/styles/easy.<lang>.md`
(pick the highest version via `ls -1 | sort -V | tail -1`; one of
`en` / `ko` / `ja` / `zh` / `ru`), and apply the 7-element friendly
response pattern for the rest of the session's user-facing prose. For a
layperson audience, also run the style file's jargon→everyday
translation checklist and, where shape matters, reach for one of its 4
ASCII structure templates (before-after · tree · side-by-side ·
structure sketch). See SKILL.md for triggers, scope, and guardrails.

If `$ARGUMENTS` names a language (`en` · `ko` · `ja` · `zh` · `ru`), use
that file; otherwise auto-detect from recent user messages.

On activation, output one short confirmation line and proceed.
