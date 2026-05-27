---
description: /step-by-step — plan-first sequential runbook with TWO modes (auto · manual default) + 자동 QA 4축 (functional·visible·conformance·regression) after ship · regression FAIL → auto-revert · others → alert. MANUAL (default) — chat-form disambiguation (1 question/round, 7-element easy scaffold; free-form answers OK) until ambiguity → 0, then a `🎯 합의된 결정셋` ASCII agreement screen, then write `drafts/<slug>-plan.md` and HAND OFF to a background Agent on `go` (user can leave; agent ships end-to-end + auto-QA). AUTO — same chat-form scaffold rendered, but each question is AUTO-PICKED by the 4-axis weighted average (완성도 · 단순 · 안전(blast radius) · 표준(sidecar pattern fit); default 1:1:1:1, inline override `/sbs auto:safety <task>` or `/sbs auto:complete=2,simple=3 <task>`). First arg token `auto[:<axis-or-weights>]` | `manual` selects the mode (default manual). `legacy-manual` is the old per-step pause behavior — 1-version deprecation banner, use plain `manual`. `/sbs` is the short alias. (For "continue the paused flow" use the separate `/go` command, not a mode here.)
argument-hint: "[auto[:<axis-or-weights>]|manual] [<task> | empty = current task in context]"
---

# /step-by-step — plan-first sequential runbook (2-mode · chat-form · plan.md handoff)

Input: `$ARGUMENTS`

You are running **`/step-by-step`**: chat-disambiguate, lock the decision set,
write a plan document, and **hand off** to a background Agent that runs to
completion — the deliberate, single-threaded counterpart to `/cycle` (which
fans out in parallel). One thread, in order, top to bottom, but the
chat-form + agreement-screen + plan.md handoff is the primary path.

## Step 0 — parse mode + target

Read the FIRST whitespace-delimited token of the input. The TWO modes share
the SAME chat-form scaffold; they differ only in WHO picks the answer to each
round (user vs. 4-axis weighted average):

```
auto ─────────────────── manual
auto-pick per Q          user-picks per Q
(no user response)       (chat reply each round)
            ↓
       same agreement screen → same plan.md → same handoff
```

Token normalization (case-insensitive, first token only):

- `auto` → **AUTO** mode · default axis weights (complete=1, simple=1, safe=1, std=1) · task = remaining text.
- `auto:<axis>` (one of `complete` · `simple` · `safe` · `std`) → AUTO with that single axis forced (other three weighted 0); task = remaining text.
- `auto:<k>=<n>,<k>=<n>,...` → AUTO with explicit weights (axes default to 0 unless named); task = remaining text.
- `manual` → **MANUAL** mode (default chat-form); task = remaining text.
- `legacy-manual` → MANUAL mode, but emit a one-line deprecation banner FIRST:
  `⚠ legacy-manual is the old per-step pause behavior — being phased out; use plain manual for new chat-form default`
  Then proceed as MANUAL (chat-form).
- anything else (or input empty) → **MANUAL** mode (the default); task is the entire input.

