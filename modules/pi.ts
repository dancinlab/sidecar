// sidecar pi {install|status|remove} — wire sidecar into the Pi coding agent.
//
// Pi (earendil-works/pi-coding-agent) reads AGENTS.md/CLAUDE.md and SKILL.md skills
// natively, but its governance hooks are TypeScript extensions, not Claude Code's
// shell-command settings.json hooks. This command installs the Pi-side bridge:
//
//   1. Symlinks the bundled extension (pi/sidecar.ts) into Pi's auto-discovery dir
//      (~/.pi/agent/extensions/sidecar.ts) — so a `sidecar self-update` of the global
//      clone refreshes the extension together with the engine, and `/reload` picks it
//      up. The extension re-uses the SAME `sidecar` CLI the CC plugin calls.
//   2. Merges Pi's settings (~/.pi/agent/settings.json) to add ~/.claude/skills to the
//      `skills` array, so any SKILL.md skills load in Pi too (Pi does not auto-scan it).
//
// Mirrors the CC `install-hooks` global-only philosophy: one host-wide wiring, idempotent.
import { existsSync, readFileSync, writeFileSync, mkdirSync, symlinkSync, lstatSync, unlinkSync, readlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { SIDECAR_ROOT } from "../lib/paths.ts";
import { ok, info, warn } from "../lib/log.ts";

const PI_AGENT_DIR = resolve(homedir(), ".pi", "agent");
const PI_EXT_DIR = resolve(PI_AGENT_DIR, "extensions");
const PI_EXT_LINK = resolve(PI_EXT_DIR, "sidecar.ts");
const PI_SETTINGS = resolve(PI_AGENT_DIR, "settings.json");
const GLOBAL_CLI = resolve(homedir(), ".sidecar", "cli");
const CLAUDE_SKILLS = resolve(homedir(), ".claude", "skills");

// Prefer the GLOBAL install clone's copy (self-update keeps it fresh); fall back to
// wherever this code runs from (dev clone / `-e` test).
function extensionSource(): string {
  const global = resolve(GLOBAL_CLI, "pi", "sidecar.ts");
  if (existsSync(global)) return global;
  return resolve(SIDECAR_ROOT, "pi", "sidecar.ts");
}

function readSettings(): Record<string, unknown> {
  if (!existsSync(PI_SETTINGS)) return {};
  try {
    return JSON.parse(readFileSync(PI_SETTINGS, "utf8"));
  } catch {
    warn(`pi: ${PI_SETTINGS} malformed — fix or remove it first.`);
    return {};
  }
}

function linkTarget(): string | null {
  try {
    if (lstatSync(PI_EXT_LINK).isSymbolicLink()) return readlinkSync(PI_EXT_LINK);
  } catch { /* not present */ }
  return null;
}

function install(): number {
  const src = extensionSource();
  if (!existsSync(src)) {
    warn(`pi install: extension source missing at ${src}`);
    return 1;
  }
  // 1. symlink the extension into Pi's auto-discovery dir
  mkdirSync(PI_EXT_DIR, { recursive: true });
  const cur = linkTarget();
  if (cur !== src) {
    if (existsSync(PI_EXT_LINK) || cur !== null) unlinkSync(PI_EXT_LINK);
    symlinkSync(src, PI_EXT_LINK);
  }
  // 2. add ~/.claude/skills to Pi's skills[] (so SKILL.md skills load in Pi)
  const d = readSettings();
  const skills = Array.isArray(d.skills) ? (d.skills as string[]) : [];
  let skillsNote = "";
  if (!skills.includes(CLAUDE_SKILLS)) {
    skills.push(CLAUDE_SKILLS);
    d.skills = skills;
    mkdirSync(dirname(PI_SETTINGS), { recursive: true });
    writeFileSync(PI_SETTINGS, JSON.stringify(d, null, 2) + "\n", "utf8");
    skillsNote = ` + skills[] += ${CLAUDE_SKILLS}`;
  }
  ok(`pi install: extension symlinked → ${PI_EXT_LINK} (→ ${src})${skillsNote}`);
  info("  governance parity: per-turn injects + tool guards bridged. Run /reload in Pi (or restart) to load.");
  info("  note: Pi has no blocking Stop hook — the hard stop-gates (recommend/ing/architecture stop-check) stay CC-only; per-turn injects still re-assert the rules.");
  return 0;
}

function status(): number {
  const src = extensionSource();
  const cur = linkTarget();
  const linked = cur === src;
  const d = readSettings();
  const skills = Array.isArray(d.skills) ? (d.skills as string[]) : [];
  const skillsWired = skills.includes(CLAUDE_SKILLS);
  info(`pi status:`);
  info(`  extension : ${linked ? "✓ linked" : cur ? `✗ stale → ${cur}` : "✗ not installed"} (${PI_EXT_LINK})`);
  info(`  source    : ${existsSync(src) ? "✓" : "✗ missing"} ${src}`);
  info(`  skills    : ${skillsWired ? "✓ ~/.claude/skills in Pi skills[]" : "✗ not wired"} (${PI_SETTINGS})`);
  info(`  pi binary : ${existsSync(resolve(PI_AGENT_DIR)) ? "✓ ~/.pi present" : "✗ ~/.pi absent (is Pi installed?)"}`);
  return linked && skillsWired ? 0 : 1;
}

function remove(): number {
  let changed = false;
  if (linkTarget() !== null || existsSync(PI_EXT_LINK)) {
    try { unlinkSync(PI_EXT_LINK); changed = true; } catch { /* already gone */ }
  }
  const d = readSettings();
  const skills = Array.isArray(d.skills) ? (d.skills as string[]) : [];
  const idx = skills.indexOf(CLAUDE_SKILLS);
  if (idx >= 0) {
    skills.splice(idx, 1);
    d.skills = skills;
    writeFileSync(PI_SETTINGS, JSON.stringify(d, null, 2) + "\n", "utf8");
    changed = true;
  }
  ok(changed ? `pi remove: sidecar extension + skills entry removed (Pi config kept otherwise).` : `pi remove: nothing to remove.`);
  return 0;
}

export async function runPi(args: string[]): Promise<number> {
  const sub = args[0] ?? "status";
  switch (sub) {
    case "install": return install();
    case "status": return status();
    case "remove": return remove();
    default:
      info("usage: sidecar pi {install|status|remove}");
      info("  install — symlink the Pi bridge extension + wire ~/.claude/skills into Pi settings");
      info("  status  — show wiring state");
      info("  remove  — unwire (keeps the rest of your Pi config)");
      return sub === "help" || sub === "--help" ? 0 : 1;
  }
}
