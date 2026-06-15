// harness ci [all|fast|list]   (was `verify` — renamed; `verify` is now the
// sidecar-style tier-rubric claim verifier. Config key stays `verify.checks`.)
// Run the project's verification checks (from harness.config.json) in parallel.
// `fast` skips checks marked slow:true. Any failure → exit 1 (mandatory-pass).
import { LOGS } from "../lib/paths.ts";
import { appendJsonl, info, loudFail, ok } from "../lib/log.ts";
import { execShell, tail } from "../lib/exec.ts";
import { config, repoPath } from "../lib/config.ts";
import type { VerifyCheck } from "../lib/config.ts";

export async function runCi(args: string[]): Promise<number> {
  const mode = args[0] ?? "all";
  const checks: VerifyCheck[] = config().verify.checks ?? [];

  if (mode === "list") {
    if (!checks.length) info("no verify checks configured (harness.config.json → verify.checks)");
    for (const c of checks) info(`  ${c.id}${c.slow ? " (slow)" : ""}: ${c.cmd}`);
    return 0;
  }
  if (!checks.length) {
    info("no verify checks configured — nothing to run");
    return 0;
  }

  const fast = mode === "fast" || args.includes("--no-build");
  const run = fast ? checks.filter((c) => !c.slow) : checks;
  const t0 = Date.now();

  const results = await Promise.all(
    run.map(async (c) => {
      const r = await execShell(c.cmd, { cwd: repoPath("."), timeoutMs: c.timeoutMs ?? 240_000 });
      return { id: c.id, ok: r.code === 0 && !r.killed, code: r.code, killed: r.killed, ms: r.ms, out: tail(r.stdout + "\n" + r.stderr, 6) };
    })
  );

  const failed = results.filter((r) => !r.ok);
  appendJsonl(LOGS.observations, {
    kind: "ci",
    mode,
    total: results.length,
    failed: failed.length,
    elapsed_ms: Date.now() - t0,
    items: results.map((r) => ({ id: r.id, ok: r.ok, code: r.code, ms: r.ms })),
  });

  if (failed.length === 0) {
    ok(`ci: ${results.length}/${results.length} passed (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    return 0;
  }
  loudFail(`ci: ${failed.length}/${results.length} failed`);
  for (const f of failed) {
    info(`  ✗ ${f.id} (code=${f.code}${f.killed ? " timeout" : ""})`);
    info(f.out.split("\n").map((l) => `      ${l}`).join("\n"));
  }
  return 1;
}
