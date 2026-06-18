// harness pre bash|write — delegate target for an agent's PreToolUse hook.
// On a blocking match it writes {"decision":"block","reason":"..."} to stdout
// (the shape Claude Code / compatible runtimes read to veto a tool call).
// On a warn it prints to stderr. On no match it stays silent (H1).
//
// settings.json wiring (Claude Code):
//   "PreToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command",
//     "command": "CLAUDE_TOOL_INPUT=\"$CLAUDE_TOOL_INPUT\" <harness> pre bash" }]}]
//
// CLAUDE_TOOL_INPUT / CODEX_TOOL_INPUT is JSON: {"command":"...","file_path":"...","content":"..."}
import { readJson } from "../lib/json.ts";
import { LOGS } from "../lib/paths.ts";
import { appendJsonl } from "../lib/log.ts";
import { config, resolveRuleFile } from "../lib/config.ts";
import { detectForcePush } from "./git-guard.ts";
import { detectRawCloudCli } from "./cloud-guard.ts";
import { detectShortPollLoop } from "./poll-guard.ts";
import { worktreeAddAdvisory } from "./worktree.ts";
import { docWriteViolation } from "./docs.ts";
import { isTmpPath, detectTmpBashWrite } from "./tmp-guard.ts";
import { detectHandoffScatter } from "./handoff-guard.ts";

interface BashRule {
  id: string;
  desc?: string;
  match: string;
  exceptions?: string[];
  cwd_match?: string;
  action: "block" | "warn" | "log_only";
  reason: string;
}

interface WriteRule {
  id: string;
  desc?: string;
  path_match: string;
  content_forbidden_pattern?: string;
  bypass_patterns?: string[];
  exemption_markers?: string[];
  action: "block" | "warn" | "log_only";
  reason: string;
}

export interface PromptHintRule {
  id: string;
  desc?: string;
  match_patterns: string[];
  hint: string;
}

interface EnforcementConfig {
  pre_bash?: BashRule[];
  pre_write?: WriteRule[];
  prompt_hints?: PromptHintRule[];
}

function loadConfig(): EnforcementConfig {
  const cfg = config();
  const file = resolveRuleFile(cfg.enforcementFile, "enforcement.json");
  try {
    return readJson<EnforcementConfig>(file);
  } catch {
    return {};
  }
}

