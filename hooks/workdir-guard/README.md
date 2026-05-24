# workdir-guard

SessionStart advisory: warns once per session when the current git working tree is **shared by ≥ 2 concurrent `claude` agents** — the shared-index / branch-swap concurrency hazard.

## What it detects

A working tree is "shared" when two or more live `claude` processes have a cwd inside the same `git rev-parse --show-toplevel`. They then share one `.git/index` + `HEAD`, so one agent's stage/commit/push can interleave with another's: commit commingling, a HEAD swapped out from under you, a push that lands on a stale, far-behind branch.

Detection is one shell round-trip (~0.1 s):

```
lsof -c claude -d cwd -Fn          # cwd of every live claude process
  → keep those == toplevel or under toplevel/   (awk prefix-match)
  → count ≥ 2  ?  advise  :  stay silent
```

Grouped by **working tree** (`--show-toplevel`), not by repo: agents in separate linked worktrees of the same repo have independent indexes (that's the fix), so they don't count — and the moment you move into an isolated worktree your own count drops to 1 and the advisory stops.

## What it advises

Do git landings in an isolated worktree, and leave other agents' branches alone:

```
git worktree add -b <br> /tmp/<wt> origin/main   # independent index
# stage / commit / push inside the worktree → PR → git worktree remove
```

Never `reset` / `switch` / `delete` a branch another agent is on.

## Relationship to git-guard

Complementary, different timing — proactive vs reactive:

| | trigger | when | nature |
|---|---|---|---|
| **workdir-guard** | SessionStart, shared tree detected | session start | proactive — steer to a worktree before landing |
| **git-guard 0.5.0** | `git push`, branch ≥ 20 behind base | at push | reactive — catch a stale-base push |

## No opt-out

Advisory-only, non-blocking, and fires only when the tree is genuinely shared (silent in solo sessions). There is no env var, no config file, no exception list. A guard you can switch off is a guard you will switch off.
