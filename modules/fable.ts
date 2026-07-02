// sidecar fable [flags] <prompt...> | --file <f> | -
//   Delegate ONE instruction to the Fable 5 model via headless `claude -p`.
//   Fable 5 (claude-fable-5) is Anthropic's Mythos-class tier above Opus — this
//   command lets any session (or the user, via /fable) hand a single directive
//   to that model without switching the whole session backend (`sidecar switch`
//   stays untouched — this is per-CALL, not per-session).
//
//   The prompt is ALWAYS written to the child's stdin (the documented
//   `echo … | claude -p` path), never placed on claude's argv — so shell
//   quoting, argv length limits, and history leakage are non-issues.
//   stdout/stderr are inherited: a long generation streams live instead of
//   looking frozen behind a capture buffer.
//
//     sidecar fable "이 diff 요약해줘"            # argv words → one prompt
//     sidecar fable --file notes.md               # prompt from a file
//     git diff | sidecar fable -                  # prompt from stdin
//     sidecar fable --json "…"                    # --output-format json
//     sidecar fable --dry "…"                     # print resolved argv, no run
//     sidecar fable "…" -- --allowedTools Bash    # after --, verbatim to claude
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { info, warn, ok } from "../lib/log.ts";

const DEFAULT_MODEL = "claude-fable-5";
// Setting sources the child `claude -p` loads (user = global ~/.claude, project
// = repo .claude, local = repo .claude/*.local). DEFAULT DROPS `user`: the
// host-wide governance Stop-hooks live there, and a headless child that hits a
// BLOCKING Stop-hook (architecture/convergence stop-check when the cwd repo has
// uncommitted changes) loops forever → --timeout kills it at exit 124, AFTER the
// answer was already produced (observed: --cwd anima → 124 stall + boilerplate-
// polluted .result). Keychain auth is NOT a setting source, so dropping `user`
// keeps the child logged in; `project,local` still gives it repo CLAUDE.md.
// `--sources user,project,local` opts back into full inheritance.
const DEFAULT_SOURCES = "project,local";
const VALID_SOURCES = new Set(["user", "project", "local"]);
// NO default timeout — a run is UNLIMITED unless `--timeout <s>` is passed. The
// original stall (a headless child inheriting the global governance Stop-hooks and
// looping forever) is now fixed at the source by the default `--sources project,
// local`, so an auto-cap would only risk killing a legitimately long generation.
// `--timeout <s>` stays available as an opt-in reaper for a run you want bounded.

const USAGE = `usage: sidecar fable [flags] <prompt...> | --file <f> | -
  -m, --model <id>     model to run (default ${DEFAULT_MODEL})
  -f, --file <path>    read the prompt from a file
  -                    read the prompt from stdin (pipe-friendly)
      --json           machine output (claude --output-format json)
      --dry            print the resolved claude argv + prompt size, do not run
      --cwd <dir>      working directory for the claude run (default: current)
      --sources <l>    claude setting sources to load, comma-joined subset of
                       user,project,local (default ${DEFAULT_SOURCES} — DROPS the
                       global governance hooks that stall a headless child; pass
                       user,project,local to inherit the full session environment)
      --timeout <s>    OPT-IN cap: kill the run after <s> seconds (exit 124).
                       Default is UNLIMITED (no cap) — pass this only for a run
                       you want bounded
  -c, --continue       continue the most recent conversation in --cwd (stateful)
  -r, --resume <id>    resume a specific session by id (the session_id from a
                       prior --json run) — SAME --cwd as that run
      --bg             fire-and-forget: launch DETACHED, print a job id + poll
                       command, return immediately (no blocking wait) — collect
                       with \`sidecar fable result <id>\` / \`wait <id>\`
      -- <flags...>    everything after -- is passed to claude verbatim
prompt sources are exclusive: argv words | --file | - (stdin).
continuity: fable is stateless per-call UNLESS -c/--continue or -r/--resume is
given; capture session_id from a --json run to resume it later (same --cwd).
async jobs (no polling by hand):
  sidecar fable --bg …              launch a background job → prints <id>
  sidecar fable result <id>         print output if DONE, else RUNNING (exit 3)
  sidecar fable wait <id> [--timeout s]   block until DONE, then print output
  sidecar fable list                list background jobs + status`;

interface FableOpts {
  model: string;
  file: string | null;
  stdin: boolean;
  json: boolean;
  dry: boolean;
  bg: boolean;
  cwd: string | null;
  sources: string;
  cont: boolean;
  resume: string | null;
  timeoutSec: number | null;
  words: string[];
  extra: string[];
}

