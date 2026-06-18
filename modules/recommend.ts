// harness recommend {inject|show|set-default|clear-default|get-default|resolve-mode}
// 4-axis recommendation rubric (sidecar recommend-axes parity). `inject` emits
// config/recommend.md (the SSOT rule carrier — was recommend.tape; a plain
// Markdown carrier now, the .tape DSL is retired) + the active default-mode
// directive as additionalContext. `resolve-mode` is the deterministic mode
// resolver consumed by `harness sbs` (LOCKED precedence in code, not prose).
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { HARNESS_CONFIG_DIR, REPO_ROOT } from "../lib/paths.ts";
import { resolveRuleFile } from "../lib/config.ts";
import { readStdin } from "../lib/exec.ts";
import { info } from "../lib/log.ts";

// Standing default mode (one token), resolved with precedence:
//   per-repo .harness/recommend-default  (committed = team-shared, wins)
//   > global ~/.harness/recommend-default (host-wide — `set-default --global`)
//   > "present" (the original 4-axis-box behavior)
// The global tier is what makes a host-wide "공용 완성도" default actually
// inherit across every repo on the machine (sidecar uses ~/.sidecar host-state).
function defaultFile(): string {
  return resolve(REPO_ROOT, ".harness", "recommend-default");
}
function globalDefaultFile(): string {
  return resolve(homedir(), ".harness", "recommend-default");
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
  if (mode === "present") return "4축제시 (present · user picks)";
  if (mode === "auto") return "4축합의기준 자동 (auto-pick)";
  const a = axisLabel(mode);
  return a ? `임의 고정 선택 · auto-proceed — ${a}` : "";
}

function readDefault(): string {
  return readWithSource().mode;
}

function defaultDirective(): string {
  const mode = readDefault();
  if (mode === "present") return "";
  if (mode === "auto") {
    return "\n# default mode: AUTO (4축 합의기준 자동) — score the candidate options on ALL four axes (완성도·단순·안전·표준, 1–5, weighted avg 1:1:1:1, tie→안전), auto-pick the consensus winner, render the r2 box THEN one conclusion line `🤖 4축 auto-pick: <안> (완성도=X 단순=Y 안전=Z 표준=W · weighted=<sum>)`; decide for the user, do NOT wait (r4). ALSO governs /sbs when no explicit mode token is given.\n";
  }
  const a = axisLabel(mode);
  if (!a) return "";
  return `\n# default mode: FIXED ${a} (임의 고정 선택 · auto-proceed) — ★-mark this axis line IN PLACE in the r2 box + append \`  ← 기본값\`; STILL render all four lines, THEN AUTO-PROCEED with this axis's champion (decide, do NOT wait) + one conclusion line \`🤖 고정축 auto-pick: <안> (${a} 기준)\` (r4). ALSO governs /sbs with ${a} forced.\n`;
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
  if (!text) text = readFileSync(resolve(HARNESS_CONFIG_DIR, "recommend.md"), "utf8");
  return text + defaultDirective();
}

// ── resolve-mode: deterministic sbs mode resolver (LOCKED precedence) ─────────
const AXES = new Set(["complete", "simple", "safe", "std"]);
function balanced(): string {
  return "complete=1,simple=1,safe=1,std=1";
}
function axisWeights(axis: string): string {
  return AXES.has(axis)
    ? ["complete", "simple", "safe", "std"].map((a) => `${a}=${a === axis ? 1 : 0}`).join(",")
    : balanced();
}

function emitResolution(kind: string, axis: string, src: string, deprecation: boolean): void {
  let human = "";
  let mmode = "manual";
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
}

export function resolveMode(raw: string): void {
  const tok = raw.trim().split(/\s+/)[0] ?? "";
  const def = readDefault();
  if (tok === "manual") return emitResolution("manual", "-", "explicit", false);
  if (tok === "legacy-manual") return emitResolution("manual", "-", "explicit", true);
  if (tok.startsWith("auto:")) {
    const spec = tok.slice(5);
    if (AXES.has(spec)) return emitResolution("auto-axis", spec, "explicit", false);
    process.stdout.write(`mode: auto (4-axis weighted: ${spec})\n`);
    process.stdout.write(`resolved: mode=auto axis=- weights=${spec} source=explicit\n`);
    return;
  }
  if (tok === "auto") {
    if (AXES.has(def)) return emitResolution("auto-axis", def, "inherited", false);
    if (def === "auto") return emitResolution("auto-balanced", "-", "inherited", false);
    return emitResolution("auto-balanced", "-", "default", false);
  }
  // no mode token → inherit
  if (AXES.has(def)) return emitResolution("auto-axis", def, "inherited", false);
  if (def === "auto") return emitResolution("auto-balanced", "-", "inherited", false);
  return emitResolution("manual", "-", "default", false);
}

export async function runRecommend(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";

  if (sub === "inject") {
    try {
      const j = JSON.parse(readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      process.stdout.write(
        JSON.stringify({ hookSpecificOutput: { hookEventName: ev, additionalContext: body() } }) + "\n"
      );
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
      info("usage: harness recommend set-default <present|auto|complete|simple|safe|std> [--global]");
      return 1;
    }
    const f = isGlobal ? globalDefaultFile() : defaultFile();
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, mode + "\n", "utf8");
    info(`recommend default mode = ${modeLabel(mode)} [${isGlobal ? "global ~/.harness" : "repo .harness"}]`);
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
  info("usage: harness recommend {inject|show|set-default|clear-default|get-default|resolve-mode}");
  return 1;
}
