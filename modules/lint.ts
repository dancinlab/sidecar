// harness lint [all|fast|verbose] [--pre-commit] [--pre-push]
// Repo-integrity checks, all driven by harness.config.json:
//   • staged L0 files (git diff --cached) → flagged
//   • freshness of tracked files (_updated field or mtime vs maxAgeDays)
//   • convergence: a fix/feat commit must also touch the issues file
// Quiet on pass (H1); violations go to stderr + lint_log.jsonl + errors queue.
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { LOGS } from "../lib/paths.ts";
import { appendJsonl, info, loudFail, ok } from "../lib/log.ts";
import { readJsonOr } from "../lib/json.ts";
import { execShell } from "../lib/exec.ts";
import { isL0 } from "../lib/lockdown.ts";
import { config, repoPath } from "../lib/config.ts";
import { routeError, classify } from "./errors.ts";
import { docViolations } from "./docs.ts";

interface Violation {
  rule: string;
  file: string;
  msg: string;
}

async function stagedFiles(): Promise<string[]> {
  const r = await execShell("git diff --cached --name-only", { cwd: repoPath(".") });
  return r.stdout.split("\n").map((s) => s.trim()).filter(Boolean);
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

export async function runLint(args: string[]): Promise<number> {
  const cfg = config();
  const violations: Violation[] = [];
  const staged = await stagedFiles();

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
    // 1c. doc SSOTs: existing ARCHITECTURE (.json tree or .md prose) / README.md
    //     must be refreshed alongside meaningful code changes too — same gate
    //     pr-cycle enforces, now at commit time so it fires on EVERY task.
    //     Only one ARCHITECTURE form needs to exist; whichever is present is gated.
    //     Escape hatch: `git commit --no-verify` when a doc is genuinely N/A.
    if (codeChanges.length > 0) {
      const archDoc = existsSync(repoPath("ARCHITECTURE.json")) ? "ARCHITECTURE.json" : "ARCHITECTURE.md";
      for (const doc of [archDoc, "README.md"]) {
        if (existsSync(repoPath(doc)) && !staged.includes(doc)) {
          violations.push({
            rule: doc === "README.md" ? "README-MISSING" : "ARCHITECTURE-MISSING",
            file: doc,
            msg: `${codeChanges.length} code file(s) staged without ${doc} 현행화 (pr-cycle parity · --no-verify if truly N/A)`,
          });
        }
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

  // 3. convergence: a matching commit must touch requiredFile
  if (cfg.lint.convergence) {
    const { commitPattern, requiredFile } = cfg.lint.convergence;
    const subj = (await execShell("git log -1 --pretty=%s", { cwd: repoPath(".") })).stdout.trim();
    if (subj && new RegExp(commitPattern).test(subj)) {
      const changed = (await execShell("git show --name-only --pretty=format: HEAD", { cwd: repoPath(".") })).stdout;
      if (!changed.includes(requiredFile)) {
        violations.push({
          rule: "CONVERGENCE-MISSING",
          file: requiredFile,
          msg: `commit "${subj.slice(0, 50)}" did not update ${requiredFile}`,
        });
      }
    }
  }

  // 4b. single-doc discipline (staged .md scatter + quickref) — active only when
  // the architecture SSOT file exists (opt-in by presence).
  for (const d of docViolations(staged)) {
    violations.push({ rule: d.rule, file: d.file, msg: d.msg });
  }

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
