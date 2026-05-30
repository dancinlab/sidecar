---
description: Author a layperson-friendly `<name>.easy.md` from a technical file or topic — applies the canonical easy contract (7-element pattern · 4 ASCII structure templates · jargon→everyday translation checklist) and writes the sibling document.
argument-hint: "<file-path-or-topic>"
allowed-tools: Read, Write
---

Engage the `easy-doc` skill on `$ARGUMENTS`.

1. **Resolve the input.** If `$ARGUMENTS` is an existing file path, `Read` it.
   Otherwise treat the whole argument as a free-text topic.
2. **Pick the language** of the output document (`en` / `ko` / `ja` / `zh` / `ru`)
   from the source's language, or the user's request language for a topic.
3. **Read the easy reference (source-of-truth — do NOT duplicate it):**
   `${CLAUDE_PLUGIN_ROOT}/../../hooks/easy-auto/styles/easy.<lang>.md` when this
   plugin is checked out, else the cached install copy at
   `$HOME/.claude/plugins/cache/sidecar/easy-auto/<version>/styles/easy.<lang>.md`
   (highest version via `ls -1 | sort -V | tail -1`). This skill **applies** that
   reference; it does not restate it.
4. **Author the sibling document.** Apply the 7-element pattern (icon · name ·
   alias · plain-line · analogy · ASCII · compare) to each non-trivial concept,
   pick one of the 4 ASCII structure templates per section's shape
   (before-after · tree · side-by-side · structure-sketch), and run the
   jargon→everyday translation checklist before writing.
5. **`Write` the output** as the sibling `<dir>/<name>.easy.md` for a file input,
   or `./<slug>.easy.md` (slugified topic) for a topic. Never modify the source
   file; emit only the `.easy.md` markdown.

See `SKILL.md` for the full procedure, triggers, output skeleton, and guardrails,
and `samples/cache.easy.md` for one worked example.

On completion, print the path of the written `.easy.md` and a one-line summary.
