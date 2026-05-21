---
name: bypass
description: |
  AUTO-FIRES whenever the agent is about to write a "next user action:" /
  "you need to run:" / "사용자 액션:" block listing commands the agent
  itself can run. The agent self-checks and just executes — the user
  does NOT need to say anything. This is the DEFAULT behavior, not an
  opt-in. The skill exists as the explicit named handle for the same
  behavior (and as a reinforcement surface if the auto-guard slipped).
  Cross-project always-on enforcement lives in commons.tape (>=0.7.2)
  as a `dont` entry — the skill mirrors / explains it.
allowed-tools: Bash
---

# bypass — default-on: just execute, don't punt

## Default behavior (auto-fires; no user request needed)

Before emitting ANY "next user action:" / "you need to run:" / "사용자 액션:" / "다음 단계:" block, the agent runs the self-check below. If the listed commands are agent-executable, the agent SKIPS the punt and JUST RUNS them. The user does not need to say "bypass" / "그냥 해" — that's the fallback, not the trigger.

## Self-check (mandatory before any punt-block)

For each command the agent is about to put in the block:

| Question | If YES |
|---|---|
| Needs interactive human input? (password · OAuth web flow · 2FA · GUI clicks · browser SSO) | keep in block (truly user-only) |
| Destructive without prior auth? (force-push · `rm -rf` of unfamiliar system paths · prod deploy · drop prod table) | keep in block + ask first |
| External visible message? (Slack · email · public PR comment to non-owned repo) | keep in block + ask first |
| User explicitly asked to review the plan first? | keep in block |
| **None of the above** | **RUN IT YOURSELF** — don't write it as user-action |

If after the check the block would be EMPTY → drop the block entirely, just execute.

## Anti-pattern (this is what bypass kills)

```
다음 N5 real-run 위한 user action:
python3.11 -m venv ~/local/bete-net/venv
bash ~/core/hexa-lang/.../setup_bete_net_venv.sh
source activate.sh
bash run_n5_funnel.sh "Nb,Ti,Sn" 4 5
```

— all four are agent-runnable. User shouldn't have to say "해줘" to push through what was always agent work. The agent should have run all four and reported results.

## After running

- 1-line recap per executed command (`✓ <cmd>` or `✗ <cmd>: <reason>`)
- Final outcome / next agent step
- Surface errors verbatim, don't wrap in prose
- If a sub-step truly needs human input, isolate JUST that one in a user-action block — execute everything else

## Optional explicit invocation (fallback only)

If the auto-guard slipped and the agent did punt, the user CAN say "bypass" / "그냥 해" / "그냥 진행해" / "do it yourself" / "just run it" to force-execute. But this is the fallback — **default is auto**, not opt-in.

## Why this skill exists alongside the commons rule

- `commons.tape` ≥ 0.7.2 carries the always-on `dont` (cross-project) — that's the enforcement.
- `bypass` skill is the named, discoverable, self-documenting surface that describes the behavior and the self-check. When a teammate searches "what's the rule about user-action blocks?", they find this skill.
