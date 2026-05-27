---
description: /sbs — short alias for /step-by-step. Plan-first sequential runbook with TWO modes (auto · manual default) + 자동 QA 4축 (functional·visible·conformance·regression) after ship · regression FAIL → auto-revert · others → alert + plan.md `## qa-deferred`. MANUAL (default) — chat-form (1Q/round, easy-mode 7-element scaffold; free-form answers OK) until ambiguity → 0, then `🎯 합의된 결정셋` ASCII agreement screen, then write `drafts/<slug>-plan.md` and hand off to a background Agent on `go` (user can leave; agent ships end-to-end + auto-QA). AUTO — same chat-form rendered, but each round AUTO-PICKED by 4-axis weighted average (완성도·단순·안전(blast radius)·표준; default 1:1:1:1, inline override `auto:safety` or `auto:complete=2,simple=3`). First arg `auto[:<axis-or-weights>]`|`manual` (default manual). `legacy-manual` = old per-step pause (1-version deprecation banner). (`go` is NOT a mode — `/go` is a separate continue-the-paused-flow command.)
argument-hint: "[auto[:<axis-or-weights>]|manual] [<task> | empty = current task in context]"
---

# /sbs — alias for /step-by-step

Input: `$ARGUMENTS`

`/sbs` is the short alias for **`/step-by-step`** — identical semantics. TWO
modes share the SAME chat-form scaffold; they differ only in WHO picks the
answer to each round.

1. **Parse mode + target** — first token `auto` / `auto:<axis>` /
   `auto:<k>=<n>,…` → AUTO (4-axis weighted; default 1:1:1:1) · `manual` →
   MANUAL · `legacy-manual` → MANUAL + 1-line deprecation banner · anything
   else / empty → MANUAL (default). The rest (or whole input) is the task;
   empty task → current work in context (state the assumption, don't ask).
   Announce the mode in one line. (`go` is NOT a mode — `/go` is a separate
   continue-the-paused-flow command.)

2. **Disambiguate in CHAT** (both modes) — before locking the plan, ask ONE
   question per round in chat (NOT AskUserQuestion), each round using the
   easy-mode 7-element scaffold (icon · name · alias · plain-line · analogy
   · ASCII · compare-table · recommendation · `→ A · B · 또는 자유응답`).
   - **MANUAL** waits for the user's chat reply.
   - **AUTO** auto-picks per the 4 axes (완성도 · 단순 · 안전(blast radius) ·
     표준(sidecar pattern fit)) with the parsed weights, no pause; logs
     `🤖 auto-pick Q<n>: <option> (axes — complete=X, simple=Y, safe=Z, std=W
     · weighted=<sum>)`.
   Repeat round-by-round until a scan finds ZERO remaining ambiguity. State
   `🔍 disambiguation: <N> rounds · ambiguity → 0` (AUTO appends
   `· auto-picked (weights: …)`).

3. **Agreement screen** — render the accumulated decision set as one ASCII
   tree and pause (BOTH modes — AUTO's auto-picks still get a user
   pre-commit checkpoint):
   ```
   🎯 합의된 결정셋 (N개)
   ┌─ Q1: <axis>  → ✅ <chosen>
   ├─ Q2: <axis>  → ✅ <chosen>
   └─ Qn: <axis>  → ✅ <chosen>
   요약: <one-line restatement>
   plan 문서: drafts/<slug>-plan.md (생성 예정)
   → 맞으면 `go` · 수정은 `Qn=<다른 선택>` (예: `Q2=B`)
   ```
   On `go` → advance to step 4. On `Qn=<X>` → update only that decision,
   re-render. Substantive new ambiguity → another chat round → re-render.

4. **plan.md + background handoff** (on `go`):
   - Derive slug (kebab-case ≤6 tokens, `[a-z0-9][a-z0-9-]*`; ask once in
     Step 2 if ambiguous).
   - Ensure `drafts/` exists + is in `.gitignore` (add if missing; warn if
     blocked).
   - Write `drafts/<slug>-plan.md` (frontmatter: slug · mode · auto-weights
     if AUTO · created date · then `## task brief` · `## locked decisions` ·
     `## next-action checklist` (ending with a `[ ] ship …` line) ·
     `## completion criteria`).
   - Launch a general-purpose **background Agent** (run_in_background=true)
     with a self-contained prompt: the plan.md contents + ship instructions
     (explicit paths · no force-push · Korean commit msg · `sidecar sync`
     after push) + completion criteria + "report back when done."
   - Tell the user: `🚀 handoff: agent launched (id=…) · plan saved to
     drafts/<slug>-plan.md · you can leave` and end the turn.

5. **Inline fallback** — when the task is trivially clear (no ambiguity in
   Step 2's first scan), skip the agreement screen + handoff and run inline:
   `📋 plan (N steps)` → `▶ i/N` → `✅` / `⚠` / `❌`. AUTO flows straight
   through; MANUAL pauses after each step (`⏸ step i/N done. next → …
   proceed?`) and ends the turn until the user goes.

6. **Halt (all modes · all paths)** — on step failure (report step + verbatim
   error + un-run tail) or before an irreversible / destructive /
   outward-facing step (confirm then resume) — same bar as the `bypass`
   self-check. Handoff Agent reports back BEFORE executing such a step.

7. **Closure** — `🏁 <done>/<N> steps complete`.

8. **Auto-QA 4축 (handoff agent ship 직후)** — ship 완료 즉시 4축 자동 검증:
   **functional** (새 endpoint 응답?) · **visible** (URL/path 노출?) ·
   **conformance** (locked decision ↔ 코드 1:1) · **regression** (기존 surface
   미손상). 각 축 PASS/FAIL/SKIP — SKIP=PASS-equivalent. Fail 정책(hybrid):
   regression FAIL → `git revert <SHA> && git push && sidecar sync` 자동
   실행 + banner `🛑 sbs-qa: regression FAIL — auto-reverted <SHA>`; 나머지
   FAIL → ship 유지 + plan.md `## qa-deferred` append + banner `🛑 sbs-qa:
   <axis> FAIL — alert only`; ALL PASS/SKIP → banner 없음 · plan.md
   `## qa-results`에 ✓ 라인만 append. 결과는 항상 plan.md `## qa-results`
   (최신 위) + 필요 시 `## qa-deferred` 섹션에 기록.
