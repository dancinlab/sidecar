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

### Decision 5 — `git-guard` plugin (force-push deny only)
- **picked**: `hooks/git-guard/` · PreToolUse(Bash) Python guard · 3 regex patterns (force-push, force-with-lease, refspec-level force `+<ref>`).
- **rationale**:
  - mirrors the existing `~/.claude/settings.json::permissions.deny` `git push -f*` family but makes the rule portable across every sidecar install (settings is a per-user file, not the marketplace).
  - extends the surface — refspec-level force (`git push origin +ref`) wasn't covered by the settings denies; this catches it.
  - scope **narrowed to force-type only**: `--no-verify` family (commit / merge / rebase) intentionally NOT enforced here — left to user discipline so the guard doesn't over-block routine work.
  - opt-out is `SIDECAR_NO_GIT_GUARD=1` (logged in the deny payload — visible, not silent) + the sidecar disable surface (`~/.claude/sidecar/disabled.json`).

### Decision 6 — `sidecar-lint` plugin (auto-lint on `git commit`)
- **picked**: `hooks/sidecar-lint/` · PreToolUse(Bash) Python lint · fires only when `git commit` is the invoked verb AND the cwd's git root carries `.claude-plugin/marketplace.json` (= any Claude Code marketplace plugin pack).
- **rationale**:
  - the governance surface (`commons.tape` cross-project rules + sidecar `project.tape`) names invariants that are easy to violate in a one-line description change — version surface drift (`@D g22`), stale-history footnotes (`@D g15`), hardcoded absolute paths (`@D g13` · `@D s3`), hook script exec bits. A lint at commit time catches them before they ship.
  - **non-blocking** by design — emits `additionalContext` rather than denying. Lint is for hygiene, not for force. Complements `git-guard` (which IS blocking, but only for the truly destructive force-push family).
  - **self-exclusion**: staged-diff checks skip lines under `hooks/sidecar-lint/` and `CHANGELOG.md` so the plugin's own documentation of the patterns + the legitimate history surface don't false-positive.
  - **scope kept tight**: only version drift (not description drift — too noisy across rewrites). Description sync stays a soft norm, not a lint signal.
  - opt-out is `SIDECAR_NO_LINT=1` + the sidecar disable surface (`~/.claude/sidecar/disabled.json`).

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

### Decision 2 — `project.tape` as project SSOT
- **picked**: project identity + governance live in `<root>/project.tape` (`.tape` v1.2 — `@V` spec · `@I` identity (kind/brief/parent/ssot) · `@D` governance (do/dont)). `CLAUDE.md → project.tape` symlink for harness auto-load. `hooks/project-tape/` re-injects the same file on PreCompact + PostCompact (auto-compaction survival).
- **rationale**:
  - one canonical carrier — same `.tape` v1.2 grammar as `commons.tape`; one validator (`tape-lsp`) covers both.
  - portable across any project — `sidecar init` scaffolds `project.tape` + symlink in any working tree.
  - minimal surface — kind/brief + do/dont only; named rules live as separate decisions in `design.md`.
