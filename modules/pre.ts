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
import { readStdin, execShell } from "../lib/exec.ts";
import { LOGS } from "../lib/paths.ts";
import { appendJsonl } from "../lib/log.ts";
import { config, resolveRuleFile, repoPath, inGitRepo } from "../lib/config.ts";
import { collectViolations, lintBlockers, governanceDocWriteViolation } from "./lint.ts";
import { detectForcePush } from "./git-guard.ts";
import { detectBranchSwitch, detectMainRefMove } from "./git-checkout-guard.ts";
import { detectDangerousBash } from "./danger-guard.ts";
import { detectSecretLiteral } from "./secret-guard.ts";
import { detectRawCloudCli, detectHandrolledShardFanout } from "./cloud-guard.ts";
import { worktreeAddAdvisory } from "./worktree.ts";
import { convergenceForFile } from "./architecture.ts";
import { docWriteViolation } from "./docs.ts";
import { descWriteViolation } from "./shadow.ts";
import { commonsWriteViolation, dodontLengthWriteViolation } from "./commons.ts";
import { isTmpPath, detectTmpBashWrite } from "./tmp-guard.ts";
import { detectHandoffScatter } from "./handoff-guard.ts";
import { detectVersionedName, detectVersionedNameBash, offendingToken } from "./naming-guard.ts";
import { existsSync } from "node:fs";
import { basename, isAbsolute, join } from "node:path";
import { memPreflight } from "./mem-guard.ts";
import { detectAnnotationRisk } from "./annotation-guard.ts";

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
// code-level guard (cloud-raw c11 · force-push) silently no-op'd on an
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
// so emitting only that made EVERY code-level guard (force-push · cloud-raw c11)
// and every config `action:"block"` rule a silent no-op (stdout text, zero teeth).
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

// emitContext injects advisory text into the model's context via the PreToolUse
// `additionalContext` channel (NOT stderr) WITHOUT a permissionDecision — so the write
// still goes through the normal allow/ask flow, it just arrives with extra context. Used
// for convergence-on-touch: surface a file's recorded recurrence learnings as the agent
// edits it. Emit on the NON-block path only (a block aborts the write → context is moot).
function emitContext(ctx: string): void {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: ctx } }) + "\n"
  );
}

