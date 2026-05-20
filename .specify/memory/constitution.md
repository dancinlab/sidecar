# Sidecar Constitution

## Core Principles

### I. Concept Separation
1 plugin = exactly 1 of `{hook, command, skill}`. Each plugin lives under the matching top-level directory (`hooks/<name>/`, `commands/<name>/`, `skills/<name>/`). No mixing — a plugin never combines a PreToolUse hook with a slash command in the same package.

### II. Ship = Commit + Push + Install
A ship cycle is one atomic operation in three steps: (1) commit, (2) push to `origin/main`, (3) sync the local install (`marketplace pull` → cache copy to `~/.claude/plugins/cache/sidecar/<name>/<version>/` → patch `installed_plugins.json` with `ver/path/sha/ts`). Source on the remote and the version on disk never lag each other.

### III. Evidence Before Ship
Every new plugin lands with: a `design.md` decision entry (one decision per gate, never batched), a fire-rate or behavioral measurement when applicable, at least one smoke/test, and a README. No measurement = no ship. Functional duplication with an existing plugin = block.

### IV. Minimal Write & Implementation
Code, docs, and configs are written in the smallest form that captures intent. No speculative features, no premature abstraction, no decorative prose. Per-`@D :: governance` entry in any `.tape` file uses only `do` / `dont` body keys — never `rule` / `why` / `apply` / `cross_link` / etc.

### V. Stacked Small PRs
A change >200 lines or covering >1 logical concern is broken into a chain of stacked PRs, each <200 lines and each `--base` the previous layer's branch. Long-lived feature branches and large multi-purpose PRs are blocked.

### VI. AI-Native Authoring
Structured / machine-readable artifacts over prose. English for all artifacts (code, docs, config). The agent responds to the user in Korean while keeping every committed artifact in English.

### VII. Spec-Driven Development
Work flows through the Spec Kit pipeline: `constitution → specify → (clarify) → plan → (checklist) → tasks → (analyze) → implement`. The pipeline's atomic-task / file-exclusivity check is the prerequisite for parallel agent dispatch.

## Repository Layout

```
sidecar/
├── hooks/            # PreToolUse · SessionStart auto-behavior plugins
├── commands/         # /slash-command invoked plugins
├── skills/           # Skill tool invocable plugins
├── .claude/skills/   # Spec Kit project-scope skills (tracked)
├── .specify/         # Spec Kit pipeline artifacts (this constitution lives here)
├── .claude-plugin/marketplace.json   # plugin registry
└── archive/          # offline reference only · not distributed
```

## Development Workflow

1. **Decision**: every new direction lands in `design.md` as `### Decision N — <picked>` with 2+ rationale bullets before the next decision opens.
2. **Spec**: feature work begins with `/speckit-specify "<intent>"`. The resulting `.specify/specs/<NNN-feature>/spec.md` is the contract.
3. **Plan + Tasks**: `/speckit-plan` and `/speckit-tasks` produce the implementation plan and the file-exclusivity-checked atomic task list.
4. **Implement**: `/speckit-implement` executes tasks. Parallel agents dispatch only on disjoint file sets.
5. **Ship**: per Principle II — commit, push, sync local install.

## Governance

- This constitution supersedes prior `AGENTS.tape` governance for sidecar (legacy `AGENTS.tape` is kept dormant for reference).
- Amendments land via a new `design.md` decision entry and a single PR.
- The `commons` hook (`hooks/commons/commons.tape`) carries the cross-project layer that sits above any project constitution — when a project rule conflicts with `commons`, `commons` wins unless the project decision explicitly overrides it.
- Complexity must be justified in the corresponding `design.md` entry. Default = simpler.

**Version**: 1.0.0 | **Ratified**: 2026-05-21 | **Last Amended**: 2026-05-21
