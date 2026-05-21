# bypass

Kill the "next user action" punt — when the agent is about to write a block of bash commands the agent itself can run, just run them.

## Trigger

- Natural language: *"bypass"*, *"그냥 해"*, *"그냥 진행해"*, *"do it yourself"*, *"skip the ask"*, *"just run it"*, *"execute it for me"*
- Self-check: agent recognizes the punt-pattern about to happen and the commands are agent-executable

## Anti-pattern this kills

```
다음 user action:
python3.11 -m venv ~/local/bete-net/venv
bash setup.sh
source activate.sh
bash run_n5_funnel.sh ...
```

— all runnable. Bypass + just run. User shouldn't have to say "해줘".

## When NOT to bypass

- Interactive human input (password / OAuth / 2FA / GUI)
- Destructive without prior auth (force-push / rm system / prod deploy)
- External visible messages (slack / email / public PR comments)
- User explicitly asked to review first

For commands that genuinely need human input: isolate JUST those, execute the rest.

## Related

- Cross-project rule in `commons.tape` (≥0.7.2) bakes the anti-punt as a `dont` — fires always-on; this skill is the explicit-trigger surface.
