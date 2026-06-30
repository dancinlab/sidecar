// sidecar — Pi coding-agent bridge extension.
//
// Wires the SAME project-agnostic `sidecar` CLI into Pi (badlogic/earendil-works
// pi-coding-agent) that the Claude Code plugin wires via hooks/hooks.json. The CLI
// (modules/*.ts) is the shared engine and is NOT touched; this file is the Pi-side
// translator: it maps Pi lifecycle events onto the same `sidecar <verb>` calls and
// converts the CLI's Claude-Code-shaped output (hookSpecificOutput.additionalContext /
// permissionDecision:"deny") into Pi's return shapes ({ message } / { block }).
//
// Surface parity with the CC plugin (hooks/hooks.json):
//   CC UserPromptSubmit (per-turn injects + prompt-scan)  -> Pi before_agent_start
//   CC SessionStart (once-per-session injects + worktree gc) -> Pi session_start + first before_agent_start
//   CC PreToolUse (Bash/Write/Edit/Read/MCP guards)        -> Pi tool_call (can block)
//   CC PostToolUse (Write|Edit doc reminders)              -> Pi tool_result (advisory)
//   CC Stop (hard stop-gates that force a re-turn)         -> NOT bridged: Pi has no
//     blocking stop hook (agent_end cannot force continuation). The per-turn injects
//     re-assert the same rules every turn, so governance salience is preserved; only
//     the hard stop-gate teeth (recommend/ing/architecture stop-check) are CC-exclusive.
//
// Placement: `~/.pi/agent/extensions/sidecar.ts` (auto-discovered, /reload-able).
// `sidecar pi install` symlinks it there from the global CLI clone so `sidecar
// self-update` refreshes it together with the engine. Resolves the `sidecar` binary
// from PATH (the global ~/.sidecar/cli + ~/.local/bin install); silent no-op if absent.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { spawn, spawnSync } from "node:child_process";

// --- sidecar CLI resolution (PATH global binary · canonical-cli) -----------------
let cachedBin: string | null | undefined;
function sidecarBin(): string | null {
  if (cachedBin !== undefined) return cachedBin;
  const r = spawnSync("sh", ["-c", "command -v sidecar"], { encoding: "utf8" });
  const p = (r.stdout ?? "").trim();
  cachedBin = r.status === 0 && p ? p : null;
  return cachedBin;
}

interface VerbResult { stdout: string; stderr: string; status: number }

// Run `sidecar <args>` async (so per-turn injects can fan out in parallel — a handful
// of sequential `tsx` cold-starts would add seconds per turn). `input` is piped on
// stdin (the carrier `sidecar pre <kind>` reads tool payloads from). All failure modes
// (spawn throw, child error, timeout) resolve to a result — runVerb never rejects, so
// callers need no error branch.
function runVerb(bin: string, args: string[], cwd: string, input?: string): Promise<VerbResult> {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(bin, args, { cwd, env: process.env });
    } catch (e) {
      resolve({ stdout: "", stderr: String((e as Error)?.message ?? e), status: 1 });
      return;
    }
    let out = "", err = "";
    const killer = setTimeout(() => child.kill("SIGKILL"), 15_000);
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", (e) => { clearTimeout(killer); resolve({ stdout: "", stderr: String((e as Error)?.message ?? e), status: 1 }); });
    child.on("close", (code) => { clearTimeout(killer); resolve({ stdout: out, stderr: err, status: code ?? 0 }); });
    if (input !== undefined) child.stdin.write(input);
    child.stdin.end();
  });
}

// Pull the model-visible context out of a verb's output. Two carriers exist, matching
// how CC reads hooks: most inject verbs (commons/recommend/…) wrap the text in
// {hookSpecificOutput:{additionalContext}} on stdout, while plain-text injects
// (toolkit/companions) print raw markdown to stdout (CC SessionStart treats raw stdout
// as context). prompt-scan writes advisory text to stderr. We prefer the JSON carrier;
// when no additionalContext JSON is present we fall back to the raw stdout text.
// `includeStderr` folds stderr in (used for the `prompt` verb).
function extractContext(r: VerbResult, includeStderr = false): string {
  const json: string[] = [];
  for (const line of r.stdout.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    try {
      const j = JSON.parse(t) as Record<string, any>;
      const ac = j?.hookSpecificOutput?.additionalContext ?? j?.additionalContext;
      if (typeof ac === "string" && ac.trim()) json.push(ac);
    } catch { /* not a JSON line — skip it */ }
  }
  const parts: string[] = [];
  if (json.length) parts.push(json.join("\n\n"));
  else if (r.stdout.trim()) parts.push(r.stdout.trim()); // plain-text inject (toolkit/companions)
  if (includeStderr && r.stderr.trim()) parts.push(r.stderr.trim());
  return parts.join("\n\n");
}

// A deny is signalled by the current CC schema (hookSpecificOutput.permissionDecision
// === "deny") with the legacy {decision:"block"} appended for old builds.
function extractBlock(r: VerbResult): { reason: string } | null {
  for (const line of r.stdout.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    try {
      const j = JSON.parse(t) as Record<string, any>;
      const hs = j?.hookSpecificOutput;
      if (hs?.permissionDecision === "deny") return { reason: hs.permissionDecisionReason ?? "blocked by sidecar" };
      if (j?.decision === "block") return { reason: j.reason ?? "blocked by sidecar" };
    } catch { /* not a JSON line — skip it */ }
  }
  return null;
}

