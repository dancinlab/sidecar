// harness handoff {add <text> [--to <repo>] | ls | done <id> | inject | snapshot [reason]}
// Cross-session / cross-repo handoff queue (sidecar handoff parity, but stored
// PER-PROJECT at the repo ROOT in `handoff.jsonl` — committed to git so it is
// preserved on GitHub and travels with the repo, NOT a single host-global file
// and NOT scattered HANDOFF.md / inbox/*.md markdown (see handoff-guard).
//
// handoff.jsonl holds ONLY OPEN items: `done <id>` SCRUBS the entry (rewrites the
// file without it) rather than marking it done — the file is a live open-work
// list. SessionStart `inject` surfaces open items so a handoff is never forgotten.
//
// `snapshot` keeps the old behavior: a one-off session-state dossier under
// .harness/handoff/ (git status/log + recent mistakes/errors) for a fresh agent.
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { HANDOFF_DIR, LOGS, REPO_ROOT } from "../lib/paths.ts";
import { appendJsonl, info, ok, warn, nowIso } from "../lib/log.ts";
import { readStdin, execShell } from "../lib/exec.ts";
import { readJsonl } from "../lib/json.ts";
import { config, repoPath } from "../lib/config.ts";

interface Handoff {
  id: string;
  ts: string;
  from: string;
  to: string;
  text: string;
}

function registryPath(): string {
  return resolve(REPO_ROOT, "handoff.jsonl");
}

function readItems(): Handoff[] {
  return readJsonl<Handoff>(registryPath()).filter((h) => h && h.id && h.text);
}

// rewrite the live list (used by scrub) — empty file is removed to keep the repo clean
function writeItems(items: Handoff[]): void {
  const p = registryPath();
  if (!items.length) {
    if (existsSync(p)) rmSync(p);
    return;
  }
  writeFileSync(p, items.map((h) => JSON.stringify(h)).join("\n") + "\n", "utf8");
}

async function currentRepo(): Promise<string> {
  const url = (await execShell("git remote get-url origin 2>/dev/null", { cwd: repoPath(".") })).stdout.trim();
  if (url) return url.replace(/\.git$/, "").split("/").pop() || config().project;
  return config().project;
}

function nextId(items: Handoff[]): string {
  const max = items.reduce((m, h) => Math.max(m, parseInt(h.id, 10) || 0), 0);
  return String(max + 1);
}

export async function runHandoff(args: string[]): Promise<number> {
  const sub = args[0] ?? "ls";

  if (sub === "add") {
    const toIdx = args.indexOf("--to");
    let to = "";
    let rest = args.slice(1);
    if (toIdx >= 0) {
      to = args[toIdx + 1] ?? "";
      rest = rest.filter((_, i) => args.slice(1)[i] !== "--to" && args.slice(1)[i] !== to);
    }
    const text = rest.filter((a) => a !== "--to" && a !== to).join(" ").trim();
    if (!text) {
      info('usage: harness handoff add <text...> [--to <repo>]');
      return 1;
    }
    const items = readItems();
    const id = nextId(items);
    const rec: Handoff = { id, ts: nowIso(), from: await currentRepo(), to: to || (await currentRepo()), text };
    appendJsonl(registryPath(), rec);
    ok(`handoff +${id} → ${to || "this repo"} (handoff.jsonl · commit to persist)`);
    return 0;
  }

  if (sub === "done" || sub === "scrub") {
    const id = args[1];
    const items = readItems();
    const kept = items.filter((h) => h.id !== id);
    if (!id || kept.length === items.length) {
      info(`handoff: id '${id ?? ""}' not found. open: ${items.map((h) => h.id).join(", ") || "none"}`);
      return 1;
    }
    writeItems(kept); // SCRUB — remove the entry, do not keep a done marker
    ok(`handoff -${id} scrubbed (${kept.length} open left · commit handoff.jsonl)`);
    return 0;
  }

  if (sub === "inject") {
    // SessionStart — surface open handoffs for this repo as additionalContext
    try {
      const j = JSON.parse(readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      const items = readItems();
      if (!items.length) return 0; // silent on a clean queue
      const lines = items.map((h) => `  • #${h.id}${h.to && h.to !== h.from ? ` →${h.to}` : ""}: ${h.text}`).join("\n");
      const ctx = `📥 open handoffs in handoff.jsonl (${items.length}) — 처리 후 \`harness handoff done <id>\` 로 scrub:\n${lines}`;
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: ev, additionalContext: ctx } }) + "\n");
    } catch {
      return 0;
    }
    return 0;
  }

  if (sub === "snapshot") {
    return snapshot(args.slice(1));
  }

  // ls (default)
  const items = readItems();
  if (!items.length) {
    info("handoff: no open items (handoff.jsonl). add: harness handoff add <text> [--to <repo>]");
    return 0;
  }
  info(`handoff: ${items.length} open (repo-root handoff.jsonl):`);
  for (const h of items) info(`  • #${h.id}${h.to && h.to !== h.from ? ` →${h.to}` : ""}  ${h.text}   (${h.ts})`);
  info("  done: harness handoff done <id> (scrubs the entry)");
  return 0;
}

// ── snapshot — one-off session-state dossier (legacy behavior) ────────────────
function fmtRows(rows: Record<string, unknown>[], pick: string[]): string {
  if (!rows.length) return "_(none)_";
  return rows.slice(-10).map((r) => "- " + pick.map((k) => `${k}=${JSON.stringify(r[k])}`).join(" ")).join("\n");
}

async function snapshot(args: string[]): Promise<number> {
  const reason = args.join(" ").trim() || "manual";
  const cwd = repoPath(".");
  const status = (await execShell("git status -s", { cwd })).stdout.trim();
  const log = (await execShell("git log --oneline -8", { cwd })).stdout.trim();
  const mistakes = readJsonl(LOGS.mistakes, 10);
  const errors = readJsonl(LOGS.errors, 10);
  const ts = nowIso().replace(/[:.]/g, "-");
  const md = `# handoff snapshot — ${config().project} — ${reason}

_generated ${nowIso()}_

## git status
\`\`\`
${status || "(clean)"}
\`\`\`

## recent commits
\`\`\`
${log}
\`\`\`

## recent mistakes
${fmtRows(mistakes, ["kind", "rule_id", "exit"])}

## open-ish errors
${fmtRows(errors, ["severity", "code", "msg"])}

## next actions
- [ ] (fill in)
`;
  if (!existsSync(HANDOFF_DIR)) mkdirSync(HANDOFF_DIR, { recursive: true });
  const path = resolve(HANDOFF_DIR, `handoff-${ts}-${reason.replace(/[^a-z0-9]+/gi, "-")}.md`);
  writeFileSync(path, md, "utf8");
  writeFileSync(resolve(HANDOFF_DIR, "latest.md"), md, "utf8");
  appendJsonl(LOGS.observations, { kind: "handoff_snapshot", reason, path });
  info(`handoff snapshot → ${path}`);
  return 0;
}
