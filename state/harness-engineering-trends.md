# Agent Harness Engineering — Trend Research (snapshot: 2026-06)

> Web research synthesis on the state of "agent harness" engineering — the scaffolding that
> turns a raw LLM into an autonomous coding agent. Captured because sidecar IS a harness-engineering
> implementation; this note grounds where the field has converged and where sidecar leads/lags.
> Update-in-place as the field moves; history lives in git.

## TL;DR

The 2026 consensus: **models have converged, so the differentiator is now the harness.** The same
model weights run through different harnesses produce **42%–78%** on coding benchmarks — a swing of
10–20 percentage points attributable to scaffolding alone, not the model.

## 1. The paradigm migration (2022 → 2026)

Engineering rigor never disappeared — it relocated, layer by layer:

```
2022–24                 2025                    2026+
Prompt Engineering   →  Context Engineering  →  Harness Engineering
"what should I say?"    "what should I show?"   "what system should I build?"
CoT · ReAct ·           Write / Select /        "when the agent makes a mistake,
Ng's 4 patterns         Compress / Isolate;     change the system so that mistake
                        KV-cache hit rate        structurally cannot recur" (Hashimoto)
```

Each era's failure mode triggered the next discovery. Tobi Lütke (Jun 2025) crystallized the context
era; Mitchell Hashimoto's principle defines the harness era. Maps 1:1 to sidecar commons `root-cause`
("fix the cause, record the recurrence-learning to the SSOT so it can't be reintroduced").

## 2. Why the harness is the "secret sauce" — benchmark evidence

- Identical weights + different scaffold = 10–20 pp delta on SWE-bench; full range 42%→78%.
- 2026 leaderboards: SWE-bench Verified leader ~95.5%; SWE-bench Pro (public set) GPT-5.4 59.1%,
  vendor-reported Opus 4.8 69.2% on Anthropic's own scaffold.
- Every vendor measures on its OWN harness (tool defs, retry logic, context mgmt, prompting) — so
  cross-vendor score comparison without controlling for harness is meaningless.

## 3. The 12 harness primitives (industry-converged taxonomy) — sidecar mapping

| # | Primitive (2026 standard)        | sidecar surface                          | Status |
|---|----------------------------------|------------------------------------------|--------|
| 1 | Agent Loop (observe-plan-act-verify) | `sbs` · `cycle` runbooks             | full   |
| 2 | Planning / task decomposition    | `sbs` plan-first · `ING` board           | full   |
| 3 | Context delivery & compaction    | `inject` (commons/arch) + PreCompact     | full   |
| 4 | Tool design                      | `canonical-cli` rule                      | partial|
| 5 | Skills & MCP                     | `agentmemory-mcp` · `/cmd` shadow        | full   |
| 6 | Permissions / authorization      | `pre bash`/`pre write` guards · lockdown | full   |
| 7 | Memory & state                  | `agentmemory` 4-tier · ARCHITECTURE SSOT | full   |
| 8 | Task runners & orchestration     | `Workflow` · `fleet` · `abg`/`afg`       | full   |
| 9 | Verification & CI                | `ci` · `verdict` · `pr-cycle` gate       | full   |
| 10| Observability & tracing          | `.harness/` JSONL logs · `audit`         | partial|
| 11| Debugging & DX                   | `serve.py` viewer · `folder-docs`        | partial|
| 12| Human-in-the-loop                | 4-axis recommend box · ask guard         | full   |

Takeaway: sidecar already implements most of the converged taxonomy. Weak cells: (4) tool design
(structured-output annotations), (10) trajectory logging, (11) DX/inspectability.

## 4. Concrete patterns that hardened in 2026

- **PEV loop (Plan-Execute-Verify, gated)** — decomposition with acceptance criteria → pre-execution
  gate (validate tool calls/args/authz/workspace bounds before any action) → spec-alignment verify
  (catches architectural violations tests miss). sidecar = `sbs` + `pre` guards + `verify`/`ci`.
