# Instrument-first — measure over predict — canonical reference

> Long-form sample for the sidecar plugin **`wilson-fire-gate`**.
> Default = **on** when the plugin is installed; turn it off with
> `/wilson-fire-gate off`, `/sidecar off fire-gate`, or
> `SIDECAR_NO_FIRE_GATE=1`.
> This file is the canonical *how-to-apply* reference — `/wilson-fire-gate
> sample` prints it. Companion to `wilson-decision-gate`: that plugin
> gates *any* branch point, this one gates the narrower
> measure-vs-predict fork.

## What a "fire" is

A **fire** = running one real measurement — a benchmark, a profile, a
probe, a kernel timing run — instead of *predicting* its outcome by
reasoning. A fire costs something real: wall-clock, GPU-hours, money, a
slot in a queue. The instrument-first discipline is about spending that
cost **deliberately**, neither dodging a measurement that is genuinely
needed nor burning one on an answer already known.

The headline is **measure over predict**: when you are in genuine
doubt, lean toward measuring rather than trusting a prediction. The
four tenets below say precisely *when* that applies.

## When this principle is in effect

It fires for any **measure-vs-predict fork** — a point where you could
either run a real measurement or settle the question analytically:

- "Will this kernel beat the library?" — fire a benchmark, or resolve
  from a known roofline wall.
- "Did this change regress latency?" — fire a before/after run, or
  resolve from an unchanged hot path.
- "Is approach X faster than Y?" — fire both, or resolve from a prior
  measurement that already ranked them.

It does **not** fire for questions with no measurable answer (design
taste, naming, API ergonomics) — those are `wilson-decision-gate`
territory, not fire-gate.

## The four tenets

1. **Predict first with the most faithful model you have.** Before
   firing, state the predicted outcome out loud, grounded in the best
   evidence available — prior measurements, roofline / bandwidth
   limits, documented hard walls, an earlier KILL. A fire with no
   prior prediction is a fire you cannot learn from.

2. **Fire only when the prediction is genuinely uncertain.** If the
   faithful prediction is confident and well-grounded, a fire is
   optional — it confirms, it does not discover. Reserve fires for the
   forks where the prediction could plausibly be wrong.

3. **Never re-fire a settled result.** If a prior measurement already
   determines the outcome — a measured HARD_WALL, an earlier KILL, a
   roofline ceiling that structurally pre-decides the question —
   resolve analytically ($0). Re-confirming a known result is not
   instrument-first; it is ritual.

4. **cost-no-object ≠ fire-always.** "cost-no-object" means *do not
   block a needed fire on its cost* — if a fork is genuinely uncertain,
   expense is not a reason to skip the measurement. It does **not**
   license firing when the answer is already known. Cost frees
   *necessary* measurement; it never justifies *redundant* measurement.

## The gate

At each measure-vs-predict fork, present a gate — never silently pick:

1. **State the faithful prediction** and how confident it is.
2. **List the options** — at minimum **A: fire (measure)** and
   **B: resolve analytically ($0)**, each with a one-line consequence
   (what the fire would cost; what the analytical resolution rests on).
3. **Recommend one** with **3+ rationale bullets**.
4. **Wait for the user's pick** before acting. Use `AskUserQuestion`
   if available; otherwise stop and ask in plain text.
5. **Record it** — `/wilson-fire-gate decide "<picked>" "<rationale>"`
   appends the block below.

The user may overrule the recommendation — a "measure anyway" pick
against a confident prediction is legitimate and is still recorded.

## Autonomy mode under an active `/goal`

Claude Code's native `/goal` drives Claude turn-to-turn until its
condition is met. A fire-gate that stops to wait stalls that goal at
the first fork. So when a `/goal` is active:

- Apply the four tenets yourself — predict, judge the uncertainty,
  check whether a prior measurement already settles the question.
- Adopt the resulting call (fire when genuinely uncertain, resolve
  when settled) instead of waiting for a pick.
- Record it with `/wilson-fire-gate decide`, note it in one line,
  then continue.

A `/goal` is standing authorization for the cost-bearing fires its
closure genuinely needs — `cost-no-object` in force. It still never
licenses **re-firing a result already settled** (tenet 3): a goal
removes the confirmation pause, not the discipline. Without an active
`/goal`, gate normally and wait for the pick.

## Fire-decision record format

Inside `design.md`, every fire-vs-predict call lands as:

```markdown
### Fire-decision N — <one-line description>
- **picked**: <A: fire | B: resolve analytically | …>
- **rationale**:
  - <bullet 1 — why this beats the alternative>
  - <bullet 2 — the faithful prediction it rests on / the cost accepted>
  - <bullet 3 — what later evidence would falsify this call>
```

Three bullets is the minimum. The ledger sits alongside
`wilson-decision-gate`'s `### Decision N` blocks in the same
`design.md`, numbered independently.

## Counter-example (when NOT to apply)

- No measurable answer — design taste, naming, ergonomics → that is
  `wilson-decision-gate`, not fire-gate.
- The prediction is already a measured certainty — just resolve, no
  gate needed (tenet 3).
- A trivial, near-free probe (a sub-second local check) — just run it;
  a gate for a costless measurement is overhead.

## Relationship to `wilson-prefs` and `wilson-decision-gate`

- **Presentation is inherited** — a fire-gate fork's options +
  recommendation + rationale are rendered in whatever response style
  `wilson-prefs` currently declares (its `## Prefs` block names it);
  when the style is **friendly**, use the full 7-element pattern. The
  user never re-asks for this.
- **`wilson-decision-gate` is the generic gate**, fire-gate is the
  measurement-specialized one. Both can be on at once; a measure-vs-
  predict fork is fire-gate's, every other branch point is
  decision-gate's.

## Activation cheatsheet

```sh
# default: ON once installed (SessionStart + PostCompact inject the
# principle; UserPromptSubmit adds a short reminder only on
# measurement-looking prompts).

/wilson-fire-gate off          # turn the principle injection off
/wilson-fire-gate on           # back on
/sidecar off fire-gate         # runtime toggle via the control plugin
SIDECAR_NO_FIRE_GATE=1         # per-session kill switch (env, always wins)

/wilson-fire-gate decide "<picked>" "<rationale>"   # append a Fire-decision
/wilson-fire-gate log          # show the design.md Fire-decision entries
/wilson-fire-gate path <file>  # point at a different design.md
```
