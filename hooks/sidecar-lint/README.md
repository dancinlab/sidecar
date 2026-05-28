# sidecar-lint

PreToolUse(Bash) auto-lint that fires on `git commit` inside any Claude Code marketplace plugin pack (any repo with `.claude-plugin/marketplace.json`). Non-blocking — emits findings as `additionalContext`.

## Checks

| check | governance |
|---|---|
| stale-history patterns in staged diff added lines | commons `@D g15` (current-state docs · history → CHANGELOG / git log) |
| hardcoded `/Users/<u>/` or `/home/<u>/` in staged diff added lines | commons `@D g13` · sidecar `@D s3` (portable plugin scripts) |
| marketplace.json plugin entry vs each plugin's `plugin.json` — version drift only | commons `@D g22` (lockstep version surfaces) |
| `hooks/*/bin/*.sh` missing user-exec bit | hook fires die with Permission denied otherwise |
| unexpected top-level dir — ALLOWLIST (`hooks`·`commands`·`skills`·`agents`·`bin`·`.github`·`.claude-plugin`), tracked only | project.tape `@D s16` (co-locate by owner/domain; rename-proof — `docs`→`documentation` still flags; advisory directs moving contents under the owning domain/plugin) |

Description drift between `marketplace.json` and `plugin.json` is intentionally NOT checked — descriptions get rewritten often enough that drift-checking them adds noise without catching a real bug class.

Lines under `hooks/sidecar-lint/` and `CHANGELOG.md` are skipped in the staged-diff checks. `hooks/sidecar-lint/` because the plugin's own documentation of the patterns would trip itself; `CHANGELOG.md` because it IS the legitimate history surface per commons `@D g15` and is allowed to use historical language.

## No opt-out

There is none — no env var, no config file, no exception list. A guard you can switch off is a guard you will switch off. The findings are non-blocking already; if `sidecar-lint` is wrong for your workflow, uninstall the plugin rather than routing around it.
