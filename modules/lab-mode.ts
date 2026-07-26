// sidecar lab-mode {on [fable|sol|full]|off|status|inject}
// A PER-REPO toggle with a SPLIT delegation policy: when ON, the agent delegates
// the THINKING (design · analysis · research · review · planning · hard problems)
// to a frontier model via `sidecar lab <target>`, but does the DOING (actual code
// implementation · builds · git · commit · ship) LOCALLY itself. The engine here is
// just a config key + a per-turn UserPromptSubmit inject that re-asserts that split.
// OFF (the default) emits NOTHING — zero per-turn cost, so the aggregate inject
// budget is untouched for non-users.
//
// The switch is THIS repo's `harness.config.json` → `labMode: {enabled, target}`
// (lib/config.ts), read like every other sidecar toggle. There is deliberately NO
// host-wide "on everywhere" scope: whether a project's work is worth a frontier
// round-trip is a property of the PROJECT, not of the machine — an ambient host flag
// made every unrelated repo pay the directive. One repo can never enable another.
// `on`/`off` write the key back in place, preserving every sibling key (the same
// mechanism as `lockdown add`), so activation is committed, team-shared, auditable.
//
// The TARGET mirrors `lab` itself: fable (Claude Fable 5) · sol (OpenAI Codex 5.6)
// · full (both in parallel, reconciled by the caller). `off` keeps the last target.
//
// UNSET = FALSE, strictly: a repo that has not declared `labMode` is OFF, and
// nothing else can turn it on. The pre-config flag FILES (`.harness/lab-mode` ·
// `~/.sidecar/lab-mode`, and their pre-rename `fable-mode` names) are therefore
// NEVER consulted — honoring an ambient file is exactly the implicit activation
// this change removes. They are only reported by `status` as ignored, and cleared
// by `on`/`off`: repo-scoped ones deleted (the config key now carries the state),
// host-scoped ones renamed to `*.retired` (kept — the user's own file, not ours).
import { existsSync, readFileSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { emitInject } from "../lib/inject.ts";
import { resolve, basename } from "node:path";
import { homedir } from "node:os";
import { REPO_ROOT } from "../lib/paths.ts";
import { readStdin } from "../lib/exec.ts";
import { config } from "../lib/config.ts";
import { info, warn, loudFail } from "../lib/log.ts";

type Target = "fable" | "sol" | "full";
const TARGETS: Target[] = ["fable", "sol", "full"];
// Bare `on` = BOTH models, matching `lab`'s own default: one delegation buys two
// independent takes and the caller reconciles them. Narrow it by naming a target.
const DEFAULT_TARGET: Target = "full";

const CONFIG_PATH = resolve(REPO_ROOT, "harness.config.json");
// Pre-config flag files (incl. their pre-rename `fable-mode` names) — dead state in
// both scopes now, kept here only so the commands can report and clear them.
const REPO_FLAGS: string[] = [resolve(REPO_ROOT, ".harness", "lab-mode"), resolve(REPO_ROOT, ".harness", "fable-mode")];
const HOST_FLAGS: string[] = [resolve(homedir(), ".sidecar", "lab-mode"), resolve(homedir(), ".sidecar", "fable-mode")];

function parseTarget(raw: unknown): Target | null {
  return typeof raw === "string" && (TARGETS as string[]).includes(raw) ? (raw as Target) : null;
}

interface State {
  on: boolean;
  target: Target;
}
// The effective state for THIS repo — the config key, nothing else.
// Unset (or anything that is not exactly `true`) = OFF.
function resolveState(lm: { enabled?: unknown; target?: unknown } | undefined): State {
  return { on: lm?.enabled === true, target: parseTarget(lm?.target) ?? DEFAULT_TARGET };
}
// Hot path (per-turn inject): the merged config, like every other sidecar toggle.
function readState(): State {
  return resolveState(config().labMode);
}
// Mutation path: re-read from disk — `config()` memoizes per process, and a
// write may have just changed the file underneath it.
function readStateFromDisk(): State {
  return resolveState(rawLabMode());
}

// The raw (unmerged) config object, so an explicit `enabled:false` is
// distinguishable from "key absent". `null` = the file exists but is unusable.
function readRawConfig(): Record<string, unknown> | null {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
function rawLabMode(): { enabled?: unknown; target?: unknown } | undefined {
  const raw = readRawConfig();
  const lm = raw?.labMode;
  return lm && typeof lm === "object" && !Array.isArray(lm) ? (lm as { enabled?: unknown; target?: unknown }) : undefined;
}

// Persist labMode back to harness.config.json (2-space, trailing newline), keeping
// every sibling key intact, via a temp file + rename so an interrupted write can
// never leave a half-written config. A malformed/non-object existing config is
// REFUSED, never silently replaced — that would delete the repo's real settings.
function writeLabMode(enabled: boolean, target: Target): boolean {
  const raw = readRawConfig();
  if (raw === null) {
    loudFail(`harness.config.json is not readable JSON — refusing to overwrite it: ${CONFIG_PATH}`);
    info("  fix the file (or move it aside), then re-run.");
    return false;
  }
  // A repo with no config file yet gets a minimal one seeded with its project name;
  // every other setting still comes from the bundled defaults.
  if (!existsSync(CONFIG_PATH) && !raw.project) raw.project = basename(REPO_ROOT);
  raw.labMode = { enabled, target };
  const tmp = `${CONFIG_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(raw, null, 2) + "\n", "utf8");
  renameSync(tmp, CONFIG_PATH);
  return true;
}

// Clear the pre-config flag files now that the config key carries the state.
// Repo-scoped: removed (dead — the config key is the only switch).
// Host-scoped: renamed to `*.retired` — also dead, but the user's own file, so it
// is preserved rather than deleted. Best-effort; a failure must not break the
// toggle. Explicit commands only — `inject` never mutates anything mid-turn.
function sweepLegacyFlags(): string[] {
  const notes: string[] = [];
  for (const f of REPO_FLAGS) {
    if (!existsSync(f)) continue;
    try {
      rmSync(f);
      notes.push(`removed dead repo flag ${f} — harness.config.json labMode is the only switch now`);
    } catch {
      /* best-effort */
    }
  }
  for (const p of HOST_FLAGS) {
    if (!existsSync(p)) continue;
    try {
      renameSync(p, `${p}.retired`);
      notes.push(`retired host-wide flag ${p} → ${p}.retired (it turned EVERY repo on — no longer honored)`);
    } catch {
      /* best-effort */
    }
  }
  return notes;
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
  const off = "`sidecar lab-mode off` to stop (this repo)";
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

const USAGE = "usage: sidecar lab-mode {on [fable|sol|full]|off|status|inject}   (PER-REPO · harness.config.json labMode)";

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

  // A host-wide scope no longer exists — fail loudly instead of silently writing
  // this repo's config when someone reaches for the old global toggle.
  const globalFlag = args.find((a) => a === "--global" || a === "--host");
  if (globalFlag) {
    warn(`lab-mode is PER-REPO — ${globalFlag} is not supported (a host-wide flag turned every repo on).`);
    info("  run `sidecar lab-mode on` inside each repo that should delegate.");
    return 1;
  }
  // `--repo` was how you asked for repo scope; that is now the only scope.
  const deprecatedRepo = args.includes("--repo");

  if (sub === "on" || sub === "off") {
    const before = readStateFromDisk();
    let target = before.target;
    if (sub === "on") {
      const raw = args.slice(1).find((a) => !a.startsWith("--"));
      // Bare `on` = the documented default (full); `off` keeps whatever was set.
      const picked = raw ? parseTarget(raw) : DEFAULT_TARGET;
      if (!picked) {
        warn(`unknown target '${raw}' — expected one of: ${TARGETS.join(" | ")}`);
        info(USAGE);
        return 1;
      }
      target = picked;
    }
    if (!writeLabMode(sub === "on", target)) return 1;
    for (const n of sweepLegacyFlags()) info(`  legacy: ${n}`);
    if (deprecatedRepo) info("  note: --repo is a no-op now — per-repo IS the only scope.");
    info(`lab-mode ${sub} [repo ${basename(REPO_ROOT)} · harness.config.json labMode] → ${sub === "on" ? `ON (${target})` : `OFF (target kept: ${target})`}`);
    if (sub === "on") {
      const to = target === "full" ? "BOTH models in parallel (you reconcile)" : target;
      info(`  ⇒ next turns in THIS repo delegate DESIGN/ANALYSIS/HARD PROBLEMS(난제) to ${to} (file-mediated); IMPLEMENTATION stays local (기본진행).`);
      info("  ⇒ other repos are unaffected — opt each one in on its own.");
    }
    return 0;
  }

  if (sub === "status") {
    // Read-only: a status command must never rewrite the repo's config.
    const st = readStateFromDisk();
    const declared = rawLabMode();
    info(`lab-mode: ${st.on ? `ON (${st.target})` : "OFF"}  [repo ${basename(REPO_ROOT)} · per-repo only · no host scope]`);
    info(`  harness.config.json labMode : ${declared ? JSON.stringify(declared) : "— (unset → default OFF)"}`);
    for (const p of REPO_FLAGS) {
      if (existsSync(p)) info(`  stray repo flag (IGNORED)   : ${p} — pre-config file, no longer a switch; on/off deletes it`);
    }
    for (const p of HOST_FLAGS) {
      if (existsSync(p)) info(`  host flag (IGNORED)         : ${p} — retired scope; \`sidecar lab-mode on\` here sweeps it aside`);
      else if (existsSync(`${p}.retired`)) info(`  host flag (retired)         : ${p}.retired — inert`);
    }
    if (st.on) info(`  per-turn: design/analysis/hard problems(난제) → ${st.target} · implementation → local (directive on UserPromptSubmit).`);
    else info("  enable here: sidecar lab-mode on [fable|sol|full]");
    return 0;
  }

  info(USAGE);
  return sub === "help" || sub === "--help" || sub === "-h" ? 0 : 1;
}
