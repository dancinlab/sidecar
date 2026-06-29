// sidecar install-hooks [--global] | self-update
//   install-hooks  — merge the sidecar hook block into the GLOBAL
//                    ~/.claude/settings.json so the guards/injects fire in EVERY
//                    session/repo (like a global plugin). GLOBAL-ONLY: --repo is
//                    refused — per-repo .claude/settings.json is banned (it
//                    duplicated the global install → double-injected context).
//                    Existing non-sidecar hooks are preserved; old sidecar
//                    entries are de-duped.
//   self-update    — refresh the GLOBAL install clone (~/.sidecar/cli, what the
//                    `sidecar` on PATH actually runs) to latest origin/main, and
//                    print its path even when already current. ONLY ever touches the
//                    global clone: a `reset --hard` against a dev checkout would
//                    discard local commits/uncommitted work, so a dev clone (run via
//                    `npx tsx`) is updated by the developer's own git, never here.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { SIDECAR_ROOT } from "../lib/paths.ts";
import { execShell } from "../lib/exec.ts";
import { info, ok, warn } from "../lib/log.ts";

const G = (c: string) => `command -v sidecar >/dev/null 2>&1 && ${c} || true`;
const entry = (cmd: string) => ({ hooks: [{ type: "command", command: G(cmd) }] });
const m = (matcher: string, cmd: string) => ({ matcher, hooks: [{ type: "command", command: G(cmd) }] });

function hookSpec(): Record<string, unknown[]> {
  return {
    PreToolUse: [
      m("Bash", 'CLAUDE_TOOL_INPUT="$CLAUDE_TOOL_INPUT" sidecar pre bash'),
      m("Write|Edit", 'CLAUDE_TOOL_INPUT="$CLAUDE_TOOL_INPUT" sidecar pre write'),
      m("AskUserQuestion", "sidecar pre askq"),
      m("mcp__.*", "sidecar pre tool"),
    ],
    PostToolUse: [m("Write|Edit", 'sidecar post edit "$CLAUDE_FILE_PATH"')],
    UserPromptSubmit: [
      entry('sidecar prompt "$CLAUDE_USER_PROMPT"'),
      entry("sidecar commons inject"),
      entry("sidecar claudemd inject"),
      // NOTE: `architecture inject` is SESSION-scoped (SessionStart + Compact), NOT
      // per-turn — the design tree is a static reference doc; re-injecting it every
      // prompt is the large-doc anti-pattern (token cost for content read once). Its
      // turn-close gate is enforced deterministically by `architecture stop-check`
      // (Stop), not by a per-turn reminder. See ARCHITECTURE.json inject-strategy.
      entry("sidecar recommend inject"),
      entry("sidecar prefs inject"),
      entry("sidecar easy inject"),
      entry("sidecar load inject"),
      entry("sidecar ing inject"),
    ],
    SessionStart: [
      entry("sidecar commons inject"),
      entry("sidecar recommend inject"),
      entry("sidecar easy inject"), // full easy reference once (per-turn rides UserPromptSubmit = lean directive only)
      entry("sidecar architecture inject"),
      entry("sidecar git-context inject"),
      entry("sidecar toolkit inject"),
      entry("sidecar companions inject"),
      entry("sidecar worktree gc"),
      entry("sidecar changelog autoprune"),
      entry("sidecar ing inject"),
    ],
    Stop: [
      entry("sidecar recommend stop-check"),
      entry("sidecar architecture stop-check"), // turn-close design-report gate (was missing here vs hooks.json)
      entry("sidecar architecture convergence stop-check"),
      entry("sidecar ing staleness-check"),
    ],
    // Compaction survival — the per-turn injects (commons/recommend/prefs/easy-lean) ride
    // UserPromptSubmit so they always return, but the SESSION-scoped injects
    // (architecture·git-context·toolkit·companions·ing + easy's FULL reference) only fire
    // at SessionStart and EVAPORATE on auto-compaction (the design tree / command catalog /
    // ING board / easy gold-examples+templates vanish mid-session). Re-inject them on
    // PreCompact (so the summarizer still sees them) AND PostCompact (fresh after the new
    // context window opens). Mirrors sidecar `project-tape` PreCompact+PostCompact re-inject.
    // (easy inject auto-emits the full reference on these events, the lean slice on UserPromptSubmit.)
    PreCompact: [
      entry("sidecar commons inject"),
      entry("sidecar easy inject"),
      entry("sidecar architecture inject"),
      entry("sidecar git-context inject"),
      entry("sidecar toolkit inject"),
      entry("sidecar companions inject"),
      entry("sidecar ing inject"),
    ],
    PostCompact: [
      entry("sidecar commons inject"),
      entry("sidecar easy inject"),
      entry("sidecar architecture inject"),
      entry("sidecar git-context inject"),
      entry("sidecar toolkit inject"),
      entry("sidecar companions inject"),
      entry("sidecar ing inject"),
    ],
  };
}

