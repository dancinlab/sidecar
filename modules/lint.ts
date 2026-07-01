// sidecar lint [all|fast|verbose] [--pre-commit] [--pre-push]
// Repo-integrity checks, all driven by harness.config.json:
//   • staged L0 files (git diff --cached) → flagged
//   • freshness of tracked files (_updated field or mtime vs maxAgeDays)
// Quiet on pass (H1); violations go to stderr + lint_log.jsonl + errors queue.
import { existsSync, statSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { LOGS } from "../lib/paths.ts";
import { appendJsonl, info, loudFail, ok } from "../lib/log.ts";
import { readJsonOr } from "../lib/json.ts";
import { execShell } from "../lib/exec.ts";
import { isL0 } from "../lib/lockdown.ts";
import { config, repoPath } from "../lib/config.ts";
import { routeError, classify } from "./errors.ts";
import { docViolations } from "./docs.ts";
import { lintArchitectureTree, lintConvergenceRecords } from "./architecture.ts";
import { toolkitDrift } from "./toolkit.ts";
import { lintCommandDescriptions } from "./shadow.ts";
import { lintCommonsFormat, dodontLengthLint } from "./commons.ts";
import { qualifiesMissing } from "./folders.ts";

export interface Violation {
  rule: string;
  file: string;
  msg: string;
}

async function stagedFiles(): Promise<string[]> {
  const r = await execShell("git diff --cached --name-only", { cwd: repoPath(".") });
  return r.stdout.split("\n").map((s) => s.trim()).filter(Boolean);
}

// HELP-BACKTICK — the `cli/index.ts` `export const HELP = \`…\`` block is a template
// literal, so an UNESCAPED backtick inside a help line silently terminates it and
// breaks `sidecar help` + every tsx/esbuild build. Escaped `\\\`` is fine (used for
// `code` spans); a bare backtick is the bug. Text-scan (not import) so it still flags
// when the file is already broken. Sidecar-repo-only (no `export const HELP` → no-op).
function lintHelpBacktick(): { rule: string; file: string; msg: string }[] {
  const path = repoPath("cli/index.ts");
  if (!existsSync(path)) return [];
  let lines: string[];
  try {
    lines = readFileSync(path, "utf8").split("\n");
  } catch {
    return [];
  }
  const start = lines.findIndex((l) => /export const HELP = `/.test(l));
  if (start < 0) return [];
  const out: { rule: string; file: string; msg: string }[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === "`;") break; // intended closer
    const stripped = lines[i].replace(/\\`/g, ""); // drop escaped backticks
    if (stripped.includes("`")) {
      out.push({
        rule: "HELP-BACKTICK",
        file: "cli/index.ts",
        msg: `line ${i + 1}: unescaped backtick in the HELP template literal — it terminates the literal and breaks 'sidecar help' + build. Escape as \\\` or use plain quotes.`,
      });
    }
  }
  return out;
}

function fileAgeDays(absPath: string): number | null {
  if (!existsSync(absPath)) return null;
  // prefer an `_updated` JSON field; else fall back to filesystem mtime
  const data = readJsonOr<Record<string, unknown>>(absPath, {});
  const upd = typeof data._updated === "string" ? data._updated : null;
  const base = upd ? Date.parse(upd) : statSync(absPath).mtimeMs;
  if (Number.isNaN(base)) return null;
  return (Date.now() - base) / 86_400_000;
}

// Collect all lint violations (pure — no printing). Reused by `runLint` (commit-time
// gate) AND by the PreToolUse(Bash) commit interceptor (pre.ts) so the SAME lint runs
// globally on agent `git commit` in any sidecar-managed repo, not only where a git
// pre-commit hook is installed. `stagedOverride` lets the commit interceptor widen the
// fileset (e.g. `git commit -a` = staged + tracked-modified).
// inject-bloat (context-rot) guard — each source sidecar RE-INJECTS to the agent every
// turn must stay under its byte cap (lint.injectCaps). Re-injected bloat silently degrades
// EVERY future turn (context rot — the "agent gets dumber" failure mode), so this is the
// recurrence guard for it. Keep the SOURCE lean — never truncate at emit. Shared by the
// commit-time lint AND ship's pre-flight gate. Sidecar-repo-only: injectCaps lists THIS
// repo's inject sources (commons.md/recommend.md…); empty elsewhere → no-op.
export function injectCapViolations(): Violation[] {
  const cfg = config();
  const out: Violation[] = [];
  let total = 0; // running sum across ALL inject sources (the aggregate budget)
  for (const [key, cap] of Object.entries(cfg.lint?.injectCaps ?? {})) {
    if (!cap || cap <= 0) continue;
    const targets: string[] = [];
    if (key.endsWith("/")) {
      const dir = repoPath(key.slice(0, -1));
      if (existsSync(dir)) for (const f of readdirSync(dir)) if (f.endsWith(".md")) targets.push(`${key}${f}`);
    } else if (existsSync(repoPath(key))) {
      targets.push(key);
    }
    for (const f of targets) {
      let bytes = 0;
      try {
        bytes = Buffer.byteLength(readFileSync(repoPath(f), "utf8"), "utf8");
      } catch {
        continue;
      }
      // aggregate only single-file sources: a dir key (e.g. styles/) expands to many
      // language variants but only ONE ships per turn, so summing all would overcount.
      if (!key.endsWith("/")) total += bytes;
      if (bytes > cap) {
        out.push({ rule: "INJECT-OVERSIZED", file: f, msg: `${bytes}B > ${cap}B inject cap — re-injected every turn; trim prose (keep the rule + 1 example, drop redundant examples/reference tables) or raise this inject's lint.injectCaps budget` });
      }
    }
  }
  // also count files re-injected every turn that carry their OWN format lint (so they
  // aren't in injectCaps) but still spend the per-turn token budget — e.g. repo-root
  // CLAUDE.md (claudemd inject). Listed in lint.injectBudgetExtra; counted toward the
  // SUM only, never per-source capped here.
  for (const f of cfg.lint?.injectBudgetExtra ?? []) {
    try {
      if (existsSync(repoPath(f))) total += Buffer.byteLength(readFileSync(repoPath(f), "utf8"), "utf8");
    } catch {
      /* unreadable → skip */
    }
  }
  // aggregate budget — per-source caps stop ONE file ballooning; this stops death-by-a-
  // thousand-cuts (many sources each under cap but summing huge = context rot is about the
  // TOTAL tokens, not any single file). Opt-in via lint.injectBudgetBytes.
  const budget = cfg.lint?.injectBudgetBytes ?? 0;
  if (budget > 0 && total > budget) {
    out.push({ rule: "INJECT-BUDGET", file: "lint.injectBudgetBytes", msg: `per-turn re-injected total ${total}B > ${budget}B aggregate budget — the SUM drives context-rot (every turn); trim a source, do not just raise the budget` });
  }
  return out;
}

export async function collectViolations(stagedOverride?: string[]): Promise<Violation[]> {
  const cfg = config();
  const violations: Violation[] = [];
  const staged = stagedOverride ?? (await stagedFiles());

  // 1. staged L0
  for (const f of staged) {
    if (isL0(f)) {
      violations.push({ rule: "L0-LOCKDOWN", file: f, msg: "staged L0 file — handle deliberately" });
    }
  }

  // 1b. changelog: staged code changes must include the changelog file
  if (cfg.lint.changelog && staged.length > 0) {
    const { file, triggerPattern, ignore } = cfg.lint.changelog;
    const trigRe = new RegExp(triggerPattern);
    const igRe = (ignore ?? []).map((p) => new RegExp(p));
    const codeChanges = staged.filter(
      (f) => f !== file && trigRe.test(f) && !igRe.some((r) => r.test(f))
    );
    if (codeChanges.length > 0 && !staged.includes(file)) {
      violations.push({
        rule: "CHANGELOG-MISSING",
        file,
        msg: `${codeChanges.length} code file(s) staged without ${file} (e.g. ${codeChanges[0]})`,
      });
    }
    // 1c. doc SSOT: existing ARCHITECTURE (.json tree or .md prose) must be
    //     refreshed alongside meaningful code changes too — same gate pr-cycle
    //     enforces, now at commit time so it fires on EVERY task.
    //     Only one ARCHITECTURE form needs to exist; whichever is present is gated.
    //     README is NOT force-gated (update-in-place stays advisory, not blocking).
    //     Escape hatch: `git commit --no-verify` when the doc is genuinely N/A.
    if (codeChanges.length > 0) {
      const archDoc = existsSync(repoPath("ARCHITECTURE.json")) ? "ARCHITECTURE.json" : "ARCHITECTURE.md";
      if (existsSync(repoPath(archDoc)) && !staged.includes(archDoc)) {
        violations.push({
          rule: "ARCHITECTURE-MISSING",
          file: archDoc,
          msg: `${codeChanges.length} code file(s) staged without ${archDoc} 현행화 (현재상태 SSOT — 제자리 덮어쓰기, 이력 아님 · pr-cycle parity · --no-verify if truly N/A)`,
        });
      }
    }
  }

  // 2. freshness
  for (const ff of cfg.lint.freshnessFiles ?? []) {
    const abs = repoPath(ff.path);
    const age = fileAgeDays(abs);
    if (age === null) continue;
    if (age > ff.maxAgeDays) {
      violations.push({
        rule: ff.rule ?? "STALE",
        file: ff.path,
        msg: `not updated in ${age.toFixed(1)}d (max ${ff.maxAgeDays}d)`,
      });
    }
  }

  // 2b. protected branches: no direct commit on main/master
  if (cfg.lint.protectedBranches?.length && staged.length > 0) {
    // symbolic-ref reports the (even unborn) branch name; abbrev-ref returns "HEAD" before the first commit
    const branch = (await execShell("git symbolic-ref --short -q HEAD || git rev-parse --abbrev-ref HEAD", { cwd: repoPath(".") })).stdout.trim();
    if (cfg.lint.protectedBranches.includes(branch)) {
      violations.push({
        rule: "PROTECTED-BRANCH",
        file: branch,
        msg: `direct commit to protected branch '${branch}' — use a feature branch + PR`,
      });
    }
  }

  // 4b. single-doc discipline (staged .md scatter + quickref) — active only when
  // the architecture SSOT file exists (opt-in by presence).
  for (const d of docViolations(staged)) {
    violations.push({ rule: d.rule, file: d.file, msg: d.msg });
  }

  // 4b'. per-folder CLAUDE.md (commons folder-docs) — a folder you COMMIT into must
  // carry a local guide. Scoped to the dirs of STAGED files (not a whole-repo scan)
  // so an unrelated missing guide never blocks an unrelated commit — "manage the
  // guide as you work the folder". qualifiesMissing() honors folderGuides config
  // (roots/depth/minFiles/ignore); `sidecar folders scaffold <dir>` fixes it.
  const stagedDirs = new Set(staged.map((f) => dirname(resolve(repoPath("."), f))));
  for (const dir of [...stagedDirs].sort()) {
    if (qualifiesMissing(dir)) {
      violations.push({
        rule: "FOLDER-GUIDE-MISSING",
        file: `${dir.replace(repoPath(".") + "/", "")}/`,
        msg: `committing into this folder but it lacks ${config().folderGuides.filename} — run \`sidecar folders scaffold ${dir.replace(repoPath(".") + "/", "")}\` and fill it (commons folder-docs)`,
      });
    }
  }

  // 4c. architecture tree hygiene (single-doc) — oversized / piled / history leaf nodes
  // drift the design SSOT from a navigable tree into a wall of text. BLOCK
  // (severity-map ARCH-* = block): forces the tree to stay finely decomposed —
  // a >700-char or >6-piled leaf must split into one child node per sub-point.
  for (const h of lintArchitectureTree()) {
    violations.push({ rule: h.rule, file: "ARCHITECTURE.json", msg: `${h.path} — ${h.msg}` });
  }

  // 4d. convergence record hygiene (root-cause) — recurrence-prevention learnings now
  // live in the ARCHITECTURE.json `convergence` array (single-doc SSOT, not inline code
  // markers). Each record must carry id + a valid state, else the learning is malformed
  // and can't be surfaced on file-touch; architecture.ts owns the validator.
  for (const it of lintConvergenceRecords()) {
    violations.push({ rule: "CONVERGENCE-MALFORMED", file: "ARCHITECTURE.json", msg: it });
  }

  // 4e. toolkit catalog drift (agent command discoverability) — the committed
  // TOOLKIT.jsonl artifact must match the HELP-derived catalog. warn-only: the
  // SessionStart inject regenerates live from HELP, so the agent always sees the
  // current surface; the committed file is just the external snapshot.
  const drift = toolkitDrift();
  if (drift) violations.push({ rule: "TOOLKIT-DRIFT", file: "TOOLKIT.jsonl", msg: drift });

  // 4e'. HELP template-literal hygiene — an unescaped backtick in cli/index.ts's HELP
  // block breaks `sidecar help` + build silently (recurred twice). block (HELP_NO_RAW_BACKTICK).
  for (const it of lintHelpBacktick()) violations.push(it);

  // 4f. command description-recognition hygiene (sidecar s18 port) — each
  // commands/*.md `description:` must stay under the skill-listing cap AND carry
  // a `Triggers —` clause, else the bare /cmd silently stops being auto-recognized
  // from natural language. warn-only (discoverability). Sidecar-repo-only (commands/).
  for (const it of lintCommandDescriptions()) {
    violations.push({ rule: it.rule, file: it.file, msg: it.msg });
  }

  // 4g. commons do/dont format — each `## <slug>` section in the governance SSOT
  // must be do/dont lines only (no prose), so it can't silently re-bloat. block.
  for (const it of lintCommonsFormat()) {
    violations.push({ rule: it.rule, file: it.file, msg: it.msg });
  }

  // 4h. do/dont length cap (archive_sidecar tape-lint #2 port) — diff-aware vs HEAD,
  // so it catches BOTH Write and Edit (the write-guard only sees full-content Write).
  // For each staged commons.md or repo-ROOT CLAUDE.md, compare the working file to its
  // HEAD version: a NEW or LENGTHENED `- do:`/`- dont:` line over the cap blocks; legacy
  // long lines are grandfathered. block. cap 0 = off. (A SUBFOLDER CLAUDE.md like
  // `modules/CLAUDE.md` is free-form per folder-docs — out of scope.)
  for (const f of staged) {
    const base = f.split("/").pop() ?? "";
    if (base !== "commons.md" && f !== "CLAUDE.md") continue;
    let working = "";
    try {
      working = readFileSync(repoPath(f), "utf8");
    } catch {
      continue; // staged deletion — nothing to cap
    }
    const head = (await execShell(`git show HEAD:"${f}" 2>/dev/null`, { cwd: repoPath(".") })).stdout;
    for (const it of dodontLengthLint(working, head, f)) {
      violations.push({ rule: it.rule, file: it.file, msg: it.msg });
    }
  }

  // 4j. inject-oversized — the context-rot guard, shared with ship's pre-flight gate.
  violations.push(...injectCapViolations());

  // 4k. inject-non-english — Korean (Hangul) PROSE in a governance doc sidecar RE-INJECTS
  // every turn. Korean costs ~3 bytes/char (2-3x the token budget of english per turn) and
  // prefs mandate english docs, so Hangul here silently taxes EVERY future turn. block.
  // Resolve targets = exact repo-relative paths that exist + (bare-filename entries) every
  // tracked file with that basename (git ls-files). Korean literals inside `backticks` are
  // EXEMPT (code-spans stripped first). diff-aware (dodontLengthLint pattern): only a target
  // among THIS commit's staged files blocks — untouched legacy Korean files are grandfathered.
  // ALWAYS-ON baseline — every re-injected governance PROSE doc, in EVERY repo (incl. new
  // ones), with NO per-repo config required. `.harness/commons.md`/`config/commons.md` = the
  // commons override + bundled source; `CLAUDE.md` (basename) = repo-root + every subfolder
  // guide (all tracked CLAUDE.md). ARCHITECTURE.json is intentionally EXCLUDED (its injected
  // tree carries deliberate Korean). Per-repo `injectEnglishOnly` is ADDITIVE — it can EXTEND
  // this set but never shrink it, so config can't silently disable the rule.
  const BUILTIN_ENGLISH_ONLY = ["CLAUDE.md", ".harness/commons.md", "config/commons.md"];
  const englishOnly = [...new Set([...BUILTIN_ENGLISH_ONLY, ...(cfg.lint?.injectEnglishOnly ?? [])])];
  {
    const targets = new Set<string>();
    let tracked: string[] | null = null;
    for (const entry of englishOnly) {
      if (entry.includes("/")) {
        if (existsSync(repoPath(entry))) targets.add(entry);
      } else {
        if (tracked === null) {
          tracked = (await execShell("git ls-files", { cwd: repoPath(".") })).stdout
            .split("\n").map((s) => s.trim()).filter(Boolean);
        }
        for (const f of tracked) if ((f.split("/").pop() ?? "") === entry) targets.add(f);
      }
    }
    for (const f of targets) {
      if (!staged.includes(f)) continue; // diff-aware: only newly-touched files block
      let text = "";
      try {
        text = readFileSync(repoPath(f), "utf8");
      } catch {
        continue; // staged deletion → nothing to scan
      }
      const stripped = text.replace(/`[^`]*`/g, ""); // exempt Korean literals inside code-spans
      const hangul = stripped.match(/[\uAC00-\uD7A3]/g);
      if (hangul && hangul.length > 0) {
        violations.push({
          rule: "INJECT-NON-ENGLISH",
          file: f,
          msg: `${hangul.length} Korean (Hangul) char(s) in re-injected governance doc — re-injected every turn, Korean costs ~3 bytes/char (2-3x token budget) and prefs mandate english docs → translate to English (Korean literals allowed only inside \`backticks\`).`,
        });
      }
    }
  }

  // 4l. claude-md-oversized — every tracked CLAUDE.md is re-injected EVERY turn (claudemd
  // inject) in every repo, so an oversized one silently taxes ALL future turns (context-rot
  // · agent degradation). ALWAYS-ON byte cap (lint.claudeMdCap, built-in default) applied to
  // any STAGED CLAUDE.md (root + subfolder guides). diff-aware: an untouched legacy bloated
  // file never blocks — only a staged one over cap does (so it's paid down on next edit).
  const mdCap = cfg.lint?.claudeMdCap ?? 0;
  if (mdCap > 0) {
    for (const f of staged) {
      if ((f.split("/").pop() ?? "") !== "CLAUDE.md") continue;
      let bytes = 0;
      try {
        bytes = Buffer.byteLength(readFileSync(repoPath(f), "utf8"), "utf8");
      } catch {
        continue; // staged deletion → nothing to scan
      }
      if (bytes > mdCap) {
        violations.push({
          rule: "CLAUDE-MD-OVERSIZED",
          file: f,
          msg: `${bytes}B > ${mdCap}B cap — CLAUDE.md is re-injected EVERY turn, so its size taxes all future turns (context-rot). Trim to the lean essentials (project blurb + orientation tree + hard rules); move deep structure to ARCHITECTURE.json and detail to subfolder guides. Raise lint.claudeMdCap only if the size is genuinely irreducible.`,
        });
      }
    }
  }

  return violations;
}

