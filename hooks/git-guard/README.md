# git-guard

PreToolUse(Bash) guard that denies force-type git push operations.

## Patterns blocked

| pattern | example |
|---|---|
| `git push --force` / `-f` | `git push --force origin main` |
| `git push --force-with-lease` | `git push --force-with-lease origin main` |
| refspec-level force (`+<ref>`) | `git push origin +feat:main` |

## Why

Each blocked pattern rewrites history on a shared remote — almost always the wrong remedy. The right path is to resolve the conflict at the source, not overwrite. Hook-bypass (`--no-verify`) is intentionally NOT blocked here; it's a developer-local discipline call rather than something to enforce mechanically.

## No opt-out

There is none — no env var, no config file, no exception list. A guard you can switch off is a guard you will switch off. If a force-push is genuinely required, run it outside Claude Code; if `git-guard` is wrong for your workflow, uninstall the plugin rather than routing around it.
