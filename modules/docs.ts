// harness docs {status|check|scratch [name]}
// Single-document discipline: keep AI output in two canonical files —
//   architecture (UPDATE-in-place SSOT) + log (APPEND-only) — instead of
// scattering *-report.md / *-summary.md / dated notes. Any document that must
// live separately MUST carry a quickref pointer back to the SSOT.
// ACTIVE ONLY when the architecture file exists (opt-in by presence).
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { resolve, relative, basename } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { config, repoPath } from "../lib/config.ts";
import { info, ok, warn } from "../lib/log.ts";

export interface DocViolation {
  rule: string;
  file: string;
  msg: string;
}

export function docsActive(): boolean {
  return existsSync(repoPath(config().docs.architecture));
}

function isAllowed(rel: string): boolean {
  const base = basename(rel);
  return config().docs.allow.includes(base);
}

function isScatter(rel: string): boolean {
  return config().docs.scatterPatterns.some((p) => new RegExp(p).test(rel));
}

// A separate doc must point back to the SSOT in its first ~12 lines:
//   a link to the architecture file, OR the tokens SSOT / quickref / 단일 문서.
function hasQuickref(absFile: string): boolean {
  const arch = basename(config().docs.architecture);
  let head = "";
  try {
    head = readFileSync(absFile, "utf8").split("\n").slice(0, 12).join("\n");
  } catch {
    return true; // unreadable → don't flag
  }
  if (head.includes(arch)) return true;
  return /\b(SSOT|quickref|단일\s*문서|↩|→\s*\[)/i.test(head);
}

function walkMd(dir: string, out: string[]): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  const ignore = new Set(["node_modules", ".git", ".harness", "dist", "build", ".next", "vendor", "target", ".build"]);
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".harness") {
      if (e.isDirectory()) continue;
    }
    const abs = resolve(dir, e.name);
    if (e.isDirectory()) {
      if (ignore.has(e.name)) continue;
      walkMd(abs, out);
    } else if (e.name.endsWith(".md")) {
      out.push(abs);
    }
  }
}

// Main CLAUDE.md MUST carry: (1) a project blurb, (2) a tree structure with a
// per-node one-line description. Checked whenever the doc discipline is active.
function claudeMdViolations(): DocViolation[] {
  const v: DocViolation[] = [];
  const abs = repoPath("CLAUDE.md");
  if (!existsSync(abs)) {
    v.push({ rule: "CLAUDE-MD-MISSING", file: "CLAUDE.md", msg: "메인 CLAUDE.md 없음 — 프로젝트 설명 + 트리 구조 포함해 작성" });
    return v;
  }
  const text = readFileSync(abs, "utf8");
  const lines = text.split("\n");
  // (1) project blurb: an H1 followed by a non-heading/non-blank prose line
  const h1 = lines.findIndex((l) => /^#\s+\S/.test(l));
  let hasDesc = false;
  if (h1 >= 0) {
    for (const l of lines.slice(h1 + 1, h1 + 12)) {
      const t = l.trim();
      if (t && !t.startsWith("#") && !t.startsWith("```") && !t.startsWith(">")) {
        hasDesc = true;
        break;
      }
    }
  }
  if (!hasDesc) v.push({ rule: "CLAUDE-MD-NO-DESC", file: "CLAUDE.md", msg: "프로젝트 간략 설명 누락 — H1 아래 한두 문장 추가" });
  // (2) tree + per-node descriptions
  const hasTree = /(├─|└─|│ )/.test(text);
  const hasTreeDesc = lines.some((l) => /(├─|└─).*(—| - |#|:)/.test(l));
  if (!hasTree) v.push({ rule: "CLAUDE-MD-NO-TREE", file: "CLAUDE.md", msg: "트리 구조 누락 — ``` 블록에 디렉토리 트리(├─/└─) + 각 항목 한 줄 설명 추가" });
  else if (!hasTreeDesc) v.push({ rule: "CLAUDE-MD-TREE-NO-DESC", file: "CLAUDE.md", msg: "트리 항목별 설명 누락 — 각 트리 라인에 `— 설명` 추가" });
  return v;
}

// scope=staged → only git-staged .md; scope=all → whole repo tree.
export function docViolations(staged: string[] | null): DocViolation[] {
  if (!docsActive()) return [];
  const v: DocViolation[] = [...claudeMdViolations()];
  const cfg = config().docs;
  let files: string[];
  if (staged) {
    files = staged.filter((f) => f.endsWith(".md")).map((f) => repoPath(f));
  } else {
    files = [];
    walkMd(REPO_ROOT, files);
  }
  for (const abs of files) {
    const rel = relative(REPO_ROOT, abs);
    if (isAllowed(rel)) continue;
    if (isScatter(rel)) {
      v.push({
        rule: "DOC-SCATTER",
        file: rel,
        msg: `흩어진 문서 — 아키텍처는 ${cfg.architecture}(갱신), 이력은 ${cfg.log}(append)로 통합. 임시면 ${cfg.scratchDir}/`,
      });
      continue; // scatter implies single-doc; quickref check moot
    }
    if (existsSync(abs) && !hasQuickref(abs)) {
      v.push({
        rule: "DOC-NO-QUICKREF",
        file: rel,
        msg: `분리 문서에 quickref 누락 — 상단에 SSOT(${cfg.architecture}) 로 가는 링크/포인터 1줄 추가`,
      });
    }
  }
  return v;
}

export async function runDocs(args: string[]): Promise<number> {
  const sub = args[0] ?? "status";
  const cfg = config().docs;

  if (sub === "scratch") {
    const dir = repoPath(cfg.scratchDir);
    mkdirSync(dir, { recursive: true });
    const name = args[1];
    if (name) process.stdout.write(resolve(dir, name) + "\n");
    else info(`scratch dir ready: ${cfg.scratchDir}/ (tmp 대신 여기에 보관)`);
    return 0;
  }

  if (!docsActive()) {
    info(`docs discipline inactive — create ${cfg.architecture} to enable (opt-in by presence).`);
    info(`  architecture(SSOT, 갱신형): ${cfg.architecture}`);
    info(`  log(추가형): ${cfg.log} · scratch: ${cfg.scratchDir}/`);
    return 0;
  }

  const all = docViolations(null);
  if (sub === "check") {
    if (all.length === 0) {
      ok("docs: ok");
      return 0;
    }
    warn(`docs: ${all.length} violation(s)`);
    for (const x of all) info(`  [${x.rule}] ${x.file} — ${x.msg}`);
    return 1;
  }

  // status
  info(`docs discipline ACTIVE — architecture=${cfg.architecture} · log=${cfg.log} · scratch=${cfg.scratchDir}/`);
  const scatter = all.filter((x) => x.rule === "DOC-SCATTER");
  const noref = all.filter((x) => x.rule === "DOC-NO-QUICKREF");
  info(`  흩어진 문서: ${scatter.length} · quickref 누락: ${noref.length}`);
  for (const x of all) info(`  • [${x.rule}] ${x.file}`);
  return 0;
}
