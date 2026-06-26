// sidecar lab init [dir] [--force] [--dry-run] [--name N] [--desc D]
// Scaffold the lumen/rtsc/carbon-capture sibling-repo skeleton (a research/design
// "lab" campaign) into a target repo: src/ · state/ · ARCHITECTURE.json +
// architecture.html viewer + serve.py · CLAUDE.md · README.md · CHANGELOG.md ·
// .gitignore · .harness/fleet/ · HYPOTHESES/ (pre-register→falsify→run→verdict) ·
// tool/<slug>.py shared deterministic harness.
//
// The skeleton lives tokenized under templates/lab/; this walks it recursively,
// substitutes {{NAME}}/{{SLUG_SNAKE}}/{{DESC}}/{{DATE}} in BOTH file paths and
// contents, and writes — never clobbering an existing file unless --force, and
// only reporting (writing nothing) under --dry-run. Files-only: no git init/push.
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, basename, dirname, join, sep } from "node:path";
import { REPO_ROOT, SIDECAR_ROOT } from "../lib/paths.ts";
import { info, ok, warn } from "../lib/log.ts";

const USAGE = `sidecar lab — scaffold a research/design "lab" campaign skeleton into a repo

usage:
  sidecar lab init [dir] [--force] [--dry-run] [--name <N>] [--desc <D>]

  dir          target repo dir (default: current repo root)
  --name <N>   project name (default: basename of the target dir)
  --desc <D>   one-line description (default: a placeholder)
  --force      overwrite existing files (default: never clobber)
  --dry-run    report what would be written; write nothing

scaffolds: src/ · state/ · ARCHITECTURE.json + architecture.html + serve.py ·
  CLAUDE.md · README.md · CHANGELOG.md · .gitignore · .harness/fleet/ ·
  HYPOTHESES/ (registry + cards + method) · tool/<slug>.py shared harness.`;

interface LabFlags {
  force: boolean;
  dryRun: boolean;
  name: string;
  desc: string;
  dir: string;
}

function parse(args: string[]): LabFlags {
  const f: LabFlags = { force: false, dryRun: false, name: "", desc: "", dir: "" };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--force") f.force = true;
    else if (a === "--dry-run") f.dryRun = true;
    else if (a === "--name") f.name = args[++i] ?? "";
    else if (a === "--desc") f.desc = args[++i] ?? "";
    else if (a.startsWith("--name=")) f.name = a.slice("--name=".length);
    else if (a.startsWith("--desc=")) f.desc = a.slice("--desc=".length);
    else if (a.startsWith("-")) warn(`lab: ignoring unknown flag ${a}`);
    else if (!f.dir) f.dir = a;
    else warn(`lab: ignoring extra argument ${a}`);
  }
  return f;
}

// Recursively list every file (not dir) under root, returned as absolute paths.
function walk(root: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(root)) {
    const abs = join(root, name);
    if (statSync(abs).isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

type Action = { path: string; how: "create" | "skip" | "would" };

export function runLab(rest: string[]): number {
  const sub = rest[0];
  if (!sub) {
    info(USAGE);
    return 0;
  }
  if (sub !== "init") {
    warn(`lab: unknown subcommand '${sub}'`);
    info(USAGE);
    return 1;
  }

  const flags = parse(rest.slice(1));
  const targetDir = flags.dir ? resolve(flags.dir) : REPO_ROOT;

  const NAME = flags.name || basename(targetDir);
  const SLUG = NAME.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "lab";
  const DESC = flags.desc || `${NAME} — (one-line campaign description here).`;
  const DATE = new Date().toISOString().slice(0, 10);

  const render = (s: string): string =>
    s
      .replace(/\{\{NAME\}\}/g, NAME)
      .replace(/\{\{SLUG_SNAKE\}\}/g, SLUG)
      .replace(/\{\{DESC\}\}/g, DESC)
      .replace(/\{\{DATE\}\}/g, DATE);

  const tplRoot = resolve(SIDECAR_ROOT, "templates", "lab");
  if (!existsSync(tplRoot)) {
    warn(`lab: template dir missing: ${tplRoot}`);
    return 1;
  }

  const files = walk(tplRoot).sort();
  const actions: Action[] = [];

  for (const srcAbs of files) {
    const rel = relative(tplRoot, srcAbs);
    // render tokens in the path too (tool/{{SLUG_SNAKE}}.py -> tool/<slug>.py)
    const renderedRel = render(rel);
    const dstAbs = resolve(targetDir, renderedRel);
    const label = renderedRel.split(sep).join("/");
    const content = render(readFileSync(srcAbs, "utf8"));

    if (existsSync(dstAbs) && !flags.force) {
      actions.push({ path: label, how: "skip" });
      continue;
    }
    if (flags.dryRun) {
      actions.push({ path: label, how: "would" });
      continue;
    }
    mkdirSync(dirname(dstAbs), { recursive: true });
    writeFileSync(dstAbs, content, "utf8");
    actions.push({ path: label, how: "create" });
  }

  // report
  info(`sidecar lab init ${flags.dryRun ? "(dry-run) " : ""}— target: ${targetDir}`);
  info(`  name: ${NAME}   slug: ${SLUG}   date: ${DATE}`);
  for (const a of actions) {
    const mark = a.how === "skip" ? "·" : a.how === "would" ? "?" : "✓";
    info(`  ${mark} ${a.how.padEnd(6)} ${a.path}`);
  }

  const wrote = actions.filter((a) => a.how === "create").length;
  const skipped = actions.filter((a) => a.how === "skip").length;
  const would = actions.filter((a) => a.how === "would").length;
  info("");
  if (flags.dryRun) {
    info(`dry-run: ${would} file(s) would be written, ${skipped} already exist (skipped).`);
    ok("done (dry-run — nothing written). re-run without --dry-run to scaffold.");
  } else {
    if (skipped) warn(`${skipped} file(s) already existed and were left untouched (use --force to overwrite).`);
    ok(`done. wrote ${wrote} file(s) → ${targetDir}. next: edit ARCHITECTURE.json, then \`python3 serve.py\`.`);
  }
  return 0;
}
