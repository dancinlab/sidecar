---
name: cloud
description: Wrap `hexa cloud` for runpod / vast.ai GPU dispatch — structured argv, never raw ssh/scp/runpodctl/vastai/REST (commons g8 · enforced by cloud-guard hook). Subverbs preflight · run · nohup · poll · tail · copy-to · copy-from. tail = live remote-log stream → Monitor bridge (commons g57). Triggers — "runpod dispatch", "GPU pod에 돌려", "학습 cloud에 던져", "pod 결과 가져와", "로그 실시간 보기", "OOM 사전체크", "preflight".
allowed-tools: Bash
---

@D cloud := "wrap `hexa cloud` for runpod / vast.ai dispatch" :: skill
  do   = "`hexa cloud {preflight|run|nohup|poll|tail|copy-to|copy-from}` — structured argv (commons g8)"
  do   = "`hexa cloud tail <host> <log> [--grep RE] [--until RE]` → attach a Monitor to a remote job's log, no polling (commons g57)"
  do   = "monitor handoff 3-step (current contract, until cloud_fire RFC ships): (1) `hexa cloud nohup <host> <logfile> -- <argv>` → caller keeps the `<logfile>` path; (2) `hexa cloud tail <host> <logfile> [--until RE]` → line-by-line stdout stream; (3) attach Monitor to that tail command. Planned: `hexa cloud nohup`/`fire` emits a `__MONITOR_HANDLE__={…}` JSON line so caller can `grep` it out (see `inbox/rfc_drafts/cloud-fire-monitor-handle.md`)"
  do   = "`hexa cloud tail` exit codes — 0 = `--until` regex matched (clean job end via `JOB DONE`/`OOMKilled`/… marker) · 255 = ssh transport drop · other non-zero = log truncated mid-stream"
  dont = "forget the logfile path between `nohup` and `tail` — caller must thread it through (the planned `cloud_fire` verb + `__MONITOR_HANDLE__=` echo ends this, but until shipped the path lives in the caller)"
  dont = "raw `runpodctl {exec|ssh|send|receive|send-file|receive-file|port}` · raw `vast(ai) {exec|ssh|scp|copy|attach-ssh|execute}` · raw `ssh`/`scp`/`rsync`/`sftp` to `*.runpod.io`/`proxy.runpod.net`/`*.vast.ai` · raw `curl`/`wget` to `api.runpod.{io,ai}`/`rest.runpod.io`/`runpod.io/graphql`/`console.vast.ai`/`vast.ai/api` · skip the preflight mem-budget check before pod spinup — cloud-guard hard-blocks all of these"
