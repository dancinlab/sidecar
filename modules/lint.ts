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
import { routeError } from "./errors.ts";

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

  appendJsonl(LOGS.lint, { kind: "lint", mode: args[0] ?? "all", violations: violations.length, items: violations });

  if (violations.length === 0) {
    ok("lint: ok");
    return 0;
  }
  loudFail(`lint: ${violations.length} violation(s)`);
  for (const v of violations) {
    info(`  [${v.rule}] ${v.file} — ${v.msg}`);
    routeError({ source: "lint", kind: "lint_rule", code: v.rule, file: v.file, line: 0, msg: v.msg });
  }
  return 1;
}
