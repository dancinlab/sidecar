// harness uninstall [--dry-run] [--force] [--keep-logs]
// Reverse of `init`: remove what the harness INJECTED into the repo. Never
// touches user content (ARCHITECTURE.md / CHANGELOG.md / CLAUDE.md / scripts/
// scratch / source). Git hooks + the scripts/harness wrapper are removed only
// when they carry the harness signature; .claude/settings.json is auto-removed
// only when ALL its hook commands are harness ones (else left + advised).
import { existsSync, readFileSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { info, ok, warn } from "../lib/log.ts";

interface Flags {
  dryRun: boolean;
  force: boolean;
  keepLogs: boolean;
}

type Act = { path: string; how: "remove" | "edit" | "keep" | "skip" | "would" };

function isHarnessWrapper(abs: string): boolean {
  try {
    return /bin\/harness/.test(readFileSync(abs, "utf8"));
  } catch {
    return false;
  }
}
function isHarnessHook(abs: string): boolean {
  try {
    const t = readFileSync(abs, "utf8");
    // primary signal = the signature comment init writes into every hook it installs
    return t.includes("installed by 'harness init") || /scripts\/harness"?\s+(lint|verify|errors)/.test(t);
  } catch {
    return false;
  }
}

export async function runUninstall(args: string[]): Promise<number> {
  const flags: Flags = {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    keepLogs: args.includes("--keep-logs"),
  };
  const acts: Act[] = [];

  const rm = (rel: string, label = rel) => {
    const abs = resolve(REPO_ROOT, rel);
    if (!existsSync(abs)) {
      acts.push({ path: label, how: "skip" });
      return;
    }
    if (flags.dryRun) {
      acts.push({ path: label, how: "would" });
      return;
    }
    rmSync(abs, { recursive: true, force: true });
    acts.push({ path: label, how: "remove" });
  };

  // 1. .harness/ — rules, prefs, recommend-default, logs, handoff (all ours)
  if (flags.keepLogs && existsSync(resolve(REPO_ROOT, ".harness"))) {
    // remove everything under .harness except logs/ + handoff/
    for (const name of readdirSync(resolve(REPO_ROOT, ".harness"))) {
      if (name === "logs" || name === "handoff") {
        acts.push({ path: `.harness/${name}`, how: "keep" });
        continue;
      }
      rm(`.harness/${name}`, `.harness/${name}`);
    }
  } else {
    rm(".harness", ".harness/ (rules·prefs·logs·handoff)");
  }

  // 2. harness.config.json
  rm("harness.config.json");

  // 3. scripts/harness wrapper (only if it's ours)
  {
    const abs = resolve(REPO_ROOT, "scripts", "harness");
    if (existsSync(abs) && isHarnessWrapper(abs)) rm("scripts/harness");
    else if (existsSync(abs)) acts.push({ path: "scripts/harness", how: "keep" });
  }

  // 4. git hooks installed by harness (signature-gated)
  for (const hook of ["pre-commit", "pre-push"]) {
    const abs = resolve(REPO_ROOT, ".git", "hooks", hook);
    if (existsSync(abs) && isHarnessHook(abs)) rm(`.git/hooks/${hook}`);
    else if (existsSync(abs)) acts.push({ path: `.git/hooks/${hook}`, how: "keep" });
  }

  // 5. .gitignore — drop exactly the lines `init` appends (keep in sync with init.ts needLines)
  {
    const abs = resolve(REPO_ROOT, ".gitignore");
    if (existsSync(abs)) {
      const drop = new Set([".harness/logs/", "ING.jsonl", "ING.jsonl.bak", "ING.jsonl.tmp.*"]);
      const orig = readFileSync(abs, "utf8");
      const kept = orig.split("\n").filter((l) => !drop.has(l.trim()));
      if (kept.join("\n") !== orig) {
        if (flags.dryRun) acts.push({ path: ".gitignore (−n)", how: "would" });
        else {
          writeFileSync(abs, kept.join("\n"), "utf8");
          acts.push({ path: ".gitignore", how: "edit" });
        }
      }
    }
  }

  // 6. .claude/settings.json — remove only if EVERY hook command is harness
  {
    const abs = resolve(REPO_ROOT, ".claude", "settings.json");
    if (existsSync(abs)) {
      let allHarness = false;
      try {
        const j = JSON.parse(readFileSync(abs, "utf8"));
        const cmds: string[] = [];
        for (const ev of Object.values(j.hooks ?? {})) {
          for (const g of ev as Array<{ hooks?: Array<{ command?: string }> }>) {
            for (const h of g.hooks ?? []) if (h.command) cmds.push(h.command);
          }
        }
        allHarness = cmds.length > 0 && cmds.every((c) => /\bharness\b/.test(c));
      } catch {
        allHarness = false;
      }
      if (allHarness) rm(".claude/settings.json");
      else acts.push({ path: ".claude/settings.json", how: "keep" });
    }
  }

  // report
  info(`harness uninstall ${flags.dryRun ? "(dry-run) " : ""}— repo: ${REPO_ROOT}`);
  for (const a of acts) {
    const mark = a.how === "remove" || a.how === "edit" ? "✓" : a.how === "would" ? "?" : "·";
    info(`  ${mark} ${a.how.padEnd(6)} ${a.path}`);
  }
  const kept = acts.filter((a) => a.how === "keep");
  if (kept.some((a) => a.path.includes("settings.json"))) {
    warn(".claude/settings.json kept (has non-harness hooks) — remove harness pre/post/prompt/prefs/easy/recommend lines manually if desired.");
  }
  info("");
  info("preserved (user content, never removed): ARCHITECTURE.md · CHANGELOG.md · CLAUDE.md · scripts/scratch/ · source.");
  info("the engine itself (submodule/vendor dir) is untouched — remove it with your package/submodule tool if desired.");
  if (!flags.dryRun) ok("uninstall done.");
  return 0;
}
