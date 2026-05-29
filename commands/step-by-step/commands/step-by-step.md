---
description: /step-by-step — plan-first sequential runbook with TWO modes (auto · manual default) + 자동 QA 4축 (functional·visible·conformance·regression) after ship · regression FAIL → auto-revert · others → alert + 0.7.0 자동 HANDOFF.md 9-section 인계 doc 작성 (handoff agent ship+QA 직후 · `plan.handoff` verb 있으면 end-user dossier bundle 도 생성). MANUAL (default) — chat-form disambiguation (1 question/round, 7-element easy scaffold; free-form answers OK) until ambiguity → 0, then a `🎯 합의된 결정셋` ASCII agreement screen, then write `drafts/<slug>-plan.md` and HAND OFF to a background Agent on `go` (user can leave; agent ships end-to-end + auto-QA + HANDOFF.md). AUTO — same chat-form scaffold rendered, but each question is AUTO-PICKED by the 4-axis weighted average (완성도 · 단순 · 안전(blast radius) · 표준(sidecar pattern fit); default 1:1:1:1, inline override `/sbs auto:safety <task>` or `/sbs auto:complete=2,simple=3 <task>`). First arg token `auto[:<axis-or-weights>]` | `manual` selects the mode (default manual). `legacy-manual` is the old per-step pause behavior — 1-version deprecation banner, use plain `manual`. `/sbs` is the short alias. (For "continue the paused flow" use the separate `/go` command, not a mode here.)
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
   status: active                                              # active | done | abandoned (plan-guard tracks `active`)
   auto-weights: complete=<n>, simple=<n>, safe=<n>, std=<n>   # AUTO only; omit in MANUAL
   created: <ISO date>
   ---

   # <slug> — plan

   ## task brief
   <one paragraph restating the task as understood>

   ## locked decisions
   - @L1 (<axis>): <chosen option> · assert:<grep:|file:|verdict:> <arg>
   - @L2 (<axis>): <chosen option> · assert:<grep:|file:|verdict:> <arg>
   - …

   ## next-action checklist
   - [ ] step 1: <…>
   - [ ] step 2: <…>
   - …
   - [ ] ship (explicit paths · Korean commit msg · sidecar sync after push)

   ## completion criteria
   <how the agent knows it is done — files touched, gates passed, ship landed>
   ```

   ### `@L<n> … assert:` — locked-decision machine-readable contract

   Each `## locked decisions` bullet MAY carry a machine-checkable assertion so
   the plan becomes a contract the `plan-guard` plugin can enforce (verbatim
   hook injection + ship-time `plan-lint`), not just prose a sub-agent can
   silently drift past. Form:

   ```
   - @L<n> (<axis>): <human-readable chosen option> · assert:<kind> <arg>
   ```

   - `@L<n>` — stable id (`@L1`, `@L2`, …), monotone, never reused within a plan.
   - `assert:<kind> <arg>` — the falsifier. THREE kinds:
     - `assert:grep <pattern>` — the locked term MUST appear somewhere in the
       checked surface (repo files, or the `--diff` file set). e.g.
       `assert:grep akida_backend_resolve` to lock an AKIDA-first decision.
       Prefix `!` to invert (`assert:grep !GPU` = the term must be ABSENT).
     - `assert:file <path>` — the path MUST exist (relative to repo root). e.g.
       `assert:file HEXAD/CHAT/coffeshop_akida.hexa`.
     - `assert:verdict <slug>/<id>` — a terminal verdict file
       `.verdicts/<slug>/<id>.txt` MUST exist and be non-empty (closure gate).
   - The human option text and the `assert:` clause are separated by ` · `.
   - One assert per `@L` line; add more `@L` lines for more locks.

   **Backward compatible** — a plan.md with NO `@L` lines (legacy `Q1`/`Q2`
   bullets) is simply skipped by `plan-lint` (no asserts → nothing to check →
   exit 0). Adding `@L` is opt-in; existing plans never break.

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

## Step 0.9 — HANDOFF.md 9-section 자동 작성 (handoff agent · auto-QA 직후 · 보고 직전)

ship + auto-QA 완료 직후, handoff agent는 **다음 세션 (AI 인계용) HANDOFF.md를
자동 작성**한다. user가 자리에 없어도 다음 세션이 두 번 일하지 않도록
9 섹션 단일 문서로 작업 결과를 굳히는 단계. **handoff agent 종료의 마지막
스텝** (plan.md `## qa-results` 기록 → HANDOFF.md → 보고 순).

**작성 위치 (canonical)**:
- 레포가 `/domain` 컨벤션 따르면 (즉 `domains/` 디렉토리 존재 또는 active
  domain이 `domains/<NAME>.md` 형태) → `domains/HANDOFF.md`
- 그 외 → 레포 루트 `HANDOFF.md`
- 기존 파일 존재 시 덮어쓰기 (현재 상태만 기록 · 히스토리는 `git log`)

**9 섹션** (생략 가능 = SKIP 표기, 비우지 말 것):

1. `## § PR 진행 상태 매트릭스` — `| # | title | status | merged | core |` 표. status
   = `merged`/`open`/`draft`/`closed`. plan 이 stacked PR 가 아니어도 최소 1 행
   (이번 ship 의 main commit/PR).
2. `## § 설계 SSOT 파일 인덱스` — 다음 세션이 먼저 읽어야 할 파일 경로 bullet
   리스트 (e.g. plan.md · 핵심 SKILL.md · 새 manifest tape · API spec).