// CC UserPromptSubmit inject set (run EVERY turn).
const PER_TURN: string[][] = [
  ["commons", "inject"], ["claudemd", "inject"], ["recommend", "inject"],
  ["prefs", "inject"], ["easy", "inject"], ["load", "inject"], ["ing", "inject"],
];
// CC SessionStart-only inject set (run ONCE per session — first turn).
const SESSION_ONCE: string[][] = [
  ["architecture", "inject"], ["git-context", "inject"],
  ["toolkit", "inject"], ["companions", "inject"],
];

// Map a Pi built-in tool name -> (sidecar pre kind, CC-shaped tool_input). Pi uses
// `path`; the CC carrier (pre.ts) reads `file_path`, so we alias both. MCP/custom tools
// route to the annotation guard (`pre tool`).
function mapTool(toolName: string, input: Record<string, any>): { kind: string; toolInput: Record<string, any> } {
  const i = input ?? {};
  switch (toolName) {
    case "bash":
      return { kind: "bash", toolInput: { command: i.command ?? "" } };
    case "write":
    case "edit":
    case "multi_edit":
      return { kind: "write", toolInput: { ...i, file_path: i.path ?? i.file_path ?? "", content: i.content ?? "" } };
    case "read":
      return { kind: "touch", toolInput: { ...i, file_path: i.path ?? i.file_path ?? "" } };
    default:
      return { kind: "tool", toolInput: { ...i } };
  }
}

export default function (pi: ExtensionAPI) {
  let sessionInjected = false;

  // SessionStart housekeeping: worktree gc (fire-and-forget · advisory).
  pi.on("session_start", async (event: any, ctx: any) => {
    const bin = sidecarBin();
    if (!bin) return;
    if (event?.reason === "reload") sessionInjected = false; // re-emit session injects after /reload
    void runVerb(bin, ["worktree", "gc"], ctx.cwd);
  });

  // UserPromptSubmit parity: per-turn injects + prompt-scan, plus session-once injects
  // on the first turn. All run in parallel; concatenated into one invisible context msg.
  pi.on("before_agent_start", async (event: any, ctx: any) => {
    const bin = sidecarBin();
    if (!bin) return;
    const cwd = ctx.cwd;
    const jobs: Promise<string>[] = [];

    // prompt-scan reads its text from argv (not stdin) and writes advisory text to stderr.
    if (event?.prompt) {
      jobs.push(runVerb(bin, ["prompt", String(event.prompt)], cwd).then((r) => extractContext(r, true)));
    }
    // Inject verbs read the hook event JSON from STDIN and key their output's
    // hookEventName off `hook_event_name` — emitting nothing without it (CC relies on
    // run.sh inheriting the piped hook payload). So we synthesize the carrier here.
    // Some injects carry their text on stdout (JSON additionalContext), others on
    // stderr (toolkit/companions) — extractContext(.., true) folds in both.
    const PER_TURN_EV = JSON.stringify({ hook_event_name: "UserPromptSubmit" });
    const SESSION_EV = JSON.stringify({ hook_event_name: "SessionStart" });
    for (const v of PER_TURN) jobs.push(runVerb(bin, v, cwd, PER_TURN_EV).then((r) => extractContext(r, true)));
    if (!sessionInjected) {
      for (const v of SESSION_ONCE) jobs.push(runVerb(bin, v, cwd, SESSION_EV).then((r) => extractContext(r, true)));
    }
    sessionInjected = true;

    const content = (await Promise.all(jobs)).filter(Boolean).join("\n\n");
    if (!content) return;
    return { message: { customType: "sidecar-governance", content, display: false } };
  });

  // PreToolUse parity: guard tool calls; translate a deny into a Pi block.
  pi.on("tool_call", async (event: any, ctx: any) => {
    const bin = sidecarBin();
    if (!bin) return;
    const mapped = mapTool(event.toolName, event.input);
    const payload = JSON.stringify({ tool_name: event.toolName, tool_input: mapped.toolInput });
    const r = await runVerb(bin, ["pre", mapped.kind], ctx.cwd, payload);
    const blocked = extractBlock(r);
    if (blocked) return { block: true, reason: blocked.reason };
    // Advisory context (convergence-on-touch etc.) — surface without blocking.
    const adv = extractContext(r);
    if (adv) ctx.ui?.notify?.(adv.split("\n")[0].slice(0, 200), "info");
  });

  // PostToolUse parity (Write|Edit): doc/architecture reminders — advisory on Pi
  // (tool_result cannot inject fresh model context the way CC additionalContext does).
  pi.on("tool_result", async (event: any, ctx: any) => {
    if (event.toolName !== "write" && event.toolName !== "edit" && event.toolName !== "multi_edit") return;
    const bin = sidecarBin();
    if (!bin) return;
    const path = event.input?.path ?? event.input?.file_path ?? "";
    if (!path) return;
    const r = await runVerb(bin, ["post", "edit", String(path)], ctx.cwd);
    const adv = extractContext(r);
    if (adv) ctx.ui?.notify?.(adv.split("\n")[0].slice(0, 200), "info");
  });
}
