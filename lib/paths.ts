import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

// The harness can be installed ANYWHERE inside (or beside) a consuming repo.
// Two roots matter:
//   HARNESS_ROOT  — where this code lives (bundled config / defaults)
//   REPO_ROOT     — the consuming project whose rules/logs we operate on
//
// REPO_ROOT discovery order:
//   1. $HARNESS_REPO_ROOT env override (tests / non-standard layouts)
//   2. nearest ancestor of $PWD that has a `harness.config.json`
//   3. nearest ancestor that has a `.git` directory
//   4. $PWD fallback

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const HARNESS_ROOT = resolve(__dirname, "..");
export const HARNESS_CONFIG_DIR = resolve(HARNESS_ROOT, "config");

function findRepoRoot(): string {
  if (process.env.HARNESS_REPO_ROOT) return resolve(process.env.HARNESS_REPO_ROOT);
  let d = process.env.PWD ? resolve(process.env.PWD) : process.cwd();
  let firstGit = "";
  while (true) {
    if (existsSync(resolve(d, "harness.config.json"))) return d;
    if (!firstGit && existsSync(resolve(d, ".git"))) firstGit = d;
    const parent = dirname(d);
    if (parent === d) break;
    d = parent;
  }
  if (firstGit) return firstGit;
  return process.cwd();
}

export const REPO_ROOT = findRepoRoot();

// Logs live inside the consuming repo (gitignore `.harness/`), per-repo.
export const LOG_DIR = process.env.HARNESS_LOG_DIR
  ? resolve(process.env.HARNESS_LOG_DIR)
  : resolve(REPO_ROOT, ".harness", "logs");

export const HANDOFF_DIR = resolve(REPO_ROOT, ".harness", "handoff");

export const LOGS = {
  lint: resolve(LOG_DIR, "lint_log.jsonl"),
  mistakes: resolve(LOG_DIR, "mistakes.jsonl"),
  errors: resolve(LOG_DIR, "errors.jsonl"),
  workRegistry: resolve(LOG_DIR, "work_registry.jsonl"),
  audit: resolve(LOG_DIR, "audit_score.jsonl"),
  observations: resolve(LOG_DIR, "observations.jsonl"),
  gc: resolve(LOG_DIR, "gc_log.jsonl"),
} as const;