- **3-agent split (Planner / Generator / Evaluator)** — separate generation from grading so agents
  can't grade their own work (Anthropic, OpenAI Codex). sidecar = commons `verify-done`
  ("no LLM self-judgment").
- **Ralph pattern** — loop agents with CLEAN context resets; persist state in git history + filesystem
  rather than context-window bloat. sidecar = `ING.jsonl` (dedicated git ref) + `state/` single root.
- **Hooks = lifecycle events (27–30 types)** — Claude Code's harness rated "deepest"; the hook pipeline
  surfaces context compaction, subagent delegation, tool calls. sidecar wires
  PreToolUse/PostToolUse/UserPromptSubmit/Stop/PreCompact.

## 5. Security — two rules that became standard

- **Rule of Two (Meta) / Lethal Trifecta** — an agent must hold at most 2 of: (1) untrusted input,
  (2) sensitive-data access, (3) state modification / external comms. All three = inevitable incident.
- **Permission is structural**, not prompt-text — tool annotations (readOnlyHint, destructiveHint,
  idempotentHint, openWorldHint) and orchestration topology matter more than prompt warnings.
  sidecar = `no-escape-hatch` · `git-safety` guards (force-push block etc.).

## 6. Emerging vocabulary

- **NLAH (Natural-Language Agent Harness)** — externalize the harness as executable natural-language
  artifacts, not buried framework defaults. sidecar commons.md + runbooks ARE this form.
- **MCP Streamable HTTP** (remote MCP servers) · **A2A protocol / Agent Cards** (agent-to-agent
  discovery) · **AG-UI** (HITL UI event streaming).
- **Skills as optimizable parameters** — `SKILL.md` artifacts that self-refine from execution feedback,
  not static fragments. Includes negative examples.
- **Tool loadout** — beyond ~30 tools the model confuses overlapping descriptions; dynamically select
  per-query. (This session's ToolSearch is exactly that.)
- **Fowler/Böckeler 2×2** — feedforward×feedback × deterministic×non-deterministic:
  deterministic-feedforward = guides (AGENTS.md/.cursorrules); deterministic-feedback = compilers/linters;
  non-det-feedforward = behavioral system prompts; non-det-feedback = LLM-as-judge.

## 7. Sidecar gap candidates (observations, not committed work)

- (4) **Tool annotations** — feed `readOnlyHint/destructiveHint`-style structured metadata into guards.
- (10) **Trajectory logging** — extend `.harness/` JSONL to trajectory-analyzable form (revives the
  `audit` quality_gate / cost axes, which currently read 0 on sparse logs).
- **Skills self-refine** — move static runbooks toward execution-feedback-updated artifacts.

## Sources

- Anthropic 2026 Agentic Coding Trends Report — https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf
- awesome-harness-engineering (12 primitives taxonomy) — https://github.com/ai-boost/awesome-harness-engineering
- Augment Code — Harness Engineering 3-layer / PEV — https://www.augmentcode.com/guides/harness-engineering-ai-coding-agents
- From Prompts to Harnesses (4-year evolution) — https://bits-bytes-nn.github.io/insights/agentic-ai/2026/04/05/evolution-of-ai-agentic-patterns-en.html
- Faros — Harness Engineering 2026 — https://www.faros.ai/blog/harness-engineering
- Requesty — Claude Code vs Cursor vs Codex vs Aider 2026 — https://www.requesty.ai/blog/agentic-coding-tools-compared-2026-claude-code-cursor-codex-aider
- The New Stack — six months in — https://thenewstack.io/claude-code-vs-cursor-vs-codex-vs-antigravity-2026/
- Multi-Agent Orchestration: 5 Patterns (2026) — https://www.digitalapplied.com/blog/multi-agent-orchestration-5-patterns-that-work
- digitalapplied — SWE-bench vs Scaffolding reality — https://www.digitalapplied.com/blog/swe-bench-verified-june-2026-benchmark-vs-scaffolding-analysis
- LogRocket — LLM context problem 2026 — https://blog.logrocket.com/llm-context-problem-strategies-2026/
