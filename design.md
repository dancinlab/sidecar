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

### Decision 4 — `hexa-lsp` plugin (LSP wiring, minimal scope)
- **picked**: `hooks/hexa-lsp/` with `.claude-plugin/plugin.json` (lspServers ref) + `lsp.json` (one server entry).
- **rationale**:
  - LSP wiring is auto-behavior — kicks in when a `.hexa` file opens. Hooks/ is the closest fit among the three concept dirs (no separate `lsp/` dir added — would have been over-engineering for a single plugin).
  - Minimal scope: only `.hexa` is claimed. Archived `wilson-lsp` also claimed firmware extensions (`.c/.h/.v/.s/...`) under the hexa-first absorption story; that's deferred. Sister-format LSPs (tape/n6/hxc/kosmos) are likewise separate future plugins.
  - Two files, zero scripts. `hexa lsp` is the canonical LSP server (per `hexa --help`).

### Decision 3 — `inbox` skill+command (cross-project handoff, minimal)
- **picked**: `skills/inbox/` with SKILL.md (natural-language trigger) + `commands/inbox.md` (explicit `/inbox list` · `/inbox new <kind> <slug>`) + `bin/inbox.sh` (POSIX shell).
- **rationale**:
  - cross-project handoff (gap/request that belongs in another SSOT repo) is common; archived `wilson-inbox` covered it with 9 verbs — too heavy.
  - 2 verbs (list, new) cover the only operations that aren't trivially plain git/edit. Other lifecycle (apply / archive / pr) goes through plain `gh`.
  - placed under `skills/` so the SKILL.md description auto-triggers on natural language ("file an inbox entry", "this belongs in <repo>'s inbox") — slash invocation optional. Concept-separation rule relaxed for this bundle: a skill MAY ship its own slash command when the command is the literal mechanism the skill orchestrates.
  - template = 5 lines (slug · source · kind · status · body) — minimal, easy to grow.

### Decision 2 — Adopt GitHub Spec Kit (project-level)
- **picked**: install `specify-cli` + run `specify init . --integration claude` · Spec Kit owns `CLAUDE.md` · `.specify/memory/constitution.md` becomes the active substantive SSOT · legacy `AGENTS.tape` stays dormant carry.
- **rationale**:
  - industry-validated 2026 pattern: spec → plan → tasks → implement with explicit file-exclusivity check at the tasks stage — directly addresses the multi-agent same-branch conflict problem.
  - 9 project-scope skills (`speckit-{constitution,specify,clarify,plan,checklist,tasks,analyze,implement,taskstoissues}`) make the pipeline a single-keystroke flow.
  - rolled out to ~71 dancinlab repos in the same session (see batch log) — sidecar is the canonical reference.
  - `gh-stack` skill + waitlist (private preview) covers the stacked-PR side; Spec Kit covers the spec→code side. The two compose.
