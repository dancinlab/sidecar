// sidecar switch [glm|claude|toggle|status]
//   Swap Claude Code's backend between the OFFICIAL Anthropic API and Z.AI's
//   GLM models (Anthropic-compatible endpoint). Z.AI exposes an
//   Anthropic-protocol gateway, so the switch is purely a matter of which
//   `env` block Claude Code loads at startup — we toggle the GLM env keys in
//   the GLOBAL ~/.claude/settings.json:
//
//     glm    → inject  ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
//                       ANTHROPIC_AUTH_TOKEN=<secret get zai.api_key>
//                       API_TIMEOUT_MS + GLM model mappings
//     claude → strip those keys → Claude Code falls back to the official API
//
//   The Z.AI key is NEVER taken on argv (it would leak into history/logs) —
//   it lives in the `secret` store under `zai.api_key` and is read via
//   secretGet() each time GLM is selected (commons git-safety).
//   Ref: https://docs.z.ai/scenario-example/develop-tools/claude
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { info, ok, warn } from "../lib/log.ts";
import { secretGet, secretBin } from "./secret.ts";

type Profile = "glm" | "claude";

// Z.AI GLM env profile (Anthropic-compatible gateway). Values per the official
// Z.AI ↔ Claude Code integration doc. ANTHROPIC_AUTH_TOKEN is added separately
// from the secret store, so it is NOT listed here.
const ZAI_BASE_URL = "https://api.z.ai/api/anthropic";
const ZAI_ENV: Record<string, string> = {
  ANTHROPIC_BASE_URL: ZAI_BASE_URL,
  API_TIMEOUT_MS: "3000000",
  // 1M-context auto-compaction window — pairs with the glm-5.2[1m] (1M) tier.
  CLAUDE_CODE_AUTO_COMPACT_WINDOW: "1000000",
  ANTHROPIC_DEFAULT_OPUS_MODEL: "glm-5.2[1m]",
  ANTHROPIC_DEFAULT_SONNET_MODEL: "glm-5.2[1m]",
  ANTHROPIC_DEFAULT_HAIKU_MODEL: "glm-4.5-air",
};
// Every env key the GLM profile owns — `claude` strips exactly these (and nothing
// else), so a user's unrelated env entries survive a switch.
const ZAI_ENV_KEYS = [...Object.keys(ZAI_ENV), "ANTHROPIC_AUTH_TOKEN"];
const SECRET_KEY = "zai.api_key";

function settingsPath(): string {
  return resolve(homedir(), ".claude", "settings.json");
}

// Load ~/.claude/settings.json. Returns null `d` on a parse error so callers can
// abort WITHOUT clobbering a malformed-but-recoverable file (setup.ts pattern).
function loadSettings(): { d: Record<string, unknown> | null; existed: boolean } {
  const p = settingsPath();
  if (!existsSync(p)) return { d: {}, existed: false };
  try {
    return { d: JSON.parse(readFileSync(p, "utf8")), existed: true };
  } catch {
    return { d: null, existed: true };
  }
}

function saveSettings(d: Record<string, unknown>): void {
  const p = settingsPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(d, null, 2) + "\n", "utf8");
}

function activeProfile(env: Record<string, string>): Profile {
  return (env.ANTHROPIC_BASE_URL ?? "").includes("z.ai") ? "glm" : "claude";
}

// Mask a credential for human-readable status — never print the full token.
function mask(tok: string): string {
  if (!tok) return "(empty)";
  if (tok.length <= 10) return tok.slice(0, 2) + "…";
  return tok.slice(0, 6) + "…" + tok.slice(-2);
}

// Big, scannable backend label printed at the FRONT of every switch output so
// the active provider is the first thing the eye lands on.
function badge(p: Profile): string {
  return p === "glm" ? "[ GLM ]" : "[ CLAUDE ]";
}

function restartHint(): void {
  info("  ↻ env is read at Claude Code STARTUP — restart your session (or `/exit` and reopen) for it to take effect.");
}

