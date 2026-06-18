// harness verdict {record <slug>/<id> <cmd...> | list | show <slug>/<id>}
// Verification-evidence ledger (hexa verify / g5 parity). `record` runs a verify
// command, captures its stdout+stderr verbatim to state/<slug>/<id>.txt with
// a tier header (PASS exit0 / FAIL else), and appends to a verdict ledger so you
// can track what's been verified and what passed. Verdict files are committable
// evidence; never LLM-judge correctness — the captured command output IS the proof.
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { REPO_ROOT, LOG_DIR } from "../lib/paths.ts";
import { execShell } from "../lib/exec.ts";
import { appendJsonl, info, ok, loudFail, nowIso } from "../lib/log.ts";
import { readJsonl } from "../lib/json.ts";

const LEDGER = resolve(LOG_DIR, "verdicts.jsonl");

function vpath(rel: string): string {
  return resolve(REPO_ROOT, "state", rel + ".txt");
}

// shell-quote a single argv token so spaces/quotes/operators survive when the
// argv is re-joined into a shell line (used only for `record … -- <argv>`).
function shq(t: string): string {
  return /^[A-Za-z0-9_@%+=:,.\/-]+$/.test(t) ? t : `'${t.replace(/'/g, "'\\''")}'`;
}

export async function runVerdict(args: string[]): Promise<number> {
  const sub = args[0] ?? "list";

  if (sub === "record") {
    const id = args[1];
    const rest = args.slice(2);
    // `record id -- prog arg "a b"` = ARGV mode: shell-quote each token so spaces
    // and quoting survive intact (fixes the silent flatten of quoted commands).
    // Without `--`, args are one shell line so `record id "a && b"` still runs
    // shell operators verbatim.
    const cmd = rest[0] === "--" ? rest.slice(1).map(shq).join(" ") : rest.join(" ");
    if (!id || !cmd) {
      info("usage: harness verdict record <slug>/<id> <verify-cmd...>");
      return 1;
    }
    const r = await execShell(cmd, { cwd: resolve(REPO_ROOT), timeoutMs: 600_000 });
    const tier = r.code === 0 && !r.killed ? "PASS" : "FAIL";
    const body =
      `# verdict ${id}\n# cmd: ${cmd}\n# tier: ${tier}  exit=${r.code}${r.killed ? " (timeout)" : ""}  at ${nowIso()}\n` +
      `# ── captured stdout+stderr (verbatim) ──\n${r.stdout}${r.stderr ? "\n[stderr]\n" + r.stderr : ""}\n`;
    const p = vpath(id);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, body, "utf8");
    appendJsonl(LEDGER, { kind: "verdict", id, tier, exit: r.code, cmd: cmd.slice(0, 200), file: `state/${id}.txt` });
    if (tier === "PASS") ok(`verdict ${id}: 🟢 PASS → state/${id}.txt`);
    else loudFail(`verdict ${id}: 🔴 FAIL (exit ${r.code}) → state/${id}.txt`);
    return tier === "PASS" ? 0 : 1;
  }

  if (sub === "show") {
    const id = args[1];
    const p = vpath(id ?? "");
    if (!id || !existsSync(p)) {
      info(`verdict: no record for ${id ?? "<id>"}`);
      return 1;
    }
    process.stdout.write(readFileSync(p, "utf8"));
    return 0;
  }

  // list — latest verdict per id
  const rows = readJsonl<{ id: string; tier: string; ts?: string; cmd?: string }>(LEDGER);
  if (!rows.length) {
    info("verdict: none recorded. `harness verdict record <slug>/<id> <cmd>`");
    return 0;
  }
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) latest.set(r.id, r);
  const items = [...latest.values()];
  const pass = items.filter((x) => x.tier === "PASS").length;
  info(`verdicts: ${pass}/${items.length} PASS`);
  for (const v of items) info(`  ${v.tier === "PASS" ? "🟢" : "🔴"} ${v.id}  (${v.ts ?? ""})`);
  return 0;
}
