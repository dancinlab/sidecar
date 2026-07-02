// sidecar companions {inject|list} — sibling-CLI command-catalog injector.
//
// The sidecar engine is DOMAIN-AGNOSTIC: it does NOT know about `hexa` or any
// specific sibling toolchain. WHICH companion CLIs to surface is DATA, carried in
// config — repo `harness.config.json` (`companions`) and/or a host-wide
// `~/.sidecar/companions.json` — so an agent KNOWS a sibling CLI's command surface
// at SessionStart instead of re-discovering it ("does `hexa cloud` even exist?")
// from scratch every session. Same proactive-catalog philosophy as `toolkit`
// (which surfaces the sidecar's OWN commands), generalized to neighbour CLIs.
//   inject  SessionStart additionalContext — for each configured companion that
//           resolves on PATH, run its catalog command (default `--help`) and emit a
//           compact block. Silent when none are configured or none resolve.
//   list    human render — which companions are configured and whether each resolves.
//
import { homedir } from "node:os";
import { resolve } from "node:path";
import { execArgs, readStdin } from "../lib/exec.ts";
import { config } from "../lib/config.ts";
import { readJsonOr } from "../lib/json.ts";
import { info } from "../lib/log.ts";
import { emitInject } from "../lib/inject.ts";

export interface Companion {
  cmd: string; // executable name (resolved on PATH at inject time)
  args?: string[]; // catalog command (default ["--help"])
  label?: string; // section heading (default cmd)
  lines?: number; // cap injected lines (default 40)
}

const GLOBAL = resolve(homedir(), ".sidecar", "companions.json");
const PROBE_TIMEOUT_MS = 8000;

function normalize(e: string | Companion): Companion | null {
  if (typeof e === "string") return e.trim() ? { cmd: e.trim() } : null;
  return e && typeof e.cmd === "string" && e.cmd.trim() ? e : null;
}

// Union of host-wide ~/.sidecar/companions.json and repo config.companions,
// deduped by cmd (the repo entry wins — it may override args/label/lines).
export function resolveCompanions(): Companion[] {
  const global = readJsonOr<(string | Companion)[]>(GLOBAL, []);
  const repo = config().companions ?? [];
  const byCmd = new Map<string, Companion>();
  for (const raw of [...global, ...repo]) {
    const c = normalize(raw);
    if (c) byCmd.set(c.cmd, c);
  }
  return [...byCmd.values()];
}

// Run a companion's catalog command. Returns the (line-capped) output, or null
// when the cmd is absent / errored / emitted nothing — so inject stays quiet.
async function catalog(c: Companion): Promise<string | null> {
  const args = c.args?.length ? c.args : ["--help"];
  const r = await execArgs(c.cmd, args, { timeoutMs: PROBE_TIMEOUT_MS });
  if (r.code !== 0 || !r.stdout.trim()) return null;
  const cap = c.lines ?? 40;
  const lines = r.stdout.replace(/\s+$/, "").split("\n");
  if (lines.length <= cap) return lines.join("\n");
  return [...lines.slice(0, cap), `  … (truncated — \`${c.cmd} ${args.join(" ")}\` for the full catalog)`].join("\n");
}

const HEADER = [
  "# companions — sibling-CLI command surface (so you KNOW these exist without probing)",
  "",
  "Project-adjacent CLIs available on this host. Reach for one by NAME when its job fits —",
  "do NOT re-discover whether it or its subcommands exist. `<cmd> <verb> --help` for per-verb detail.",
  "",
];

export async function runCompanions(args: string[]): Promise<number> {
  const sub = args[0] ?? "list";
  const companions = resolveCompanions();

  if (sub === "inject") {
    if (!companions.length) return 0;
    const blocks: string[] = [];
    for (const c of companions) {
      const cat = await catalog(c);
      if (cat) blocks.push(`## ${c.label ?? c.cmd}\n\n\`\`\`\n${cat}\n\`\`\``);
    }
    if (!blocks.length) return 0;
    // Emit via stdout `{hookSpecificOutput:{additionalContext}}` (emitInject) — the
    // schema Claude Code reads. Raw STDERR (old behaviour) was dropped, so the
    // neighbour-CLI surface never reached the agent. Needs the hook payload on STDIN
    // for the event name; a bare manual run (no stdin JSON) stays silent.
    try {
      const j = JSON.parse(await readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      emitInject("companions", ev, [...HEADER, blocks.join("\n\n")].join("\n"));
    } catch {
      return 0;
    }
    return 0;
  }

  if (sub === "list") {
    if (!companions.length) {
      info("companions: none configured (repo harness.config.json `companions` or ~/.sidecar/companions.json)");
      return 0;
    }
    info(`companions: ${companions.length} configured`);
    for (const c of companions) {
      const a = c.args?.length ? c.args : ["--help"];
      const r = await execArgs(c.cmd, a, { timeoutMs: PROBE_TIMEOUT_MS });
      const status = r.code === 0 && r.stdout.trim() ? "✓ resolves" : "✗ absent/failed";
      info(`  ${c.cmd.padEnd(12)} ${status}  (${c.cmd} ${a.join(" ")})`);
    }
    return 0;
  }

  process.stdout.write("usage: sidecar companions {inject|list}\n");
  return 1;
}
