---
description: /cloud <args> — runs `hexa cloud "$@"` (canonical subcommand form per commons g8 · runpod/vast.ai dispatch with structured argv). Subverbs preflight · run · nohup · fire · poll · tail · copy-to · copy-from · pods · dispatch. preflight = closed-form GPU mem-budget check (no LLM, no pod spinup). fire/nohup = pod fire + Monitor handle emit; tail = live remote-log stream (commons g57). **`pods`/`dispatch` (hexa-lang PR #1699 + cloud@0.4.0)** = per-project active pod/job work manifest at cwd's `./pods.json` (one file per repo). After every fire, caller MUST `hexa cloud dispatch add <jid> <pid> <dir>` to register (ghost-pod class — pod-monitor 0.1.4 advisory + commons g57). `cloud pods` renders the table; `cloud dispatch [tree|active|add|verdict|rm]` manages it update-form. Distinct from global `~/.hexa-cloud/pods.jsonl` orphan/billing registry. Triggers — "runpod dispatch", "GPU pod에 돌려", "학습 cloud에 던져", "pod 결과 가져와", "로그 실시간 보기", "OOM 사전체크", "preflight", "fire", "cloud pods", "cloud dispatch", "활성 pod", "지금 뭐 돌고있어", "작업 매니페스트", "verdict 갱신", "pod tree", "dispatch add".
argument-hint: "<preflight | run | nohup | fire | poll | tail | copy-to | copy-from | pods | dispatch> [args...]"
allowed-tools: Bash
---

!`hexa cloud $ARGUMENTS`
