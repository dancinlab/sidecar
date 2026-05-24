# sidecar commands — agent self-use catalog

Slash commands available cross-project (backed by sidecar plugins). Use them autonomously when the situation fits — this is the canonical command surface.

```
# ── Discovery ───────────────────────────────────────────────
/kick <seed>          hexa kick — gap-breakthrough / discovery engine
/gap [scope|full]     42-lens multi-axis gap sweep (8 families)
/brainstorm <seed>    width-first idea exhaustion (rounds until depletion)

# ── Fan-out / loop ──────────────────────────────────────────
/all-bg-go            reactive single fan-out of the prior turn's branches
/cycle                autonomous loop: self-enumerate → plan → fan-out → loop
/cycle-full <goal>    /cycle preceded by a phase-0 depletion brainstorm
/step-by-step <task>  sequential runbook: plan → auto-run steps in order (sequential counterpart to /cycle · alias /sbs)

# ── Dispatch ────────────────────────────────────────────────
/pool <args>          host roster + remote exec on sidekick hosts
/cloud <args>         hexa cloud — rented-GPU pod dispatch (runpod / vast.ai)

# ── Cross-project ───────────────────────────────────────────
/domain <task>        <NAME>.md snapshot + <NAME>.log.md checkbox-task log
#                      cross-repo handoff → `cd <target> && /domain set INBOX`

# ── Verify / help ───────────────────────────────────────────
/verify <args>        hexa verify — tier rubric (🔵🟢🟡🟠🔴⚪)
/hexa-help [verb]     hexa --help (top-level catalog or per-verb signature)

# ── Research / generate ─────────────────────────────────────
/arxiv <q>            arXiv API search / id lookup
/yt <url>             YouTube caption transcript extract
/imagine <pf> <out>   AI image gen (fal backend · gpt-image-2 pinned)
/paper <args>         arxiv LaTeX scaffolder (new·sample·fig·compile·lint·list)

# ── Session / meta ──────────────────────────────────────────
/inject  (/ij)        sidecar sync + inject commons.tape/project.tape THIS turn
/ship -m "<msg>" …    atomic commit + push + sidecar sync
/prefs <axis> <lang>  language prefs (code · docs · response)
/secret <args>        macOS Keychain-backed credential CLI
/quota [status|list|add|nick|switch|remove|refresh]  Claude 5h/7d limits + multi-account registry + cred swap + nicks
/easy                 friendly 7-element response style
/check                task dashboard (domain log · open PRs · git · merges)
/question (/q) <txt>  quick side-question, no task pivot (alias for /btw)

# ── Guard hooks (no command — fire automatically) ───────────
# hexa-native    .py/.sh write deny in project.tape repos
# plist-guard    .plist write deny (g37)
# cloud-guard    runpodctl/vastai exec/ssh deny → hexa cloud (g8)
# verify-guard   wolframscript / inline-sympy deny → hexa verify (g5)
# ai-api-guard   curl AI-hostname / inline AI-SDK deny → CLI wrapper (g50)
# pr-cycle       `gh pr create` → appends && gh pr merge + worktree clean (g47)
# pool-route     heavy Bash → ssh-route to a pool host
# git-guard      force-push deny
# sidecar-lint   git-commit lint (stale-history · hardpath · drift · CHANGELOG)
# tape-lint      .tape edit lint (fields · length · lang · @I siblings)
# limit-guard    session-limit checkpoint directive
# sidecar-auto-sync  SessionStart `sidecar sync` (cache always fresh; no opt-out — uninstall to disable)
```