(`go` is NOT a mode here — `/go` is a separate command for "continue the paused
flow / proceed with the last proposal". Don't conflate them.)

Then resolve the target:

- task text non-empty → the target is that text.
- task empty → the target is the current work in context. State your assumption
  in one line (the uncommitted diff, else the task under discussion, else the
  repo at cwd) and proceed — do not stop to ask. (Empty + non-trivial
  disambiguation needed → Step 0.5's first chat round asks the missing pieces.)

State the chosen mode in one line, e.g. `mode: manual (chat-form · plan.md handoff)` ·
`mode: auto (4-axis weighted: complete=1, simple=1, safe=1, std=1)`.

## Step 0.5 — chat-form disambiguation loop (BOTH modes)

Before locking the plan, drive ambiguity to ZERO. This is the "묻고 또 묻고" form
— keep asking until nothing is unclear.

**Form = CHAT, not selectbox.** AskUserQuestion's 4-option select-box stacks
up to 4 axes per round, which spikes cognitive load on design/teaching tasks
where the user is reasoning their way through unfamiliar territory. The
chat-form asks **ONE question per round** with the easy-style 7-element
scaffolding so each round is itself a tiny lesson. Free-form answers are
explicitly OK (`A` / `B` / `다른 안: <text>`) — the user is never funneled into
a fixed option grid.

1. **Enumerate** EVERY open question about the target: unclear requirements,
   unstated constraints, edge-case behavior, naming/location choices, scope
   boundaries, success criteria, which-of-several-interpretations, tradeoff
   preferences. Hold the list internally — do not dump it at the user; you'll
   feed them (or AUTO-pick) one at a time.

2. **Ask one at a time, in chat (NOT AskUserQuestion).** Each round is one
   question, formatted with the easy-mode 7 elements when the question is
   non-trivial:
   - **아이콘** — visual anchor for the axis (e.g. 🍳 🧶 🔌)
   - **이름 / 별칭** — the canonical axis name + friendly alias
   - **하는 일** — one-line plain restatement of what the choice controls
   - **비유** — everyday analogy (cooking / weaving / wiring …)
   - **ASCII** — fenced sketch of the option space (tree / side-by-side / before-after)
   - **비교 표** — option-by-option markdown table with the relevant axes
   - **추천** — one-line "I'd pick X because Y" (the user can override)
   Close every round with: `→ A · B · 또는 자유응답 (예: "다른 안: …")`.

   **MANUAL** — wait for the user's chat reply, record the answer to the
   internal decision set, advance.

   **AUTO** — IMMEDIATELY auto-pick using the 4-axis weighted average; do NOT
   pause for a user reply. The 4 axes:
   - **완성도 (complete)** — robustness · edge-case coverage · finished quality
   - **단순 (simple)** — Occam's razor · fewest moving parts · least surface area
   - **안전 (safe)** — blast radius minimized · reversible · narrow scope
   - **표준 (std)** — fits the established sidecar pattern (plugin shape · governance keys · concept separation)

   For each option, score 1-5 on each axis, multiply by the weights from
   Step 0's parse, sum, pick the highest. On a tie, prefer the recommendation
   from the `추천` line. Log one line after the auto-pick:
   `🤖 auto-pick Q<n>: <option> (axes — complete=X, simple=Y, safe=Z, std=W · weighted=<sum>)`.
   Then continue to the next round immediately.

3. After each round, re-scan: did the answer (user or auto-picked) resolve
   everything, or surface NEW questions? If new ambiguity appeared, ask
   another round (same chat scaffold). Repeat — round after round — until a
   scan finds **zero remaining ambiguity**.

4. Then proceed to **Step 0.6 (agreement screen)**. State
   `🔍 disambiguation: <N> rounds · ambiguity → 0` (AUTO: append
   `· auto-picked (weights: complete=…, simple=…, safe=…, std=…)`).

Do NOT fabricate answers in MANUAL — every unknown is a chat question.
In AUTO, the auto-pick IS the answer; the user can still override at the
agreement screen.

(Fallback — when chat doesn't fit, e.g. the question genuinely has a small
closed option set and the user has signalled they prefer the picker, you MAY
use AskUserQuestion for that one round in MANUAL only. The default is chat.)

## Step 0.6 — agreement screen ("🎯 이거 맞아요?")

Once `ambiguity → 0`, **do NOT jump straight to plan execution**. Render
the accumulated decision set as one ASCII tree so the user can confirm the
whole picture at a glance — the round-by-round chat scrolled by, but the
collected decisions are what plan execution will lock in.

```
🎯 합의된 결정셋 (N개)
┌─ Q1: <axis name>     → ✅ <chosen option>
├─ Q2: <axis name>     → ✅ <chosen option>
├─ Q3: <axis name>     → ✅ <chosen option>
└─ Qn: <axis name>     → ✅ <chosen option>

요약: <one-line restatement of what the plan will actually build>
plan 문서: drafts/<slug>-plan.md (생성 예정)
→ 맞으면 `go` · 수정은 `Qn=<다른 선택>` (예: `Q2=B` 또는 `Q3=다른 안: <text>`)
```

End the turn and wait for the user. On reply:

- **`go`** (or `예`/`yes`/`맞아`) — advance to Step 0.7 (plan.md + handoff).
- **`Qn=<X>`** — update ONLY that decision in the set, keep the others, then
  re-render the agreement screen. The user may flip several in sequence;
  each flip re-renders.
- **`Qn=다른 안: <text>`** — free-form revision; record + re-render.
- **substantive new ambiguity** in the reply ("그런데 X는 어떻게 하지?") —
  treat it as a new Step 0.5 round (chat-form, 7 elements, MANUAL waits /
  AUTO auto-picks per the original mode), then return to the agreement
  screen.

The agreement screen is the **last cheap checkpoint** before the plan
document is written and the background Agent fans out.

## Step 0.7 — plan.md generation + background handoff (on `go`)

On `go`, do the following IN ORDER and atomically (no pause between substeps):

1. **Derive slug** — from the task brief (kebab-case, ≤6 tokens, no
   punctuation). If ambiguous, ask once at the start of Step 0.5 as a chat
   round (so the slug is itself a recorded decision). Slug must match
   `[a-z0-9][a-z0-9-]*`.

2. **Ensure `drafts/` exists and is gitignored**:
   - If `drafts/` directory missing → create it.
   - If `.gitignore` lacks a `drafts/` line → append one (match the existing
     /draft skill pattern). If editing `.gitignore` is blocked
     (sign-gitignore gate / read-only), continue but emit a one-line warning:
     `⚠ drafts/ not in .gitignore — plan.md may commit accidentally`.

3. **Write `drafts/<slug>-plan.md`** with this layout (Write tool, not
   echo/heredoc):
   ```
   ---
   slug: <slug>
   mode: <manual|auto>
   auto-weights: complete=<n>, simple=<n>, safe=<n>, std=<n>   # AUTO only; omit in MANUAL
   created: <ISO date>
   ---

   # <slug> — plan

   ## task brief
   <one paragraph restating the task as understood>

   ## locked decisions
   - Q1 (<axis>): <chosen option>
   - Q2 (<axis>): <chosen option>
   - …

   ## next-action checklist
   - [ ] step 1: <…>
   - [ ] step 2: <…>
   - …
   - [ ] ship (explicit paths · Korean commit msg · sidecar sync after push)

   ## completion criteria
   <how the agent knows it is done — files touched, gates passed, ship landed>
   ```

4. **Launch a background Agent** (general-purpose Agent, `run_in_background=true`).
   Prompt = self-contained: the full plan.md contents, ship instructions
   (explicit paths, no force-push, Korean commit msg, run `sidecar sync`
   after push), completion criteria, and "report back when done." The Agent
   owns the work end-to-end with no further user input.

5. **Tell the user the handoff line** and end the turn:
   ```
   🚀 handoff: agent launched (id=<agent-id>) · plan saved to drafts/<slug>-plan.md · you can leave
   ```

After Step 0.7 you have nothing more to do in this session — the background
Agent will report when complete (or if it hits a hard halt). Do NOT poll;
do NOT continue inline.

## Step 0.8 — auto-QA 4축 (handoff agent의 ship 직후)

Ship 완료 직후 handoff agent가 자동 4축 검증을 실행한다. 각 축은
PASS/FAIL/SKIP — SKIP은 "해당 없음"(= PASS-equivalent, 통과로 간주).

| 축 | 묻는 것 | 실행 방법 |
|---|---|---|
| **functional** | 새 endpoint/verb/surface가 응답하는가? | 코드 실행 또는 smoke verb (없으면 SKIP) |
| **visible** | 사용자 진입 URL/path/surface 변화 노출? | render check (없으면 SKIP) |
| **conformance** | locked decision ↔ 코드 1:1 매핑 | spec ↔ diff 대조 (LLM judge) |
| **regression** | 기존 surface 미손상 | 영향 받는 plugin parse + smoke 재실행 |

**Fail 정책** (hybrid):
- regression FAIL → `git revert <ship-SHA> && git push && sidecar sync` 자동 실행 + 다음 사용자 turn에 banner `🛑 sbs-qa: regression FAIL — auto-reverted <SHA> · 자세한 내용 drafts/<slug>-plan.md`
- functional / visible / conformance FAIL → ship 유지 + plan.md `## qa-deferred` 섹션에 fail 사유 append + banner `🛑 sbs-qa: <axis> FAIL — alert only · see drafts/<slug>-plan.md` (다음 사용자 turn 첫 줄)
- SKIP = PASS-equivalent (자동 통과)
- ALL PASS/SKIP → banner 없음 · plan.md `## qa-results`에 ✓ 라인만 append · DONE

결과는 항상 `drafts/<slug>-plan.md`의 `## qa-results` (최신 위) + 필요 시
`## qa-deferred` 섹션에 기록. user가 돌아오면 plan.md 읽어 후속 결정.

## Step 1+ (fallback) — inline plan + execute (when chat-form is overkill)

When the task is trivially clear (no ambiguity surfaced in Step 0.5's first
scan), skip the agreement screen + handoff and run inline:

1. **Plan**: ordered, numbered, dependency-ordered steps (`📋 plan (N steps)`).
2. **Execute**: per step `▶ i/N — <step>` → work → `✅` / `⚠` / `❌`.
   - **AUTO** (inline fallback): no pause between steps — flow straight through.
   - **MANUAL** (inline fallback): after each step STOP — `⏸ step i/N done.
     next → … proceed? (continue / adjust / skip / stop)` — wait for user.

This fallback path keeps `/sbs` useful for tiny tasks where the chat-form
ceremony would itself be the bottleneck. The chat-form + handoff is the
primary path for non-trivial work.

## Halt conditions (ALL modes · ALL paths)

Regardless of mode or whether handoff is in play, stop and report — never
blindly continue — when:

- a step **fails** (`❌`): report which step, the verbatim error, and the
  remaining un-run steps; let the user decide.
- the next step is **irreversible, destructive, or outward-facing** (deploy,
  publish, force-push, mass-delete, send): pause for explicit confirmation,
  then resume. Same bar as the `bypass` self-check. In the handoff Agent
  this means the Agent reports back BEFORE executing such a step; in inline
  MANUAL every step already pauses; in inline AUTO the auto-flow stops here.

## Closure

After the last step (or when the run ends), print:

```
🏁 <done>/<N> steps complete
```

If it halted early, print where it stopped, why, and the remaining un-run tail.