async function toGlm(d: Record<string, unknown>): Promise<number> {
  const token = await secretGet(SECRET_KEY);
  if (!token) {
    info(badge(activeProfile((d.env ?? {}) as Record<string, string>)) + "  (unchanged — switch aborted)");
    warn(`switch glm: no Z.AI API key available (secret key '${SECRET_KEY}').`);
    if (!(await secretBin())) {
      info("  the `secret` CLI is not installed — install dancinlab/secret (Keychain credential store) first, then:");
    } else {
      info("  Get a key at https://z.ai/manage-apikey/apikey-list , then store it (it stays out of argv/history):");
    }
    info(`    secret set ${SECRET_KEY}`);
    info("  …and re-run `sidecar switch glm`.");
    return 1;
  }
  const env = (d.env ?? (d.env = {})) as Record<string, string>;
  const already = activeProfile(env) === "glm";
  Object.assign(env, ZAI_ENV);
  env.ANTHROPIC_AUTH_TOKEN = token;
  saveSettings(d);
  ok(`${badge("glm")}  switch → GLM (Z.AI) ${already ? "(refreshed)" : ""}— ${ZAI_BASE_URL}`);
  info(`  models: opus/sonnet=${ZAI_ENV.ANTHROPIC_DEFAULT_OPUS_MODEL} · haiku=${ZAI_ENV.ANTHROPIC_DEFAULT_HAIKU_MODEL} · token=${mask(token)}`);
  info(`  env:    API_TIMEOUT_MS=${ZAI_ENV.API_TIMEOUT_MS} · CLAUDE_CODE_AUTO_COMPACT_WINDOW=${ZAI_ENV.CLAUDE_CODE_AUTO_COMPACT_WINDOW}`);
  restartHint();
  return 0;
}

function toClaude(d: Record<string, unknown>): number {
  const env = (d.env ?? {}) as Record<string, string>;
  const already = activeProfile(env) === "claude";
  for (const k of ZAI_ENV_KEYS) delete env[k];
  // Drop an emptied env object so settings.json stays clean.
  if (d.env && Object.keys(env).length === 0) delete d.env;
  saveSettings(d);
  ok(`${badge("claude")}  switch → Claude (official Anthropic API) ${already ? "(already)" : ""}— GLM env keys removed`);
  restartHint();
  return 0;
}

async function status(d: Record<string, unknown>, existed: boolean): Promise<number> {
  const env = (d.env ?? {}) as Record<string, string>;
  const cur = activeProfile(env);
  const stored = await secretGet(SECRET_KEY);
  info(badge(cur));
  info(`backend: ${cur === "glm" ? "GLM (Z.AI)" : "Claude (official Anthropic API)"}`);
  info(`  settings: ${settingsPath()}${existed ? "" : " (absent)"}`);
  if (cur === "glm") {
    info(`  base_url: ${env.ANTHROPIC_BASE_URL}`);
    info(`  token:    ${mask(env.ANTHROPIC_AUTH_TOKEN ?? "")}`);
    info(`  models:   opus/sonnet=${env.ANTHROPIC_DEFAULT_OPUS_MODEL ?? "?"} · haiku=${env.ANTHROPIC_DEFAULT_HAIKU_MODEL ?? "?"}`);
    info(`  env:      API_TIMEOUT_MS=${env.API_TIMEOUT_MS ?? "?"} · CLAUDE_CODE_AUTO_COMPACT_WINDOW=${env.CLAUDE_CODE_AUTO_COMPACT_WINDOW ?? "?"}`);
  } else {
    info("  base_url: (default Anthropic)");
  }
  info(`  secret '${SECRET_KEY}': ${stored ? `present (${mask(stored)})` : "MISSING — `secret set " + SECRET_KEY + "` before `switch glm`"}`);
  info("  switch with: `sidecar switch glm` · `sidecar switch claude` · `sidecar switch toggle`");
  return 0;
}

export async function runSwitch(args: string[]): Promise<number> {
  const sub = (args[0] ?? "status").toLowerCase();
  const { d, existed } = loadSettings();
  if (d === null) {
    warn(`switch: ${settingsPath()} is malformed JSON — fix or remove it first (refusing to overwrite).`);
    return 1;
  }

  if (sub === "glm" || sub === "zai" || sub === "z.ai") return toGlm(d);
  if (sub === "claude" || sub === "anthropic" || sub === "official") return toClaude(d);
  if (sub === "toggle") {
    const env = (d.env ?? {}) as Record<string, string>;
    return activeProfile(env) === "glm" ? toClaude(d) : toGlm(d);
  }
  if (sub === "status" || sub === "show") return status(d, existed);

  info("usage: sidecar switch {glm|claude|toggle|status}");
  info("  glm    → Z.AI GLM (Anthropic-compatible · key from `secret get zai.api_key`)");
  info("  claude → official Anthropic API (strips the GLM env keys)");
  info("  toggle → flip to the other backend · status → show the active backend");
  return 1;
}
