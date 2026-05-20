# git-guard

PreToolUse(Bash) guard that denies force / hook-bypass git operations.

## Patterns blocked

| pattern | example |
|---|---|
| `git push --force` / `-f` | `git push --force origin main` |
| `git push --force-with-lease` | `git push --force-with-lease origin main` |
| refspec-level force (`+<ref>`) | `git push origin +feat:main` |
| `git commit --no-verify` | `git commit --no-verify -m x` |
| `git merge --no-verify` | `git merge --no-verify x` |
| `git rebase --no-verify` | `git rebase --no-verify x` |

## Why

Every blocked pattern either rewrites history on a shared remote or skips a configured safety hook. Both are foot-guns that almost always indicate the wrong remedy was chosen. The right path is to fix the underlying issue (resolve the conflict / debug the failing hook), not silence it.

## Opt out

```bash
SIDECAR_NO_GIT_GUARD=1 git push --force origin my-branch     # logged in the deny payload
```

Or disable per project via the sidecar control surface:

```bash
echo '{"disabled":["git-guard"]}' > ~/.claude/sidecar/disabled.json
```
