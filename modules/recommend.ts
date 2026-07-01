// sidecar recommend {inject|show|set-default|clear-default|get-default|resolve-mode}
// 4-axis recommendation rubric. `inject` emits
// config/recommend.md (the SSOT rule carrier — was recommend.tape; a plain
// Markdown carrier now, the .tape DSL is retired) + the active default-mode
// directive as additionalContext. `resolve-mode` is the deterministic mode
// resolver consumed by `sidecar sbs` (LOCKED precedence in code, not prose).
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { emitInject } from "../lib/inject.ts";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { SIDECAR_CONFIG_DIR, REPO_ROOT } from "../lib/paths.ts";
import { resolveRuleFile } from "../lib/config.ts";
import { readStdin } from "../lib/exec.ts";
import { info } from "../lib/log.ts";

// Standing default mode (one token), resolved with precedence:
//   per-repo .harness/recommend-default  (committed = team-shared, wins)
//   > global ~/.sidecar/recommend-default (host-wide — `set-default --global`)
//   > "present" (the original 4-axis-box behavior)
// The global tier is what makes a host-wide "공용 완성도" default actually
// inherit across every repo on the machine.
function defaultFile(): string {
  return resolve(REPO_ROOT, ".harness", "recommend-default");
}
function globalDefaultFile(): string {
  return resolve(homedir(), ".sidecar", "recommend-default");
}
function readWithSource(): { mode: string; source: "repo" | "global" | "none" } {
  for (const [f, src] of [[defaultFile(), "repo"], [globalDefaultFile(), "global"]] as const) {
    if (existsSync(f)) {
      const v = readFileSync(f, "utf8").trim();
      if (v) return { mode: v, source: src };
    }
  }
  return { mode: "present", source: "none" };
}

function axisLabel(axis: string): string {
  return (
    { complete: "① 완성도(complete)", simple: "② 단순(simple)", safe: "③ 안전(safe)", std: "④ 표준(std)" }[axis] ?? ""
  );
}

function modeLabel(mode: string): string {
  const p = parseMode(mode);
  if (!p) return "";
  if (p.kind === "present") return "4축제시 (present · user picks)";
  if (p.kind === "auto") return "4축합의기준 자동 (auto-pick)";
  const labels = p.axes.map(axisLabel).join(" + ");
  return p.axes.length === 1
    ? `임의 고정 선택 · auto-proceed — ${labels}`
    : `복수 고정 선택 · auto-proceed (선택축만 채점) — ${labels}`;
}

function readDefault(): string {
  return readWithSource().mode;
}

const HARD_STOP_LINE =
  "# ⛔ HARD STOP RULE — the LAST thing in your reply MUST be the actual work (a tool call, the executed change, or its result) — NEVER the box or the `🤖 ... auto-pick` line. If you notice you are about to end the turn right after the auto-pick conclusion, THAT is the bug: keep going and DO the picked champion now. A Stop-hook backstop (`recommend stop-check`) will detect a turn that ends on the box and force you to continue — don't make it have to.\n";

