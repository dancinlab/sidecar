// sidecar pre bash|write — delegate target for an agent's PreToolUse hook.
// On a blocking match it writes {"decision":"block","reason":"..."} to stdout
// (the shape Claude Code / compatible runtimes read to veto a tool call).
// On a warn it prints to stderr. On no match it stays silent (H1).
//
// settings.json wiring (Claude Code):
//   "PreToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command",
//     "command": "CLAUDE_TOOL_INPUT=\"$CLAUDE_TOOL_INPUT\" <sidecar> pre bash" }]}]
//
// CLAUDE_TOOL_INPUT / CODEX_TOOL_INPUT is JSON: {"command":"...","file_path":"...","content":"..."}
import { readJson } from "../lib/json.ts";
import { readStdin } from "../lib/exec.ts";
import { LOGS } from "../lib/paths.ts";
import { appendJsonl } from "../lib/log.ts";
import { config, resolveRuleFile } from "../lib/config.ts";
import { detectForcePush } from "./git-guard.ts";
import { detectDangerousBash } from "./danger-guard.ts";
import { detectSecretLiteral } from "./secret-guard.ts";
import { detectRawCloudCli, detectHandrolledShardFanout } from "./cloud-guard.ts";
import { detectShortPollLoop } from "./poll-guard.ts";
import { worktreeAddAdvisory } from "./worktree.ts";
// import { convergenceForFile } from "./architecture.ts"; // convergence-on-touch DISABLED (commented off)
import { docWriteViolation } from "./docs.ts";
import { descWriteViolation } from "./shadow.ts";
import { commonsWriteViolation, dodontLengthWriteViolation } from "./commons.ts";
import { isTmpPath, detectTmpBashWrite } from "./tmp-guard.ts";
import { detectHandoffScatter } from "./handoff-guard.ts";
import { detectVersionedName, detectVersionedNameBash } from "./naming-guard.ts";
import { detectBannedStateDir, detectBannedStateDirBash } from "./state-guard.ts";
import { memPreflight } from "./mem-guard.ts";

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

// Resolve the tool-input object from EITHER carrier, in priority order:
//   1. CLAUDE_TOOL_INPUT / CODEX_TOOL_INPUT env (Codex, or a wrapper that exports it)
//   2. the hook payload piped on STDIN — how current Claude Code passes PreToolUse
//      input ({session_id, tool_name, tool_input:{command|file_path|content}, …})
// Each carrier may hold the full payload (unwrap `.tool_input`) OR the bare input
// object directly (use as-is). The env path was the ONLY carrier read before, but
// current CC does not populate that env var — it pipes JSON on stdin — so every
// code-level guard (cloud-raw c11 · force-push · poll c19) silently no-op'd on an
// empty command. Read stdin as the working carrier; keep env as back-compat.
//
function unwrapToolInput(j: unknown): Record<string, unknown> | null {
  if (!j || typeof j !== "object") return null;
  const obj = j as Record<string, unknown>;
  if (obj.tool_input && typeof obj.tool_input === "object") return obj.tool_input as Record<string, unknown>;
  return obj;
}

function parseToolInput(): Record<string, unknown> {
  const env = process.env.CLAUDE_TOOL_INPUT ?? process.env.CODEX_TOOL_INPUT ?? "";
  for (const raw of [env, readStdin()]) {
    if (!raw || !raw.trim()) continue;
    try {
      const got = unwrapToolInput(JSON.parse(raw));
      if (got) return got;
    } catch {
      /* try next carrier */
    }
  }
  return {};
}

// PreToolUse deny. Current Claude Code honors ONLY `hookSpecificOutput.permissionDecision`
// for PreToolUse — the legacy top-level `decision:"block"` is ignored for this event,
// so emitting only that made EVERY code-level guard (force-push · cloud-raw c11 · poll
// c19) and every config `action:"block"` rule a silent no-op (stdout text, zero teeth).
// We emit the current schema as the operative key and keep the legacy fields appended
// for older CC builds (harmless — new builds read hookSpecificOutput, old read decision).
function emitBlock(id: string, reason: string): number {
  const full = `[${id}] ${reason}`;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: full },
      decision: "block", // legacy fallback for older Claude Code builds
      reason: full,
    }) + "\n"
  );
  appendJsonl(LOGS.mistakes, { kind: "pre_block", rule_id: id, reason });
  return 0;
}

