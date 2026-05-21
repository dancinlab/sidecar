---
name: bypass
description: |
  Anti-punt — DEFAULT BEHAVIOR (auto-fires, not opt-in). Before any
  agent move that hands control back to the user unnecessarily, the
  agent runs the universal self-check; if the action is local +
  reversible + non-destructive + needs no human-only input, just
  execute. Covers an extensible catalog of punt-patterns: "next user
  action:" blocks, "Should I proceed?" confirmations, "Want me to
  check?" deferrals, option-trees with obvious defaults,
  over-clarification of inferable details, defer-by-waiting, excessive
  recap-before-action, etc. Cross-project always-on enforcement in
  commons.tape ≥ 0.7.2. User can also invoke explicitly: "bypass",
  "그냥 해", "그냥 진행해", "do it yourself", "just run it".
allowed-tools: Bash
---

# bypass — auto-execute, don't punt

## Default behavior (auto-fires; no user request needed)

Before ANY move that would hand control back to the user, the agent runs the universal self-check. If the action is local + reversible + non-destructive + needs no human-only input, the agent JUST DOES IT. The user does not need to say anything.

## Universal self-check (mandatory before any punt-form)

For each action the agent is about to defer / confirm / option-tree:

| Question | If YES |
|---|---|
| Needs interactive human input? (password · OAuth web flow · 2FA · GUI clicks · browser SSO) | legitimately user-only |
| Destructive without prior authorization? (force-push · `rm -rf` of system / unfamiliar dirs · prod deploy · drop prod tables · amend published commits) | check-in legitimate — ask first |
| External visible message? (Slack · email · public PR comment to non-owned repo · posting to third-party services) | check-in legitimate — ask first |
| User explicitly asked to review first? ("show me the plan", "preview before running") | respect the explicit request |
| **None of the above** | **EXECUTE — don't punt** |

If after the check the punt-form would carry zero questions → drop the punt entirely, just execute and report.

## Punt-pattern catalog (extensible — add more here)

### 1. `next user action:` / `you need to run:` block
Listing bash commands as user-todo when the agent has Bash + the commands are local-executable. Run them; show output; recap.

### 2. `Should I proceed with X?` / `Want me to do Y?`
Permission-seeking for obviously-OK reversible work. If X is the obvious next step (per the prior conversation), just do X. Confirmation is for destructive / external / unclear-scope actions only.

### 3. Option-tree with obvious default
`we could do A, B, or C — which?` when ONE of A/B/C is the clearly-correct default given context. Pick the default and execute; mention the rejected alternatives in a 1-liner ("went with A since the goal is X; B/C would fit Y/Z").

### 4. Defer-by-waiting
`let me know if you want me to...`, `I'll wait for your input on...`, `ping me when ready` — when the agent could move forward with reasonable defaults. Move forward. Mention what defaults you took so the user can redirect.

### 5. Over-clarification on inferable details
Asking for info already in context, or info with a sensible default (`what name should the file have?` when the context implies `foo.py`). Use the inferred / default value, mention it ("named it `foo.py` per the surrounding pattern; rename if you want X").

### 6. Excessive recap-before-action
Restating what was just decided over multiple turns before doing anything. Skip the recap; do the work; recap AFTER with the actual outcome.

### 7. "Plan first, then ask, then execute" for reversible work
Breaking a reversible local task into plan-then-confirm-then-execute when execute-and-report is fine. Execute and report. Reserve the plan-then-ask shape for high-blast-radius work only.

*(More patterns to come — append to this list as they're observed.)*

## Patterns this does NOT bypass (legitimate check-ins)

- **Destructive ops without prior auth** — force-push, `git reset --hard` of un-backed-up work, dropping prod tables, deploying to prod
- **External visible messages** — Slack / email / public-repo PR comments / posts to third-party services
- **Hard-to-reverse cross-boundary actions** — amending published commits, force-pushing main, deleting branches with un-pulled work
- **User explicitly asked to review first** — honor the request literally
- **Genuine human-input requirements** — OAuth web flow, 2FA codes, password entry, GUI interactions

For these, the punt is correct.

## After running

- 1-line recap per executed action (`✓ <verb> <object>` or `✗ <verb>: <reason>`)
- Final outcome / next agent step
- Errors surface verbatim, no prose wrapper
- If a sub-step truly needs human input, isolate JUST that one (`A, B, C done; need you to run D — requires browser SSO: <cmd>`)

## Anti-pattern reference (this is what bypass kills)

```
다음 N5 real-run 위한 user action:
python3.11 -m venv ~/local/bete-net/venv
bash ~/core/hexa-lang/.../setup_bete_net_venv.sh
source activate.sh
bash run_n5_funnel.sh "Nb,Ti,Sn" 4 5
```

— all four runnable, user shouldn't have to say "해줘". Agent should have run all four, reported results.

## Adding new punt-patterns

When you spot a NEW recurring punt-pattern that bypass should catch, edit this SKILL.md → "Punt-pattern catalog" section → add a numbered entry with: pattern name, detection cue, bypass action. Bump plugin version (patch for additions). The universal self-check is grammar-level — covers any pattern by construction; the catalog just makes the common ones explicit.

## Optional explicit invocation (fallback only)

If the auto-guard slipped and the agent did punt, the user CAN say "bypass" / "그냥 해" / "그냥 진행해" / "do it yourself" / "just run it" to force-execute. But this is the fallback — **default is auto**, not opt-in.

## Related

- `commons.tape` ≥ 0.7.2 — cross-project always-on `dont` (the always-on enforcement layer; this skill is the named handle + detailed catalog).
