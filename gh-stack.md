# gh-stack reference

Personal note — stacked PR workflow with GitHub's `gh stack` CLI (private preview as of 2026-05).

## Status (2026-05-21)

| Layer | State |
|---|---|
| `gh` CLI | ✅ 2.92.0 |
| `gh stack` extension | ✅ installed (`gh extension install github/gh-stack`) |
| `gh-stack` agent skill | ✅ `~/.claude/skills/gh-stack/` (Claude Code recognizes stack tasks) |
| Repo enablement | ⏳ waitlist · https://gh.io/stacksbeta |
| Server-side stack tracking (UI map · cascade rebase · merge-multi) | ❌ blocked until enablement |

## Activation steps when waitlist clears

1. Receive enable email for org `dancinlab` (or per-repo).
2. Confirm via `gh stack submit` on a test layer — should attach to a Stack on the PR page (otherwise treated as plain PR chain).
3. Update this doc → mark "Repo enablement" ✅.
4. Switch from manual `gh pr create --base previous-layer` to `gh stack` commands.

## CLI command map

```
gh stack init <branch>           # start a stack (first branch on top of main)
gh stack init <a> <b> <c>        # create N layers in one shot
gh stack add <branch>            # add another layer on top of current
gh stack view                    # ascii tree of the stack
gh stack push                    # push every branch to origin
gh stack submit                  # open / update PRs as a stack
gh stack sync                    # pull main into the bottom, cascade rebase upward
gh stack rebase                  # interactive cascade rebase
gh stack modify                  # restructure (reorder / delete / rename)
gh stack checkout <pr|branch>    # bring a remote stack into local
gh stack up | down | top | bottom   # navigate between layers
gh stack unstack                 # tear down stack locally + on GitHub
gh stack alias                   # install `gs` as a shorter alias
```

## Stack shape

```
main (trunk)
 └── feat/auth          → PR #1 (base: main)         · bottom
     └── feat/api       → PR #2 (base: feat/auth)
         └── feat/ui    → PR #3 (base: feat/api)     · top
```

Bottom = closest to trunk · top = furthest.

## Pre-enablement manual fallback

```bash
# layer 1 — base: main
git checkout main && git pull
git checkout -b layer1
# ... commits ...
git push -u origin layer1
gh pr create --base main --draft --title "..."

# layer 2 — base: layer1
git checkout -b layer2
# ... commits ...
git push -u origin layer2
gh pr create --base layer1 --draft --title "..."
```

Same logical shape, missing only the server-side stack metadata.

## Reference

- Overview: https://github.github.com/gh-stack/
- Waitlist: https://gh.io/stacksbeta
- Skill repo: https://github.com/github/gh-stack
