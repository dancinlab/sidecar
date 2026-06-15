// harness lockdown {status|list|add <path...>|rm <path...>|check <path>}
// Manage the L0 (lockdown) file set — the files whose edits get flagged so the
// agent treats them deliberately. L0 is OPT-IN: empty until a repo explicitly
// designates files here. `add`/`rm` mutate harness.config.json's lockdown.files
// (repo-relative paths), preserving every other config key.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { config } from "../lib/config.ts";
import { l0Files } from "../lib/lockdown.ts";
import { info, ok, warn, loudFail } from "../lib/log.ts";

const err = (m: string) => loudFail(m);

const CONFIG_PATH = resolve(REPO_ROOT, "harness.config.json");

// Normalize a user-supplied path to a clean repo-relative form.
function toRepoRel(p: string): string {
  const abs = isAbsolute(p) ? p : resolve(REPO_ROOT, p);
  const rel = relative(REPO_ROOT, abs);
  return rel.startsWith("..") ? p : rel; // outside repo → keep as given
}

function readRawConfig(): Record<string, unknown> {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// Persist lockdown.files back to harness.config.json (2-space, trailing newline),
// keeping all sibling keys intact.
function writeFiles(files: string[]): void {
  const raw = readRawConfig();
  const lock = (raw.lockdown && typeof raw.lockdown === "object" ? raw.lockdown : {}) as Record<string, unknown>;
  lock.files = files;
  raw.lockdown = lock;
  writeFileSync(CONFIG_PATH, JSON.stringify(raw, null, 2) + "\n");
}

// Explicitly-designated files (config only) — distinct from l0Files(), which
// also folds in any 🔴 markdown block.
function configFiles(): string[] {
  return [...(config().lockdown.files ?? [])];
}

function printStatus(): void {
  const cfgFiles = configFiles();
  const all = l0Files();
  const md = config().lockdown.fromMarkdown;
  if (all.length === 0) {
    info("L0: none — 별도 지정 없음 (opt-in). 지정: harness lockdown add <path>");
    return;
  }
  info(`L0 (${all.length} file${all.length === 1 ? "" : "s"}):`);
  for (const f of all) {
    const src = cfgFiles.includes(f) ? "config" : `🔴 ${md ?? "markdown"}`;
    info(`  • ${f}  (${src})`);
  }
  if (md) info(`  (markdown scan: lockdown.fromMarkdown = ${md})`);
}

export async function runLockdown(args: string[]): Promise<number> {
  const sub = args[0] ?? "status";

  if (sub === "status" || sub === "list") {
    printStatus();
    return 0;
  }

  if (sub === "check") {
    const target = args[1];
    if (!target) {
      err("usage: harness lockdown check <path>");
      return 2;
    }
    const rel = toRepoRel(target);
    const hit = l0Files().some((p) => rel === p || rel.endsWith("/" + p));
    if (hit) {
      warn(`L0: ${rel} — 잠금 파일 (편집 시 경고)`);
      return 0;
    }
    ok(`not L0: ${rel} — 자유 편집`);
    return 0;
  }

  if (sub === "add") {
    const targets = args.slice(1).map(toRepoRel).filter(Boolean);
    if (targets.length === 0) {
      err("usage: harness lockdown add <path...>");
      return 2;
    }
    const cur = configFiles();
    const added: string[] = [];
    for (const t of targets) {
      if (!existsSync(resolve(REPO_ROOT, t))) warn(`경로 없음 (그래도 지정): ${t}`);
      if (!cur.includes(t)) {
        cur.push(t);
        added.push(t);
      }
    }
    if (added.length === 0) {
      info("이미 모두 L0 — 변경 없음");
      return 0;
    }
    writeFiles(cur);
    ok(`L0 지정: ${added.join(", ")}`);
    info(`  → harness.config.json lockdown.files (총 ${cur.length})`);
    return 0;
  }

  if (sub === "rm" || sub === "remove" || sub === "release") {
    const targets = args.slice(1).map(toRepoRel);
    if (targets.length === 0) {
      err("usage: harness lockdown rm <path...>");
      return 2;
    }
    const cur = configFiles();
    const next = cur.filter((f) => !targets.includes(f));
    const removed = cur.filter((f) => targets.includes(f));
    if (removed.length === 0) {
      const md = config().lockdown.fromMarkdown;
      info(`config 에 없음 — 변경 없음${md ? ` (🔴 ${md} 블록 유래면 거기서 제거)` : ""}`);
      return 0;
    }
    writeFiles(next);
    ok(`L0 해제: ${removed.join(", ")}`);
    info(`  → harness.config.json lockdown.files (총 ${next.length})`);
    return 0;
  }

  err(`unknown subcommand: ${sub}`);
  info("usage: harness lockdown {status|list|add <path...>|rm <path...>|check <path>}");
  return 2;
}
