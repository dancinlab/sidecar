// harness sync {run|diff}
// Thin wrapper to run a repo's own shared-file sync script (if configured).
// Generic: it just executes the configured shell script and logs the outcome.
import { LOGS } from "../lib/paths.ts";
import { appendJsonl, info, loudFail } from "../lib/log.ts";
import { execShell } from "../lib/exec.ts";
import { config, repoPath } from "../lib/config.ts";
import { existsSync } from "node:fs";

export async function runSync(args: string[]): Promise<number> {
  const script = config().sync?.script;
  if (!script) {
    info("sync: no script configured (harness.config.json → sync.script)");
    return 0;
  }
  const abs = repoPath(script);
  if (!existsSync(abs)) {
    loudFail(`sync: script not found: ${script}`);
    return 1;
  }
  const sub = args[0] ?? "run";
  if (sub === "diff") {
    const r = await execShell(`git diff --stat`, { cwd: repoPath(".") });
    process.stdout.write(r.stdout);
    return r.code;
  }
  const r = await execShell(`bash ${JSON.stringify(abs)}`, { cwd: repoPath(".") });
  appendJsonl(LOGS.observations, { kind: "sync_run", code: r.code, ms: r.ms });
  if (r.code !== 0) {
    loudFail(`sync failed (code=${r.code})`);
    process.stderr.write(r.stderr);
    return r.code;
  }
  info("sync: ok");
  return 0;
}
