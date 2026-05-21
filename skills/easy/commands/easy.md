---
description: Switch response style to "easy" — friendly 7-element pattern (icon · name · alias · plain-line · analogy · ASCII · compare). Reads styles/easy.<lang>.md matching the user's response language.
argument-hint: "[language-hint]"
allowed-tools: Read
---

Engage the `easy` skill: detect the user's response language, Read
`${CLAUDE_PLUGIN_ROOT}/styles/easy.<lang>.md` (one of `en` / `ko` / `ja`
/ `zh` / `ru`), and apply the 7-element friendly response pattern for
the rest of the session's user-facing prose. See SKILL.md for triggers,
scope, and guardrails.

If `$ARGUMENTS` names a language (`en` · `ko` · `ja` · `zh` · `ru`), use
that file; otherwise auto-detect from recent user messages.

On activation, output one short confirmation line and proceed.