3. `## § 새 API surface` — `| method | path | role | auth |` 표. 신규 endpoint
   없을 시 한 줄 `(none — no new API surface)` 로 SKIP 표기.
4. `## § 새 컴포넌트/lib 트리` — 신규 추가 디렉토리 스케치 (tree -L 2 형태,
   파일 수 많으면 핵심만). 없을 시 `(none)`.
5. `## § 환경 변수` — 활성화 전 export 필요 env vars (e.g. `OPENAI_API_KEY`,
   `HEXA_LANG`). 없을 시 `(none required)`.
6. `## § 다음 우선순위` — 정렬된 todo list. 소스 = active domain의 open
   milestones (`- [ ]`) + `## deferred` 섹션 + 이번 작업에서 발견한 follow-up.
7. `## § 알려진 한계 + guard rule` — 이번 ship 이 안 다룬 것 + 관련된 commons.tape
   `@D` 또는 project.tape governance rule pointer.
8. `## § memory/CLAUDE.md 인덱스` — `~/.claude/projects/<project>/memory/MEMORY.md`
   에서 이 작업과 관련된 entry pointer (e.g. `feedback:postcompact-survival`).
   매칭 없을 시 `(no related memory entries)`.
9. `## § 한 줄 시작 가이드` — 다음 세션이 즉시 실행할 첫 command 한 줄
   (e.g. `/domain set <NAME> && /cycle` · `cd <repo> && /go`).

**Trigger keywords — handoff doc 강제 작성** (이 키워드가 task brief에
포함되면 plan 복잡도와 무관하게 항상 HANDOFF.md 작성):

- `완전한 handoff` · `handoff 모드` · `완전 구현` · `complete handoff` · `end-to-end handoff`

키워드 없을 시 휴리스틱: plan 의 PR 개수 ≥ 3 OR 변경 LOC ≥ 500 이면 작성, 아니면
SKIP. SKIP 시 plan.md `## qa-results` 아래 한 줄 `handoff-doc: SKIP (small change)`.

**Memory mirror** (HANDOFF.md 작성 후 추가 스텝):
- `~/.claude/projects/<project>/memory/project_<slug>_handoff.md` 한 줄 pointer
  생성 (`# project:<slug>-handoff\n\nSee <repo>/HANDOFF.md (or
  domains/HANDOFF.md).`). project dir 없으면 silent skip.
- 동 디렉토리 `MEMORY.md` 인덱스에 한 줄 `- project:<slug>-handoff —
  [<slug> 인계](project_<slug>_handoff.md): <task one-line>` append.
  MEMORY.md 없으면 silent skip.

**Stacked PR-cycle 효율 hint** (관찰만 · 강제 X):
plan 이 N 개 stacked PR 이라면, **단일 worktree** (`~/core/<repo>-pr-cycle`)
안에서 branch 갈아끼우는 패턴이 N 회 worktree 생성/제거보다 5-10× 빠르다
(실측: 7 PR ~6 분). 매 PR 사이클:
`git reset --hard origin/main && git checkout -b feat/<n>`. agent prompt에
이 hint 한 줄 포함 권장.

**Deferred** (별도 cycle):
`gh pr merge --repo X` PR 번호 누락 → exit 1 버그는 pr-cycle plugin 별도
cycle 에서 처리. sbs skill 가 PR 번호 캡처해 명시적 `gh pr merge <N> --repo X`
폴백 발사하는 fix 는 ⏳ deferred — pr-cycle plugin cycle 에 위임.

## Step 0.10 — end-user dossier (plan 에 `handoff` verb 가 있을 때만)

plan 의 next-action checklist 또는 task brief 에 **end-user 대상 `handoff`
verb** 가 포함되면 (i.e. 사용자가 클릭 한 번으로 받아 들고 나갈 산출물이
필요한 케이스), Step 0.9 의 AI 인계 doc 와 **별도로** end-user 대상 dossier
bundle 도 생성한다.

**generic spec** (domain-agnostic):

- sbs 의 `handoff` verb = "end-user 가 download / click-to-receive 가능한
  실 산출물 (dossier bundle) 을 만든다" 는 의미.
- 형식은 앱에 따라 자유 — JSON dossier · zip · pdf · csv export · download
  link · 무엇이든 사용자가 클릭해 가질 수 있으면 OK.
- sbs 가 강제하는 건 한 가지: **handoff verb 의 구현이 사용자가 손에 쥘 수
  있는 무언가를 produce 한다.**
- reference impl 한 예: HTTP API 가 dossier JSON 을 다운로드로 반환
  (`Content-Disposition: attachment` · `{ uid, generated_at, records[],
  manifest{...} }`). 단순 한 예시일 뿐 — 강제 X.

**두 패턴 공존**:
- **AI handoff doc** (Step 0.9) = handoff agent 가 **항상** 작성 (다음 세션
  AI 가 이어받기 위한 인계 문서).
- **end-user dossier** (Step 0.10) = plan 에 `handoff` verb 가 있을 때만
  생성 (앱 사용자가 클릭해 가져갈 실 산출물).

dossier 생성도 plan 의 한 step 으로 잡혀 있어야 하고 (handoff verb 자체가
plan checklist 에 들어가 있어야 한다), 작성 결과는 plan.md `## qa-results`
에 `end-user-dossier: <path or url>` 한 줄로 기록한다.

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
