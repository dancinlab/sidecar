---
title: reflect hexa cloud cycle C (preflight verb) in /cloud skill
status: closed
filed: 2026-05-22
closed: 2026-05-22
resolved_in: cloud 0.2.0 (SKILL.md · README.md · commands/cloud.md · plugin.json · marketplace.json · CHANGELOG.md @ repo root)
filed_by: hexa-lang (CLOUD.md cycle C author)
target_ssot: skills/cloud/
related:
  - skills/cloud/ — this plugin (target)
  - commons.tape g8 — `hexa cloud` canonical form (upstream contract)
  - hexa-lang CLOUD.md (~/core/hexa-lang/CLOUD.md) — domain SSOT for the cycle ledger
  - hexa-lang stdlib/cloud/cloud_cli.hexa — canonical help text
  - hexa-lang inbox/patches/hexa-cloud-subcommand.md — sister patch (deploy gap)
---

# Ask

`stdlib/cloud` shipped **cycle C** on 2026-05-22 — adds the `preflight`
verb to `hexa cloud`, plus 4 new files in `stdlib/cloud/` and an
extended `_cloud_help` in `cloud_cli.hexa`. Please refresh the sidecar
`/cloud` plugin so it exposes the new surface to slash + NL triggers.

# What changed in hexa-lang (already landed on this branch)

| file | what |
|---|---|
| `CLOUD.md` (repo root) | new domain SSOT (cycle ledger · F-gates) |
| `stdlib/cloud/cloud_budget.hexa` | optimizer state-size table + closed-form `mem_budget_check` + `optimizer_downgrade_path` |
| `stdlib/cloud/cloud_job.hexa` | `CloudJob` / `ModelSpec` / `OptimizerSpec` / `BatchSpec` / `GpuSpec` + 6-gate `dispatch_validate` |
| `stdlib/cloud/cloud_dispatch.hexa` | full-cycle `cloud_dispatch_cycle` (validate → spinup → upload → train → poll → fetch → terminate; LLM zero, terminate-guaranteed) |
| `stdlib/cloud/cloud_cli.hexa` | new `preflight` verb + 19 spec flags + extended `_cloud_help` |
| `stdlib/cloud/preflight_smoke.hexa` | F-PREFLIGHT-MEM falsifier (V3 attempt-9 reconstruction · 12/12 PASS measured) |
| `self/main.hexa` | inline `hexa cloud --help` re-synced byte-eq with `_cloud_help` (cycle C surface) |

F-PREFLIGHT-MEM closed at run-time on 2026-05-22 (measured): V3 attempt
9 spec (8.92B params · AdamW f32 · H100-80GB) refused at **119,692 MB >
69,632 MB cap** ($0, no LLM, no pod spinup). Downgrade ladder offers
AdamW8bit / PagedAdamW8bit (both FIT at 66,172 MB) as first two
suggestions.

# Sidecar files to update

Path prefix: `~/.hx/packages/sidecar/skills/cloud/`.

1. **`SKILL.md`** — add `preflight` to the subverb list + NL triggers
   (suggested phrases: `"OOM 사전체크"`, `"메모리 예산 확인"`,
   `"preflight"`, `"dispatch refuse"`). Mention cycle C in
   the `description` frontmatter.

2. **`README.md`** — add the `preflight` row to the subverb table.
   Optional: include the V3-attempt-9 worked example
   (`/cloud preflight --n-params-m 8920 --optimizer AdamW
   --gpu-mem-mb 81920 ...` → `BudgetExceededError` exit 2).

3. **`commands/cloud.md`** — extend `argument-hint` to include
   `preflight`. Update the `description` if it currently lists subverbs
   exhaustively.

4. **`.claude-plugin/plugin.json`** — bump version
   (`0.1.0` → `0.2.0`), add `preflight` + `mem-budget` keywords,
   mention cycle C in the `description`.

5. **`bin/cloud.sh`** — **no change needed** if it already does
   `exec hexa cloud "$@"`. Args pass through unchanged.

# Canonical help text (for byte-eq sync)

The canonical surface lives in
`stdlib/cloud/cloud_cli.hexa::_cloud_help` (also mirrored byte-eq in
`self/main.hexa` at the `sub == "cloud"` branch). Anything sidecar
documents about subverbs / spec-flags should point users at
`hexa cloud --help` rather than duplicate the text — that keeps a
single source of truth and avoids a future cycle-D/E drift.

# Surface example (post-update)

```
$ /cloud preflight --n-params-m 8920 --param-bytes 2 --optimizer AdamW \
                   --gpu H100-80GB --gpu-mem-mb 81920 \
                   --bsz 2 --seq-len 128 --n-layer 28 --d-model 3072 \
                   --n-head 24 --n-kv-head 8

[cloud] preflight REFUSED — BudgetExceededError (gate=mem)
[cloud] mem budget exceeded · 119692 MB needed > 69632 MB cap (over by 50060 MB)
  ... breakdown ...
  downgrade ladder:
    1. AdamW8bit       (saves 53520 MB, new total 66172 MB · FITS)
    2. PagedAdamW8bit  (saves 53520 MB, new total 66172 MB · FITS)
    3. Lion            (still over by 14380 MB)
    4. ZeRO-2-AdamW    (saves 0 MB · n_gpu=1)
exit 2
```

# Honest blocker (separate gap — not your fix)

`hexa cloud --help` currently errors `unknown subcommand 'cloud'` on a
default `~/.hx/bin/hexa` because the deployed binary is older than the
`self/main.hexa::4693` wiring. Sister `inbox/patches/hexa-cloud-subcommand.md`
tracks the deploy. Sidecar `/cloud` will reach the new surface as soon
as the next `hexa` build is installed — no sidecar-side change required
for that part.

# Acceptance

Sidecar `/cloud --help` (or `/cloud preflight --help`) lists
`preflight` and pass-through works once `hexa` is rebuilt:

```
$ /cloud preflight --n-params-m 1500 --optimizer PagedAdamW8bit --gpu-mem-mb 81920 ...
# exit 0   (FITS)
$ /cloud preflight --n-params-m 8920 --optimizer AdamW --gpu-mem-mb 81920 ...
# exit 2   (BudgetExceededError)
```

R4 invariant: this note is operational coordination only; no science /
absorbed=true claim attached.
