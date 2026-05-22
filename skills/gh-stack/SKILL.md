---
name: gh-stack
description: |
  Stacked-PR workflow — invoke when the user wants to split work into a chain
  of dependent PRs (each layer < 200 lines, 1 logical concern, --base on the
  layer below). Use `gh stack` commands when the repo is enabled (private
  preview waitlist at https://gh.io/stacksbeta); otherwise use the manual
  `gh pr create --base previous-layer` fallback — same logical shape, missing
  only the server-side stack metadata. Triggers on phrases like "split this
  into stacked PRs", "stack these changes", "make a PR chain", "rebase the
  stack", "open the next layer".
allowed-tools: Bash
---

# gh-stack — stacked-PR workflow

## When to use

The change is >200 lines or covers >1 logical concern. Sidecar's governance (`project.tape :: do :: stacked PRs`) breaks it into a chain — each layer < 200 lines, 1 concern, `--base` on the layer below.

## Shape

```
main (trunk)
 └── feat/auth          → PR #1 (base: main)         · bottom
     └── feat/api       → PR #2 (base: feat/auth)
         └── feat/ui    → PR #3 (base: feat/api)     · top
```

Bottom = closest to trunk · top = furthest from trunk.

## Mode A — `gh stack` (enabled repos)

```
gh stack init <branch>              # start a stack (first layer on top of main)
gh stack init <a> <b> <c>           # create N layers in one shot
gh stack add <branch>               # add another layer on top of current
gh stack view                       # ascii tree of the stack
gh stack push                       # push every branch to origin
gh stack submit                     # open / update PRs as a stack
gh stack sync                       # pull main into bottom, cascade rebase upward
gh stack rebase                     # interactive cascade rebase
gh stack checkout <pr|branch>       # bring a remote stack into local
gh stack up | down | top | bottom   # navigate between layers
gh stack unstack                    # tear down stack locally + on GitHub
```

Requires the `gh-stack` extension (`gh extension install github/gh-stack`) and per-repo enablement from the private preview.

## Mode B — manual fallback (pre-enablement)

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

Same logical shape · missing only server-side stack metadata (no UI map · no `gh stack sync` cascade rebase · no merge-multi).

## Status + activation

CLI reference + manual fallback: [`GH-STACK.md`](../../GH-STACK.md). Per-org enablement state + activation history: [`GH-STACK.log.md`](../../GH-STACK.log.md).