// commit-lint gate — the GLOBAL enforcer. The lint commit-gate used to live ONLY in a
// per-repo git pre-commit hook (installed by `sidecar init`), so a repo that was never
// `init`-ed (e.g. anima) committed completely un-gated. `sidecar pre bash` is wired
// GLOBALLY via ~/.claude/settings.json, so intercepting an agent `git commit` HERE runs
// the SAME lint (`collectViolations` → `lintBlockers`) in EVERY git repo — no per-repo
// hook needed. The managed-marker opt-in is ABOLISHED: this fires in ANY git repo (not
// just ones carrying harness.config.json/CLAUDE.md), so brand-new repos are gated with
// zero setup; a repo with no config just lints against the bundled defaults. Honors the
// --no-verify / `# no-verify-ok` escape the danger guard already governs, so it is ONE
// consistent opt-out, not a new hatch. Returns a block reason or null.
async function commitLintGate(cmd: string): Promise<string | null> {
  if (!/(^|[\s;&|(])git\s+(-\S+\s+)*commit(?![\w-])/.test(cmd)) return null; // not a git commit
  if (/--no-verify|(^|\s)-n(\s|$)|no-verify-ok/.test(cmd)) return null; // danger-guard-governed escape
  if (!inGitRepo()) return null; // any git repo (managed-marker abolished · config.ts inGitRepo)
  const split = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
  const cached = split((await execShell("git diff --cached --name-only", { cwd: repoPath(".") })).stdout);
  // `git commit -a/-am/--all` auto-stages tracked-modified files at commit time — widen
  // the lint scope to match the about-to-commit set (precise -a detection, no over-match).
  const after = cmd.slice((cmd.search(/\bcommit\b/) + 6) || 0).split(/\s+/);
  const dashA = after.some((t) => t === "--all" || /^-[A-Za-z]*a[A-Za-z]*$/.test(t));
  let scope = cached;
  if (dashA) {
    const tracked = split((await execShell("git diff --name-only", { cwd: repoPath(".") })).stdout);
    scope = [...new Set([...cached, ...tracked])];
  }
  if (!scope.length) return null; // nothing to commit (e.g. message-only --amend) → let git handle it
  const blockers = lintBlockers(await collectViolations(scope));
  if (!blockers.length) return null;
  const lines = blockers.map((v) => `  • [${v.rule}] ${v.file} — ${v.msg}`).join("\n");
  return (
    `git commit blocked by ${blockers.length} sidecar lint violation(s) (global gate via settings.json · commons cycle-docs-pr) —\n${lines}\n` +
    `Fix them (add the CHANGELOG entry · refresh ARCHITECTURE · split the oversized cell · …), ` +
    `or if a doc is genuinely N/A append \`# no-verify-ok <reason>\` and \`git commit --no-verify\`.`
  );
}

// True when `cwd` is the MAIN worktree of a git repo (the shared primary
// checkout), false for a linked/temp worktree or outside any repo. A linked
// worktree's git-dir lives under `<common>/.git/worktrees/<name>`; the main
// worktree's absolute-git-dir is `<repo>/.git` with no `/worktrees/` segment.
// Linked worktrees are MEANT to switch branches, so they are exempt from the
// branch-switch guard — only the shared main checkout is protected.
async function isMainWorktree(cwd: string): Promise<boolean> {
  const r = await execShell("git rev-parse --absolute-git-dir", { cwd: cwd || "." }).catch(() => null);
  if (!r || r.code !== 0) return false; // not a git repo → nothing to protect
  return !/\.git\/worktrees\//.test(r.stdout.trim());
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

  // built-in git branch-switch guard — DENIES a HEAD-moving checkout/switch in
  // the MAIN worktree (clobbers a parallel session's untracked work · #3559).
  // Runs git only when a candidate is parsed (no per-bash latency otherwise);
  // the ambiguous `git checkout <ref>` form is verified to be a real ref before
  // blocking, so a file restore (`git checkout README.md`) falls through.
  if (config().git.guardBranchSwitch) {
    const bs = detectBranchSwitch(cmd);
    // a git-level `-C <path>` makes the command operate in <path>, not cwd — judge
    // that directory's worktree so `git -C <main> checkout x` from anywhere is caught.
    const effDir = bs?.dir ? (isAbsolute(bs.dir) ? bs.dir : join(cwd || ".", bs.dir)) : cwd;
    if (bs && (await isMainWorktree(effDir))) {
      let block = !bs.needsVerify;
      if (bs.needsVerify && bs.target) {
        const rev = await execShell(`git rev-parse --verify --quiet ${JSON.stringify(bs.target)}^{commit}`, { cwd: effDir || "." }).catch(() => null);
        block = !!rev && rev.code === 0 && rev.stdout.trim().length > 0; // resolves to a commit → it's a switch, not a file
      }
      if (block) {
        return emitBlock(
          "GIT-BRANCH-SWITCH-MAIN",
          `'${bs.label}' switches the MAIN worktree's branch — this clobbers a parallel session's untracked work and lands later commits on the wrong branch (the parallel-worktree incident, #3559). Do parallel work in an ISOLATED worktree instead: \`git worktree add <path> -b <branch>\` then \`cd\` there. No inline override; if a deliberate main-checkout switch is genuinely required, run it outside the agent.`
        );
      }
    }

    // Sibling vector — force-repoint/rename/delete the SHARED main ref via `git branch`
    // (no checkout needed). Hits the shared ref store → dangerous from ANY worktree, so
    // this is NOT gated on isMainWorktree. Same #3559 class as a branch switch.
    const rm = detectMainRefMove(cmd);
    if (rm) {
      return emitBlock(
        "GIT-MAIN-REF-MOVE",
        `'${rm.label}' force-repoints/renames/deletes the shared main branch — hijacking it out from under the main checkout + parallel sessions (parallel-worktree incident, #3559). Do parallel work in an ISOLATED worktree (\`git worktree add <path> -b <branch>\`) and let \`sidecar pr-cycle\` land the verified main merge. No inline override; if genuinely required, run it outside the agent.`
      );
    }
  }

  // built-in destructive / gate-bypass guard — code-level block, runs before
  // config rules, default-on. Mirrors H-NO-VERIFY/H-RESET-HARD/H-RM-RF-ROOT/
  // H-CURL-PIPE-SH so a profile edit can't disable them; honors inline `# ...-ok`.
  const danger = detectDangerousBash(cmd);
  if (danger) return emitBlock(danger.id, danger.reason);

  // commit-lint gate — global enforcer (see commitLintGate). Runs the SAME lint the git
  // pre-commit hook runs, but via the settings.json PreToolUse(Bash) hook → an agent
  // `git commit` is gated in EVERY sidecar-managed repo, even ones without a per-repo
  // pre-commit hook. After the danger guard so --no-verify is governed in one place.
  const commitBlock = await commitLintGate(cmd).catch(() => null);
  if (commitBlock) return emitBlock("COMMIT-LINT", commitBlock);

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
  // Edit supplies new_string (a PARTIAL fragment); Write supplies content (the FULL
  // document). The section-aware write-guards below (commons do/dont · dodont-length)
  // can only validate a complete document — a fragment truncates its boundary section's
  // body and false-positives it as "no do/dont" (e.g. an edit anchored on the next
  // `## ` header). They are Write-only by design (Edit fragments fall through to the
  // commit-time lint backstop, which has full-file context + claudeMdExempt). Detect
  // the fragment case so those two guards skip it.
  const isEditFragment = input.content === undefined && input.new_string !== undefined;
  if (!filePath) return 0;

  // convergence-on-touch — surface this file's recorded recurrence-prevention learnings
  // as INJECTED context (additionalContext, not stderr) so the agent doesn't reintroduce
  // a defect already learned-from. Computed up-front; emitted on the non-block path at the
  // end of this function (a block aborts the write, so the learning is moot for that try).
  const convergenceCtx = config().convergenceOnTouch ? convergenceForFile(filePath) : "";

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

  // naming-guard — version/copy-suffixed names; history is git's job, not the
  // filename. Honors the `@canonical-ok` marker in content (real API versioning).
  // NEW name (file doesn't exist yet) → BLOCK creation. EXISTING bad-named file
  // being edited (touch) → WARN-only so you can still fix/rename it (advisory, like
  // ing/convergence touch nudges) instead of being unable to edit it.
  if (config().namingGuard) {
    const nv = detectVersionedName(filePath, content);
    if (nv) {
      if (existsSync(filePath)) emitWarn("NAMING-TOUCH-VERSION-SUFFIX", `${nv} — 기존 파일을 터치 중. 고치는 김에 canonical 이름으로 rename 고려 (\`sidecar naming audit\`).`);
      else return emitBlock("NAMING-VERSION-SUFFIX", nv);
    }
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

  // governance-doc SAVE-time guard — block Korean prose (CLAUDE.md · commons.md · runs on
  // Write AND Edit) or an oversized CLAUDE.md (full Write) the moment it is saved, instead
  // of deferring to the commit-time lint (which a user's own terminal commit never hits).
  // english-only is NOT section-aware, so it is fragment-safe (pre-ts-1); the byte cap skips
  // Edit fragments (can't size the final file → commit-time lint is the backstop).
  const gdv = governanceDocWriteViolation(filePath, content, isEditFragment);
  if (gdv) return emitBlock(gdv.rule, gdv.msg);

  // skill/command description-recognition guard (sidecar `skill-desc-guard` s18,
  // write-time). A commands/*.md or SKILL.md `description:` over the skill-listing
  // cap gets truncated/dropped → recognition dies; hard-DENY before it lands.
  // Missing Triggers clause → warn (lint 4f is the commit-time backstop).
  const sd = descWriteViolation(filePath, content);
  if (sd) {
    if (sd.warn) emitWarn("SKILL-DESC-TRIGGERS", sd.warn);
    if (sd.block) return emitBlock(sd.blockRule ?? "SKILL-DESC-CAP", sd.block);
  }

  // commons do/dont format guard (write-time, sidecar-style) — a commons.md
  // (bundled or .harness/ override) full-document write must be do/dont-only;
  // a prose section is hard-DENIED before it lands, not just at commit (lint 4g
  // is the backstop). Keeps the always-on governance SSOT from re-bloating.
  if (!isEditFragment) {
    const cw = commonsWriteViolation(filePath, content);
    if (cw) return emitBlock(cw.rule, cw.block);
  }

  // do/dont length cap (archive_sidecar tape-lint #2 port) — a NEW or lengthened
  // `- do:`/`- dont:` line over the cap in commons.md / CLAUDE.md is hard-DENIED
  // at write (full-content Write); diff-aware so legacy long lines are grandfathered.
  // Edit fragments fall through to the commit-time lint backstop (lint 4h).
  if (!isEditFragment) {
    const dl = dodontLengthWriteViolation(filePath, content);
    if (dl) return emitBlock(dl.rule, dl.block);
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
  // nothing blocked — inject the file's recurrence learnings (if any) as context.
  if (convergenceCtx) emitContext(convergenceCtx);
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

// PreToolUse(mcp__.*) — annotation-guard on MCP tool calls. The tool's annotations
// are NOT in the hook payload (only tool_name + tool_input), so the guard classifies
// the tool against the config-declared registry. tool_name lives at the TOP of the
// payload (sibling of tool_input), so read the raw stdin object directly here rather
// than via parseToolInput (which unwraps to `.tool_input`).
function parseToolName(): string {
  const raw = process.env.CLAUDE_TOOL_NAME ?? readStdin();
  if (!raw || !raw.trim()) return "";
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (typeof obj.tool_name === "string") return obj.tool_name;
  } catch {
    /* a bare tool-name string carrier (env) falls through */
    if (!raw.includes("{")) return raw.trim();
  }
  return "";
}

export async function preTool(_args: string[]): Promise<number> {
  if (!config().annotationGuard.enabled) return 0;
  const toolName = parseToolName();
  const v = detectAnnotationRisk(toolName);
  if (!v) return 0;
  if (v.action === "block") return emitBlock(v.id, v.reason);
  emitWarn(v.id, v.reason);
  return 0;
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
  // naming-on-touch — WARN-only when the agent READS a file whose name carries a
  // version/copy suffix (foo_v2.ts, report_final.md). Creation is blocked at write
  // time; this surfaces the non-canonical name on every touch so the backlog gets
  // noticed and renamed (mirrors the convergence-on-touch idea, warn-only).
  if (config().namingGuard) {
    const input = parseToolInput();
    const filePath = String(input.file_path ?? "");
    if (filePath) {
      const token = offendingToken(basename(filePath));
      if (token) emitWarn("NAMING-TOUCH-VERSION-SUFFIX", `${filePath} — 파일명에 비표준 접미사('${token}')가 있다. 이력은 git, 이름은 canonical 하나로 — rename 고려 (\`sidecar naming audit\`).`);
    }
  }
  // convergence-on-touch (Read surfacing) remains DISABLED (see preWrite).
  return 0;
}

export async function runPre(args: string[]): Promise<number> {
  const sub = args[0];
  if (sub === "bash") return preBash(args.slice(1));
  if (sub === "write") return preWrite(args.slice(1));
  if (sub === "askq") return preAskq(args.slice(1));
  if (sub === "touch") return preTouch(args.slice(1));
  if (sub === "tool") return preTool(args.slice(1));
  process.stderr.write("usage: sidecar pre {bash|write|askq|touch|tool}\n");
  return 1;
}