// Filter to BLOCK-severity violations (warn-severity like L0-LOCKDOWN is reported but
// never vetoes). Shared by the commit interceptor so it blocks on the same bar.
export function lintBlockers(violations: Violation[]): Violation[] {
  return violations.filter((v) => classify("lint_rule", v.rule) === "block");
}

export async function runLint(args: string[]): Promise<number> {
  const violations = await collectViolations();
  appendJsonl(LOGS.lint, { kind: "lint", mode: args[0] ?? "all", violations: violations.length, items: violations });

  if (violations.length === 0) {
    ok("lint: ok");
    return 0;
  }
  // exit 1 only on BLOCK-severity violations; warn-severity (e.g. L0-LOCKDOWN) is
  // reported but does not fail the gate — so editing an L0 file deliberately
  // doesn't hard-block a commit (it's a "handle deliberately" signal, not a veto).
  let blocking = 0;
  for (const v of violations) {
    const sev = classify("lint_rule", v.rule);
    info(`  [${sev}] [${v.rule}] ${v.file} — ${v.msg}`);
    routeError({ source: "lint", kind: "lint_rule", code: v.rule, file: v.file, line: 0, msg: v.msg });
    if (sev === "block") blocking++;
  }
  if (blocking > 0) {
    loudFail(`lint: ${blocking} blocking / ${violations.length} total violation(s)`);
    return 1;
  }
  ok(`lint: ${violations.length} warning(s), 0 blocking`);
  return 0;
}
