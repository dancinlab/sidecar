# Step-by-step decision gate — canonical reference

> Long-form sample for the sidecar plugin **`wilson-decision-gate`** (a standalone port of wilson's `step-by-step-decision-gate` governance principle).
> Default = **on** when the plugin is installed; turn it off with `/wilson-decision-gate off`, `/sidecar off decision-gate`, or `SIDECAR_NO_DECISION_GATE=1`.
> This file is the canonical *how-to-apply* reference — read it once, use it as the template when starting a multi-decision task. `/wilson-decision-gate sample [en|ko|ja|zh|ru]` prints it.

## When this principle is in effect

The principle fires for **multi-decision work** — any task with N branch points the user must pick. Examples:

- A new spec landing (decision = name, falsifier set, enforcement layer, audit format, …)
- A non-trivial refactor with scope choices (which files in / out, abstraction shape, migration order, deprecation window, …)
- An API design (verb names, param shapes, error model, versioning policy, …)
- A migration plan (step ordering, rollback gates, intermediate state shape, …)
- Any Plan-mode work that surfaces ≥ 2 viable approaches

It does **not** fire for one-shot tasks (single-bug fix, terse Q&A, mechanical edits) — there's no batching to defeat there.

## What "one decision = one user gate" means

For each branch point, the agent **must**:

1. **Present the branch point separately** — never bundle two decisions into one yes/no.
2. **List the options** (≥ 2) with one-line description each.
3. **Recommend one** (`### 🎯 추천:` or equivalent header) with **3+ bullet rationale** under "**근거**:" / "**Why**:".
4. **Wait for the user pick** before moving to the next decision. Use `AskUserQuestion` if available; otherwise stop and ask in plain text.
5. **Record the pick + rationale** in a `design.md` (or session log) as you go — `/wilson-decision-gate decide "<picked>" "<rationale>"` appends it in the format below.

The audit trail (`design.md` decision section + spec / PR cross-link, when applicable) is **part of the deliverable**, not an afterthought.

## Why no batching

Batching collapses N picks into one yes/no. Specifically:

- Most picks go undeliberated — the user reads the headlines, says "yes to all", and the loaded picks get rubber-stamped.
- Hindsight blame is unavoidable — when one of the bundled picks turns out wrong, "you said yes" is a brittle audit anchor.
- The gate ceases to be a gate — it becomes a confirmation theatre. The whole point of step-by-step is to slow each branch point down to its own decision.

This is why the protocol this principle generalises defines a hard rule: **more than one decision picked per gate → block**.

## Decision-record format

Inside the design.md / session log, every decision lands as:

```markdown
### Decision N — <one-line description>
- **picked**: ⭐ <option label> (or 🥇 / ✅ / ❌ when ranking multiple)
- **rationale**:
  - <bullet 1 — why this beats the alternatives>
  - <bullet 2 — what trade-off is being accepted>
  - <bullet 3 — what would falsify this pick later>
```

Three bullets is the minimum. More is fine for load-bearing decisions. Less = the rationale was thin enough that a future reader (you, in 3 weeks) won't be able to reconstruct what the trade-off was.

## Cross-links

- The spec / PR that the decisions belong to should carry a `decision_audit_ref: <path-to-design.md>` line (cross-link both directions — spec → design.md, design.md head → spec/PR).
- If you keep a session log, the decision-record format above slots inside it as a section.

## Worked example

Treat any real multi-decision spec/design session as the worked example: each branch point gets its own gate, a `picked` line, and a 3-bullet rationale, all cross-linked back to the spec / PR through a single `decision_audit_ref`. Read one such design.md once to internalise the pattern, then reuse this template.

## Counter-example (when NOT to apply)

- One-shot bug fix with a clear root cause — no decision to gate.
- Mechanical refactor (rename, formatting, lint fix) — no branch points.
- Q&A / explanation / status reports — no deliverable.
- Emergency hotfix where speed > deliberation (use the `/wilson-decision-gate off` / `SIDECAR_NO_DECISION_GATE=1` kill-switch for the duration of the session, and log the reason).

## Independence from the "friendly preset"

The protocol this generalises bundles two things:

1. **Friendly preset** (7-element pattern, recommendation format, emoji enum, etc.) — that is *how you write*, and lives separately in the sidecar `wilson-prefs` plugin as a response style.
2. **Step-by-step user-confirmation gate** — *this* principle, *how you decide*.

They split along their natural axes: friendly preset is how you write, step-by-step is how you decide. Either can be on while the other is off.

## Activation cheatsheet

```sh
# default: the plugin is ON once installed (SessionStart injects the
# principle; UserPromptSubmit adds a short reminder only on
# branch-point-looking prompts — not every prompt).

/wilson-decision-gate off          # turn the principle injection off
/wilson-decision-gate on           # back on
/sidecar off decision-gate         # runtime toggle via the control plugin
SIDECAR_NO_DECISION_GATE=1         # per-session kill switch (env, always wins)

/wilson-decision-gate decide "<picked>" "<rationale>"   # append a Decision
/wilson-decision-gate log          # show the design.md decision section
/wilson-decision-gate path <file>  # point at a different design.md
```
