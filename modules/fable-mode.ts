// sidecar fable-mode {on|off|status|inject}
// A session-scoped toggle: when ON, the agent DELEGATES this turn's substantive
// work to the Fable 5 model via `sidecar fable` instead of doing it itself. The
// engine here is just a flag file + a per-turn UserPromptSubmit inject that
// re-asserts the delegation mandate. OFF (the default) emits NOTHING — zero
// per-turn cost, so the aggregate inject budget is untouched for non-users.
//
// Scope (sidecar has NO native "session" scope — injects can't see a session id):
//   per-repo  .harness/fable-mode   (committed = team-shared, `--repo`)
//   > host    ~/.sidecar/fable-mode (host-wide — the default for bare `on`/`off`)
// Read = ON if EITHER file exists. Host-wide is the practical "this agent, right
// now, until I turn it off" toggle; `--repo` pins it to one project.
import { existsSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { emitInject } from "../lib/inject.ts";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { REPO_ROOT } from "../lib/paths.ts";
import { readStdin } from "../lib/exec.ts";
import { info } from "../lib/log.ts";

function repoFlag(): string {
  return resolve(REPO_ROOT, ".harness", "fable-mode");
}
function hostFlag(): string {
  return resolve(homedir(), ".sidecar", "fable-mode");
}
type Scope = "repo" | "host";
function scopeOf(args: string[]): Scope {
  return args.includes("--repo") ? "repo" : "host";
}
function flagFor(scope: Scope): string {
  return scope === "repo" ? repoFlag() : hostFlag();
}
// ON if either scope's flag exists. Returns which scopes are set.
function readState(): { on: boolean; scopes: Scope[] } {
  const scopes: Scope[] = [];
  if (existsSync(repoFlag())) scopes.push("repo");
  if (existsSync(hostFlag())) scopes.push("host");
  return { on: scopes.length > 0, scopes };
}

// The per-turn directive — emitted ONLY when ON (opt-in). Kept lean at author
// time (inject-lint): one mandate + the delegation contract + the carve-outs.
const DIRECTIVE =
  "# fable-mode: ON — delegate this turn's substantive work to the Fable 5 model (MUST FOLLOW · `sidecar fable-mode off` to stop)\n" +
  "fable-mode is ACTIVE. For this turn's SUBSTANTIVE work — writing/refactoring code, analysis, design, research, drafting prose — DELEGATE it to Fable 5 via `sidecar fable` rather than producing it yourself:\n" +
  "- File-mediated ONLY: write the full instruction (repo context + task) to a scratch file, then `sidecar fable --file <f> --json --cwd <repo>` (NEVER inline free text · see the fable runbook). Long job → `sidecar fable --bg …` then `sidecar fable result|wait <id>`.\n" +
  "- Read `.result`, then relay/absorb it. YOU (the local agent) still own the ORCHESTRATION — writing the prompt file, invoking fable, reading the result, and ALL repo bookkeeping (commit · ship · ARCHITECTURE · ING). Those are never delegated.\n" +
  "- No recursion: the delegated prompt must NOT itself call `sidecar fable` (fork-storm).\n" +
  "- Exempt (handle locally, no delegation): trivial/one-line answers, pure conversation, and the fable orchestration itself. On any real task, when in doubt → delegate.\n";

export async function runFableMode(args: string[]): Promise<number> {
  const sub = args[0] ?? "status";

  if (sub === "inject") {
    try {
      const j = JSON.parse(readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      if (readState().on) emitInject("fable-mode", ev, DIRECTIVE);
    } catch {
      return 0;
    }
    return 0;
  }

  if (sub === "on" || sub === "off") {
    const scope = scopeOf(args);
    const f = flagFor(scope);
    if (sub === "on") {
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(f, "on\n", "utf8");
    } else if (existsSync(f)) {
      rmSync(f);
    }
    const st = readState();
    const where = scope === "repo" ? "repo .harness (committed · team-shared)" : "host ~/.sidecar (this machine)";
    info(`fable-mode ${sub} [${where}] → effective: ${st.on ? "ON" : "OFF"}${st.on ? ` (scopes: ${st.scopes.join("+")})` : ""}`);
    if (sub === "off" && st.on) {
      info(`  note: still ON via ${st.scopes.join("+")} — clear it too: sidecar fable-mode off${st.scopes.includes("repo") ? " --repo" : ""}`);
    }
    if (sub === "on") info("  ⇒ next turns will delegate substantive work to Fable 5 via `sidecar fable` (file-mediated).");
    return 0;
  }

  if (sub === "status") {
    const st = readState();
    info(`fable-mode: ${st.on ? "ON" : "OFF"}${st.on ? ` (scopes: ${st.scopes.join("+")})` : ""}`);
    info(`  repo .harness/fable-mode : ${existsSync(repoFlag()) ? "set" : "—"}`);
    info(`  host ~/.sidecar/fable-mode: ${existsSync(hostFlag()) ? "set" : "—"}`);
    if (st.on) info("  per-turn: emits the Fable-5 delegation directive on UserPromptSubmit.");
    return 0;
  }

  info("usage: sidecar fable-mode {on|off|status|inject} [--repo]");
  return sub === "help" || sub === "--help" || sub === "-h" ? 0 : 1;
}