function emitWarn(id: string, reason: string): void {
  process.stderr.write(`[sidecar warn ${id}] ${reason}\n`);
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

  // built-in destructive / gate-bypass guard — code-level block, runs before
  // config rules, default-on. Mirrors H-NO-VERIFY/H-RESET-HARD/H-RM-RF-ROOT/
  // H-CURL-PIPE-SH so a profile edit can't disable them; honors inline `# ...-ok`.
  const danger = detectDangerousBash(cmd);
  if (danger) return emitBlock(danger.id, danger.reason);

  // naming-guard (bash) — BLOCK a mv/cp/touch/mkdir that CREATES a version/copy-
  // suffixed name (`mv a a_v2.ts`, `touch report_final.md`, `mkdir model_v2`). The
  // CLI sibling of the Write/Edit guard; honors an inline `# canonical-ok` marker.
  if (config().namingGuard) {
    const nb = detectVersionedNameBash(cmd);
    if (nb) {
      return emitBlock(
        "NAMING-VERSION-SUFFIX",
        `'${nb.offender}' carries a version/copy suffix ('${nb.token}') — history belongs in git, not the filename. ` +
          `Use ONE canonical native name and update it in place (old versions stay recoverable via git log/blame). ` +
          `If genuinely intentional (e.g. real public API versioning), append '# canonical-ok <reason>' to the command.`
      );
    }
  }

  // state-guard (bash) — BLOCK a mkdir/touch/cp/mv that CREATES output inside a
  // scatter dir (.verdicts/bench/experiments/scripts-scratch); work output lives in
  // the single `state/` root (commons preserve-state). Honors `# state-ok`.
  if (config().stateGuard) {
    const sd = detectBannedStateDirBash(cmd);
    if (sd) {
      return emitBlock(
        "STATE-SCATTER-DIR",
        `'${sd}/' is a scatter directory (commons preserve-state) — work output belongs in the single git-tracked \`state/\` root ` +
          `(committed → preserved on GitHub). Regenerable artifacts → \`build/\` (gitignored); machine logs → \`.harness/\`. ` +
          `If genuinely needed outside \`state/\`, append '# state-ok <reason>' to the command.`
      );
    }
  }

  // built-in raw-cloud-CLI guard — code-level block (c11), runs before config
  // rules, default-on, NO override. GPU/cloud must go through hexa builtins.
  const cloudLabel = detectRawCloudCli(cmd);
  if (cloudLabel) {
    return emitBlock(
      "CLOUD-RAW-CLI",
      `${cloudLabel} — raw GPU-provider CLI/API direct use is blocked (commons c11). Use the hexa builtins: GPU/cloud → \`hexa cloud run <host> -- <argv...>\`, training jobs → \`hexa dojo <domain> <slug> '<spec>'\`, input decks → \`hexa deck …\`. Register running cloud work with \`sidecar ing pod add\`. No override — provider CLIs/APIs are not called directly from the agent.`
    );
  }

  // hand-rolled shard-fanout launcher — WARN + redirect (c11 sibling). A local
  // CPU-parallel loop is legitimate, so this never blocks; but the moment such a
  // loop is copied to a pod the structured dispatch (register · cost · monitor) is
  // lost, so we surface the canonical path every time the pattern appears.
  const fanoutLabel = detectHandrolledShardFanout(cmd);
  if (fanoutLabel) {
    emitWarn(
      "CLOUD-HANDROLLED-FANOUT",
      `${fanoutLabel} — if this targets a GPU pod, hand-rolling the fanout (then \`hexa cloud copy-to\` + remote run) bypasses structured dispatch, \`pods.json\` registration, and cost accounting. Use \`hexa cloud fire-shards\` (splits the job list into N shards + stagger-launches each as a registered detached job). Local CPU-only batches are fine — ignore if not pod-bound.`
    );
  }

  // built-in poll-interval guard — code-level block (c19), runs before config
  // rules, default-on. A short-interval bash poll loop over an external long-runner
  // (pod/r2/cloud/training) must poll at ≥30min or be delegated to a sub-agent.
  const pollLabel = detectShortPollLoop(cmd);
  if (pollLabel) {
    return emitBlock(
      "POLL-INTERVAL",
      `${pollLabel} — external long-running jobs (GPU pod · remote r2/measure · cloud) must be polled at ≥30min (1800s), not minute-by-minute (commons c19): short intervals bust the prompt cache (5min TTL) for no gain. Lengthen the sleep to ≥1800, or delegate the polling to a sub-agent (worktree-isolated), or register the job with \`sidecar ing pod add\` and check it ≥30min apart. (Fast local/CI waits are exempt — this only fires on external long-runners.)`
    );
  }

  // worktree-add advisory — non-blocking (stranded-work + branch-reuse hygiene)
  const wtAdv = await worktreeAddAdvisory(cmd).catch(() => "");
  if (wtAdv) emitWarn("WORKTREE-HYGIENE", wtAdv);

  // mem-guard — OOM preflight: a background-spawn (`&`/nohup) under low system RAM
  // risks a macOS jetsam kill (the fan-out accumulation that OOM-dies a 16GB Mac).
  // warn by default; block only when available RAM < blockPct (config, default 0 = off).
  const mem = memPreflight(cmd);
  if (mem) {
    if (mem.action === "block") return emitBlock("MEM-OOM", mem.reason);
    emitWarn("MEM-LOW", mem.reason);
  }

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

  // convergence-on-touch — DISABLED (commented off): surfacing the file's recurrence
  // learnings on every Write/Edit added per-touch noise/tokens of uncertain value.
  // The store + CRUD + lint stay; re-enable by uncommenting (+ the preTouch/import).
  // const cv = convergenceForFile(filePath);
  // if (cv) process.stderr.write(cv + "\n");

  // handoff-guard — block scattered HANDOFF.md / INBOX.md / inbox/*.md; route to handoff.jsonl.
  if (config().handoffGuard) {
    const hs = detectHandoffScatter(filePath);
    if (hs) return emitBlock("HANDOFF-SCATTER", hs);
  }

  // built-in secret-literal guard — code-level block (c1), runs before config
  // rules, default-on. A committed credential is an irreversible git-history leak.
  const secret = detectSecretLiteral(filePath, content);
  if (secret) return emitBlock("SECRET-LITERAL", secret);

  // tmp-guard — writing a file into a volatile tmp dir loses it; steer to scratch.
  if (config().tmpGuard && isTmpPath(filePath)) {
    emitWarn("TMP-VOLATILE", `${filePath} is in a volatile tmp dir (lost on reboot/reaper). Write progress/working data to ${config().docs.scratchDir}/ (git-tracked) and commit it so it persists on GitHub.`);
  }

  // naming-guard — BLOCK version/copy-suffixed names; history is git's job, not the
  // filename. Honors the `@canonical-ok` marker in content (real API versioning).
  if (config().namingGuard) {
    const nv = detectVersionedName(filePath, content);
    if (nv) return emitBlock("NAMING-VERSION-SUFFIX", nv);
  }

  // state-guard — BLOCK writing output into a scatter dir (.verdicts/bench/…);
  // all work output lives in the single `state/` root (commons preserve-state).
  // Honors the `@state-ok` marker in content.
  if (config().stateGuard) {
    const sv = detectBannedStateDir(filePath, content);
    if (sv) return emitBlock("STATE-SCATTER-DIR", sv);
  }

  // built-in single-doc discipline (write-time) — fires when a scattered or
  // quickref-less .md is created, the moment it happens (lint alone is too late).
  if (filePath.endsWith(".md")) {
    const dv = docWriteViolation(filePath, content);
    if (dv) {
      const level = config().docs.enforce ?? "warn";
      // scatter filenames (`*-report/summary/notes.md` …) and a non-root architecture
      // dup are HARD single-doc violations — always BLOCK (commons single-doc · the
      // 산출물 이름 family). The softer missing-quickref nudge stays at the configured
      // enforce level (warn by default).
      const hard = dv.rule === "DOC-SCATTER" || dv.rule === "DOC-ARCH-NONROOT";
      if (hard || level === "block") return emitBlock(dv.rule, dv.msg);
      emitWarn(dv.rule, dv.msg);
    }
  }

  // skill/command description-recognition guard (sidecar `skill-desc-guard` s18,
  // write-time). A commands/*.md or SKILL.md `description:` over the skill-listing
  // cap gets truncated/dropped → recognition dies; hard-DENY before it lands.
  // Missing Triggers clause → warn (lint 4f is the commit-time backstop).
  const sd = descWriteViolation(filePath, content);
  if (sd) {
    if (sd.warn) emitWarn("SKILL-DESC-TRIGGERS", sd.warn);
    if (sd.block) return emitBlock("SKILL-DESC-CAP", sd.block);
  }

  // commons do/dont format guard (write-time, sidecar-style) — a commons.md
  // (bundled or .harness/ override) full-document write must be do/dont-only;
  // a prose section is hard-DENIED before it lands, not just at commit (lint 4g
  // is the backstop). Keeps the always-on governance SSOT from re-bloating.
  const cw = commonsWriteViolation(filePath, content);
  if (cw) return emitBlock(cw.rule, cw.block);

  // do/dont length cap (archive_sidecar tape-lint #2 port) — a NEW or lengthened
  // `- do:`/`- dont:` line over the cap in commons.md / CLAUDE.md is hard-DENIED
  // at write (full-content Write); diff-aware so legacy long lines are grandfathered.
  // Edit fragments fall through to the commit-time lint backstop (lint 4h).
  const dl = dodontLengthWriteViolation(filePath, content);
  if (dl) return emitBlock(dl.rule, dl.block);

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

// preTouch — Read convergence surfacing — DISABLED (commented off · see preWrite).
// Kept as a no-op so the Read hook matcher stays harmless; re-enable by uncommenting.
export async function preTouch(_args: string[]): Promise<number> {
  // const input = parseToolInput();
  // const filePath = String(input.file_path ?? "");
  // if (!filePath) return 0;
  // const cv = convergenceForFile(filePath);
  // if (cv) process.stderr.write(cv + "\n");
  return 0;
}

export async function runPre(args: string[]): Promise<number> {
  const sub = args[0];
  if (sub === "bash") return preBash(args.slice(1));
  if (sub === "write") return preWrite(args.slice(1));
  if (sub === "askq") return preAskq(args.slice(1));
  if (sub === "touch") return preTouch(args.slice(1));
  process.stderr.write("usage: sidecar pre {bash|write|askq|touch}\n");
  return 1;
}
