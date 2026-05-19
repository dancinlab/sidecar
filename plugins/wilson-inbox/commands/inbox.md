---
description: wilson-inbox — cross-project handoff inbox. File a gap/request that affects another SSOT repo as a structured inbox/<kind>/<slug>.md entry instead of working around it downstream. add <kind> <slug> scaffolds from a template (kind: notes/patches/poc/rfc_drafts); list/show/path inspect entries; verify checks structure (and detects heavy-mode PATCHES.yaml); apply/archive transition heavy-mode status; rm deletes; pr opens an upstream PR for a scaffolded entry (idempotent — checkout/create inbox/<kind>/<slug> branch, commit + push, `gh pr create` with the file's first H1 as the title and body). Target repo: --to <name> (~/core/<name>) or the nearest .git from the cwd.
argument-hint: "[add <kind> <slug> [--to <repo>] | list [<kind>] [--to <repo>] | show <slug> [--to <repo>] | path <slug> [--to <repo>] | verify [--to <repo>] | apply <slug> [--status <new>] [--to <repo>] | archive <slug> [--to <repo>] | rm <slug> [--to <repo>] | pr <slug> [--to <repo>]]"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/inbox.sh" cmd $ARGUMENTS`