function isSidecar(e: unknown): boolean {
  try {
    return ((e as { hooks: { command: string }[] }).hooks[0].command).includes("sidecar");
  } catch {
    return false;
  }
}

function installHooks(args: string[]): number {
  // GLOBAL-ONLY: per-repo .claude/settings.json is banned (it duplicated the
  // global install and double-injected context). --repo is refused.
  if (args.includes("--repo")) {
    warn("install-hooks --repo is disabled: per-repo .claude/settings.json is banned (duplicated the global install → double-inject).");
    info("  sidecar is global-only — run `sidecar install-hooks` (global) or `sidecar install` once per host.");
    return 1;
  }
  const uninstall = args.includes("--uninstall");
  const settingsPath = resolve(homedir(), ".claude", "settings.json");
  if (uninstall) {
    if (!existsSync(settingsPath)) {
      info(`install-hooks --uninstall: ${settingsPath} absent (nothing to do)`);
      return 0;
    }
    let d: Record<string, unknown>;
    try {
      d = JSON.parse(readFileSync(settingsPath, "utf8"));
    } catch {
      warn(`install-hooks: ${settingsPath} malformed — aborting.`);
      return 1;
    }
    const hooks = (d.hooks ?? {}) as Record<string, unknown[]>;
    for (const ev of Object.keys(hooks)) {
      hooks[ev] = (hooks[ev] ?? []).filter((e) => !isSidecar(e));
      if (!hooks[ev].length) delete hooks[ev];
    }
    writeFileSync(settingsPath, JSON.stringify(d, null, 2) + "\n", "utf8");
    ok(`install-hooks: sidecar hooks REMOVED from ${settingsPath} (use the plugin instead).`);
    return 0;
  }
  let d: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try {
      d = JSON.parse(readFileSync(settingsPath, "utf8"));
    } catch {
      warn(`install-hooks: ${settingsPath} malformed — aborting (fix or remove it first).`);
      return 1;
    }
  }
  const hooks = (d.hooks ?? (d.hooks = {})) as Record<string, unknown[]>;
  const spec = hookSpec();
  for (const [ev, items] of Object.entries(spec)) {
    const cur = (hooks[ev] ?? []).filter((e) => !isSidecar(e)); // dedup old sidecar entries
    hooks[ev] = [...cur, ...items];
  }
  // Enable agent-teams (SendMessage to background subagents) by default — only
  // SETS the flag if absent, never overwrites a user's explicit value.
  const env = (d.env ?? (d.env = {})) as Record<string, string>;
  let envNote = "";
  if (!("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" in env)) {
    env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
    envNote = " + env CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 (SendMessage)";
  }
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(d, null, 2) + "\n", "utf8");
  ok(`install-hooks: sidecar hooks merged → ${settingsPath} (global)${envNote}. Needs \`sidecar\` on PATH.`);
  info("  events: PreToolUse · PostToolUse · UserPromptSubmit · SessionStart · Stop · PreCompact · PostCompact (existing non-sidecar hooks preserved)");
  return 0;
}

// The global install clone the `sidecar` wrapper on PATH actually runs (install.sh
// SSOT: clone → ~/.sidecar/cli). self-update must refresh THIS regardless of where
// the running binary lives, else a dev-clone invocation silently leaves PATH stale.
const GLOBAL_CLI = resolve(homedir(), ".sidecar", "cli");

