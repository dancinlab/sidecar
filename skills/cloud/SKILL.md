---
name: cloud
description: |
  Wrap `hexa cloud` (runpod dispatch with structured argv — never
  raw ssh/scp per commons.tape g8). Subverbs: preflight · run · nohup ·
  poll · copy-to · copy-from. Invoke when the user wants to size-check
  a job against GPU memory before spinup, dispatch training / compute
  to a runpod GPU pod, poll a long-running job, or move files to/from
  runpod. Triggers on phrases like "runpod dispatch", "GPU pod 에 돌려",
  "학습 cloud 에 던져", "pod 결과 가져와", "cloud copy-to", "runpod 폴링",
  "OOM 사전체크", "메모리 예산 확인", "preflight", "dispatch refuse".
allowed-tools: Bash
---

# cloud — wrap `hexa cloud` for runpod dispatch

## When to use

Runpod GPU work: pre-dispatch memory budgeting, training dispatch, long-running compute, file movement to/from a pod. Per `commons.tape g8`, ALWAYS use `hexa cloud` (structured argv) — NEVER raw `ssh` / `scp`.

## Subverbs

```
/cloud preflight <spec-flags>    closed-form GPU mem-budget check (no pod, no LLM)
/cloud run <pod> <cmd>           foreground run (blocks)
/cloud nohup <pod> <cmd>         background run (detached)
/cloud poll <pod> <job-id>       check on a nohup-spawned job
/cloud copy-to <pod> <src> <dst> upload file/dir to pod
/cloud copy-from <pod> <src> <dst>  download from pod
```

(Exact arg shape per `hexa cloud --help` — args pass through.)

## Related

- `commons.tape g8` — mandates `hexa cloud` over raw ssh/scp for runpod.
- `commons.tape g12` — fan out up to 8 parallel pods when wall time shrinks.
- `/pool` — sister wrapper for the `pool` CLI (different host surface — pool = your own host roster, cloud = runpod GPU).