function parseToolInput(): Record<string, unknown> {
  const raw = process.env.CLAUDE_TOOL_INPUT ?? process.env.CODEX_TOOL_INPUT ?? "";
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function emitBlock(id: string, reason: string): number {
  process.stdout.write(JSON.stringify({ decision: "block", reason: `[${id}] ${reason}` }) + "\n");
  appendJsonl(LOGS.mistakes, { kind: "pre_block", rule_id: id, reason });
  return 0;
}

function emitWarn(id: string, reason: string): void {
  process.stderr.write(`[harness warn ${id}] ${reason}\n`);
  appendJsonl(LOGS.observations, { kind: "pre_warn", rule_id: id, reason });
}

export async function preBash(_args: string[]): Promise<number> {
  const input = parseToolInput();
  const cmd = String(input.command ?? "");
  if (!cmd) return 0;
  const cwd = process.env.PWD ?? "";

  // built-in git force-push guard — runs before config rules, default-on.
  if (config().git.guardForcePush) {
    const label = detectForcePush(cmd);
    if (label) {
      return emitBlock(
        "GIT-FORCE-PUSH",
        `${label} — rewrites or bypasses shared history. No override; if a force-push is genuinely required, run it outside the agent.`
      );
    }
  }

  // built-in raw-cloud-CLI guard — code-level block (c11), runs before config
  // rules, default-on, NO override. GPU/cloud must go through hexa builtins.
  const cloudLabel = detectRawCloudCli(cmd);
  if (cloudLabel) {
    return emitBlock(
      "CLOUD-RAW-CLI",
      `${cloudLabel} — raw GPU-provider CLI/API direct use is blocked (commons c11). Use the hexa builtins: GPU/cloud → \`hexa cloud run <host> -- <argv...>\`, training jobs → \`hexa dojo <domain> <slug> '<spec>'\`, input decks → \`hexa deck …\`. Register running cloud work with \`harness ing pod add\`. No override — provider CLIs/APIs are not called directly from the agent.`
    );
  }

  // built-in poll-interval guard — code-level block (c19), runs before config
  // rules, default-on. A short-interval bash poll loop over an external long-runner
  // (pod/r2/cloud/training) must poll at ≥30min or be delegated to a sub-agent.
  const pollLabel = detectShortPollLoop(cmd);
  if (pollLabel) {
    return emitBlock(
      "POLL-INTERVAL",
      `${pollLabel} — external long-running jobs (GPU pod · remote r2/measure · cloud) must be polled at ≥30min (1800s), not minute-by-minute (commons c19): short intervals bust the prompt cache (5min TTL) for no gain. Lengthen the sleep to ≥1800, or delegate the polling to a sub-agent (worktree-isolated), or register the job with \`harness ing pod add\` and check it ≥30min apart. (Fast local/CI waits are exempt — this only fires on external long-runners.)`
    );
  }

  // worktree-add advisory — non-blocking (stranded-work + branch-reuse hygiene)
  const wtAdv = await worktreeAddAdvisory(cmd).catch(() => "");
  if (wtAdv) emitWarn("WORKTREE-HYGIENE", wtAdv);

  // tmp-guard — progress/working data written to volatile tmp is discarded.
  if (config().tmpGuard) {
    const where = detectTmpBashWrite(cmd);
    if (where) emitWarn("TMP-VOLATILE", `output → ${where} is volatile (lost on reboot/reaper). For progress/working data use ${config().docs.scratchDir}/ (git-tracked) and commit it so it persists on GitHub.`);
  }

  const cfg = loadConfig();

  for (const rule of cfg.pre_bash ?? []) {
    if (!new RegExp(rule.match, "i").test(cmd)) continue;
    if (rule.cwd_match && !cwd.includes(rule.cwd_match)) continue;
    if (rule.exceptions?.some((p) => new RegExp(p, "i").test(cmd))) continue;

    appendJsonl(LOGS.observations, { kind: "pre_bash_match", rule_id: rule.id, cmd_len: cmd.length });
    if (rule.action === "block") return emitBlock(rule.id, rule.reason);
    if (rule.action === "warn") emitWarn(rule.id, rule.reason);
  }
  return 0;
}

function checkBypassPatterns(content: string, patterns: string[], exemptions: string[]): string[] {
  const hits: string[] = [];
  const lines = content.split("\n");
  for (const pat of patterns) {
    const re = new RegExp(pat, "i");
    for (const line of lines) {
      if (!re.test(line)) continue;
      if (exemptions.some((m) => line.includes(m))) continue;
      hits.push(`${pat}  → "${line.trim().slice(0, 120)}"`);
      break; // one report per pattern
    }
  }
  return hits;
}

export async function preWrite(_args: string[]): Promise<number> {
  const input = parseToolInput();
  const filePath = String(input.file_path ?? "");
  const content = String(input.content ?? input.new_string ?? "");
  if (!filePath) return 0;

  // handoff-guard — block scattered HANDOFF.md / INBOX.md / inbox/*.md; route to handoff.jsonl.
  if (config().handoffGuard) {
    const hs = detectHandoffScatter(filePath);
    if (hs) return emitBlock("HANDOFF-SCATTER", hs);
  }

  // tmp-guard — writing a file into a volatile tmp dir loses it; steer to scratch.
  if (config().tmpGuard && isTmpPath(filePath)) {
    emitWarn("TMP-VOLATILE", `${filePath} is in a volatile tmp dir (lost on reboot/reaper). Write progress/working data to ${config().docs.scratchDir}/ (git-tracked) and commit it so it persists on GitHub.`);
  }

  // built-in single-doc discipline (write-time) — fires when a scattered or
  // quickref-less .md is created, the moment it happens (lint alone is too late).
  if (filePath.endsWith(".md")) {
    const dv = docWriteViolation(filePath, content);
    if (dv) {
      const level = config().docs.enforce ?? "warn";
      if (level === "block") return emitBlock(dv.rule, `${dv.msg} (docs.enforce=block)`);
      emitWarn(dv.rule, dv.msg);
    }
  }

  const cfg = loadConfig();

  for (const rule of cfg.pre_write ?? []) {
    if (!new RegExp(rule.path_match).test(filePath)) continue;

    if (rule.content_forbidden_pattern && content) {
      if (!new RegExp(rule.content_forbidden_pattern, "is").test(content)) continue;
    }

    if (rule.bypass_patterns && rule.bypass_patterns.length > 0) {
      if (!content) continue;
      const hits = checkBypassPatterns(content, rule.bypass_patterns, rule.exemption_markers ?? []);
      if (hits.length === 0) continue;
      appendJsonl(LOGS.observations, {
        kind: "pre_write_bypass",
        rule_id: rule.id,
        file: filePath,
        hits: hits.slice(0, 10),
      });
      const reasonWithHits = `${rule.reason}\n  matched ${hits.length}:\n${hits
        .slice(0, 5)
        .map((h) => `    • ${h}`)
        .join("\n")}`;
      if (rule.action === "block") return emitBlock(rule.id, reasonWithHits);
      if (rule.action === "warn") emitWarn(rule.id, reasonWithHits);
      continue;
    }

    appendJsonl(LOGS.observations, { kind: "pre_write_match", rule_id: rule.id, file: filePath });
    if (rule.action === "block") return emitBlock(rule.id, rule.reason);
    if (rule.action === "warn") emitWarn(rule.id, rule.reason);
  }
  return 0;
}

// Used by prompt-scan to surface prompt_hints alongside keyword matches.
export function matchPromptHints(text: string): PromptHintRule[] {
  const cfg = loadConfig();
  const out: PromptHintRule[] = [];
  const lowered = text.toLowerCase();
  for (const rule of cfg.prompt_hints ?? []) {
    if (rule.match_patterns.some((p) => new RegExp(p, "i").test(lowered))) out.push(rule);
  }
  return out;
}

// PreToolUse(AskUserQuestion) — deny the arrow-key option box; ask in plain chat.
export async function preAskq(_args: string[]): Promise<number> {
  if (!config().askqText) return 0;
  return emitBlock(
    "ASKQ-TEXT",
    "this session asks questions in plain CHAT, not the arrow-key option box. Re-ask conversationally as plain text in your reply — do NOT call AskUserQuestion: state the question in prose; if you had options, list them inline (short bullets) and mark the one you'd recommend; accept a free-form answer. (ExitPlanMode for plan approval is unaffected.)"
  );
}

export async function runPre(args: string[]): Promise<number> {
  const sub = args[0];
  if (sub === "bash") return preBash(args.slice(1));
  if (sub === "write") return preWrite(args.slice(1));
  if (sub === "askq") return preAskq(args.slice(1));
  process.stderr.write("usage: harness pre {bash|write|askq}\n");
  return 1;
}
