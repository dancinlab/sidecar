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

## Opt out

```bash
SIDECAR_NO_GIT_GUARD=1 git push --force origin my-branch     # logged in the deny payload
```

Or disable per project via the sidecar control surface:

```bash
echo '{"disabled":["git-guard"]}' > ~/.claude/sidecar/disabled.json
```
