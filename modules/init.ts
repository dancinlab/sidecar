// harness init [--force] [--hooks] [--dry-run]
// One-shot scaffold for a consuming repo:
//   • harness.config.json     (project name auto-detected from repo dir)
//   • .harness/{enforcement,keywords,severity-map}.json  (copied from bundled defaults)
//   • .gitignore              (append log/handoff ignores)
//   • scripts/harness         (thin wrapper)
//   • prints the .claude/settings.json hook snippet (or writes it with --hooks)
// Never overwrites existing files unless --force. With --dry-run, only reports.
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, basename, dirname } from "node:path";
import { REPO_ROOT, HARNESS_ROOT, HARNESS_CONFIG_DIR } from "../lib/paths.ts";
import { info, ok, warn } from "../lib/log.ts";

interface Flags {
  force: boolean;
  hooks: boolean;
  dryRun: boolean;
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
        ],
      },
    },
    null,
    2
  );
}

function starterConfig(project: string): string {
  return JSON.stringify(
    {
      project,
      lockdown: { files: [], fromMarkdown: "CLAUDE.md", onEditReminder: "L0 file edited — update CHANGELOG + issue tracker in the same change." },
      enforcementFile: ".harness/enforcement.json",
      keywordsFile: ".harness/keywords.json",
      severityMapFile: ".harness/severity-map.json",
      verify: { checks: [] },
      lint: { freshnessFiles: [] },
      guides: ["CLAUDE.md", "AGENTS.md", "README.md"],
      ledger: { staleSec: 3600 },
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
  };
  const actions: Action[] = [];
  const engineRel = enginePath();

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
  write(resolve(REPO_ROOT, "harness.config.json"), starterConfig(basename(REPO_ROOT)), "harness.config.json");

  // 2. .harness/*.json (copy bundled defaults so the repo can customize)
  for (const name of ["enforcement.json", "keywords.json", "severity-map.json"]) {
    const dst = resolve(REPO_ROOT, ".harness", name);
    const src = resolve(HARNESS_CONFIG_DIR, name);
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

  // 4. scripts/harness wrapper
  const wrapper = `#!/usr/bin/env bash\nexec bash "$(dirname "$0")/${relative(resolve(REPO_ROOT, "scripts"), HARNESS_ROOT)}/bin/harness" "$@"\n`;
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

  // 5. hooks
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
  info(`harness init ${flags.dryRun ? "(dry-run) " : ""}— repo: ${REPO_ROOT}`);
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
