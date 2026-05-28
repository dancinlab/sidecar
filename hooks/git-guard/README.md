# git-guard

git-staleness safety guard. Five layers — a `PreToolUse(Bash)` binary (`_git_guard.hexa`) and a `SessionStart` binary (`_git_guard_session.hexa`):

1. **Deny** force-type push (rewrites shared history).
2. **Advisory** (non-blocking) on a stale-base *push* (silent-revert / shared-workdir branch-swap risk).
3. **Advisory** (non-blocking) on a stale-base *merge* (`gh pr merge`, anima #1105).
4. **Advisory** (non-blocking) on a stale-base *creation* — `git worktree add` / `checkout -b` / `switch -c` (0.7.0, UPSTREAM).
5. **Advisory** (non-blocking) at **SessionStart** — local default branch behind `origin/<default>` (0.7.0, UPSTREAM).

Layers 1-3 are DOWNSTREAM — they fire when a stale base is about to be pushed/merged. Layers 4-5 are UPSTREAM — they catch the staleness at branch-creation time and at session start, before any work lands on a stale base. No layer ever runs a network `git fetch`: `.git/FETCH_HEAD` mtime is the freshness proxy, and the fetch command lives only in the advisory text.

## 1. Force push — denied

| pattern | example |
|---|---|
| `git push --force` / `-f` | `git push --force origin main` |
| `git push --force-with-lease` | `git push --force-with-lease origin main` |
| refspec-level force (`+<ref>`) | `git push origin +feat:main` |

Each rewrites history on a shared remote — almost always the wrong remedy. The right path is to resolve the conflict at the source, not overwrite. Quotes are stripped before tokenizing (0.4.2) so `'--force-with-lease=x'` / `+"refspec"` can't slip past. Hook-bypass (`--no-verify`) is intentionally NOT blocked; it's a developer-local discipline call.

## 2. Stale-base push — advisory (0.5.0)

For a **non-force** `git push`, the guard computes the current branch's divergence from the remote default base (`origin/HEAD`, else `origin/main`) in one read-only round-trip. When the branch trails that base by **≥ 20 commits**, it emits non-blocking `additionalContext` and lets the push proceed.

```
push of branch cut from a stale point:

origin/main  ●──●──●──●──●──●─ … ─●   (37 ahead of the cut)
              \
   branch      ●                       (1 commit, 37 behind)
               └─ push → PR → merge silently reverts files
                  changed on main since the cut
```

Why it matters: in a **shared working dir** (one repo, several concurrent agents — see the demiurge concurrency hazard), a sibling agent can swap `HEAD` out from under you between your commit and your push, so the push lands on a stale, far-behind branch. Merging it can overwrite newer files on the base with their old versions. The advisory surfaces the branch + behind/ahead counts so you can confirm the branch is intended; if it isn't, re-cut an isolated worktree from the base (`git worktree add -b <br> /tmp/<wt> origin/main`).

Advisory-only (per the guards-narrow-scope policy: non-blocking `additionalContext` > deny for hygiene). The ≥ 20 threshold is hardcoded — far above the normal drift of short-lived stacked PRs, so it fires on genuinely stale bases, not routine churn.

## 3. Stale-base merge — advisory (0.6.0, anima #1105)

The push-time check (layer 2) is a backstop, but a `gh pr merge` (squash) can reach `main` via a path it never saw — in anima #1105 a squash-merge of a stale-base PR revert-deleted 35190 files. So when a command contains `gh pr merge` (and no `git push`, and is not a cross-repo `--repo X` merge), the guard runs the same divergence probe and warns before the merge lands. Stays advisory — the real deny on mass deletion lives in pr-cycle-hook's deletion-sanity gate.

## 4. Stale-base creation — advisory (0.7.0, UPSTREAM)

Layers 2-3 fire DOWNSTREAM, once a stale-base branch is about to be pushed or merged. Layer 4 fires UPSTREAM — at the moment a branch/worktree is **cut** — so the staleness is surfaced before any work accumulates on the bad base. It matches the creation verbs:

| verb | example |
|---|---|
| `git worktree add` | `git worktree add -b feat /tmp/wt main` |
| `git checkout -b` / `-B` | `git checkout -b feat` |
| `git switch -c` / `-C` / `--create` | `git switch -c feat origin/main` |

It emits a non-blocking advisory when **either**:

- **(a)** the base argument does not resolve to `origin/<default>` — i.e. the base is local `main` / `HEAD` / omitted. In a shared working tree the local default branch can sit behind `origin`, so cutting off it starts work on a stale base.
- **(b)** `.git/FETCH_HEAD` is older than **30 minutes** — the local `origin/*` refs are themselves likely stale, so even basing off `origin/<default>` may be off the real remote tip.

The advisory steers: `git fetch origin` first, then base off `origin/<default>` (e.g. `git worktree add -b <br> /tmp/<wt> origin/main`). Creation is **never** denied. A fresh cut off `origin/<default>` with a recently-fetched `FETCH_HEAD` is silent.

## 5. SessionStart stale-local advisory (0.7.0, UPSTREAM)

At **SessionStart**, in a git repo with an `origin` remote, the guard cheaply runs `git rev-list --left-right --count origin/<default>...<default>` against the **already-fetched** refs (no network). When the local default branch is **≥ 1 commit behind** `origin/<default>`, it injects a one-shot advisory:

> 로컬 `<default>`가 origin/`<default>`보다 N커밋 뒤처짐 — 트리가 조용할 때 `git fetch origin && git pull --ff-only`로 정렬.

This is the shared-working-tree drift fingerprint: a concurrent agent merged a PR to `origin` without this checkout pulling, so the local default silently fell behind. If `.git/FETCH_HEAD` is also older than 30 minutes, a `git fetch origin` nudge is appended (the local `origin/*` refs may themselves be stale, so the behind-count can understate the drift). Silent when up-to-date, not a git repo, or there is no `origin` remote.

## No opt-out

There is none — no env var, no config file, no exception list. A guard you can switch off is a guard you will switch off. If a force-push is genuinely required, run it outside Claude Code; if `git-guard` is wrong for your workflow, uninstall the plugin rather than routing around it.
