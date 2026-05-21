# cloud

`/cloud <args>` — wrap `hexa-cloud` (runpod dispatch · structured argv · never raw ssh/scp).

## Subverbs

| Form | Effect |
|---|---|
| `/cloud run <pod> <cmd>` | foreground run (blocks) |
| `/cloud nohup <pod> <cmd>` | background detached run |
| `/cloud poll <pod> <job-id>` | check on a nohup-spawned job |
| `/cloud copy-to <pod> <src> <dst>` | upload to pod |
| `/cloud copy-from <pod> <src> <dst>` | download from pod |

(Exact arg shape per `hexa cloud --help` — args pass through.)

## Trigger

- Slash: `/cloud <args>` — args pass through unchanged
- Natural language: *"runpod dispatch"*, *"GPU pod 에 돌려"*, *"학습 cloud 에 던져"*, *"pod 결과 가져와"*, *"cloud copy-to"*, *"runpod 폴링"*

## Related

- `commons.tape g8` — mandates `hexa-cloud` over raw ssh/scp for runpod.
- `commons.tape g12` — fan out up to 8 parallel pods when wall time shrinks.
- `/pool` — sister wrapper (pool = your own host roster, cloud = runpod GPU).
