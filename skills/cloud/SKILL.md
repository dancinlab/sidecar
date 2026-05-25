---
name: cloud
description: Wrap `hexa cloud` for runpod / vast.ai GPU dispatch — structured argv, never raw ssh/scp/runpodctl/vastai/REST (commons g8 · enforced by cloud-guard hook). Subverbs preflight · run · nohup · poll · tail · copy-to · copy-from. tail = live remote-log stream → Monitor bridge (commons g57). Triggers — "runpod dispatch", "GPU pod에 돌려", "학습 cloud에 던져", "pod 결과 가져와", "로그 실시간 보기", "OOM 사전체크", "preflight".
allowed-tools: Bash
---

@D cloud := "wrap `hexa cloud` for runpod / vast.ai dispatch" :: skill
  do   = "`hexa cloud {preflight|run|nohup|poll|tail|copy-to|copy-from}` — structured argv (commons g8)"
  do   = "`hexa cloud tail <host> <log> [--grep RE] [--until RE]` → attach a Monitor to a remote job's log, no polling (commons g57)"
  dont = "raw `runpodctl {exec|ssh|send|receive|send-file|receive-file|port}` · raw `vast(ai) {exec|ssh|scp|copy|attach-ssh|execute}` · raw `ssh`/`scp`/`rsync`/`sftp` to `*.runpod.io`/`proxy.runpod.net`/`*.vast.ai` · raw `curl`/`wget` to `api.runpod.{io,ai}`/`rest.runpod.io`/`runpod.io/graphql`/`console.vast.ai`/`vast.ai/api` · skip the preflight mem-budget check before pod spinup — cloud-guard hard-blocks all of these"