function parseArgs(args: string[]): FableOpts | null {
  const o: FableOpts = { model: DEFAULT_MODEL, file: null, stdin: false, json: false, dry: false, bg: false, cwd: null, sources: DEFAULT_SOURCES, cont: false, resume: null, timeoutSec: null, words: [], extra: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--") {
      o.extra = args.slice(i + 1);
      break;
    } else if (a === "-m" || a === "--model") {
      const v = args[++i];
      if (!v) return null;
      o.model = v;
    } else if (a === "-f" || a === "--file") {
      const v = args[++i];
      if (!v) return null;
      o.file = v;
    } else if (a === "--cwd") {
      const v = args[++i];
      if (!v) return null;
      o.cwd = v;
    } else if (a === "--sources") {
      const v = args[++i];
      if (!v) return null;
      const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length === 0 || !parts.every((p) => VALID_SOURCES.has(p))) return null;
      o.sources = parts.join(",");
    } else if (a === "-c" || a === "--continue") {
      o.cont = true;
    } else if (a === "-r" || a === "--resume") {
      const v = args[++i];
      if (!v) return null;
      o.resume = v;
    } else if (a === "--timeout") {
      const v = Number(args[++i]);
      if (!Number.isFinite(v) || v < 0) return null; // 0 = unlimited (allowed)
      o.timeoutSec = v;
    } else if (a === "--bg") {
      o.bg = true;
    } else if (a === "-") {
      o.stdin = true;
    } else if (a === "--json") {
      o.json = true;
    } else if (a === "--dry") {
      o.dry = true;
    } else if (a.startsWith("-") && a !== "-") {
      // An unrecognized flag — REJECT it loudly instead of swallowing it as a
      // prompt word (which silently corrupts the prompt or trips the
      // exclusive-sources check). A frequent trip-up: claude's own flag name
      // `--setting-sources` vs fable's `--sources`; flags meant for claude go
      // AFTER `--`.
      warn(`fable: unknown flag '${a}'. Known: -m/--model · -f/--file · - (stdin) · --json · --dry · --cwd · --sources · --timeout · -c/--continue · -r/--resume. Pass claude's own flags AFTER '--'.`);
      return null;
    } else {
      o.words.push(a);
    }
  }
  return o;
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c: string) => (buf += c));
    process.stdin.on("end", () => resolve(buf));
  });
}

