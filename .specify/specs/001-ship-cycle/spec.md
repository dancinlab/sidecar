# Feature Specification: ship = commit + push + install

**Feature Branch**: `001-ship-cycle`
**Created**: 2026-05-21
**Status**: Draft
**Input**: User description: "ship = commit + push + install — formalize as the single atomic cycle for sidecar plugin updates."

## User Scenarios & Testing

### User Story 1 — Author ships a sidecar plugin update (Priority: P1)

The author edits a sidecar plugin (e.g. `hooks/commons/commons.tape`), bumps the plugin version (and the marketplace.json entry), and runs the **ship cycle**. The cycle must atomically (a) record the change in source control, (b) make it reachable from `origin/main`, and (c) refresh the local Claude Code install so the new version is loaded on the next SessionStart — with no manual `/plugin` reload step.

**Why this priority**: Every plugin update in this repo goes through this cycle. Skipping any step breaks the "source HEAD ≡ local install" invariant the project depends on.

**Independent Test**: Bump `hooks/commons/.claude-plugin/plugin.json` version + the matching entry in `.claude-plugin/marketplace.json`. Run the ship cycle. Verify:
  - `git status` is clean.
  - `origin/main` carries the new commit.
  - `~/.claude/plugins/cache/sidecar/commons/<new-version>/` exists with the expected files.
  - `~/.claude/plugins/installed_plugins.json` points `commons@sidecar` at the new version + new SHA + new timestamp.

**Acceptance Scenarios**:

1. **Given** a working-tree change + a matching version bump in `plugin.json` and `marketplace.json`, **When** the author runs the ship cycle, **Then** the commit lands on `origin/main`, the cache version directory is created, and `installed_plugins.json` is updated to the new version.
2. **Given** the same change without a version bump, **When** ship runs, **Then** the cycle still commits + pushes; install sync becomes a no-op (no new cache dir needed) but `installed_plugins.json` SHA is refreshed.
3. **Given** a credential pattern (`rpa_…` / `sk-…` / `hf_…` / `AKIA…`) in the staged diff, **When** ship runs the pre-commit credential scan, **Then** the cycle aborts before the commit is created and the secret is not pushed.

### User Story 2 — Author ships a new plugin (Priority: P2)

A new plugin is created under `hooks/`, `commands/`, or `skills/`. The ship cycle must additionally create the `marketplace.json` entry, create the initial cache directory, and add the `installed_plugins.json` entry on first ship.

**Why this priority**: Less frequent than P1, but the ship cycle must cover it without manual steps.

**Independent Test**: Drop a new plugin folder + add its `marketplace.json` entry. Run ship. Verify the local install reflects the new plugin.

**Acceptance Scenarios**:

1. **Given** a new plugin folder + new `marketplace.json` entry, **When** ship runs, **Then** the commit lands, the cache directory is created at the entry's version, and `installed_plugins.json` gets a new entry.

## Requirements

### Functional Requirements

- **FR-001**: ship MUST run as a single command (or single composed shell pipeline) — no per-step prompts.
- **FR-002**: ship MUST stage only the explicitly-named paths (no `git add -A`).
- **FR-003**: ship MUST run a credential scan (`rpa_|sk-[A-Za-z0-9]{20}|hf_[A-Za-z0-9]{30}|AKIA`) on the staged diff before the commit is created. Any match aborts with a clear error.
- **FR-004**: ship MUST `git push origin main` after the commit.
- **FR-005**: ship MUST `git pull --rebase` the marketplace clone at `~/.claude/plugins/marketplaces/sidecar/` to receive the new commit.
- **FR-006**: ship MUST copy the new version directory from the marketplace clone into `~/.claude/plugins/cache/sidecar/<plugin>/<version>/`.
- **FR-007**: ship MUST patch `~/.claude/plugins/installed_plugins.json` with the new `installPath`, `version`, `lastUpdated` (ISO timestamp), and `gitCommitSha` for the affected plugin.
- **FR-008**: ship MUST emit a single-line summary of the form `→ <plugin> <version> <sha7>` for traceability.

### Non-functional Requirements

- **NFR-001**: ship completes in under 10 seconds for a single-file change on a routine connection.
- **NFR-002**: ship does not depend on `/plugin` reload, marketplace UI, or any interactive prompt.
- **NFR-003**: ship is idempotent — re-running on a clean tree is a no-op (nothing to commit) and exits cleanly.

## Boundaries

### In scope

- Single-plugin and multi-plugin ships (e.g. several plugin folders in one commit).
- First-time install of a new plugin entry in the same ship cycle.
- Re-running ship after a partial failure (e.g. push failed) — the cycle resumes from the appropriate step.

### Out of scope

- Rollbacks (a separate verb).
- Cross-repo ships (e.g. sidecar + pool + hexa-lang) — each repo has its own ship cycle.
- Test execution (separate gate; ship assumes tests have been run upstream).
- Public marketplace publication beyond `dancinlab/sidecar` — covered by the existing `marketplace.json` distribution.

## Open Questions

1. Should ship reject if the staged version in `plugin.json` does not match the corresponding `marketplace.json` entry? (Currently relies on the author to keep them in sync.)
2. Should ship verify the cache copy with `git rev-parse` of the marketplace clone matches the just-pushed sha?
3. Should ship be exposed as a `pool init`-style single CLI verb (e.g. `sidecar-ship <plugin>`) or stay as an inline shell pipeline?
