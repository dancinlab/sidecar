# Design

> Step-by-step decision gate audit trail. One decision per gate, never batched.

---

## Decisions

### Decision 1 — `commons` hook (cross-project common layer)
- **picked**: hooks/commons/ — SessionStart hook emits `commons.tape` as `additionalContext` (no slash command).
- **rationale**:
  - per-project AGENTS.tape covers project-local rules · a cross-project shared layer was missing.
  - SessionStart hook (auto-inject) chosen over /slash command — applies regardless of user invocation; matches g_concept_separation (hooks/ ⊂ auto-behavior).
  - body kept to a single `@D :: governance` entry with `do` / `dont` only — same shape as AGENTS.tape governance, very short.

### Decision 2 — Adopt GitHub Spec Kit (project-level)
- **picked**: install `specify-cli` + run `specify init . --integration claude` · Spec Kit owns `CLAUDE.md` · `.specify/memory/constitution.md` becomes the active substantive SSOT · legacy `AGENTS.tape` stays dormant carry.
- **rationale**:
  - industry-validated 2026 pattern: spec → plan → tasks → implement with explicit file-exclusivity check at the tasks stage — directly addresses the multi-agent same-branch conflict problem.
  - 9 project-scope skills (`speckit-{constitution,specify,clarify,plan,checklist,tasks,analyze,implement,taskstoissues}`) make the pipeline a single-keystroke flow.
  - rolled out to ~71 dancinlab repos in the same session (see batch log) — sidecar is the canonical reference.
  - `gh-stack` skill + waitlist (private preview) covers the stacked-PR side; Spec Kit covers the spec→code side. The two compose.
