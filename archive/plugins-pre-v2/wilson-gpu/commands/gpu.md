---
description: wilson-gpu — rented-GPU cost guardrail + lifecycle for RunPod / Vast.ai. status shows still-billing instances + accrued cost vs strategy; `strategy` = watch|budget|idle-reaper|ephemeral; `provisioning`/`reaping` are separate off-by-default switches gating the money/destroy actions (`up` also needs --yes); `fanout`/`fanout-plan` is a cost-tolerance decision aid for shardable jobs; `down` is the kill switch; `attach`/`detach` wire an ssh target into the wilson-pool roster. Inert unless runpodctl / vastai is on PATH.
argument-hint: "[status | strategy <watch|budget|idle-reaper|ephemeral> | budget <$N> | max-hours <N> | reaping on|off | fanout on|off | fanout-tolerance <$N|N%> | fanout-plan <h> <rate> [N] | provisioning on|off | up <runpod|vast> --yes -- <cli args> | down <runpod|vast> <id> | down all --yes | attach <ssh-target> [linux|macos] | detach <ssh-target>]"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/gpu.sh" cmd $ARGUMENTS`
