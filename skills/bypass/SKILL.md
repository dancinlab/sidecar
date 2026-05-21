---
name: bypass
description: |
  Bypass the "next user action" punt. Invoke when the agent is about to
  emit a block like "다음 N5 real-run 위한 user action:" / "next steps
  (you need to run):" / "사용자 액션:" listing bash commands that the
  AGENT ITSELF can run. Just execute instead of asking. Also triggers
  on phrases like "bypass", "그냥 해", "그냥 진행해", "do it
  yourself", "skip the ask", "just run it", "execute it for me".
allowed-tools: Bash
---

# bypass — just execute, don't punt

## When to use

The agent is about to write a "next steps / user action" block listing bash commands. The agent has the tools (Bash, Edit, etc.) to run those commands. Punting forces an extra turn and wastes the user's time.

Use this skill any time the user signals "bypass" / "그냥 해" / "just do it" — OR the agent self-recognizes the punt-pattern about to happen and the action is agent-executable.

## When NOT to bypass

Bypass means "execute without re-asking". Do NOT bypass when:

- Commands require interactive human input (passwords, OAuth web flow, 2FA, GUI clicks, browser SSO)
- Commands are destructive without prior authorization (force-push, `rm -rf` of unfamiliar dirs, deploy to prod, drop production tables)
- Commands send visible external messages (Slack, email, PR comments to public repos) without prior user OK
- Commands cross machine / account boundaries that the user hasn't authorized
- User has explicitly asked to review the plan first ("show me what you'd run before running")

For the genuinely human-only fraction, isolate JUST those commands as user-action and execute everything else.

## What to do instead of punting

1. Execute the runnable commands directly via Bash / Edit / Write
2. Show output (concise — tail of relevant log, exit codes, key results)
3. Brief recap: "ran X · Y · Z · result: <summary>"
4. If a sub-step needs human input, isolate it: "ran A, B, C. need you to run D (requires browser SSO): `<cmd>`"

## Anti-pattern (kill this exact shape)

```
다음 N5 real-run 위한 user action:
python3.11 -m venv ~/local/bete-net/venv
bash ~/core/hexa-lang/stdlib/material/_setup/setup_bete_net_venv.sh
source ~/core/hexa-lang/stdlib/material/_setup/activate_bete_net.sh
bash ~/core/hexa-lang/stdlib/material/_setup/run_n5_funnel.sh "Nb,Ti,Sn" 4 5
```

— all four commands are agent-runnable. Bypass the user-action framing and run them. The user shouldn't have to say "해줘" to push through what was always agent work.

## Detection heuristic (use before writing the block)

Self-check before any "next steps" / "user action" block:

```
For each command in the block:
  - does it need human-interactive input? (password / GUI / browser SSO)
  - is it destructive in a way user hasn't authorized? (force-push / rm system / prod deploy)
  - does it send external visible messages? (slack / email / public PR)
If ALL answers NO for a command → run it yourself
If ANY answer YES → keep it in the user-action block (and run the others)
```

If after the heuristic the user-action block is EMPTY, drop the block entirely and just run.

## Output style

- No "I'll run these commands for you:" preamble — just run
- After running: 1-line recap per command + final outcome
- If something fails: surface the error verbatim, don't wrap in prose
