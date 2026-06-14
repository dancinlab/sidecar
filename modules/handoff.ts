// harness handoff [reason]
// Snapshot the working state (git status/log + recent mistakes/errors) into a
// timestamped markdown file so a fresh session/agent can pick up the thread.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { HANDOFF_DIR, LOGS } from "../lib/paths.ts";
import { appendJsonl, info } from "../lib/log.ts";
import { execShell } from "../lib/exec.ts";
import { readJsonl } from "../lib/json.ts";
import { config, repoPath } from "../lib/config.ts";

function fmtRows(rows: Record<string, unknown>[], pick: string[]): string {
  if (!rows.length) return "_(none)_";
  return rows
    .slice(-10)
    .map((r) => "- " + pick.map((k) => `${k}=${JSON.stringify(r[k])}`).join(" "))
    .join("\n");
}

export async function runHandoff(args: string[]): Promise<number> {
  const reason = args.join(" ").trim() || "manual";
  const cwd = repoPath(".");
  const status = (await execShell("git status -s", { cwd })).stdout.trim();
  const log = (await execShell("git log --oneline -8", { cwd })).stdout.trim();

  const mistakes = readJsonl(LOGS.mistakes, 10);
  const errors = readJsonl(LOGS.errors, 10);

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const md = `# handoff — ${config().project} — ${reason}

_generated ${new Date().toISOString()}_

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
  appendJsonl(LOGS.observations, { kind: "handoff_write", reason, path });
  info(`handoff → ${path}`);
  return 0;
}
