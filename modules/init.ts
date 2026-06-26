// sidecar init [--force] [--dry-run]
// One-shot scaffold for a consuming repo:
//   • harness.config.json     (project name auto-detected from repo dir)
//   • .harness/{enforcement,keywords,severity-map}.json  (copied from bundled defaults)
//   • .gitignore              (append log ignores)
//   • scripts/sidecar         (thin wrapper)
// Hooks are GLOBAL-ONLY — run `sidecar install` (once per host) to wire them for
// every repo. init NEVER writes a per-repo .claude/settings.json (banned: it
// duplicated the global install and double-injected context). Never overwrites
// existing files unless --force. With --dry-run, only reports.
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { resolve, relative, basename, dirname } from "node:path";
import { REPO_ROOT, SIDECAR_ROOT, SIDECAR_CONFIG_DIR } from "../lib/paths.ts";
import { info, ok, warn } from "../lib/log.ts";
import { config } from "../lib/config.ts";
import { ciWorkflowYaml, defaultCiSetup } from "./ci.ts";

interface Flags {
  force: boolean;
  dryRun: boolean;
}


function enginePath(): string {
  // relative path from repo root to the sidecar engine (for wrappers/snippets)
  const rel = relative(REPO_ROOT, SIDECAR_ROOT);
  return rel || ".";
}

interface Check {
  id: string;
  cmd: string;
  timeoutMs?: number;
  slow?: boolean;
}
interface Stack {
  ids: string[];
  checks: Check[];
  exts: string[];
}

// Detect the repo's ecosystem(s) from marker files → starter verify checks +
// the extension set used for the changelog gate. Language-agnostic: detects
// node / python / rust / go / swift / c-cmake / c-make / hexa, and merges if mixed.
function detectStack(): Stack {
  const has = (f: string) => existsSync(resolve(REPO_ROOT, f));
  let top: string[] = [];
  try {
    top = readdirSync(REPO_ROOT);
  } catch {
    /* ignore */
  }
  const hasExt = (e: string) => top.some((n) => n.endsWith(e));

  const ids: string[] = [];
  const checks: Check[] = [];
  const exts = new Set<string>();

  if (has("package.json")) {
    ids.push("node");
    const pm = has("pnpm-lock.yaml") ? "pnpm" : has("yarn.lock") ? "yarn" : "npm";
    if (has("tsconfig.json")) checks.push({ id: "typecheck", cmd: "npx tsc --noEmit", timeoutMs: 240000 });
    checks.push({ id: "test", cmd: `${pm} test`, timeoutMs: 240000 });
    ["ts", "tsx", "js", "jsx", "mjs", "cjs"].forEach((e) => exts.add(e));
  }
  if (has("Cargo.toml")) {
    ids.push("rust");
    checks.push({ id: "fmt", cmd: "cargo fmt --check", timeoutMs: 60000 });
    checks.push({ id: "clippy", cmd: "cargo clippy -- -D warnings", timeoutMs: 300000 });
    checks.push({ id: "test", cmd: "cargo test", timeoutMs: 300000, slow: true });
    exts.add("rs");
  }
  if (has("pyproject.toml") || has("setup.py") || has("requirements.txt")) {
    ids.push("python");
    checks.push({ id: "lint", cmd: "ruff check .", timeoutMs: 120000 });
    checks.push({ id: "test", cmd: "pytest -q", timeoutMs: 240000 });
    exts.add("py");
  }
  if (has("go.mod")) {
    ids.push("go");
    checks.push({ id: "vet", cmd: "go vet ./...", timeoutMs: 120000 });
    checks.push({ id: "test", cmd: "go test ./...", timeoutMs: 240000 });
    exts.add("go");
  }
  if (has("Package.swift") || top.some((n) => n.endsWith(".xcodeproj"))) {
    ids.push("swift");
    checks.push({ id: "build", cmd: "swift build", timeoutMs: 600000, slow: true });
    checks.push({ id: "test", cmd: "swift test", timeoutMs: 600000, slow: true });
    ["swift", "m", "mm"].forEach((e) => exts.add(e));
  }
  if (has("CMakeLists.txt")) {
    ids.push("cmake");
    checks.push({ id: "build", cmd: "cmake --build build", timeoutMs: 600000, slow: true });
    ["c", "h", "cpp", "cc", "cxx", "hpp"].forEach((e) => exts.add(e));
  } else if (has("Makefile") || has("makefile")) {
    ids.push("make");
    checks.push({ id: "build", cmd: "make", timeoutMs: 600000, slow: true });
    ["c", "h", "cpp", "cc", "cxx", "hpp"].forEach((e) => exts.add(e));
  }
  if (hasExt(".hexa")) {
    ids.push("hexa");
    checks.push({ id: "verify", cmd: "hexa verify", timeoutMs: 240000 });
    exts.add("hexa");
  }

  return { ids, checks, exts: [...exts] };
}

