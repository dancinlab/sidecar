import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { REPO_ROOT, HARNESS_CONFIG_DIR } from "./paths.ts";

// harness.config.json (at REPO_ROOT) declares everything project-specific.
// Anything omitted falls back to the bundled defaults below, so a repo with
// NO config file still gets sensible cross-project behavior.

export interface VerifyCheck {
  id: string;
  cmd: string;
  timeoutMs?: number;
  slow?: boolean; // skipped by `verify fast`
}

export interface FreshnessFile {
  path: string; // repo-relative
  maxAgeDays: number;
  rule?: string;
}

export interface HarnessConfig {
  project: string;
  // L0 "lockdown" files — editing one emits an onEdit reminder (post edit) and
  // is flagged by `lint` when staged. Optionally parsed from a markdown 🔴 L0 block.
  lockdown: {
    files: string[];
    fromMarkdown?: string; // repo-relative .md to scan for a "🔴 L0" block
    onEditReminder?: string;
  };
  // Filenames (repo-relative) of the rule configs. If the repo file is absent,
  // the bundled default under HARNESS_CONFIG_DIR is used.
  enforcementFile: string;
  keywordsFile: string;
  severityMapFile: string;
  verify: { checks: VerifyCheck[] };
  lint: {
    freshnessFiles: FreshnessFile[];
    // commit-subject regex that REQUIRES `requiredFile` to be in the commit
    convergence?: { commitPattern: string; requiredFile: string };
    // staged code changes REQUIRE the changelog file to also be staged
    changelog?: { file: string; triggerPattern: string; ignore?: string[] };
    // committing directly on one of these branches is a violation (hardcore)
    protectedBranches?: string[];
  };
  // optional incident/convergence tracking over a JSON file with
  // { incidents: { records: [...] }, convergence: {...} }
  convergence?: { issuesFile: string };
  // optional shared-file sync: a shell script the repo runs to fan files out
  sync?: { script: string };
  // markdown guides whose relative links `gc` checks for drift
  guides: string[];
  // nudge per-subfolder CLAUDE.md authoring: `folders` command + post-edit hint
  folderGuides: {
    enabled: boolean;
    roots: string[];
    depth: number;
    minFiles: number;
    filename: string;
    ignore: string[];
    ext: string[];
  };
  // single-doc discipline — keep AI output in two canonical files instead of
  // scattering reports/notes. Active only when `architecture` file exists (opt-in
  // by presence). architecture = UPDATE-in-place SSOT; log = APPEND-only.
  docs: {
    architecture: string; // 최종 아키텍처 SSOT (업데이트형, 추가형 아님)
    log: string; // 추가형 로그 (append-only)
    scratchDir: string; // 임시 산출물 보관 (tmp 휘발 금지)
    scatterPatterns: string[]; // 흩어진 문서로 간주하는 .md 작명 패턴
    allow: string[]; // SSOT/허용 문서 (scatter·quickref 검사 제외)
  };
  ledger: { staleSec: number };
}

const DEFAULTS: HarnessConfig = {
  project: "unknown",
  lockdown: {
    files: [],
    fromMarkdown: "CLAUDE.md",
    onEditReminder: "L0 file edited — update your changelog / issue tracker in the same change.",
  },
  enforcementFile: ".harness/enforcement.json",
  keywordsFile: ".harness/keywords.json",
  severityMapFile: ".harness/severity-map.json",
  verify: { checks: [] },
  lint: { freshnessFiles: [] },
  guides: ["CLAUDE.md", "AGENTS.md", "README.md"],
  folderGuides: {
    enabled: true,
    roots: ["src", "lib", "app", "packages", "modules", "components", "services"],
    depth: 2,
    minFiles: 3,
    filename: "CLAUDE.md",
    ignore: ["node_modules", ".git", ".next", "dist", "build", "coverage", ".harness", "__pycache__", "vendor", "target", ".build", "DerivedData", "Pods"],
    ext: [
      ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte",
      ".py", ".rb", ".php",
      ".go", ".rs", ".java", ".kt", ".kts", ".scala",
      ".c", ".h", ".cpp", ".cc", ".cxx", ".hpp", ".m", ".mm",
      ".swift", ".dart", ".hexa",
    ],
  },
  docs: {
    architecture: "ARCHITECTURE.md",
    log: "CHANGELOG.md",
    scratchDir: "scripts/scratch",
    scatterPatterns: [
      "-(report|summary|notes|note|audit|status|plan|analysis|design|spec|overview|guide)\\.md$",
      "(REPORT|SUMMARY|NOTES|TODO|AUDIT|STATUS|ANALYSIS)\\.md$",
      "\\d{6,8}[-_].*\\.md$",
    ],
    allow: ["README.md", "CHANGELOG.md", "ARCHITECTURE.md", "CLAUDE.md", "AGENTS.md", "LICENSE", "CONTRIBUTING.md", "SECURITY.md"],
  },
  ledger: { staleSec: 3600 },
};

function deepMerge<T>(base: T, over: Partial<T>): T {
  if (over == null) return base;
  const out: Record<string, unknown> = Array.isArray(base) ? [...(base as unknown[])] as never : { ...(base as object) };
  for (const [k, v] of Object.entries(over as object)) {
    if (v === undefined) continue;
    const bv = (out as Record<string, unknown>)[k];
    if (v && typeof v === "object" && !Array.isArray(v) && bv && typeof bv === "object" && !Array.isArray(bv)) {
      (out as Record<string, unknown>)[k] = deepMerge(bv, v as Record<string, unknown>);
    } else {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out as T;
}

let _cfg: HarnessConfig | null = null;

export function config(): HarnessConfig {
  if (_cfg) return _cfg;
  const p = resolve(REPO_ROOT, "harness.config.json");
  let user: Partial<HarnessConfig> = {};
  if (existsSync(p)) {
    try {
      user = JSON.parse(readFileSync(p, "utf8")) as Partial<HarnessConfig>;
    } catch {
      /* malformed config → defaults */
    }
  }
  _cfg = deepMerge(DEFAULTS, user);
  return _cfg;
}

// Resolve a rule-config file: prefer the repo override, else the bundled default.
export function resolveRuleFile(repoRelOrAbs: string, bundledName: string): string {
  const candidate = isAbsolute(repoRelOrAbs) ? repoRelOrAbs : resolve(REPO_ROOT, repoRelOrAbs);
  if (existsSync(candidate)) return candidate;
  return resolve(HARNESS_CONFIG_DIR, bundledName);
}

export function repoPath(rel: string): string {
  return isAbsolute(rel) ? rel : resolve(REPO_ROOT, rel);
}