// Fast-forward one clone to origin/main. Returns the outcome (for the caller to
// report) or null when `dir` is not a git clone. before===after ⇒ already current.
// NON-DESTRUCTIVE: a blind `reset --hard origin/main` silently destroys any local
// commits/changes in the clone (root-cause of repeated loss — local feature commits
// were wiped on every self-update). We fetch, then REFUSE to reset when the clone is
// ahead of origin/main or dirty, returning `skipped` so the caller warns instead of
// clobbering. Merge/push the local work → origin/main advances → ahead becomes 0 →
// self-update resumes cleanly.
async function updateClone(dir: string): Promise<{ before: string; after: string; skipped?: string } | null> {
  const inside = await execShell("git rev-parse --is-inside-work-tree 2>/dev/null", { cwd: dir });
  if (inside.stdout.trim() !== "true") return null;
  const before = (await execShell("git rev-parse --short HEAD", { cwd: dir })).stdout.trim();
  const fetched = await execShell("git fetch -q origin", { cwd: dir });
  if (fetched.code !== 0) throw new Error(fetched.stderr.slice(0, 200));
  const dirty = (await execShell("git status --porcelain", { cwd: dir })).stdout.trim();
  const ahead = (await execShell("git rev-list --count origin/main..HEAD", { cwd: dir })).stdout.trim();
  if (dirty || (ahead && ahead !== "0")) {
    return { before, after: before, skipped: `${ahead || "0"} local commit(s)${dirty ? " + uncommitted changes" : ""}` };
  }
  const up = await execShell("git reset -q --hard origin/main", { cwd: dir });
  if (up.code !== 0) throw new Error(up.stderr.slice(0, 200));
  const after = (await execShell("git rev-parse --short HEAD", { cwd: dir })).stdout.trim();
  return { before, after };
}

async function selfUpdate(): Promise<number> {
  if (!existsSync(GLOBAL_CLI)) {
    warn(`self-update: global install ${GLOBAL_CLI} not found — run \`sidecar install\` first.`);
    return 1;
  }
  let res: { before: string; after: string; skipped?: string } | null;
  try {
    res = await updateClone(GLOBAL_CLI);
  } catch (e) {
    warn(`self-update: failed — ${(e as Error).message}`);
    return 1;
  }
  if (res === null) {
    warn(`self-update: ${GLOBAL_CLI} is not a git clone — update manually.`);
    return 1;
  }
  if (res.skipped) {
    warn(`self-update: ${GLOBAL_CLI} has ${res.skipped} — NOT reset (protecting local work). Merge/push to main first, then re-run.`);
    return 0;
  }
  ok(res.before === res.after
    ? `self-update: already current (${res.after}) — global ${GLOBAL_CLI}`
    : `self-update: ${res.before} → ${res.after} — global ${GLOBAL_CLI}`);
  // Flag the silent-no-op trap: a dev-clone invocation updated the global install,
  // NOT the clone you ran from. Make that explicit so "already current" is unambiguous.
  if (resolve(SIDECAR_ROOT) !== GLOBAL_CLI) {
    info(`  (ran from dev clone ${SIDECAR_ROOT} — updated the GLOBAL install above, not this clone; use git here.)`);
  }
  return 0;
}

// install — one-shot COMMON/GLOBAL setup: clone dancinlab/sidecar → ~/.sidecar/cli
// + a `sidecar` wrapper on ~/.local/bin + global hook wiring. This is NOT a
// per-repo scaffold (that's `init`). Delegates to the SSOT bootstrap shipped in
// this engine/bundle (scripts/install.sh) so the curl one-liner and the CLI verb
// run identical logic. Idempotent.
export async function runInstall(args: string[]): Promise<number> {
  const script = resolve(SIDECAR_ROOT, "scripts", "install.sh");
  if (!existsSync(script)) {
    warn(`install: bootstrap script missing at ${script}`);
    info("  curl -fsSL https://raw.githubusercontent.com/dancinlab/sidecar/main/scripts/install.sh | bash");
    return 1;
  }
  const passthru = args.map((a) => JSON.stringify(a)).join(" ");
  const r = await execShell(`bash ${JSON.stringify(script)} ${passthru}`, { timeoutMs: 300_000 });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.code;
}

export async function runInstallHooks(args: string[]): Promise<number> {
  return installHooks(args);
}
export async function runSelfUpdate(_args: string[]): Promise<number> {
  return selfUpdate();
}
