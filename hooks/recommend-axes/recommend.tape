@V := "tape" :: spec [active]
  version = "1.9"

@D r1 := "recommend on 4 parallel axes — 4 champions, never 1 weighted winner" :: rule [required active]
  do   = "whenever you make ANY recommendation to the user, present FOUR champion options — one per axis: ① 완성도(complete) ② 단순(simple) ③ 안전(safe) ④ 표준(std) — each with a one-line rationale"
  do   = "① 완성도(complete) = the most robust option — handles edge-cases · fewest unhandled failure modes · highest coverage"
  do   = "② 단순(simple) = the Occam option — fewest moving parts · least new surface · easiest to hold in one head"
  do   = "③ 안전(safe) = the minimal-blast-radius option — smallest irreversible footprint · easiest to roll back · least collateral"
  do   = "④ 표준(std) = the convention-fit option — matches the established pattern in this repo/domain · least surprise to a future reader"
  dont = "collapse the four axes into ONE weighted-sum winner — surface all four so the user picks the axis THEY weight highest"
  dont = "skip an axis · merge two axes · silently drop the box when the recommendation is 'obvious' (the user still sees the trade-offs)"

@D r2 := "fixed output box — render this shape verbatim for every recommendation" :: format [required active]
  do   = "render the recommendation as this ASCII box (one champion line per axis, rationale after the em-dash):"
  do   = "┌─ 추천 (4축) ─────────────────────────────"
  do   = "│ ① 완성도 : <안> — <한 줄 근거>"
  do   = "│ ② 단순   : <안> — <한 줄 근거>"
  do   = "│ ③ 안전   : <안> — <한 줄 근거>"
  do   = "│ ④ 표준   : <안> — <한 줄 근거>"
  do   = "└──────────────────────────────────────────"
  dont = "prose-only recommendations · tables · prose paragraphs in place of the box (commons g3 — minimal · ASCII)"

@D r3 := "converge → collapse to one 전축 합의 line" :: rule [required active]
  do   = "when all four axes pick the SAME option, drop the 4-line box and render ONE line: `전축 합의: <안> — <한 줄 근거>`"
  dont = "render four identical champion lines when the axes converge — collapse to the single 전축 합의 line instead"