async function resolvePrompt(o: FableOpts): Promise<string | null> {
  const sources = [o.words.length > 0, o.file !== null, o.stdin].filter(Boolean).length;
  if (sources !== 1) {
    warn(sources === 0 ? "fable: no prompt — pass words, --file <f>, or - (stdin)." : "fable: prompt sources are exclusive — pick ONE of argv words | --file | -.");
    return null;
  }
  if (o.file) {
    try {
      return readFileSync(o.file, "utf8");
    } catch (e) {
      warn(`fable: cannot read --file ${o.file}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }
  if (o.stdin) return readStdin();
  return o.words.join(" ");
}

// ── async background jobs ────────────────────────────────────────────────────
// --bg launches a DETACHED claude and returns immediately with a job id; the
// caller collects via `fable result <id>` / `wait <id>` instead of hand-rolling
// `sidecar fable … & ` + a `pgrep` poll loop (which also self-matches its own
// command line → false "RUNNING", the remote-poll-pgrep trap). Jobs live under
// ~/.sidecar/fable-jobs/<id>/ : prompt.txt · out · err · exitcode (present ⇒ done).
function jobsRoot(): string {
  return join(homedir(), ".sidecar", "fable-jobs");
}
function shq(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
// Effective cap: null flag → default 30 min; 0 → unlimited (null); else the value.
function effTimeoutSec(o: FableOpts): number | null {
  // unlimited by default; only an explicit positive --timeout caps the run.
  return o.timeoutSec && o.timeoutSec > 0 ? o.timeoutSec : null;
}
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// Launch a detached claude, prompt fed from a file (stdin redirect), out/err/exit
// captured to the job dir. Returns 0 after printing the handle — never waits.
function launchBg(claudeArgs: string[], prompt: string, o: FableOpts): number {
  const id = `fable-${Date.now().toString(36)}`;
  const dir = join(jobsRoot(), id);
  mkdirSync(dir, { recursive: true });
  const pf = join(dir, "prompt.txt");
  const outF = join(dir, "out");
  const errF = join(dir, "err");
  const exitF = join(dir, "exitcode");
  writeFileSync(pf, prompt);
  const cwd = o.cwd ?? process.cwd();
  const cap = effTimeoutSec(o);
  // Detached run: claude in the background inside the shell, plus a watchdog that
  // SIGKILLs it after `cap` seconds (exit 124), so a stalled bg job self-reaps
  // instead of lingering forever. exitcode file is written LAST → its existence is
  // the unambiguous done-signal.
  const core = `claude ${claudeArgs.map(shq).join(" ")} < ${shq(pf)} > ${shq(outF)} 2> ${shq(errF)}`;
  const sh = cap
    ? `cd ${shq(cwd)} && { ${core} & cpid=$!; ( sleep ${cap}; kill -9 $cpid 2>/dev/null; echo 124 > ${shq(exitF)} ) & wpid=$!; wait $cpid; ec=$?; kill $wpid 2>/dev/null; [ -f ${shq(exitF)} ] || echo $ec > ${shq(exitF)}; }`
    : `cd ${shq(cwd)} && ${core}; echo $? > ${shq(exitF)}`;
  const child = spawn("bash", ["-lc", sh], { detached: true, stdio: "ignore" });
  child.unref();
  writeFileSync(
    join(dir, "status.json"),
    JSON.stringify({ id, pid: child.pid, started: new Date().toISOString(), cwd, promptChars: prompt.length, json: o.json, timeoutSec: cap }),
  );
  ok(`fable: launched bg job ${id} (pid ${child.pid ?? "?"})`);
  info(`  collect → sidecar fable result ${id}   ·   block → sidecar fable wait ${id}`);
  return 0;
}

interface JobStatus {
  done: boolean;
  code: number | null;
  alive: boolean;
  started?: string;
  pid?: number;
}
function readJob(id: string): { dir: string; st: JobStatus } | null {
  const dir = join(jobsRoot(), id);
  if (!existsSync(dir)) return null;
  const exitF = join(dir, "exitcode");
  let meta: any = {};
  try {
    meta = JSON.parse(readFileSync(join(dir, "status.json"), "utf8"));
  } catch {
    /* status optional */
  }
  if (existsSync(exitF)) {
    const code = Number(readFileSync(exitF, "utf8").trim());
    return { dir, st: { done: true, code: Number.isFinite(code) ? code : 0, alive: false, started: meta.started, pid: meta.pid } };
  }
  const alive = typeof meta.pid === "number" && isAlive(meta.pid);
  return { dir, st: { done: false, code: null, alive, started: meta.started, pid: meta.pid } };
}

// Print a finished job's output (stdout), or its RUNNING/crashed status. Returns
// the child exit code when done, 3 when still RUNNING (pollable), 1 on no-such-job.
function jobResult(id: string): number {
  const j = readJob(id);
  if (!j) {
    warn(`fable: no job '${id}' (list: sidecar fable list)`);
    return 1;
  }
  if (!j.st.done) {
    if (j.st.alive) {
      info(`⏳ fable ${id}: RUNNING (pid ${j.st.pid}, since ${j.st.started ?? "?"}) — sidecar fable wait ${id}`);
      return 3;
    }
    warn(`⚠ fable ${id}: process gone but no exitcode — likely crashed. stderr:`);
    process.stderr.write(existsSync(join(j.dir, "err")) ? readFileSync(join(j.dir, "err"), "utf8") : "(none)\n");
    return 1;
  }
  process.stdout.write(existsSync(join(j.dir, "out")) ? readFileSync(join(j.dir, "out"), "utf8") : "");
  if (j.st.code !== 0) {
    warn(`fable ${id}: exit ${j.st.code}${j.st.code === 124 ? " (stalled)" : ""} — stderr:`);
    process.stderr.write(existsSync(join(j.dir, "err")) ? readFileSync(join(j.dir, "err"), "utf8") : "");
  }
  return j.st.code ?? 0;
}

async function jobWait(id: string, timeoutSec: number | null): Promise<number> {
  if (!readJob(id)) {
    warn(`fable: no job '${id}' (list: sidecar fable list)`);
    return 1;
  }
  const deadline = timeoutSec ? Date.now() + timeoutSec * 1000 : Infinity;
  for (;;) {
    const j = readJob(id);
    if (j?.st.done || (j && !j.st.alive)) return jobResult(id);
    if (Date.now() >= deadline) {
      warn(`fable wait ${id}: still RUNNING after ${timeoutSec}s — sidecar fable result ${id} later.`);
      return 3;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

function jobList(): number {
  const root = jobsRoot();
  if (!existsSync(root)) {
    info("fable: no background jobs.");
    return 0;
  }
  const ids = readdirSync(root).filter((d) => existsSync(join(root, d, "status.json")));
  if (!ids.length) {
    info("fable: no background jobs.");
    return 0;
  }
  info(`fable jobs (${ids.length}):`);
  for (const id of ids.sort()) {
    const j = readJob(id);
    if (!j) continue;
    const status = j.st.done ? (j.st.code === 0 ? "✅ done" : `🔴 exit ${j.st.code}`) : j.st.alive ? "⏳ running" : "⚠ crashed";
    info(`  ${id}  ${status}  (${j.st.started ?? "?"})`);
  }
  info("  collect: sidecar fable result <id>");
  return 0;
}

export async function runFable(args: string[]): Promise<number> {
  // job-management verbs (async collection) — checked before flag parsing.
  const verb = args[0];
  if (verb === "result") return jobResult(args[1] ?? "");
  if (verb === "list") return jobList();
  if (verb === "wait") {
    const id = args[1] ?? "";
    const ti = args.indexOf("--timeout");
    const t = ti >= 0 ? Number(args[ti + 1]) : null;
    return jobWait(id, Number.isFinite(t as number) && (t as number) > 0 ? (t as number) : null);
  }
  if (args.length === 0 || ["help", "-h", "--help"].includes(args[0])) {
    info(USAGE);
    return args.length === 0 ? 1 : 0;
  }
  const o = parseArgs(args);
  if (!o) {
    info(USAGE);
    return 1;
  }
  if (o.cont && o.resume !== null) {
    warn("fable: --continue and --resume are mutually exclusive — pick one (continue = most recent in --cwd; resume = a specific session_id).");
    return 1;
  }
  const prompt = await resolvePrompt(o);
  if (prompt === null) return 1;
  if (prompt.trim() === "") {
    // 0 bytes on '-' is almost always an eaten pipe, not an empty prompt: a
    // wrapper that backgrounds its child (naive `timeout` shims — POSIX sh
    // points a background job's stdin at /dev/null) swallows the stream.
    warn(o.stdin ? "fable: stdin delivered 0 bytes — if you wrapped this in a `timeout` shim, it may have eaten the pipe; use the native `--timeout <s>` flag instead." : "fable: prompt is empty.");
    return 1;
  }

  // --continue / --resume make the call STATEFUL: claude re-opens a prior
  // session (keyed to --cwd) and appends this prompt. session_id comes back in
  // the --json result of an earlier run. These sit before the `--` passthrough.
  const contArgs = o.cont ? ["--continue"] : o.resume !== null ? ["--resume", o.resume] : [];
  const claudeArgs = ["-p", "--model", o.model, "--setting-sources", o.sources, ...contArgs, ...(o.json ? ["--output-format", "json"] : []), ...o.extra];
  if (o.dry) {
    info(`fable --dry: claude ${claudeArgs.join(" ")}`);
    info(`  prompt: ${prompt.length} chars via child stdin${o.cwd ? ` · cwd=${o.cwd}` : ""} · timeout=${effTimeoutSec(o) === null ? "off" : effTimeoutSec(o) + "s"}${o.cont ? " · continue" : o.resume !== null ? ` · resume=${o.resume}` : ""}${o.bg ? " · bg" : ""}`);
    return 0;
  }

  // --bg: fire-and-forget. Detach + capture to a job dir, return a handle now.
  if (o.bg) return launchBg(claudeArgs, prompt, o);

  // Prompt goes through the child's stdin; the answer streams straight to ours.
  return new Promise<number>((resolve) => {
    const child = spawn("claude", claudeArgs, {
      cwd: o.cwd ?? process.cwd(),
      stdio: ["pipe", "inherit", "inherit"],
    });
    // No cap by default (unlimited) — only an explicit --timeout <s> reaps the run
    // at that many seconds (exit 124), for a run you want bounded.
    const cap = effTimeoutSec(o);
    let timedOut = false;
    const timer = cap
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, cap * 1000)
      : null;
    const settle = (code: number) => {
      if (timer) clearTimeout(timer);
      resolve(code);
    };
    child.on("error", (e: NodeJS.ErrnoException) => {
      warn(e.code === "ENOENT" ? "fable: `claude` CLI not found on PATH — install Claude Code first." : `fable: claude spawn failed: ${e.message}`);
      settle(127);
    });
    child.on("close", (code) => {
      if (timedOut) {
        warn(`fable: killed after ${cap}s timeout (headless stall). Causes: auth wait (\`claude /login\`), or a BLOCKING inherited Stop-hook looping the child — default --sources ${DEFAULT_SOURCES} already drops the global governance hooks, so this repeats only if you passed --sources user,… into a repo with uncommitted changes. Raise with --timeout <s> or disable with --timeout 0.`);
        settle(124);
        return;
      }
      settle(code ?? 1);
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}
