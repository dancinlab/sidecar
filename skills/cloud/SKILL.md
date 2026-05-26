---
name: cloud
description: Wrap `hexa cloud` for runpod / vast.ai GPU dispatch — structured argv, never raw ssh/scp/runpodctl/vastai/REST (commons g8 · enforced by cloud-guard hook). Subverbs preflight · run · nohup · poll · tail · copy-to · copy-from. tail = live remote-log stream → Monitor bridge (commons g57). Triggers — "runpod dispatch", "GPU pod에 돌려", "학습 cloud에 던져", "pod 결과 가져와", "로그 실시간 보기", "OOM 사전체크", "preflight".
allowed-tools: Bash
---

@D cloud := "wrap `hexa cloud` for runpod / vast.ai dispatch" :: skill
  do   = "`hexa cloud {preflight|run|nohup|poll|tail|copy-to|copy-from}` — structured argv (commons g8)"
  do   = "`hexa cloud tail <host> <log> [--grep RE] [--until RE]` → attach a Monitor to a remote job's log, no polling (commons g57)"
  do   = "monitor handoff (shipped — hexa-lang PRs #1306+#1309): `hexa cloud fire <host> [--log <path>] -- <argv>` (atomic, auto-log = `/tmp/cloud-<unix_ts>.log` on the remote when `--log` omitted) emits a `__MONITOR_HANDLE__={\"host\":...,\"pid\":N,\"log\":...,\"tail_cmd\":\"hexa cloud tail <h> <log>\"}` JSON one-liner on success → caller `grep '^__MONITOR_HANDLE__='` to extract `tail_cmd` and attach Monitor to it. `hexa cloud nohup <host> <logfile> -- <argv>` emits the same handle line (use when the caller pre-decides the logfile path for batched fan-out)"
  do   = "`hexa cloud tail` exit codes — 0 = `--until` regex matched (clean job end via `JOB DONE`/`OOMKilled`/… marker) · 255 = ssh transport drop · other non-zero = log truncated mid-stream"
  dont = "skip the `__MONITOR_HANDLE__=` line — parse it (don't reconstruct host/log from the human `[cloud] started; …` message); collide two `cloud fire` calls on the same unix_ts by omitting `--log` under heavy batched fan-out (pass an explicit unique `--log` for batches)"
  dont = "raw `runpodctl {exec|ssh|send|receive|send-file|receive-file|port}` · raw `vast(ai) {exec|ssh|scp|copy|attach-ssh|execute}` · raw `ssh`/`scp`/`rsync`/`sftp` to `*.runpod.io`/`proxy.runpod.net`/`*.vast.ai` · raw `curl`/`wget` to `api.runpod.{io,ai}`/`rest.runpod.io`/`runpod.io/graphql`/`console.vast.ai`/`vast.ai/api` · skip the preflight mem-budget check before pod spinup — cloud-guard hard-blocks all of these"
