---
description: /roi [scope] — enumerate LOSSLESS performance/resource/speed improvement TODO list, ranked by impact/effort, risk=low only. Bare /roi = active-domain/cwd repo · /roi <scope-message> restricts to that scope (file/dir/feature/layer).
argument-hint: "[scope: file path · subdir · feature name · layer · …]"
allowed-tools: Bash, Read, Grep, Glob
---

User asks `/roi $ARGUMENTS` — produce a ranked TODO list of **LOSSLESS** perf /
resource / speed wins for the given scope.

**SCOPE**:
- bare `/roi` → active domain (if set, via `/domain` skill) ELSE the cwd repo.
  State the resolved scope in one line.
- `/roi <message>` → use `$ARGUMENTS` to narrow: file path · subdir · feature
  name · layer (frontend/backend/db) · language · hot path · component slug.
  Restrict the scan to files matching the scope.

**LOSSLESS definition** (hard gate):
- ✅ Changes only HOW behavior is produced (algo · data structure · I/O pattern
  · caching · batching · lazy eval · short-circuit · …)
- ❌ Changes WHAT is produced (output diff · API shape · error semantics ·
  side-effect order observable to callers · test expectations)
- Items that COULD regress observable behavior under edge cases → mark
  `risk=medium` and EXCLUDE from the output. Only `risk=low` ships.

**STAGES**:

1. **Resolve scope** — `🎯 scope: <resolved>` (one line).
2. **Enumerate candidates** via fast scan (Read · Grep · Glob; avoid
   long-running bench unless trivial):
   - Anti-pattern grep: `N+1`, `re-parse`, `O(n²)` (nested loops over same
     collection), unbounded `push`/append, `sleep` on hot path, sync I/O in
     async context, `JSON.parse` of constants, `compile()` per call,
     `sort(...).slice(0, 1)` vs `min`, repeated `gettimeofday`/`now()`, …
   - Resource: file handles not closed, buffers grown then thrown away, dict
     keys with stable lifetimes uncached, full table scans where index exists,
     log-level=debug in tight loop.
   - Speed: blocking when async available, single-thread when trivially
     parallel (`map` over independent items), reading entire file when tail
     suffices, regex recompile per match, dict lookup in loop where hoist
     applies.
3. **Bench-ground where measurable** (commons @D g5 bench_kernel_choices —
   "가정 말고 벤치"). If quick `hyperfine` / `python -m timeit` / `bench` is
   trivial: include the verdict in `evidence`. If not measurable cheaply:
   mark `evidence: code-pattern` and lower confidence.
4. **Rank** by impact-to-effort ratio (highest ROI first). Tiebreak by lower
   risk, then lower effort.

**OUTPUT** — single table:

```
🎯 scope: <resolved>

| # | category | item | impact | effort | risk | how | evidence |
|---|---|---|---|---|---|---|---|
| 1 | ⚡ speed | hoist regex compile out of loop in <file>:<line> | high | low | low | `re.compile` outside the loop, reuse the pattern object | grep: `re\.search\(.*\)` inside `for .* in` block · ×N callers |
| 2 | 🧠 perf | replace sort+take-1 with min() in <file>:<line> | med | low | low | `min(seq, key=…)` is O(n) vs O(n log n) sort | bench: 10k items 8.2ms → 0.4ms |
| 3 | 💾 resource | reuse dict between calls in <file>:<line> | med | med | low | thread-local cache · TTL bounded · invalidate on schema change | code-pattern: rebuilt every call, keys stable across N calls |
| … | … | … | … | … | … | … | … |
```

Categories (icon · label):
- ⚡ speed (wall-clock latency)
- 🧠 perf (CPU / algorithmic complexity)
- 💾 resource (memory / disk / network)
- 🔋 efficiency (battery / cost / throughput-per-watt)

**Impact** ∈ {low, med, high} · **Effort** ∈ {low, med, high} · **Risk** =
**low** only (gate). Drop any candidate where risk could rise to medium —
that's NOT lossless.

**Confidence labels** (optional `tier:` column when uncertain):
- 🔵 bench-verified (recompute matches) · 🟢 numerical · 🟡 cited only ·
- 🟠 INSUFFICIENT (no benchable path — code-pattern only)

**Cap**: default top 10 per category, or all if N ≤ 10. State `N candidates ·
showing top X / category` if truncated. Surface count of items DROPPED for
risk≥medium ("12 candidates considered · 7 listed · 5 dropped (risk≥med)").

**Closing line** — one-sentence summary: top recommendation + total est-impact.

Triggers — `/roi`, `/roi <scope>`, `roi 뽑아`, `roi list`,
`무손실 개선 할일`, `성능 개선 할일`, `자원 개선 할일`, `속도 개선 할일`,
`효율 개선 할일`, `lossless improvements`, `perf wins`.
