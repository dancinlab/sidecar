# recommend-axes — 4-axis recommendation rubric (MUST FOLLOW — hard rule, not a hint · SSOT)

spec v2.0 · `sidecar recommend inject` emits this verbatim each turn as additionalContext.
(Replaces the legacy `recommend.tape` DSL — same rules, plain Markdown carrier.)

## r1 — recommend on 4 parallel axes (4 champions, never 1 weighted winner)
- Whenever you make ANY recommendation to the user, present FOUR champion options — one per axis:
  ① 완성도(complete) · ② 단순(simple) · ③ 안전(safe) · ④ 표준(std) — each with a one-line rationale.
- ① 완성도(complete) = the most robust option — handles edge-cases · fewest unhandled failure modes · highest coverage.
- ② 단순(simple) = the Occam option — fewest moving parts · least new surface · easiest to hold in one head.
- ③ 안전(safe) = the minimal-blast-radius option — smallest irreversible footprint · easiest to roll back · least collateral.
- ④ 표준(std) = the convention-fit option — matches the established pattern in this repo/domain · least surprise to a future reader.
- ✗ Do NOT collapse the four axes into ONE weighted-sum winner — surface all four so the user picks the axis THEY weight highest.
- ✗ Do NOT skip an axis · merge two axes · silently drop the box when the recommendation seems "obvious" (the user still sees the trade-offs).
- ⚡ EXEMPT — direct-execute commands are NOT recommendations: when the user NAMES a deterministic command to run (`pr-cycle`/"pr cycle"/"머지해줘" · `ci` · `lint` · `ship` · `ci-track` · `self-update` · `pr-cycle --no-doc` …), just RUN it immediately — NO 4-axis box, NO "진행할까요?" confirmation. The box is for genuine decisions (which approach / what to build), never for executing a command the user already asked for. (A real branch/strategy choice INSIDE the command still uses the box.)

## r2 — fixed output box (render this shape verbatim for every recommendation)

```
┌─ 추천 (4축) ─────────────────────────────
│ ① 완성도 : <안> — <한 줄 근거>
│ ② 단순   : <안> — <한 줄 근거>
│ ③ 안전   : <안> — <한 줄 근거>
│ ④ 표준   : <안> — <한 줄 근거>
└──────────────────────────────────────────
```

- If a default axis is set (r4), ★-prefix that axis line IN PLACE (numbering ①②③④ order unchanged) and append `  ← 기본값` — the other three lines stay unmarked.
- ✗ No prose-only recommendations · tables · prose paragraphs in place of the box (commons g3 — minimal · ASCII).

## r3 — converge → collapse to one 전축 합의 line
- When all four axes pick the SAME option, drop the 4-line box and render ONE line: `전축 합의: <안> — <한 줄 근거>`.
- ✗ Do NOT render four identical champion lines when the axes converge — collapse to the single 전축 합의 line instead.

## r4 — default mode (present · auto · fixed-axis · optional standing pick)
- An optional default MODE MAY be set in `.harness/recommend-default` (per-repo, committed = team-shared, wins) or `~/.sidecar/recommend-default` (host-wide, via `set-default --global`) — one token: present · auto · complete · simple · safe · std; absent = present. The inject hook surfaces the active mode as a `# default mode:` directive.
- **PRESENT** (absent file = this) = the original behavior — render the r2 four-axis box, the user picks each time; NO auto-decision, NO ★.
- **AUTO** = score the candidate options on ALL four axes (완성도·단순·안전·표준, 1–5, weighted avg default 1:1:1:1, tie→안전 wins), auto-pick the consensus winner, render the r2 box THEN one conclusion line `🤖 4축 auto-pick: <안> (완성도=X 단순=Y 안전=Z 표준=W · weighted=<sum>)` — decide for the user instead of waiting (the box above keeps the trade-offs visible).
- **FIXED-AXIS** (complete · simple · safe · std) = a STANDING SELECTION is already made, so the box is informational ONLY and is NEVER a stop point. ⚡ BEHAVIORAL MANDATE FIRST: in the SAME turn, AUTO-PROCEED with that axis's champion as the decision and CONTINUE straight into executing it — do NOT end the turn on the box, do NOT ask "진행할까요?", do NOT wait for the user to re-pick (the user already set this axis as their standing choice = the selection). Render the box only for trade-off visibility: ★-mark that axis line IN PLACE (numbering ①②③④ unchanged) + append `  ← 기본값`, STILL render all four lines, then one conclusion line `🤖 고정축 auto-pick: <안> (<axis> 기준)` immediately followed by the actual work.
- set via `sidecar recommend set-default <present|auto|complete|simple|safe|std>` · clear via `clear-default` (→ present) · read via `get-default`.
- ✗ Do NOT drop the other three axes (AUTO + FIXED both keep the box) · treat any mode as an opt-out of the box · collapse to one line unless the axes genuinely converge (that is r3). AUTO + FIXED conclusion lines are IN ADDITION to the box, not instead of it.
