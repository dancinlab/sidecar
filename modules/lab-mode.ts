// sidecar lab-mode {on [fable|sol|full]|off|status|inject} [--repo]
// A session-scoped toggle with a SPLIT delegation policy: when ON, the agent
// delegates the THINKING (design · analysis · research · review · planning ·
// hard problems) to a frontier model via `sidecar lab <target>`, but does the
// DOING (actual code implementation · builds · git · commit · ship) LOCALLY
// itself. The engine here is just a flag file + a per-turn UserPromptSubmit
// inject that re-asserts that split. OFF (the default) emits NOTHING — zero
// per-turn cost, so the aggregate inject budget is untouched for non-users.
//
// The TARGET mirrors `lab` itself: fable (Claude Fable 5) · sol (OpenAI Codex
// 5.6) · full (both in parallel, reconciled by the caller). It is stored as the
// flag file's CONTENT — one file per scope, so a scope can never hold a
// contradictory multi-target state.
//
// Scope (sidecar has NO native "session" scope — injects can't see a session id):
//   per-repo  .harness/lab-mode   (committed = team-shared, `--repo`)
//   > host    ~/.sidecar/lab-mode (host-wide — the default for bare `on`/`off`)
// ON if EITHER file exists; when both are set the REPO target wins (specific
// beats ambient). Host-wide is the practical "this agent, right now, until I
// turn it off" toggle; `--repo` pins it to one project.
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { emitInject } from "../lib/inject.ts";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { REPO_ROOT } from "../lib/paths.ts";
import { readStdin } from "../lib/exec.ts";
import { info } from "../lib/log.ts";

type Target = "fable" | "sol" | "full";
const TARGETS: Target[] = ["fable", "sol", "full"];
const DEFAULT_TARGET: Target = "fable";
type Scope = "repo" | "host";

function flagFor(scope: Scope): string {
  return scope === "repo" ? resolve(REPO_ROOT, ".harness", "lab-mode") : resolve(homedir(), ".sidecar", "lab-mode");
}
// Pre-rename flag files (content was a meaningless "on") → migrated to target=fable.
function legacyFlagFor(scope: Scope): string {
  return scope === "repo" ? resolve(REPO_ROOT, ".harness", "fable-mode") : resolve(homedir(), ".sidecar", "fable-mode");
}
function scopeOf(args: string[]): Scope {
  return args.includes("--repo") ? "repo" : "host";
}
function parseTarget(raw: string | undefined): Target | null {
  if (!raw) return null;
  return (TARGETS as string[]).includes(raw) ? (raw as Target) : null;
}
// Read a scope's target. Unreadable/empty/unrecognized content → DEFAULT_TARGET:
// the per-turn inject path must never fail over a stray file.
function targetAt(scope: Scope): Target | null {
  const f = flagFor(scope);
  if (!existsSync(f)) return null;
  try {
    return parseTarget(readFileSync(f, "utf8").trim()) ?? DEFAULT_TARGET;
  } catch {
    return DEFAULT_TARGET;
  }
}
// One-shot rename of a pre-rename flag file to the canonical one (content
// "fable" — the only thing the old file could mean), so an already-ON host stays
// ON across the rename with no user action. Best-effort: a failure must not break
// the toggle.
function migrateLegacy(scope: Scope): void {
  const legacy = legacyFlagFor(scope);
  if (!existsSync(legacy)) return;
  try {
    if (!existsSync(flagFor(scope))) {
      mkdirSync(dirname(flagFor(scope)), { recursive: true });
      writeFileSync(flagFor(scope), `${DEFAULT_TARGET}\n`, "utf8");
    }
    rmSync(legacy);
  } catch {
    /* best-effort */
  }
}
// ON if either scope's flag exists. Target precedence: repo > host.
function readState(): { on: boolean; scopes: Scope[]; target: Target } {
  for (const s of ["repo", "host"] as Scope[]) migrateLegacy(s);
  const scopes: Scope[] = [];
  let target: Target = DEFAULT_TARGET;
  for (const s of ["host", "repo"] as Scope[]) {
    const t = targetAt(s);
    if (t) {
      scopes.push(s);
      target = t; // repo read last → repo wins
    }
  }
  return { on: scopes.length > 0, scopes: scopes.sort(), target };
}

// The per-turn directive — emitted ONLY when ON (opt-in). Kept lean at author
// time (inject-lint). SPLIT model: delegate the THINKING (design/analysis) to the
// frontier model; keep the DOING (implementation) local. Their depth pays off on
// design/investigation, while headless delegation of code changes carries real
// friction (read-only default, context overhead, --json blindness).
const LOCAL_BULLET =
  "- DO LOCALLY yourself, the NORMAL way — do NOT delegate: the actual IMPLEMENTATION — writing/editing code in the repo, builds/tests, git/worktree, commit, ship, and all repo bookkeeping (ARCHITECTURE · ING · CHANGELOG). Take the delegated design/analysis and execute it directly.\n";
const NO_RECURSION =
  "- No recursion (a delegated prompt must not call `sidecar lab`); trivial/conversational answers stay local.\n";
const THINK_KINDS =
  "design, architecture, analysis, root-cause investigation, research, review, planning/spec, and HARD PROBLEMS (난제 — anything you're stuck on, failed attempts, gnarly bugs/proofs/algorithms)";

