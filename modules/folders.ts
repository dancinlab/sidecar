// harness folders [scan|missing|scaffold <dir>]
// Encourage a per-subfolder CLAUDE.md so an agent reading just that folder has
// local context. `scan` lists qualifying folders that lack one; `scaffold`
// writes a skeleton. A post-edit nudge (see post.ts) surfaces this during work.
import { existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, relative, basename, dirname, extname } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { config, repoPath } from "../lib/config.ts";
import { LOGS } from "../lib/paths.ts";
import { appendJsonl, info, ok, warn } from "../lib/log.ts";
import { readJsonl } from "../lib/json.ts";

interface FG {
  enabled: boolean;
  roots: string[];
  depth: number;
  minFiles: number;
  filename: string;
  ignore: string[];
  ext: string[];
}

function fg(): FG {
  return config().folderGuides;
}

function sourceFileCount(absDir: string, exts: string[]): number {
  let n = 0;
  for (const e of readdirSync(absDir, { withFileTypes: true })) {
    if (e.isFile() && exts.includes(extname(e.name))) n++;
  }
  return n;
}

// A folder "qualifies" if it holds >= minFiles source files and lacks the guide.
export function qualifiesMissing(absDir: string): boolean {
  const cfg = fg();
  if (!cfg.enabled) return false;
  if (!existsSync(absDir) || !statSync(absDir).isDirectory()) return false;
  const rel = relative(REPO_ROOT, absDir);
  if (!rel || rel.startsWith("..")) return false;
  const parts = rel.split("/");
  if (parts.some((p) => cfg.ignore.includes(p))) return false;
  // must be under a configured root
  if (!cfg.roots.includes(parts[0])) return false;
  // depth (root counts as depth 1)
  if (parts.length > cfg.depth) return false;
  if (existsSync(resolve(absDir, cfg.filename))) return false;
  return sourceFileCount(absDir, cfg.ext) >= cfg.minFiles;
}

function walk(absDir: string, cfg: FG, depth: number, out: string[]): void {
  if (depth > cfg.depth) return;
  let entries;
  try {
    entries = readdirSync(absDir, { withFileTypes: true });
  } catch {
    return;
  }
  if (qualifiesMissing(absDir)) out.push(absDir);
  for (const e of entries) {
    if (!e.isDirectory() || cfg.ignore.includes(e.name) || e.name.startsWith(".")) continue;
    walk(resolve(absDir, e.name), cfg, depth + 1, out);
  }
}

export function enumerateMissing(): string[] {
  const cfg = fg();
  if (!cfg.enabled) return [];
  const out: string[] = [];
  for (const root of cfg.roots) {
    const abs = repoPath(root);
    if (existsSync(abs)) walk(abs, cfg, 1, out);
  }
  return [...new Set(out)].sort();
}

function template(absDir: string): string {
  const rel = relative(REPO_ROOT, absDir) || basename(absDir);
  return `# ${rel} — <한 줄 목적>

> 이 폴더에서 작업하는 AI/사람을 위한 로컬 가이드.

## 목적
(이 폴더가 무엇을 담당하는가 — 한두 문장)

## 핵심 파일
| 파일 | 역할 |
|------|------|
| | |

## 규칙 / 컨벤션
- (이 폴더 코드가 따르는 패턴 — 네이밍, import 방향, 금지사항)

## 주의 (gotchas)
- (실수하기 쉬운 점, 과거에 깨졌던 부분)

## 관련
- (상위/연관 폴더, 관련 문서 링크)
`;
}

// post-edit nudge — at most once per folder (deduped via observations log).
export function postEditNudge(file: string): void {
  const cfg = fg();
  if (!cfg.enabled) return;
  const dir = dirname(repoPath(file));
  if (!qualifiesMissing(dir)) return;
  const rel = relative(REPO_ROOT, dir);
  const already = readJsonl<{ kind?: string; dir?: string }>(LOGS.observations).some(
    (r) => r.kind === "folder_guide_nudge" && r.dir === rel
  );
  if (already) return;
  appendJsonl(LOGS.observations, { kind: "folder_guide_nudge", dir: rel });
  process.stderr.write(
    `\x1b[33m📁 ${rel}/ 에 ${cfg.filename} 가 없습니다 — 이 폴더 작업 맥락을 남기려면 \`harness folders scaffold ${rel}\` 로 가이드를 만드세요.\x1b[0m\n`
  );
}

export async function runFolders(args: string[]): Promise<number> {
  const sub = args[0] ?? "scan";

  if (sub === "scaffold") {
    const target = args[1];
    if (!target) {
      info("usage: harness folders scaffold <dir> [--force]");
      return 1;
    }
    const abs = repoPath(target);
    const path = resolve(abs, fg().filename);
    if (existsSync(path) && !args.includes("--force")) {
      warn(`${relative(REPO_ROOT, path)} already exists (use --force to overwrite)`);
      return 1;
    }
    mkdirSync(abs, { recursive: true });
    writeFileSync(path, template(abs), "utf8");
    appendJsonl(LOGS.observations, { kind: "folder_guide_scaffold", dir: relative(REPO_ROOT, abs) });
    ok(`scaffolded ${relative(REPO_ROOT, path)} — fill in the sections.`);
    return 0;
  }

  // scan / missing
  const missing = enumerateMissing();
  appendJsonl(LOGS.observations, { kind: "folders_scan", missing: missing.length });
  if (missing.length === 0) {
    ok(`folders: every qualifying source folder has ${fg().filename}`);
    return 0;
  }
  warn(`folders: ${missing.length} folder(s) without ${fg().filename}`);
  for (const d of missing) info(`  ${relative(REPO_ROOT, d)}/`);
  info("");
  info(`scaffold one: harness folders scaffold <dir>`);
  return 0;
}
