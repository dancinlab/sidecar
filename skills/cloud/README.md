# cloud

`/cloud <args>` — wrap `hexa cloud` (runpod dispatch · structured argv · never raw ssh/scp).

## Subverbs

| Form | Effect |
|---|---|
| `/cloud preflight <spec-flags>` | closed-form GPU mem-budget check — refuses out-of-budget specs before pod spinup (no LLM, $0) |
| `/cloud run <pod> <cmd>` | foreground run (blocks) |
| `/cloud nohup <pod> <cmd>` | background detached run |
| `/cloud poll <pod> <job-id>` | check on a nohup-spawned job |
| `/cloud copy-to <pod> <src> <dst>` | upload to pod |
| `/cloud copy-from <pod> <src> <dst>` | download from pod |

(Exact arg shape per `hexa cloud --help` — args pass through.)

### preflight example

```
$ /cloud preflight --n-params-m 8920 --param-bytes 2 --optimizer AdamW \
                   --gpu H100-80GB --gpu-mem-mb 81920 \
                   --bsz 2 --seq-len 128 --n-layer 28 --d-model 3072 \
                   --n-head 24 --n-kv-head 8

[cloud] preflight REFUSED — BudgetExceededError (gate=mem)
[cloud] mem budget exceeded · 119692 MB needed > 69632 MB cap (over by 50060 MB)
  downgrade ladder:
    1. AdamW8bit       (saves 53520 MB, new total 66172 MB · FITS)
    2. PagedAdamW8bit  (saves 53520 MB, new total 66172 MB · FITS)
exit 2
```

## Trigger

- Slash: `/cloud <args>` — args pass through unchanged
- Natural language: *"runpod dispatch"*, *"GPU pod 에 돌려"*, *"학습 cloud 에 던져"*, *"pod 결과 가져와"*, *"cloud copy-to"*, *"runpod 폴링"*, *"OOM 사전체크"*, *"메모리 예산 확인"*, *"preflight"*, *"dispatch refuse"*

## Related

- `commons.tape g8` — mandates `hexa cloud` over raw ssh/scp for runpod.
- `commons.tape g12` — fan out up to 8 parallel pods when wall time shrinks.
- `/pool` — sister wrapper (pool = your own host roster, cloud = runpod GPU).