function directive(target: Target): string {
  const off = "`sidecar lab-mode off` to stop";
  if (target === "full") {
    return (
      `# lab-mode: ON (full) — delegate DESIGN/ANALYSIS/HARD PROBLEMS to BOTH frontier models and reconcile; do the IMPLEMENTATION yourself (MUST FOLLOW · ${off})\n` +
      "lab-mode is ACTIVE (target full = Claude Fable 5 + OpenAI Codex 5.6 in parallel). Split this turn by KIND of work:\n" +
      `- DELEGATE to BOTH (file-mediated: write the instruction to a scratch file → \`sidecar lab full --file <f> --cwd <repo>\` — ONE call runs both; read the \`── fable ──\` / \`── sol ──\` sections): ${THINK_KINDS} — the reasoning-heavy work where their depth pays off.\n` +
      "- RECONCILE the two answers YOURSELF: where they agree → adopt. Where they disagree → decide per point by checking the repo/tests (cheapest check first); if not cheaply verifiable, take fable's call and record sol's dissent in ONE line in your deliverable. Never silently blend them into an unverified average.\n" +
      LOCAL_BULLET +
      NO_RECURSION
    );
  }
  const name = target === "sol" ? "OpenAI Codex 5.6" : "Claude Fable 5";
  const absorb = target === "sol" ? "then absorb stdout (`--json` = machine-clean answer)" : "then absorb `.result`";
  return (
    `# lab-mode: ON (${target}) — delegate DESIGN/ANALYSIS/HARD PROBLEMS to ${name}; do the IMPLEMENTATION yourself (MUST FOLLOW · ${off})\n` +
    `lab-mode is ACTIVE (target ${target} = ${name}). Split this turn by KIND of work:\n` +
    `- DELEGATE to ${name} (file-mediated: write the instruction to a scratch file → \`sidecar lab ${target} --file <f> --json --cwd <repo>\`, ${absorb}): ${THINK_KINDS} — the reasoning-heavy work where its depth pays off.\n` +
    LOCAL_BULLET +
    NO_RECURSION +
    `- Rule of thumb — think vs do: design/analysis/research/hard problems → ${name}; code changes / execution → you.\n`
  );
}

export async function runLabMode(args: string[]): Promise<number> {
  const sub = args[0] ?? "status";

  if (sub === "inject") {
    try {
      const j = JSON.parse(readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      const st = readState();
      if (st.on) emitInject("lab-mode", ev, directive(st.target));
    } catch {
      return 0;
    }
    return 0;
  }

  if (sub === "on" || sub === "off") {
    const scope = scopeOf(args);
    const f = flagFor(scope);
    if (sub === "on") {
      const raw = args.slice(1).find((a) => !a.startsWith("--"));
      const target = raw ? parseTarget(raw) : DEFAULT_TARGET;
      if (!target) {
        info(`unknown target '${raw}' — expected one of: ${TARGETS.join(" | ")}`);
        info("usage: sidecar lab-mode {on [fable|sol|full]|off|status|inject} [--repo]");
        return 1;
      }
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(f, `${target}\n`, "utf8"); // update-in-place: re-`on` switches target
    } else {
      for (const p of [f, legacyFlagFor(scope)]) if (existsSync(p)) rmSync(p);
    }
    const st = readState();
    const where = scope === "repo" ? "repo .harness (committed · team-shared)" : "host ~/.sidecar (this machine)";
    info(`lab-mode ${sub} [${where}] → effective: ${st.on ? `ON (${st.target})` : "OFF"}${st.on ? ` (scopes: ${st.scopes.join("+")})` : ""}`);
    if (sub === "off" && st.on) {
      info(`  note: still ON via ${st.scopes.join("+")} — clear it too: sidecar lab-mode off${st.scopes.includes("repo") ? " --repo" : ""}`);
    }
    if (sub === "on") {
      const to = st.target === "full" ? "BOTH models in parallel (you reconcile)" : st.target;
      info(`  ⇒ next turns delegate DESIGN/ANALYSIS/HARD PROBLEMS(난제) to ${to} (file-mediated); IMPLEMENTATION stays local (기본진행).`);
    }
    return 0;
  }

  if (sub === "status") {
    const st = readState();
    info(`lab-mode: ${st.on ? `ON (${st.target})` : "OFF"}${st.on ? ` (scopes: ${st.scopes.join("+")})` : ""}`);
    const repoT = targetAt("repo");
    const hostT = targetAt("host");
    info(`  repo .harness/lab-mode : ${repoT ? `${repoT}${st.on ? " ← effective" : ""}` : "—"}`);
    info(`  host ~/.sidecar/lab-mode: ${hostT ? `${hostT}${st.on && !repoT ? " ← effective" : ""}` : "—"}`);
    if (st.on) info(`  per-turn: design/analysis/hard problems(난제) → ${st.target} · implementation → local (directive on UserPromptSubmit).`);
    return 0;
  }

  info("usage: sidecar lab-mode {on [fable|sol|full]|off|status|inject} [--repo]");
  return sub === "help" || sub === "--help" || sub === "-h" ? 0 : 1;
}
