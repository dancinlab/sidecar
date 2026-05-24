# git-guard

PreToolUse(Bash) git-push safety guard. Two layers:

1. **Deny** force-type push (rewrites shared history).
2. **Advisory** (non-blocking) on a stale-base push (silent-revert / shared-workdir branch-swap risk).

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

## No opt-out

There is none — no env var, no config file, no exception list. A guard you can switch off is a guard you will switch off. If a force-push is genuinely required, run it outside Claude Code; if `git-guard` is wrong for your workflow, uninstall the plugin rather than routing around it.
