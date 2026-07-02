// sidecar fable-mode {on|off|status|inject}
// A session-scoped toggle with a SPLIT delegation policy: when ON, the agent
// delegates the THINKING (design · analysis · research · review · planning ·
// hard problems) to the Fable 5 model via `sidecar fable`, but does the DOING (actual code
// implementation · builds · git · commit · ship) LOCALLY itself. The engine here
// is just a flag file + a per-turn UserPromptSubmit inject that re-asserts that
// split. OFF (the default) emits NOTHING — zero per-turn cost, so the aggregate
// inject budget is untouched for non-users.
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
// time (inject-lint). SPLIT model: delegate the THINKING (design/analysis) to
// Fable 5; keep the DOING (implementation) local. Fable's depth pays off on
// design/investigation, while headless delegation of code changes carries real
// friction (read-only default, context overhead, --json blindness).
const DIRECTIVE =
  "# fable-mode: ON — delegate DESIGN/ANALYSIS/HARD PROBLEMS to Fable 5; do the IMPLEMENTATION yourself (MUST FOLLOW · `sidecar fable-mode off` to stop)\n" +
  "fable-mode is ACTIVE. Split this turn by KIND of work:\n" +
  "- DELEGATE to Fable 5 (file-mediated: write the instruction to a scratch file → `sidecar fable --file <f> --json --cwd <repo>`, then absorb `.result`): design, architecture, analysis, root-cause investigation, research, review, planning/spec, and HARD PROBLEMS (난제 — anything you're stuck on, failed attempts, gnarly bugs/proofs/algorithms) — the reasoning-heavy work where Fable 5's depth pays off.\n" +
  "- DO LOCALLY yourself, the NORMAL way — do NOT delegate: the actual IMPLEMENTATION — writing/editing code in the repo, builds/tests, git/worktree, commit, ship, and all repo bookkeeping (ARCHITECTURE · ING · CHANGELOG). Take Fable's design/analysis and execute it directly.\n" +
  "- No recursion (a delegated prompt must not call `sidecar fable`); trivial/conversational answers stay local.\n" +
  "- Rule of thumb — think vs do: design/analysis/research/hard problems → Fable; code changes / execution → you.\n";

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
    if (sub === "on") info("  ⇒ next turns delegate DESIGN/ANALYSIS/HARD PROBLEMS(난제) to Fable 5 (file-mediated); IMPLEMENTATION stays local (기본진행).");
    return 0;
  }

  if (sub === "status") {
    const st = readState();
    info(`fable-mode: ${st.on ? "ON" : "OFF"}${st.on ? ` (scopes: ${st.scopes.join("+")})` : ""}`);
    info(`  repo .harness/fable-mode : ${existsSync(repoFlag()) ? "set" : "—"}`);
    info(`  host ~/.sidecar/fable-mode: ${existsSync(hostFlag()) ? "set" : "—"}`);
    if (st.on) info("  per-turn: design/analysis/hard problems(난제) → Fable 5 · implementation → local (directive on UserPromptSubmit).");
    return 0;
  }

  info("usage: sidecar fable-mode {on|off|status|inject} [--repo]");
  return sub === "help" || sub === "--help" || sub === "-h" ? 0 : 1;
}
