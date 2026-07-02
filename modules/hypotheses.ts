// sidecar hypotheses {check|migrate|scaffold|show}
//   Enforce ONE canonical hypothesis folder (config `hypotheses.dir`, default
//   `HYPOTHESES/`) for pre-register→falsify→run→verdict science work. The write/bash
//   guards (hypothesis-guard.ts) stop NEW strays at authoring time; this command is
//   the repo-wide audit + the migration helper for the backlog the guards never saw.
//
//     check [path] [--gate]   scan the tracked tree for stray hypothesis folders
//                             (aliases + built-in hypothes*/가설* pattern) → report;
//                             --gate exits 1 on any hit (CI/commit use)
//     migrate <dir>           `git mv <dir> <canonical>` (or merge its contents in if
//                             the canonical dir already exists) — history-preserving
//     scaffold                create the canonical dir + a minimal registry skeleton
//     show                    print the active canonical dir + configured aliases
import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { config } from "../lib/config.ts";
import { REPO_ROOT } from "../lib/paths.ts";
import { info, ok, warn, loudFail as err } from "../lib/log.ts";
import { execArgs } from "../lib/exec.ts";
import { strayHypothesisSegment } from "./hypothesis-guard.ts";

function canon(): string {
  return config().hypotheses?.dir || "HYPOTHESES";
}

// git-tracked top-level dirs (fast) + untracked dirs — union, so a not-yet-committed
// stray folder is still audited. Returns dir names at the repo root only (hypothesis
// registries are repo-root folders by convention).
function repoRootDirs(): string[] {
  try {
    return readdirSync(REPO_ROOT)
      .filter((n) => !n.startsWith(".") && statSync(resolve(REPO_ROOT, n)).isDirectory());
  } catch {
    return [];
  }
}

function scanStrays(): { dir: string; reason: string }[] {
  const out: { dir: string; reason: string }[] = [];
  for (const d of repoRootDirs()) {
    const reason = strayHypothesisSegment(d);
    if (reason) out.push({ dir: d, reason });
  }
  return out;
}

function runCheck(args: string[]): number {
  const gate = args.includes("--gate");
  const strays = scanStrays();
  const c = canon();
  if (strays.length === 0) {
    ok(`hypotheses: no stray folders — all hypothesis work is under the canonical '${c}/' (or none exists yet).`);
    return 0;
  }
  warn(`hypotheses: ${strays.length} stray hypothesis folder(s) — canonical is '${c}/':`);
  for (const s of strays) info(`  • ${s.dir}/  (${s.reason}) → \`sidecar hypotheses migrate ${s.dir}\``);
  if (gate) {
    err(`hypotheses check --gate: ${strays.length} stray folder(s) — migrate to '${c}/' or add a '@hypothesis-ok' marker.`);
    return 1;
  }
  return 0;
}

async function runMigrate(args: string[]): Promise<number> {
  const src = args[0];
  if (!src) {
    err("usage: sidecar hypotheses migrate <dir>");
    return 1;
  }
  const c = canon();
  const srcPath = resolve(REPO_ROOT, src);
  if (!existsSync(srcPath)) {
    err(`hypotheses migrate: '${src}' does not exist.`);
    return 1;
  }
  if (src === c) {
    ok(`hypotheses migrate: '${src}' is already the canonical dir — nothing to do.`);
    return 0;
  }
  const dstPath = resolve(REPO_ROOT, c);
  if (!existsSync(dstPath)) {
    // simple case: rename the whole tree, history-preserving
    const r = await execArgs("git", ["mv", src, c], { cwd: REPO_ROOT });
    if (r.code !== 0) {
      err(`hypotheses migrate: git mv ${src} ${c} failed — ${r.stderr.trim() || "non-zero exit"}`);
      return 1;
    }
    ok(`hypotheses: git mv ${src}/ → ${c}/ (history preserved). Update any references to '${src}' next.`);
    info(`  grep the repo for lingering '${src}' mentions: \`grep -rl ${src} . --exclude-dir=.git\``);
    return 0;
  }
  // canonical dir already exists → merge each child in (don't clobber)
  warn(`hypotheses migrate: '${c}/' already exists — merging '${src}/' contents in (git mv per entry):`);
  let failed = 0;
  for (const child of readdirSync(srcPath)) {
    const target = join(c, child);
    if (existsSync(resolve(REPO_ROOT, target))) {
      warn(`  ⚠ skip '${child}' — already in '${c}/' (resolve manually).`);
      failed++;
      continue;
    }
    const r = await execArgs("git", ["mv", join(src, child), target], { cwd: REPO_ROOT });
    if (r.code !== 0) {
      warn(`  ✗ '${child}' — ${r.stderr.trim() || "git mv failed"}`);
      failed++;
    } else {
      info(`  ✓ ${child}`);
    }
  }
  if (failed) {
    err(`hypotheses migrate: ${failed} entr(y/ies) not moved — resolve, then remove the empty '${src}/'.`);
    return 1;
  }
  ok(`hypotheses: merged '${src}/' into '${c}/'. Remove the now-empty '${src}/' and update references.`);
  return 0;
}

function runScaffold(): number {
  const c = canon();
  const dir = resolve(REPO_ROOT, c);
  if (existsSync(dir)) {
    ok(`hypotheses: '${c}/' already exists.`);
    return 0;
  }
  mkdirSync(join(dir, "cards"), { recursive: true });
  writeFileSync(join(dir, "HYPOTHESES.jsonl"), "");
  writeFileSync(
    join(dir, "CLAUDE.md"),
    `# ${c} — hypothesis registry\n\nPre-register → falsify → run → verdict. One canonical home for every hypothesis.\n\n- \`HYPOTHESES.jsonl\` — the registry (append-only: id · claim · falsifier · verdict).\n- \`cards/<id>.md\` — one card per hypothesis (method + numeric falsifier).\n\nA hypothesis that cannot be numerically falsified does not belong here.\n`
  );
  ok(`hypotheses: scaffolded '${c}/' (HYPOTHESES.jsonl + cards/ + CLAUDE.md).`);
  return 0;
}

function runShow(): number {
  const c = canon();
  const aliases = config().hypotheses?.aliases ?? [];
  info(`hypotheses: canonical dir = '${c}/'`);
  info(`  aliases (this repo, steered → '${c}/'): ${aliases.length ? aliases.join(", ") : "(none)"}`);
  info(`  built-in stray patterns: hypotheses_* · hypothesis_* · 가설* (any non-canonical hypothesis-named folder)`);
  info(`  guard: hypothesisGuard=${config().hypothesisGuard} (blocks NEW strays · warns on edits to existing)`);
  return 0;
}

export async function runHypotheses(args: string[]): Promise<number> {
  const sub = (args[0] ?? "check").toLowerCase();
  const rest = args.slice(1);
  if (["-h", "--help", "help"].includes(sub)) {
    info("usage: sidecar hypotheses {check [path] [--gate]|migrate <dir>|scaffold|show}");
    info("  ONE canonical hypothesis folder (config hypotheses.dir, default HYPOTHESES/).");
    return 0;
  }
  if (sub === "check") return runCheck(rest);
  if (sub === "migrate") return runMigrate(rest);
  if (sub === "scaffold") return runScaffold();
  if (sub === "show") return runShow();
  info("usage: sidecar hypotheses {check|migrate <dir>|scaffold|show}");
  return 1;
}
