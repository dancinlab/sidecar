// harness install-hooks [--global] | self-update
//   install-hooks  — merge the harness hook block into ~/.claude/settings.json
//                    (--global, default) so the guards/injects fire in EVERY
//                    session/repo (like a global plugin), or into the repo's
//                    .claude/settings.json (--repo). Existing non-harness hooks
//                    are preserved; old harness entries are de-duped.
//   self-update    — git pull the harness CLI clone this binary runs from
//                    (e.g. ~/.harness/cli) to the latest main.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { HARNESS_ROOT, REPO_ROOT } from "../lib/paths.ts";
import { execShell } from "../lib/exec.ts";
import { info, ok, warn } from "../lib/log.ts";

const G = (c: string) => `command -v harness >/dev/null 2>&1 && ${c} || true`;
const entry = (cmd: string) => ({ hooks: [{ type: "command", command: G(cmd) }] });
const m = (matcher: string, cmd: string) => ({ matcher, hooks: [{ type: "command", command: G(cmd) }] });

function hookSpec(): Record<string, unknown[]> {
  return {
    PreToolUse: [
      m("Bash", 'CLAUDE_TOOL_INPUT="$CLAUDE_TOOL_INPUT" harness pre bash'),
      m("Write|Edit", 'CLAUDE_TOOL_INPUT="$CLAUDE_TOOL_INPUT" harness pre write'),
      m("AskUserQuestion", "harness pre askq"),
    ],
    PostToolUse: [m("Write|Edit", 'harness post edit "$CLAUDE_FILE_PATH"')],
    UserPromptSubmit: [
      entry('harness prompt "$CLAUDE_USER_PROMPT"'),
      entry("harness commons inject"),
      entry("harness claudemd inject"),
      entry("harness architecture inject"),
      entry("harness recommend inject"),
      entry("harness prefs inject"),
      entry("harness easy inject"),
      entry("harness ing inject"),
    ],
    SessionStart: [
      entry("harness commons inject"),
      entry("harness recommend inject"),
      entry("harness architecture inject"),
      entry("harness worktree gc"),
      entry("harness ing inject"),
    ],
  };
}

function isHarness(e: unknown): boolean {
  try {
    return ((e as { hooks: { command: string }[] }).hooks[0].command).includes("harness");
  } catch {
    return false;
  }
}

function installHooks(args: string[]): number {
  const repo = args.includes("--repo");
  const uninstall = args.includes("--uninstall");
  const settingsPath = repo
    ? resolve(REPO_ROOT, ".claude", "settings.json")
    : resolve(homedir(), ".claude", "settings.json");
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
      hooks[ev] = (hooks[ev] ?? []).filter((e) => !isHarness(e));
      if (!hooks[ev].length) delete hooks[ev];
    }
    writeFileSync(settingsPath, JSON.stringify(d, null, 2) + "\n", "utf8");
    ok(`install-hooks: harness hooks REMOVED from ${settingsPath} (use the plugin instead).`);
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
    const cur = (hooks[ev] ?? []).filter((e) => !isHarness(e)); // dedup old harness entries
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
  ok(`install-hooks: harness hooks merged → ${settingsPath} (${repo ? "repo" : "global"})${envNote}. Needs \`harness\` on PATH.`);
  info("  events: PreToolUse · PostToolUse · UserPromptSubmit · SessionStart (existing non-harness hooks preserved)");
  return 0;
}

async function selfUpdate(): Promise<number> {
  const r = await execShell("git rev-parse --is-inside-work-tree 2>/dev/null", { cwd: HARNESS_ROOT });
  if (r.stdout.trim() !== "true") {
    warn(`self-update: ${HARNESS_ROOT} is not a git clone — update manually.`);
    return 1;
  }
  const before = (await execShell("git rev-parse --short HEAD", { cwd: HARNESS_ROOT })).stdout.trim();
  const up = await execShell("git fetch -q origin && git reset -q --hard origin/main", { cwd: HARNESS_ROOT });
  if (up.code !== 0) {
    warn(`self-update: failed — ${up.stderr.slice(0, 200)}`);
    return 1;
  }
  const after = (await execShell("git rev-parse --short HEAD", { cwd: HARNESS_ROOT })).stdout.trim();
  ok(before === after ? `self-update: already current (${after})` : `self-update: ${before} → ${after} (${HARNESS_ROOT})`);
  return 0;
}

// install — one-shot COMMON/GLOBAL setup: clone dancinlab/harness → ~/.harness/cli
// + a `harness` wrapper on ~/.local/bin + global hook wiring. This is NOT a
// per-repo scaffold (that's `init`). Delegates to the SSOT bootstrap shipped in
// this engine/bundle (scripts/install.sh) so the curl one-liner and the CLI verb
// run identical logic. Idempotent.
export async function runInstall(args: string[]): Promise<number> {
  const script = resolve(HARNESS_ROOT, "scripts", "install.sh");
  if (!existsSync(script)) {
    warn(`install: bootstrap script missing at ${script}`);
    info("  curl -fsSL https://raw.githubusercontent.com/dancinlab/harness/main/scripts/install.sh | bash");
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