function changelogTrigger(exts: string[]): string {
  const set = exts.length
    ? exts
    : ["ts", "tsx", "js", "jsx", "py", "rb", "go", "rs", "java", "kt", "c", "h", "cpp", "cc", "hpp", "m", "mm", "swift", "hexa"];
  return `\\.(${set.join("|")})$`;
}

function starterConfig(project: string, stack: Stack): string {
  const lint: Record<string, unknown> = {
    freshnessFiles: [],
    changelog: {
      file: "CHANGELOG.md",
      triggerPattern: changelogTrigger(stack.exts),
      ignore: ["(^|/)(tests?|__tests__|spec)/", "\\.(test|spec)\\.[a-z]+$", "(^|/)\\.harness(-engine)?/"],
    },
    protectedBranches: ["main", "master"],
  };
  return JSON.stringify(
    {
      project,
      stack: stack.ids,
      lockdown: { files: [], fromMarkdown: "CLAUDE.md", onEditReminder: "L0 file edited — update CHANGELOG + issue tracker in the same change." },
      enforcementFile: ".harness/enforcement.json",
      keywordsFile: ".harness/keywords.json",
      severityMapFile: ".harness/severity-map.json",
      verify: { checks: stack.checks },
      lint,
      guides: ["CLAUDE.md", "AGENTS.md", "README.md"],
      ledger: { staleSec: 1800 },
    },
    null,
    2
  ) + "\n";
}

type Action = { path: string; how: "create" | "copy" | "append" | "skip" | "would" };

