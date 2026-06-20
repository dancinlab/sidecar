// harness ci-track <pr|branch|url> [--watch] [--interval=N] [--timeout=M] [--merge-on-green] [-R owner/repo]
//
// Remote CI / PR-check tracker — the sanctioned replacement for hand-rolled
// `gh pr checks … | grep` polling and ad-hoc `/tmp/pr_mon.sh` watch loops (the
// exact pattern that recurs in long merge-on-green campaigns). Wraps
// `gh pr checks --json` into a clean aggregate + a terminal verdict, with an
// optional in-process `--watch` poll (so the agent does NOT write a bash sleep
// loop — c19) and an optional `--merge-on-green` auto-squash-merge.
//
// Verdict (from gh's own `bucket` classification):
//   any fail/cancel → 🔴 RED (exit 2) · any pending → 🟡 PENDING (exit 1)
//   all pass/skipping → 🟢 GREEN (exit 0) · no checks → ⚪ NONE (exit 0)
//
// @convergence state=ossified id=CI_TRACK_NATIVE value="PR CI status is tracked by `harness ci-track` (gh pr checks --json → aggregate + verdict + optional --watch/--merge-on-green), not by hand-rolled `gh pr checks|grep` + /tmp monitor sleep loops" threshold="merge-on-green campaigns repeatedly re-implemented CI polling inline (e.g. /tmp/pr3688_mon.sh) — no harness command tracked remote CI; this centralizes it (c19-compatible: the poll runs inside the CLI, not a bash sleep loop)"
import { execShell } from "../lib/exec.ts";
import { info, ok, warn, loudFail } from "../lib/log.ts";

type Bucket = "pass" | "fail" | "pending" | "skipping" | "cancel" | string;
interface Check {
  name: string;
  state: string;
  bucket: Bucket;
  workflow?: string;
}
interface Snapshot {
  checks: Check[];
  pass: number;
  fail: number;
  pending: number;
  other: number;
  verdict: "GREEN" | "RED" | "PENDING" | "NONE";
  exit: number;
}

function classify(checks: Check[]): Snapshot {
  let pass = 0,
    fail = 0,
    pending = 0,
    other = 0;
  for (const c of checks) {
    if (c.bucket === "fail" || c.bucket === "cancel") fail++;
    else if (c.bucket === "pending") pending++;
    else if (c.bucket === "pass") pass++;
    else other++; // skipping/neutral
  }
  let verdict: Snapshot["verdict"], exit: number;
  if (checks.length === 0) (verdict = "NONE"), (exit = 0);
  else if (fail > 0) (verdict = "RED"), (exit = 2);
  else if (pending > 0) (verdict = "PENDING"), (exit = 1);
  else (verdict = "GREEN"), (exit = 0);
  return { checks, pass, fail, pending, other, verdict, exit };
}

async function fetchSnapshot(ref: string, repoFlag: string): Promise<Snapshot | null> {
  const r = await execShell(`gh pr checks ${ref} ${repoFlag} --json name,state,bucket,workflow`, { timeoutMs: 60_000 });
  // gh exits non-zero with "no checks reported" when the PR has zero checks — treat as NONE, not error.
  if (r.code !== 0 && /no checks reported/i.test(r.stderr)) return classify([]);
  const raw = r.stdout.trim();
  if (!raw) {
    // non-JSON failure (bad PR ref, auth, etc.)
    if (r.code !== 0) {
      loudFail(`ci-track: gh pr checks failed — ${r.stderr.trim().slice(0, 160) || "no output"}`);
      return null;
    }
    return classify([]);
  }
  try {
    return classify(JSON.parse(raw) as Check[]);
  } catch {
    loudFail(`ci-track: could not parse gh output — ${raw.slice(0, 160)}`);
    return null;
  }
}

const ICON: Record<string, string> = { GREEN: "🟢", RED: "🔴", PENDING: "🟡", NONE: "⚪" };

function render(ref: string, s: Snapshot): void {
  const fails = s.checks.filter((c) => c.bucket === "fail" || c.bucket === "cancel").map((c) => c.name);
  const pend = s.checks.filter((c) => c.bucket === "pending").map((c) => c.name);
  info(
    `ci-track ${ref}: ${ICON[s.verdict]} ${s.verdict}  ·  pass=${s.pass} fail=${s.fail} pending=${s.pending}${s.other ? ` other=${s.other}` : ""} (${s.checks.length} checks)`
  );
  if (fails.length) warn(`  ✗ failing: ${fails.join(" · ")}`);
  if (pend.length) info(`  … pending: ${pend.slice(0, 8).join(" · ")}${pend.length > 8 ? ` (+${pend.length - 8})` : ""}`);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const numFlag = (args: string[], name: string, dflt: number): number => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  const v = a ? Number(a.split("=")[1]) : NaN;
  return Number.isFinite(v) && v > 0 ? v : dflt;
};

async function mergeOnGreen(ref: string, repoFlag: string): Promise<number> {
  info(`ci-track: GREEN → squash-merging ${ref} …`);
  const r = await execShell(`gh pr merge ${ref} ${repoFlag} --squash --admin --delete-branch`, { timeoutMs: 120_000 });
  if (r.code === 0) {
    ok(`ci-track: merged ${ref}`);
    return 0;
  }
  loudFail(`ci-track: merge failed — ${r.stderr.trim().slice(0, 160)}`);
  return 2;
}

export async function runCiTrack(args: string[]): Promise<number> {
  const positional = args.filter((a) => !a.startsWith("-"));
  const ref = positional[0];
  if (!ref) {
    info("usage: harness ci-track <pr#|branch|url> [--watch] [--interval=60] [--timeout=1800] [--merge-on-green] [-R owner/repo]");
    return 0;
  }
  const repoIdx = args.findIndex((a) => a === "-R" || a === "--repo");
  const repoFlag = repoIdx >= 0 && args[repoIdx + 1] ? `--repo ${args[repoIdx + 1]}` : "";
  const watch = args.includes("--watch");
  const mergeOnGreenFlag = args.includes("--merge-on-green");
  const interval = numFlag(args, "interval", 60) * 1000;
  const timeoutMs = numFlag(args, "timeout", 1800) * 1000;

  if (!watch) {
    const s = await fetchSnapshot(ref, repoFlag);
    if (!s) return 3;
    render(ref, s);
    if (mergeOnGreenFlag && s.verdict === "GREEN") return mergeOnGreen(ref, repoFlag);
    return s.exit;
  }

  // --watch: poll in-process until terminal (GREEN/RED/NONE) or timeout.
  const start = Date.now();
  let last = "";
  for (;;) {
    const s = await fetchSnapshot(ref, repoFlag);
    if (!s) return 3;
    const line = `${s.verdict} pass=${s.pass} fail=${s.fail} pending=${s.pending}`;
    if (line !== last) {
      render(ref, s);
      last = line;
    }
    if (s.verdict !== "PENDING") {
      if (mergeOnGreenFlag && s.verdict === "GREEN") return mergeOnGreen(ref, repoFlag);
      return s.exit;
    }
    if (Date.now() - start >= timeoutMs) {
      warn(`ci-track: still PENDING after ${Math.round(timeoutMs / 1000)}s — giving up (exit 1). Re-run or raise --timeout.`);
      return 1;
    }
    await sleep(interval);
  }
}