function defaultDirective(): string {
  const p = parseMode(readDefault());
  if (!p || p.kind === "present") return "";
  if (p.kind === "auto") {
    return "\n# default mode: AUTO (4축 합의기준 자동) — score the candidate options on ALL four axes (완성도·단순·안전·표준, 1–5, weighted avg 1:1:1:1, tie→안전), auto-pick the consensus winner, render the r2 box THEN one conclusion line `🤖 4축 auto-pick: <안> (완성도=X 단순=Y 안전=Z 표준=W · weighted=<sum>)`; decide for the user, do NOT wait (r4). ALSO governs /sbs when no explicit mode token is given.\n# ⛔ HARD STOP RULE — the LAST thing in your reply MUST be the actual work (a tool call / the executed change / its result) — NEVER the box or the `🤖 ... auto-pick` line. Ending the turn right after the auto-pick conclusion is the bug: keep going and DO the picked winner now. A Stop-hook backstop (`recommend stop-check`) will force you to continue if you stop on the box.\n";
  }
  // ── FIXED-AXIS (single) — forced champion of one axis (original behavior) ──
  if (p.axes.length === 1) {
    const a = axisLabel(p.axes[0]);
    return `\n# default mode: FIXED ${a} (STANDING SELECTION · auto-proceed) — ⚡ BEHAVIORAL MANDATE FIRST: a standing selection (${a}) is already set, so the 4-axis box is informational ONLY and is NEVER a stop point — in the SAME turn AUTO-PROCEED with this axis's champion and CONTINUE straight into executing it; do NOT end your turn on the box, do NOT ask "진행할까요?", do NOT wait for a re-pick (the user already chose this axis = the selection). Then render the box for trade-off visibility: ★-mark this axis line IN PLACE + append \`  ← 기본값\`, STILL render all four lines, + one conclusion line \`🤖 고정축 auto-pick: <안> (${a} 기준)\` immediately followed by the actual work (r4). ALSO governs /sbs with ${a} forced.\n${HARD_STOP_LINE}`;
  }
  // ── FIXED-MULTI — score across ONLY the selected axes, auto-pick consensus ──
  const labels = p.axes.map(axisLabel).join(" + ");
  const plain = p.axes.map((x) => ({ complete: "완성도", simple: "단순", safe: "안전", std: "표준" }[x])).join("·");
  const tie = p.axes.includes("safe") ? "안전" : axisLabel(p.axes[0]).replace(/^[①②③④]\s*/, "").replace(/\(.*/, "");
  return `\n# default mode: FIXED-MULTI [${labels}] (STANDING SELECTION · auto-proceed) — ⚡ BEHAVIORAL MANDATE FIRST: a standing MULTI-axis selection (${labels}) is set, so the 4-axis box is informational ONLY and is NEVER a stop point. Score the candidate options on ONLY the selected axes (${plain}, 1–5, equal weight among the selected · the unselected axes weight 0), auto-pick the consensus winner among them (tie→${tie}), and in the SAME turn AUTO-PROCEED with that pick and CONTINUE straight into executing it; do NOT end your turn on the box, do NOT ask "진행할까요?", do NOT wait for a re-pick (the user already chose THESE axes = the selection). Then render the box for trade-off visibility: ★-mark EACH selected axis line IN PLACE (numbering ①②③④ unchanged) + append \`  ← 기본값\` to every selected line, STILL render all four lines, + one conclusion line \`🤖 복수고정축 auto-pick: <안> (${labels} 기준 · 선택축만 채점)\` immediately followed by the actual work (r4). ALSO governs /sbs with these axes forced.\n${HARD_STOP_LINE}`;
}

// ── stop-check: forcing backstop for auto-proceed (precise) ──────────────────
// The every-turn default-mode directive (above) mandates proceeding past the 4-axis
// box in auto/fixed-axis mode. This Stop hook is the TEETH: if the turn genuinely
// ENDED on the box (the last assistant text literally terminates on an auto-pick /
// box-border line, with no work after) while a non-present default is active, it emits
// a Stop `decision:block` so Claude Code re-invokes the model to actually do the work.
//
// PRECISION: the block fires ONLY on a true box-stop — `endsOnBox` checks the LAST
// ~2 non-empty lines, so a normal turn (box for visibility, THEN the actual change /
// a summary) does NOT trip it. That's what reconciles "no Stop-hook-error noise" with
// "auto-proceed is enforced": in correct operation it never fires (no error label);
// when you genuinely stop on the box (the thing being prevented) it forces you on.
//
// Loop guard is NATIVE: Claude Code sets `stop_hook_active:true` on the payload of
// a Stop that was itself triggered by a prior Stop-block — we bail on that, so we
// nudge at most ONCE per chain (no marker file needed).
const AUTOPICK_RE = /🤖[^\n]*auto-pick/; // the conclusion line emitted only on a real auto-pick
const BOX_TAIL_RE = /(🤖[^\n]*auto-pick|^[│└┌├].*추천|추천 \(4축\)|^└[─]{3,})/m;

// Pull the text of the LAST assistant message from a transcript JSONL file.
// Exported so other Stop-hook scanners (e.g. architecture convergence stop-check)
// reuse one transcript reader instead of duplicating the JSONL parse.
export function lastAssistantText(transcriptPath: string): string {
  let raw = "";
  try {
    raw = readFileSync(transcriptPath, "utf8");
  } catch {
    return "";
  }
  let last = "";
  for (const line of raw.split("\n")) {
    const s = line.trim();
    if (!s) continue;
    let j: any;
    try {
      j = JSON.parse(s);
    } catch {
      continue;
    }
    const type = j.type ?? j.message?.role;
    if (type !== "assistant") continue;
    const content = j.message?.content ?? j.content;
    let text = "";
    if (typeof content === "string") text = content;
    else if (Array.isArray(content))
      text = content
        .filter((c: any) => c && (c.type === "text" || typeof c.text === "string"))
        .map((c: any) => c.text ?? "")
        .join("\n");
    if (text.trim()) last = text;
  }
  return last;
}

// True when the message TERMINATES on the recommendation box (premature stop): the
// reply must contain a real auto-pick AND its LAST ~2 non-empty lines are the box /
// auto-pick marker, i.e. nothing of substance follows. Tight tail (2, not 6) so the
// normal shape "box for visibility → THEN the actual work / a summary" does NOT trip —
// only a reply that literally ends on the box does.
function endsOnBox(text: string): boolean {
  if (!text || !AUTOPICK_RE.test(text)) return false; // no real auto-pick rendered at all
  const lines = text.replace(/\s+$/, "").split("\n");
  const tail = lines.filter((l) => l.trim()).slice(-2).join("\n");
  return BOX_TAIL_RE.test(tail);
}

// Stop-hook entry. Reads the Stop payload (stdin JSON), and if a non-present
// default mode is active AND the turn ended on the box, blocks to force the model
// to proceed with the auto-picked champion. Best-effort: any parse/IO failure is a
// silent no-op (never wedge a session on this backstop).
function runStopCheck(): number {
  let payload: any;
  try {
    payload = JSON.parse(readStdin());
  } catch {
    return 0;
  }
  if (payload?.stop_hook_active) return 0; // native loop guard — we already nudged
  const mode = readDefault();
  const p = parseMode(mode);
  if (!p || p.kind === "present") return 0; // present = stopping on the box IS correct
  const tp = payload?.transcript_path ?? payload?.transcriptPath;
  if (!tp) return 0;
  if (!endsOnBox(lastAssistantText(String(tp)))) return 0;
  const label = p.kind === "auto" ? "4축 합의" : p.axes.map(axisLabel).join(" + ");
  const reason =
    `당신의 답변이 추천 4축 박스 / \`🤖 ... auto-pick\` 줄에서 끝났다 — 그건 멈출 지점이 아니다 ` +
    `(default mode=${mode} · ${label} = standing selection). ` +
    `지금 그 auto-pick 챔피언을 실제로 실행하라(되묻지 말 것) — 그 작업의 도구 호출/변경/결과로 이어가라. ` +
    `로컬·가역·비파괴면 anti-punt 로 그냥 진행.`;
  // decision:block = FORCE the model to continue. Fires ONLY on a true box-stop (endsOnBox
  // tail=2), so in correct operation it never triggers (no "Stop hook error" noise); when
  // you genuinely end on the box it re-invokes you to do the picked champion. Native loop
  // guard (stop_hook_active) caps it at once per chain.
  process.stdout.write(JSON.stringify({ decision: "block", reason }) + "\n");
  return 0;
}

function body(): string {
  // recommend.md carries the MUST-FOLLOW header itself (first line), so we just
  // append the active default-mode directive. (per-repo .harness override honored.)
  const md = resolveRuleFile("recommend.md", "recommend.md");
  let text = "";
  try {
    text = readFileSync(md, "utf8");
  } catch {
    text = "";
  }
  if (!text) text = readFileSync(resolve(SIDECAR_CONFIG_DIR, "recommend.md"), "utf8");
  return text + defaultDirective();
}

// ── resolve-mode: deterministic sbs mode resolver (LOCKED precedence) ─────────
const AXIS_ORDER = ["complete", "simple", "safe", "std"] as const;
const AXES = new Set<string>(AXIS_ORDER);

// Parse a stored default-mode token into a normalized shape. Accepts a SINGLE
// axis (complete), the all-axis modes (present · auto), AND a MULTI-axis combo
// joined by `+` or `,` (e.g. complete+std = "score across just these axes").
// Returns null on an unrecognized token — also used as the set-default validator.
function parseMode(mode: string): { kind: "present" | "auto" | "axes"; axes: string[] } | null {
  const m = (mode ?? "").trim();
  if (!m || m === "present") return { kind: "present", axes: [] };
  if (m === "auto") return { kind: "auto", axes: [...AXIS_ORDER] };
  const parts = m.split(/[+,]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0 || !parts.every((x) => AXES.has(x))) return null;
  // dedupe + force canonical ①②③④ order regardless of how the user typed it
  const axes = AXIS_ORDER.filter((a) => parts.includes(a));
  return { kind: "axes", axes };
}

// Weights string for a multi-axis selection: selected axes = 1, the rest = 0.
function multiAxisWeights(axes: string[]): string {
  return AXIS_ORDER.map((a) => `${a}=${axes.includes(a) ? 1 : 0}`).join(",");
}

function balanced(): string {
  return "complete=1,simple=1,safe=1,std=1";
}
function axisWeights(axis: string): string {
  return AXES.has(axis) ? AXIS_ORDER.map((a) => `${a}=${a === axis ? 1 : 0}`).join(",") : balanced();
}

// Structured resolution returned to callers (e.g. `sidecar sbs`) so they can
// branch deterministically on the mode instead of re-parsing the printed lines.
export type SbsResolution = { mode: "auto" | "manual"; axis: string; weights: string; source: string };

function emitResolution(kind: string, axis: string, src: string, deprecation: boolean): SbsResolution {
  let human = "";
  let mmode: "auto" | "manual" = "manual";
  let maxis = "-";
  let mweights = "-";
  if (kind === "auto-axis") {
    mmode = "auto";
    maxis = axis;
    mweights = axisWeights(axis);
    human = `mode: auto (4-axis: ${axis} forced)`;
  } else if (kind === "auto-balanced") {
    mmode = "auto";
    mweights = balanced();
    human = "mode: auto (4-axis weighted: complete=1, simple=1, safe=1, std=1)";
  } else {
    human = "mode: manual (chat-form · plan.md handoff)";
  }
  if (src === "inherited") human += " ← inherited from recommend-default";
  if (deprecation) process.stdout.write("⚠ legacy-manual is the old per-step pause — use plain manual\n");
  process.stdout.write(human + "\n");
  process.stdout.write(`resolved: mode=${mmode} axis=${maxis} weights=${mweights} source=${src}\n`);
  return { mode: mmode, axis: maxis, weights: mweights, source: src };
}

// Map a stored default-mode token to an sbs resolution (or null for present →
// the caller supplies the no-default fallback). Honors single-axis, multi-axis,
// and auto. A multi-axis default resolves to weighted auto over the selected axes.
function resolveFromDefault(def: string, src: string): SbsResolution | null {
  const p = parseMode(def);
  if (!p || p.kind === "present") return null;
  if (p.kind === "auto") return emitResolution("auto-balanced", "-", src, false);
  if (p.axes.length === 1) return emitResolution("auto-axis", p.axes[0], src, false);
  const weights = multiAxisWeights(p.axes);
  const human = `mode: auto (4-axis weighted: ${weights})${src === "inherited" ? " ← inherited from recommend-default" : ""}`;
  process.stdout.write(human + "\n");
  process.stdout.write(`resolved: mode=auto axis=- weights=${weights} source=${src}\n`);
  return { mode: "auto", axis: "-", weights, source: src };
}

export function resolveMode(raw: string): SbsResolution {
  const tok = raw.trim().split(/\s+/)[0] ?? "";
  const def = readDefault();
  if (tok === "manual") return emitResolution("manual", "-", "explicit", false);
  if (tok === "legacy-manual") return emitResolution("manual", "-", "explicit", true);
  if (tok.startsWith("auto:")) {
    const spec = tok.slice(5);
    if (AXES.has(spec)) return emitResolution("auto-axis", spec, "explicit", false);
    // explicit multi-axis combo (auto:complete+std) → weighted auto over those axes
    const p = parseMode(spec);
    const weights = p && p.kind === "axes" ? multiAxisWeights(p.axes) : spec;
    process.stdout.write(`mode: auto (4-axis weighted: ${weights})\n`);
    process.stdout.write(`resolved: mode=auto axis=- weights=${weights} source=explicit\n`);
    return { mode: "auto", axis: "-", weights, source: "explicit" };
  }
  if (tok === "auto") {
    return resolveFromDefault(def, "inherited") ?? emitResolution("auto-balanced", "-", "default", false);
  }
  // no mode token → inherit
  return resolveFromDefault(def, "inherited") ?? emitResolution("manual", "-", "default", false);
}

export async function runRecommend(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";

  if (sub === "inject") {
    try {
      const j = JSON.parse(readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      emitInject("recommend", ev, body());
    } catch {
      return 0;
    }
    return 0;
  }
  if (sub === "show") {
    process.stdout.write(body());
    return 0;
  }
  if (sub === "set-default") {
    const isGlobal = args.includes("--global") || args.includes("-g");
    const mode = (args.slice(1).find((a) => !a.startsWith("-")) ?? "").trim();
    if (!modeLabel(mode)) {
      info("usage: sidecar recommend set-default <present|auto|complete|simple|safe|std|combo e.g. complete+std> [--global]");
      return 1;
    }
    const f = isGlobal ? globalDefaultFile() : defaultFile();
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, mode + "\n", "utf8");
    info(`recommend default mode = ${modeLabel(mode)} [${isGlobal ? "global ~/.sidecar" : "repo .harness"}]`);
    if (!isGlobal && existsSync(globalDefaultFile())) info("  note: a global default also exists; the repo default takes precedence here.");
    return 0;
  }
  if (sub === "clear-default") {
    const isGlobal = args.includes("--global") || args.includes("-g");
    const f = isGlobal ? globalDefaultFile() : defaultFile();
    if (existsSync(f)) rmSync(f);
    info(`recommend default [${isGlobal ? "global" : "repo"}] cleared → effective: ${modeLabel(readDefault())}`);
    return 0;
  }
  if (sub === "get-default") {
    const { mode, source } = readWithSource();
    info(`recommend default mode = ${modeLabel(mode)} [source: ${source}]`);
    return 0;
  }
  if (sub === "resolve-mode") {
    resolveMode(args.slice(1).join(" "));
    return 0;
  }
  if (sub === "stop-check") {
    return runStopCheck();
  }
  info("usage: sidecar recommend {inject|show|set-default|clear-default|get-default|resolve-mode|stop-check}");
  return 1;
}
