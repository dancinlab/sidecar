---
name: easy
description: |
  Easy (friendly) response style. Invoke when the user signals they want a
  friendlier, more approachable explanation in user-facing prose — e.g.
  "친근하게", "쉽게 설명해줘", "이지 모드", "easy", "easy mode",
  "make it friendlier", "explain it simply", "more approachable",
  "もっと分かりやすく", "フレンドリーに", "イージーモード",
  "友好一点", "简单点说", "Easy 模式",
  "попроще", "по-дружелюбнее", "Easy mode".
  When triggered, the skill reads `styles/easy.<lang>.md` matching the
  user's response language and follows its 7-element pattern (icon · name
  · alias · plain-line · analogy · ASCII diagram · compare) for the rest
  of the session's user-facing prose. Code blocks, identifiers, math
  symbols, file paths, CI JSON output, and commit titles are out of scope.
allowed-tools: Read
---

# easy — friendly response style switch

## When to use

The user signals — by natural language or by typing `/easy` — that they
want a friendlier, more approachable response style for the rest of the
conversation. Common triggers (non-exhaustive):

- Korean: `친근하게`, `쉽게 설명해줘`, `이지 모드`, `편하게 설명`
- English: `easy`, `easy mode`, `make it friendlier`, `friendly mode`, `explain it simply`, `more approachable`
- Japanese: `もっと分かりやすく`, `フレンドリーに`, `イージーモード`
- Chinese: `友好一点`, `简单点说`, `Easy 模式`
- Russian: `попроще`, `по-дружелюбнее`, `Easy mode`

Apply the style for the rest of the session unless the user explicitly
asks to switch back (e.g. `terse mode`, `concise please`, `정확하게만`).

## How to apply

1. **Detect the response language.** Match the user's prevailing message
   language to one of the five samples. Defaults to the user's most
   recent prose language, not the codebase's language.

   | language | file |
   |---|---|
   | English | `styles/easy.md` |
   | Korean  | `styles/easy.ko.md` |
   | Japanese | `styles/easy.ja.md` |
   | Chinese | `styles/easy.zh.md` |
   | Russian | `styles/easy.ru.md` |

2. **Read the matching style file.** Use the Read tool against
   `${CLAUDE_PLUGIN_ROOT}/styles/easy.<lang>.md`. The file is the
   canonical reference for tone, structure, and measurement axes.

3. **Apply the 7-element pattern** to every non-trivial concept
   explanation for the rest of the session:

   1. **icon** — one topic-anchoring emoji
   2. **name** — the canonical identifier (e.g. `HEXA-WEAVE`)
   3. **alias** — a short friendly name in the user's language
   4. **does** — one plain-language line
   5. **analogy** — an everyday-object comparison
   6. **ASCII diagram** — a fenced visual sketch
   7. **comparison** — how it differs from the nearest existing tool

4. **Honor the scope.** The style applies to user-facing narrative prose:
   chat replies, CLI stdout that carries a story, docs/README cold
   entries, error-message trailers, commit-message bodies. It does NOT
   apply to code identifiers, math symbols, API names, DOI / SHA / file
   paths, CI machine-pipe JSON, or commit titles (titles stay terse).

5. **Confirm tersely.** On activation, output one short line confirming
   the switch (e.g. `이지 모드 ON — styles/easy.ko.md 따름`), then
   proceed with the next substantive response in the new style.

## Measurement axes

(from the language sample — applied to user-facing prose only)

- `jargon-ratio` ≤ 0.30
- `analogy-presence-rate` ≥ 0.80 on non-trivial topics
- `acronym-first-use-expansion` ≥ 0.80
- 5-count emoji (🛸 TRANSCEND · 🎉 BREAKTHROUGH · ⭐️ WIN) only on
  tier-classified major events; routine = single ✅ / 🎯 / 📌
- `ascii-diagram-presence-rate` ≥ 0.50

## Guardrails

- **Don't retro-rewrite past turns.** Style switch applies forward from
  activation; past responses stay as they were.
- **Don't apply to code blocks.** Identifiers, math, JSON, paths stay
  exact.
- **Don't stack with hostile-tone overrides.** If the user has previously
  asked for terse / concise / blunt, ask once before flipping to easy.
- **One activation per session.** Don't re-read the style file on every
  turn — once is enough; the pattern stays in context for the session.
