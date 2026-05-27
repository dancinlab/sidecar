---
name: roi
description: /roi [scope] — enumerate LOSSLESS performance/resource/speed improvement TODO list, ranked by impact/effort, gated to risk=low only.
---

@D roi := "lossless perf wins only · ranked TODO" :: skill [active]
  do   = "enumerate items that change HOW (more efficient) not WHAT (same behavior) · output ranked table impact/effort · risk=low only · scope = $ARGUMENTS or cwd/active-domain · bench-grounded claims where measurable"
  dont = "include items that change API/semantics/test outcomes · include risk≥medium · invent speedups without anti-pattern evidence · order by impact alone (use impact/effort ratio) · skip risk column"
