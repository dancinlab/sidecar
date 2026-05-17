---
description: wilson-gpu — rented-GPU cost guardrail + lifecycle for RunPod / Vast.ai. status shows still-billing instances + accrued cost; `provisioning on|off` is a separate switch (OFF by default) gating `up`; `up` also needs --yes (double gate, spends money); `down` is the kill switch; `attach`/`detach` wire an ssh target into the wilson-pool roster. Inert unless runpodctl / vastai is on PATH.
argument-hint: "[status | provisioning on|off | up <runpod|vast> --yes -- <cli args> | down <runpod|vast> <id> | down all --yes | attach <ssh-target> [linux|macos] | detach <ssh-target>]"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/gpu.sh" cmd $ARGUMENTS`
