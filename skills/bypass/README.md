# bypass

**Default-on** — kill the "next user action" punt. When the agent is about to write a block of bash commands the agent itself can run, just run them. **No user request needed** — it's the default, not opt-in.

## How it fires

- **Auto (default)**: agent self-check before any punt-block (see SKILL.md). Always-on cross-project guard lives in `commons.tape` ≥ 0.7.2 as a `dont` entry.
- **Explicit (fallback)**: user says *"bypass"* / *"그냥 해"* / *"그냥 진행해"* / *"do it yourself"* / *"just run it"* — used only when the auto-guard slipped.

## Self-check the agent runs

| Question | If YES |
|---|---|
| Needs human input? (password / OAuth / 2FA / GUI) | keep in block |
| Destructive without prior auth? (force-push / rm system / prod deploy) | keep + ask first |
| External visible message? (slack / email / public PR) | keep + ask first |
| User explicitly asked to review plan first? | keep in block |
| **None of the above** | **RUN IT** — don't write as user-action |

## Anti-pattern this kills

```
다음 user action:
python3.11 -m venv ...
bash setup.sh
source activate.sh
bash run.sh ...
```

— all runnable. Should have been executed, not punted. User shouldn't have to say "해줘".

## Related

- `commons.tape` ≥ 0.7.2 — cross-project always-on `dont` enforcement.
