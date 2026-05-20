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

## Autonomy mode under an active `/goal`

Claude Code's native `/goal` keeps Claude working turn-to-turn until a completion condition is met. A gate that stops to wait for a pick **stalls that goal** — the goal is set, but the first branch point freezes it. So when a `/goal` is active the gate changes shape:

- Still present the options + recommendation + 3-bullet rationale.
- Then **adopt your own recommendation** rather than waiting.
- Record it with `/wilson-decision-gate decide` — the ledger entry is the audit trail, and it matters *more* here, not less, since the user did not pick in real time.
- Note the auto-pick in one line of your reply, and continue.

The `/goal` itself is the standing authorization: the user asked for autonomous progress toward the condition, so per-branch-point confirmation would contradict the instruction they just gave.

This removes only the **deliberation pause**, never the **safety floor** — PreToolUse guards (destructive Bash, secrets, force-push, protected paths) still fire, and a genuinely irreversible or truly-ambiguous call still warrants a real stop even mid-goal.

A **transient, recoverable failure** mid-goal — a network-failed `git push`, a rate-limit, a flaky remote — is likewise not a hard stop. The work is already committed and safe locally; note the failure as pending, retry it when conditions recover, and keep going toward the goal. Halting an autonomous goal on a failure that will clear on its own defeats the point of the goal.

With no `/goal` active, gate normally: present, then wait for the pick.

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

## Relationship to the `wilson-prefs` response style

The protocol this generalises bundles two things along their natural axes:

1. **Response style** (e.g. the friendly 7-element pattern, recommendation format, emoji enum) — *how you write*. This lives separately in the sidecar `wilson-prefs` plugin as a response style.
2. **Step-by-step user-confirmation gate** — *this* principle, *how you decide*.

**Scope is independent** (either can be on while the other is off), **but presentation is inherited — automatically**:

- A gate's options + recommendation + rationale are **rendered in whatever response style `wilson-prefs` currently declares** — the agent reads the active style from the injected `## Prefs` block (`Active response style: **<name>**`) and applies it **without the user ever re-asking**. Having to manually say "present the gate in the friendly version" when `wilson-prefs` already declared `style=friendly` is a **bug**, not the intended workflow.
- When the active style is **friendly**, each option and the recommendation use the **full friendly 7-element pattern** (emoji icon · alias · plain one-liner · everyday analogy · fenced ASCII diagram · comparison-to-nearest-tool) — *not* a bare terse table.
- When `wilson-prefs` is **absent / unset / disabled**, the gate falls back to the host's default presentation. There is no hard runtime coupling — the gate works standalone; it just can't inherit a style that was never set.

In short: *whether* you gate is this principle; *how the gate reads* is inherited from the active prefs style, with no manual reminder required.

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