export async function runInit(args: string[]): Promise<number> {
  const flags: Flags = {
    force: args.includes("--force"),
    dryRun: args.includes("--dry-run"),
  };
  const actions: Action[] = [];
  const engineRel = enginePath();
  const stack = detectStack();

  const write = (abs: string, content: string, label: string) => {
    if (existsSync(abs) && !flags.force) {
      actions.push({ path: label, how: "skip" });
      return;
    }
    if (flags.dryRun) {
      actions.push({ path: label, how: "would" });
      return;
    }
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, "utf8");
    actions.push({ path: label, how: "create" });
  };

  // 1. harness.config.json
  write(resolve(REPO_ROOT, "harness.config.json"), starterConfig(basename(REPO_ROOT), stack), "harness.config.json");

  // 1b. CI workflow — create-if-absent. Runs `sidecar ci` (verify.checks)
  // on a fast cloud runner so push-time checks stay off the dev machine. Runner/setup
  // from config ci.{runner,setup}; setup falls back to the detected stack.
  const ciCfg = config().ci;
  write(
    resolve(REPO_ROOT, ".github/workflows/ci.yml"),
    ciWorkflowYaml(basename(REPO_ROOT), ciCfg.runner, ciCfg.setup.length ? ciCfg.setup : defaultCiSetup()),
    ".github/workflows/ci.yml",
  );

  // 2. .harness/*.json (copy bundled defaults)
  for (const name of ["enforcement.json", "keywords.json", "severity-map.json"]) {
    const dst = resolve(REPO_ROOT, ".harness", name);
    const src = resolve(SIDECAR_CONFIG_DIR, name);
    if (existsSync(dst) && !flags.force) {
      actions.push({ path: `.harness/${name}`, how: "skip" });
      continue;
    }
    if (flags.dryRun) {
      actions.push({ path: `.harness/${name}`, how: "would" });
      continue;
    }
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
    actions.push({ path: `.harness/${name}`, how: "copy" });
  }

  // 2c. .harness/prefs.json (language prefs — code/docs english, response korean)
  {
    const dst = resolve(REPO_ROOT, ".harness", "prefs.json");
    const content = JSON.stringify(
      { code: "english", docs: "english", response: "korean" },
      null,
      2
    ) + "\n";
    write(dst, content, ".harness/prefs.json");
  }

  // 2d. single-doc discipline scaffolds (create-if-absent):
  //   ARCHITECTURE.json (current-state SSOT tree · commons single-doc) ·
  //   CHANGELOG.md (append) · CLAUDE.md (entry pointer — NO directory tree;
  //   the tree is the single SSOT in ARCHITECTURE.json) · state/ (산출물 루트).
  {
    const proj = basename(REPO_ROOT);
    const archTree = {
      schemaVersion: "2.0",
      kind: "architecture-tree",
      title: `${proj} — 아키텍처 SSOT`,
      summary: "(한 줄 프로젝트 설명)",
      viewer: "ARCHITECTURE.html",
      serve: "python3 serve.py",
      columns: [
        { key: "이름", label: "이름", tree: true },
        { key: "역할", label: "역할" },
        { key: "slug", label: "slug" },
        { key: "상세", label: "상세" },
      ],
      tree: {
        이름: proj,
        역할: "(프로젝트 한 줄 역할)",
        slug: proj.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "root",
        상세:
          "현재상태 스냅샷 트리 — 변경 시 해당 노드를 제자리 교체(update-in-place)." +
          " 이력/버전/날짜/previous/deprecated 노드 금지(이력은 CHANGELOG + git)." +
          " 각 노드는 고유 kebab-case slug 보유(검색키 · `sidecar architecture search`).",
        children: [
          { 이름: "src/", 역할: "소스 코드", slug: "group-src", 상세: "(컴포넌트별 역할)" },
          { 이름: "state/", 역할: "작업 산출물 단일 루트", slug: "group-state", 상세: "실험·벤치·검증·스크래치 (git-tracked)" },
        ],
      },
    };
    write(
      resolve(REPO_ROOT, "ARCHITECTURE.json"),
      JSON.stringify(archTree, null, 2) + "\n",
      "ARCHITECTURE.json"
    );
    write(
      resolve(REPO_ROOT, "CHANGELOG.md"),
      `# CHANGELOG\n\n> 추가형(append-only) 이력. 현재상태 SSOT 는 ARCHITECTURE.json.\n\n## (unreleased)\n- \n`,
      "CHANGELOG.md"
    );
    write(
      resolve(REPO_ROOT, "CLAUDE.md"),
      `# ${proj}\n\n${proj} — (한 줄 프로젝트 설명을 여기에).\n\n` +
        `> 📍 SSOT 포인터 (이 파일 = 진입점):\n` +
        `> · 구조·설계 → [ARCHITECTURE.json](ARCHITECTURE.json) — 디렉토리·모듈 트리 단일 SSOT (\`sidecar architecture inject\` 가 SessionStart 주입 · 사람은 \`python3 serve.py\` HTML 뷰어)\n` +
        `> · 이력 → [CHANGELOG.md](CHANGELOG.md) (append)\n\n` +
        `## 작업 규칙 (this repo)\n- do: (프로젝트별 do/dont 규칙을 여기에)\n`,
      "CLAUDE.md"
    );
    const scratch = resolve(REPO_ROOT, "state");
    const scratchExisted = existsSync(scratch);
    if (!flags.dryRun) {
      mkdirSync(scratch, { recursive: true });
      const keep = resolve(scratch, ".gitkeep");
      if (!existsSync(keep)) writeFileSync(keep, "");
    }
    if (scratchExisted) actions.push({ path: "state/", how: "skip" });
    else actions.push({ path: "state/", how: flags.dryRun ? "would" : "create" });
  }

  // 3. .gitignore — ensure machine log dir is ignored
  const giPath = resolve(REPO_ROOT, ".gitignore");
  const needLines = [".harness/logs/", "ING.jsonl", "ING.jsonl.bak", "ING.jsonl.tmp.*"];
  const existing = existsSync(giPath) ? readFileSync(giPath, "utf8") : "";
  const missing = needLines.filter((l) => !existing.split("\n").some((x) => x.trim() === l));
  if (missing.length) {
    if (flags.dryRun) {
      actions.push({ path: ".gitignore (+2)", how: "would" });
    } else {
      writeFileSync(giPath, (existing ? existing.replace(/\n*$/, "\n") : "") + missing.join("\n") + "\n", "utf8");
      actions.push({ path: ".gitignore", how: "append" });
    }
  } else {
    actions.push({ path: ".gitignore", how: "skip" });
  }

  // 4. scripts/sidecar wrapper — resolve repo root (one level up from scripts/)
  // then append the engine path relative to repo root (e.g. .harness-engine).
  const wrapper = `#!/usr/bin/env bash\nROOT="$(cd "$(dirname "$0")/.." && pwd)"\nexec bash "$ROOT/${engineRel}/bin/sidecar" "$@"\n`;
  const wrapPath = resolve(REPO_ROOT, "scripts", "sidecar");
  if (existsSync(wrapPath) && !flags.force) {
    actions.push({ path: "scripts/sidecar", how: "skip" });
  } else if (flags.dryRun) {
    actions.push({ path: "scripts/sidecar", how: "would" });
  } else {
    mkdirSync(dirname(wrapPath), { recursive: true });
    writeFileSync(wrapPath, wrapper, { mode: 0o755 });
    actions.push({ path: "scripts/sidecar", how: "create" });
  }

  // 5. git pre-commit hook → runs `sidecar lint` (the actual "강제" for lint gates)
  const gitDir = resolve(REPO_ROOT, ".git");
  if (existsSync(gitDir) && statSync(gitDir).isDirectory()) {
    const preCommit = resolve(gitDir, "hooks", "pre-commit");
    // route via the repo's own scripts/sidecar wrapper (single source of truth
    // for the engine location), resolved from the repo top-level at hook time.
    const body = `#!/usr/bin/env bash\n# installed by 'sidecar init' — block commits that fail sidecar lint gates\nW="$(git rev-parse --show-toplevel)/scripts/sidecar"\n[ -x "$W" ] || exit 0   # engine/wrapper absent (submodule not init'd) → skip\nexec bash "$W" lint\n`;
    if (existsSync(preCommit) && !flags.force) {
      actions.push({ path: ".git/hooks/pre-commit", how: "skip" });
    } else if (flags.dryRun) {
      actions.push({ path: ".git/hooks/pre-commit", how: "would" });
    } else {
      mkdirSync(dirname(preCommit), { recursive: true });
      writeFileSync(preCommit, body, { mode: 0o755 });
      actions.push({ path: ".git/hooks/pre-commit", how: "create" });
    }
  }

  // 5b. pre-push hook → full verify + error-queue drain
  if (existsSync(gitDir) && statSync(gitDir).isDirectory()) {
    const prePush = resolve(gitDir, "hooks", "pre-push");
    const body =
      `#!/usr/bin/env bash\n# installed by 'sidecar init' — block pushes that fail verify / have open errors\nROOT="$(git rev-parse --show-toplevel)"\n[ -x "$ROOT/scripts/sidecar" ] || exit 0   # engine/wrapper absent → skip\nbash "$ROOT/scripts/sidecar" verify || exit 1\nbash "$ROOT/scripts/sidecar" errors drain_check 1 || exit 1\n`;
    if (existsSync(prePush) && !flags.force) {
      actions.push({ path: ".git/hooks/pre-push", how: "skip" });
    } else if (flags.dryRun) {
      actions.push({ path: ".git/hooks/pre-push", how: "would" });
    } else {
      mkdirSync(dirname(prePush), { recursive: true });
      writeFileSync(prePush, body, { mode: 0o755 });
      actions.push({ path: ".git/hooks/pre-push", how: "create" });
    }
  }

  // 6. agent hooks — GLOBAL-ONLY. Per-repo .claude/settings.json is banned: it
  // duplicated the global install and double-injected context. init scaffolds
  // only repo config; hooks come solely from the global ~/.claude/settings.json.

  // report
  info(`sidecar init ${flags.dryRun ? "(dry-run) " : ""}— repo: ${REPO_ROOT}`);
  info(`  detected stack: ${stack.ids.length ? stack.ids.join(", ") : "none (generic — fill verify.checks manually)"}`);
  for (const a of actions) {
    const mark = a.how === "skip" ? "·" : a.how === "would" ? "?" : "✓";
    info(`  ${mark} ${a.how.padEnd(6)} ${a.path}`);
  }

  info("");
  info("hooks: GLOBAL-ONLY — run `sidecar install` once per host to wire guards/injects for EVERY repo.");
  info("  (per-repo .claude/settings.json is not used — it duplicated the global install.)");
  info("");
  ok("done. edit harness.config.json → verify.checks, lockdown.files, then `sidecar audit`.");
  return 0;
}
