---
description: /sbs — short alias for /step-by-step. Plan-first sequential runbook with TWO modes (auto · manual default) + 자동 QA 4축 (functional·visible·conformance·regression) after ship · regression FAIL → auto-revert · others → alert + plan.md `## qa-deferred` + 0.7.0 자동 HANDOFF.md 9-section 인계 doc (handoff agent ship+QA 직후 · plan 에 handoff verb 있으면 end-user dossier bundle 도 생성). MANUAL (default) — chat-form (1Q/round, easy-mode 7-element scaffold; free-form answers OK) until ambiguity → 0, then `🎯 합의된 결정셋` ASCII agreement screen, then write `drafts/<slug>-plan.md` and hand off to a background Agent on `go` (user can leave; agent ships end-to-end + auto-QA + HANDOFF.md). AUTO — same chat-form rendered, but each round AUTO-PICKED by 4-axis weighted average (완성도·단순·안전(blast radius)·표준; default 1:1:1:1, inline override `auto:safety` or `auto:complete=2,simple=3`). First arg `auto[:<axis-or-weights>]`|`manual` (default manual). `legacy-manual` = old per-step pause (1-version deprecation banner). (`go` is NOT a mode — `/go` is a separate continue-the-paused-flow command.)
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
   - Write `drafts/<slug>-plan.md` (frontmatter: slug · mode · `status: active`
     · auto-weights if AUTO · created date · then `## task brief` ·
     `## locked decisions` · `## next-action checklist` (ending with a
     `[ ] ship …` line) · `## completion criteria`).
   - `## locked decisions` bullets MAY carry a machine-readable contract:
     `- @L<n> (<axis>): <option> · assert:<kind> <arg>` where `<kind>` ∈
     `grep <pat>` (term present · `!pat` = absent) · `file <path>` (exists) ·
     `verdict <slug>/<id>` (`.verdicts/<slug>/<id>.txt` non-empty). The
     `plan-guard` plugin injects these verbatim into sub-agent prompts and
     runs `plan-lint` at ship. Plans with no `@L` lines are skipped
     (backward-compatible).
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

9. **HANDOFF.md 9-section 자동 작성 (handoff agent · QA 직후 · 보고 직전)** —
   다음 세션 AI 인계용 단일 문서를 작성한다. 위치: 레포가 `/domain` 컨벤션
   따르면 `domains/HANDOFF.md`, 아니면 레포 루트 `HANDOFF.md`. 9 섹션:
   (1) PR 진행 상태 매트릭스 `| # | title | status | merged | core |` ·
   (2) 설계 SSOT 파일 인덱스 (먼저 읽을 파일 bullet) ·
   (3) 새 API surface `| method | path | role | auth |` (없으면 한 줄 SKIP 표기) ·
   (4) 새 컴포넌트/lib 트리 (디렉토리 스케치) ·
   (5) 환경 변수 (활성화 전 필수) ·
   (6) 다음 우선순위 (open milestones + deferred + follow-up 정렬) ·
   (7) 알려진 한계 + guard rule pointer ·
   (8) memory/CLAUDE.md 인덱스 (관련 entry pointer · 없으면 (none)) ·
   (9) 한 줄 시작 가이드 (next-session 첫 command).

   **Trigger 키워드** (있으면 plan 복잡도 무관 강제 작성): `완전한 handoff` ·
   `handoff 모드` · `완전 구현` · `complete handoff` · `end-to-end handoff`.
   없을 시 휴리스틱: plan 의 PR ≥ 3 OR 변경 LOC ≥ 500 이면 작성, 아니면 SKIP
   + `handoff-doc: SKIP (small change)` 한 줄 plan.md `## qa-results` 아래 기록.

   **Memory mirror**: HANDOFF.md 작성 후 `~/.claude/projects/<project>/memory/
   project_<slug>_handoff.md` 한 줄 pointer + `MEMORY.md` 인덱스 한 줄 append.
   memory dir 없으면 silent skip.

   **Stacked PR-cycle hint** (관찰만): plan 이 N PR 이면 단일 worktree
   (`~/core/<repo>-pr-cycle`) 안 branch 갈아끼우는 패턴이 N 회 worktree
   create/teardown 보다 5-10× 빠름. 사이클: `git reset --hard origin/main &&
   git checkout -b feat/<n>` 매 PR. agent prompt 에 한 줄 hint 권장.

   ⏳ deferred (별도 cycle): pr-cycle hook 의 `gh pr merge --repo X` PR 번호
   누락 → exit 1 버그는 pr-cycle plugin 별도 cycle 에서 처리.

10. **end-user dossier (plan 에 `handoff` verb 있을 때만)** — plan checklist
    또는 task brief 가 end-user 대상 `handoff` verb 를 포함하면 (사용자가
    클릭 한 번에 받아 들고 나갈 실 산출물이 필요한 케이스), Step 9 의 AI
    인계 doc 와 **별도로** end-user dossier bundle 도 생성한다. 형식은 앱에
    따라 자유 — JSON dossier · zip · pdf · csv · download link 등 어느 것이든
    사용자가 손에 쥘 수 있으면 OK. sbs 가 강제하는 건: handoff verb 의
    구현이 user-deliverable 한 산출물을 produce 한다는 것. reference impl 한
    예 = HTTP API 가 dossier JSON 을 download 헤더로 반환 (`Content-
    Disposition: attachment`); 다른 형식 OK. 작성 결과는 plan.md
    `## qa-results` 에 `end-user-dossier: <path or url>` 한 줄로 기록.

    **두 패턴 공존**: AI handoff doc (Step 9) = handoff agent 가 항상 작성 ·
    end-user dossier (Step 10) = plan 에 handoff verb 있을 때만.
