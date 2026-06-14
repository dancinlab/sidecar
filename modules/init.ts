// harness init [--force] [--hooks] [--dry-run]
// One-shot scaffold for a consuming repo:
//   • harness.config.json     (project name auto-detected from repo dir)
//   • .harness/{enforcement,keywords,severity-map}.json  (copied from bundled defaults)
//   • .gitignore              (append log/handoff ignores)
//   • scripts/harness         (thin wrapper)
//   • prints the .claude/settings.json hook snippet (or writes it with --hooks)
// Never overwrites existing files unless --force. With --dry-run, only reports.
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { resolve, relative, basename, dirname } from "node:path";
import { REPO_ROOT, HARNESS_ROOT, HARNESS_CONFIG_DIR } from "../lib/paths.ts";
import { info, ok, warn } from "../lib/log.ts";

interface Flags {
  force: boolean;
  hooks: boolean;
  dryRun: boolean;
  hardcore: boolean;
}

function enginePath(): string {
  // relative path from repo root to the harness engine (for wrappers/snippets)
  const rel = relative(REPO_ROOT, HARNESS_ROOT);
  return rel || ".";
}

function hookSnippet(engineRel: string): string {
  const bin = `${engineRel}/bin/harness`;
  return JSON.stringify(
    {
      hooks: {
        PreToolUse: [
          { matcher: "Bash", hooks: [{ type: "command", command: `CLAUDE_TOOL_INPUT="$CLAUDE_TOOL_INPUT" bash ${bin} pre bash` }] },
          { matcher: "Write|Edit", hooks: [{ type: "command", command: `CLAUDE_TOOL_INPUT="$CLAUDE_TOOL_INPUT" bash ${bin} pre write` }] },
        ],
        PostToolUse: [
          { matcher: "Write|Edit", hooks: [{ type: "command", command: `bash ${bin} post edit "$CLAUDE_FILE_PATH"` }] },
        ],
        UserPromptSubmit: [
          { hooks: [{ type: "command", command: `bash ${bin} prompt "$CLAUDE_USER_PROMPT"` }] },
          { hooks: [{ type: "command", command: `bash ${bin} prefs inject` }] },
          { hooks: [{ type: "command", command: `bash ${bin} easy inject` }] },
          { hooks: [{ type: "command", command: `bash ${bin} recommend inject` }] },
        ],
        SessionStart: [
          { hooks: [{ type: "command", command: `bash ${bin} easy inject` }] },
          { hooks: [{ type: "command", command: `bash ${bin} recommend inject` }] },
        ],
      },
    },
    null,
    2
  );
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

function starterConfig(project: string, stack: Stack, hardcore: boolean): string {
  const lint: Record<string, unknown> = {
    freshnessFiles: [],
    changelog: {
      file: "CHANGELOG.md",
      triggerPattern: changelogTrigger(stack.exts),
      ignore: ["(^|/)(tests?|__tests__|spec)/", "\\.(test|spec)\\.[a-z]+$", "(^|/)\\.harness(-engine)?/"],
    },
  };
  if (hardcore) lint.protectedBranches = ["main", "master"];
  return JSON.stringify(
    {
      project,
      profile: hardcore ? "hardcore" : "default",
      stack: stack.ids,
      lockdown: { files: [], fromMarkdown: "CLAUDE.md", onEditReminder: "L0 file edited — update CHANGELOG + issue tracker in the same change." },
      enforcementFile: ".harness/enforcement.json",
      keywordsFile: ".harness/keywords.json",
      severityMapFile: ".harness/severity-map.json",
      verify: { checks: stack.checks },
      lint,
      guides: ["CLAUDE.md", "AGENTS.md", "README.md"],
      ledger: { staleSec: hardcore ? 1800 : 3600 },
    },
    null,
    2
  ) + "\n";
}

type Action = { path: string; how: "create" | "copy" | "append" | "skip" | "would" };

export async function runInit(args: string[]): Promise<number> {
  const flags: Flags = {
    force: args.includes("--force"),
    hooks: args.includes("--hooks"),
    dryRun: args.includes("--dry-run"),
    hardcore: args.includes("--hardcore"),
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
  write(resolve(REPO_ROOT, "harness.config.json"), starterConfig(basename(REPO_ROOT), stack, flags.hardcore), "harness.config.json");

  // 2. .harness/*.json (copy bundled defaults; hardcore profile uses *.hardcore.json sources)
  const ruleSrc: Record<string, string> = flags.hardcore
    ? { "enforcement.json": "enforcement.hardcore.json", "keywords.json": "keywords.json", "severity-map.json": "severity-map.hardcore.json" }
    : { "enforcement.json": "enforcement.json", "keywords.json": "keywords.json", "severity-map.json": "severity-map.json" };
  for (const name of ["enforcement.json", "keywords.json", "severity-map.json"]) {
    const dst = resolve(REPO_ROOT, ".harness", name);
    const src = resolve(HARNESS_CONFIG_DIR, ruleSrc[name]);
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

  // 2c. .harness/prefs.json (language prefs — defaults: code english / docs/response korean for hardcore)
  {
    const dst = resolve(REPO_ROOT, ".harness", "prefs.json");
    const content = JSON.stringify(
      flags.hardcore ? { code: "english", docs: "korean", response: "korean" } : { code: "english", docs: "english", response: "korean" },
      null,
      2
    ) + "\n";
    write(dst, content, ".harness/prefs.json");
  }

  // 2d. hardcore single-doc discipline scaffolds (create-if-absent):
  //   ARCHITECTURE.md (update-in-place SSOT) · CHANGELOG.md (append) ·
  //   CLAUDE.md (project blurb + tree) · scripts/scratch/ (tmp 대체).
  if (flags.hardcore) {
    const proj = basename(REPO_ROOT);
    write(
      resolve(REPO_ROOT, "ARCHITECTURE.md"),
      `# ${proj} — 아키텍처 (SSOT · 업데이트형)\n\n` +
        `> 최종 아키텍처 단일 SSOT. 변경 시 이 파일을 **갱신(덮어쓰기)** 한다(추가형 아님). 이력/결정은 CHANGELOG.md.\n\n` +
        `## 개요\n(한 줄 설명)\n\n## 구성요소\n(컴포넌트별 역할)\n\n## 데이터 흐름\n(입력 → 처리 → 출력)\n`,
      "ARCHITECTURE.md"
    );
    write(
      resolve(REPO_ROOT, "CHANGELOG.md"),
      `# CHANGELOG\n\n> 추가형(append-only) 이력. 최종 상태는 ARCHITECTURE.md.\n\n## (unreleased)\n- \n`,
      "CHANGELOG.md"
    );
    write(
      resolve(REPO_ROOT, "CLAUDE.md"),
      `# ${proj}\n\n${proj} — (한 줄 프로젝트 설명을 여기에).\n\n## 구조\n\n\`\`\`\n${proj}/\n├─ src/         — 소스 코드\n├─ scripts/     — 빌드/운영 스크립트 (scratch/ = 임시 산출물 보관)\n├─ ARCHITECTURE.md — 최종 아키텍처 SSOT (업데이트형)\n└─ CHANGELOG.md  — 이력 (추가형)\n\`\`\`\n`,
      "CLAUDE.md"
    );
    const scratch = resolve(REPO_ROOT, "scripts", "scratch");
    if (!flags.dryRun) {
      mkdirSync(scratch, { recursive: true });
      const keep = resolve(scratch, ".gitkeep");
      if (!existsSync(keep)) writeFileSync(keep, "");
    }
    actions.push({ path: "scripts/scratch/", how: flags.dryRun ? "would" : "create" });
  }

  // 3. .gitignore — ensure log/handoff dirs are ignored
  const giPath = resolve(REPO_ROOT, ".gitignore");
  const needLines = [".harness/logs/", ".harness/handoff/"];
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

  // 4. scripts/harness wrapper — resolve repo root (one level up from scripts/)
  // then append the engine path relative to repo root (e.g. .harness-engine).
  const wrapper = `#!/usr/bin/env bash\nROOT="$(cd "$(dirname "$0")/.." && pwd)"\nexec bash "$ROOT/${engineRel}/bin/harness" "$@"\n`;
  const wrapPath = resolve(REPO_ROOT, "scripts", "harness");
  if (existsSync(wrapPath) && !flags.force) {
    actions.push({ path: "scripts/harness", how: "skip" });
  } else if (flags.dryRun) {
    actions.push({ path: "scripts/harness", how: "would" });
  } else {
    mkdirSync(dirname(wrapPath), { recursive: true });
    writeFileSync(wrapPath, wrapper, { mode: 0o755 });
    actions.push({ path: "scripts/harness", how: "create" });
  }

  // 5. git pre-commit hook → runs `harness lint` (the actual "강제" for lint gates)
  const gitDir = resolve(REPO_ROOT, ".git");
  if (existsSync(gitDir) && statSync(gitDir).isDirectory()) {
    const preCommit = resolve(gitDir, "hooks", "pre-commit");
    // route via the repo's own scripts/harness wrapper (single source of truth
    // for the engine location), resolved from the repo top-level at hook time.
    const body = `#!/usr/bin/env bash\n# installed by 'harness init' — block commits that fail harness lint gates\nexec bash "$(git rev-parse --show-toplevel)/scripts/harness" lint\n`;
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

  // 5b. hardcore: pre-push hook → full verify + error-queue drain
  if (flags.hardcore && existsSync(gitDir) && statSync(gitDir).isDirectory()) {
    const prePush = resolve(gitDir, "hooks", "pre-push");
    const body =
      `#!/usr/bin/env bash\n# installed by 'harness init --hardcore' — block pushes that fail verify / have open errors\nROOT="$(git rev-parse --show-toplevel)"\nbash "$ROOT/scripts/harness" verify || exit 1\nbash "$ROOT/scripts/harness" errors drain_check 1 || exit 1\n`;
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

  // 6. agent hooks
  if (flags.hooks) {
    const settingsPath = resolve(REPO_ROOT, ".claude", "settings.json");
    if (existsSync(settingsPath) && !flags.force) {
      actions.push({ path: ".claude/settings.json", how: "skip" });
      warn(".claude/settings.json exists — not merging automatically. Snippet below:");
    } else if (!flags.dryRun) {
      mkdirSync(dirname(settingsPath), { recursive: true });
      writeFileSync(settingsPath, hookSnippet(engineRel) + "\n", "utf8");
      actions.push({ path: ".claude/settings.json", how: "create" });
    } else {
      actions.push({ path: ".claude/settings.json", how: "would" });
    }
  }

  // report
  info(`harness init ${flags.hardcore ? "🥋 HARDCORE " : ""}${flags.dryRun ? "(dry-run) " : ""}— repo: ${REPO_ROOT}`);
  info(`  detected stack: ${stack.ids.length ? stack.ids.join(", ") : "none (generic — fill verify.checks manually)"}`);
  for (const a of actions) {
    const mark = a.how === "skip" ? "·" : a.how === "would" ? "?" : "✓";
    info(`  ${mark} ${a.how.padEnd(6)} ${a.path}`);
  }

  if (!flags.hooks) {
    info("");
    info("next: add these hooks to .claude/settings.json (or re-run with --hooks):");
    process.stdout.write(hookSnippet(engineRel) + "\n");
  }
  info("");
  ok("done. edit harness.config.json → verify.checks, lockdown.files, then `harness audit`.");
  return 0;
}
