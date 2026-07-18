// sidecar lab [fable|sol|full] [flags] <prompt...> | --file <f> | -
//   Model-delegation hub — hand ONE instruction to a frontier model without
//   switching the whole session backend (per-CALL, not per-session). Three
//   backends behind one shared flag surface / prompt resolver / bg-job system:
//     · fable = Anthropic Claude Fable 5 via headless `claude -p`
//     · sol   = OpenAI Codex 5.6      via `codex exec` (model gpt-5.6-sol)
//     · full  = BOTH in parallel — answers printed under labeled sections (DEFAULT)
//
//   The backend is OPTIONAL: omit it and the prompt goes to `full` (both models),
//   the answer worth having by default — one call, two independent takes, and the
//   caller reconciles. Naming a backend narrows it to that one.
//
//   The prompt is ALWAYS fed through the child's STDIN (never placed on argv), so
//   shell quoting, argv length limits, and history leakage are non-issues.
//   stdout/stderr are inherited: a long generation streams live instead of
//   looking frozen behind a capture buffer.
//
//     sidecar lab "설계안 검토"                 # no backend → BOTH (default full)
//     sidecar lab fable "이 diff 요약해줘"      # argv words → one prompt
//     sidecar lab sol --file notes.md           # prompt from a file → Codex 5.6
//     git diff | sidecar lab fable -            # prompt from stdin
//     sidecar lab sol --json "…"                # machine-clean answer on stdout
//     sidecar lab fable --dry "…"               # print resolved argv, no run
//     sidecar lab sol "…" -- --add-dir /tmp     # after --, verbatim to codex
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, openSync, writeSync, closeSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { info, warn, ok } from "../lib/log.ts";

// Setting sources the child `claude -p` loads (fable backend only). DEFAULT DROPS
// `user`: the host-wide governance Stop-hooks live there, and a headless child
// that hits a BLOCKING Stop-hook loops forever → --timeout kills it at exit 124
// AFTER the answer was produced. Keychain auth is NOT a setting source, so
// dropping `user` keeps the child logged in; `project,local` still gives it repo
// CLAUDE.md. `--sources user,project,local` opts back into full inheritance.
const DEFAULT_SOURCES = "project,local";
const VALID_SOURCES = new Set(["user", "project", "local"]);

type BackendName = "fable" | "sol";

interface LabOpts {
  backend: BackendName | "full";
  model: string | null; // null → backend.defaultModel
  file: string | null;
  stdin: boolean;
  json: boolean;
  dry: boolean;
  bg: boolean;
  cwd: string | null;
  sources: string; // fable-only
  cont: boolean;
  resume: string | null;
  timeoutSec: number | null;
  write: boolean;
  words: string[];
  extra: string[];
}

// Opus fallback is FORBIDDEN unconditionally for the fable backend (not an opt-in
// flag). fable ALWAYS launches the child with an availableModels allowlist that
// permits the chosen model + the small background/aux tiers but NOT Opus. With
// Opus outside the allowlist, Fable 5's content-based safety-classifier fallback
// ("re-run the flagged request on the default Opus model") has no permitted
// target, so — per the model-config docs — "no fallback occurs; the refusal is
// shown as a normal error and the session's model is unchanged." A flagged
// request refuses on the delegated model instead of silently becoming Opus.
function noFallbackSettings(model: string): string {
  const allow = [...new Set([model, "sonnet", "haiku"])];
  return JSON.stringify({ availableModels: allow });
}

interface Backend {
  name: BackendName;
  bin: string;
  defaultModel: string;
  // flags set in o that this backend cannot honor → rejected loudly in runLab
  naFlags(o: LabOpts): string[];
  // full argv after `bin`. The prompt is NEVER on argv — always via child stdin.
  // captureFile != null ⇒ route the CLEAN final answer there (sol: codex -o;
  // fable: ignores it — its --json blob already IS clean stdout).
  buildArgv(o: LabOpts, captureFile: string | null): string[];
}

const FABLE: Backend = {
  name: "fable",
  bin: "claude",
  defaultModel: "claude-fable-5",
  naFlags: () => [],
  buildArgv(o) {
    const model = o.model ?? this.defaultModel;
    // --continue / --resume make the call STATEFUL (claude re-opens a prior
    // session keyed to --cwd and appends this prompt).
    const cont = o.cont ? ["--continue"] : o.resume !== null ? ["--resume", o.resume] : [];
    // Two permission tiers, both under bypassPermissions (headless has no one to
    // answer approval prompts, so plain `default` mode auto-DENIES every tool incl.
    // Bash — which leaves a delegated analysis child BLIND). DEFAULT (investigate)
    // disallows the file-WRITE tools; --write drops the disallow (full agent).
    const write = o.write
      ? ["--permission-mode", "bypassPermissions"]
      : ["--permission-mode", "bypassPermissions", "--disallowedTools", "Write", "Edit", "NotebookEdit"];
    return ["-p", "--model", model, "--setting-sources", o.sources, "--settings", noFallbackSettings(model), ...write, ...cont, ...(o.json ? ["--output-format", "json"] : []), ...o.extra];
  },
};

const SOL: Backend = {
  name: "sol",
  bin: "codex",
  defaultModel: "gpt-5.6-sol",
  // --sources is claude-only; reject when set to a non-default value on sol.
  naFlags: (o) => (o.sources !== DEFAULT_SOURCES ? ["--sources"] : []),
  buildArgv(o, captureFile) {
    const resume = o.cont || o.resume !== null;
    // Two sandbox tiers mirror fable's investigate/implement split: read-only vs
    // workspace-write (NOT danger-full-access — --write means "edit/build in the
    // workspace", the semantic twin of fable's bypass, not "sandbox off"). We set
    // the tier EXPLICITLY every run so the config.toml danger default never leaks
    // in. `codex exec` takes the canonical `-s <mode>`; `exec resume` has NO `-s`
    // selector, so there we use the equivalent `-c sandbox_mode="<mode>"` override
    // (both accept -c). Verified against codex-cli 0.144.1 `exec resume --help`.
    const sandbox = o.write ? "workspace-write" : "read-only";
    const sandboxArgs = resume ? ["-c", `sandbox_mode="${sandbox}"`] : ["-s", sandbox];
    // -o writes ONLY the final agent message (clean answer) to captureFile; the raw
    // JSONL/stream stays on stdout. codex has no single-blob --json like claude, so
    // this is how sol delivers a machine-clean answer.
    const capture = captureFile ? ["-o", captureFile] : [];
    const opts = ["-m", o.model ?? this.defaultModel, "--skip-git-repo-check", ...sandboxArgs, ...capture, ...o.extra];
    // clap positional order: `exec resume [OPTIONS] [SESSION_ID] [PROMPT]`. `--last`
    // is an OPTION (no SESSION_ID); an explicit id is the SESSION_ID positional
    // BEFORE the `-` PROMPT positional. Plain `exec [OPTIONS] [PROMPT]`.
    if (o.cont) return ["exec", "resume", "--last", ...opts, "-"];
    if (o.resume !== null) return ["exec", "resume", ...opts, o.resume, "-"];
    return ["exec", ...opts, "-"];
  },
};

const BACKENDS: Record<BackendName, Backend> = { fable: FABLE, sol: SOL };

const USAGE = `usage: sidecar lab [fable|sol|full] [flags] <prompt...> | --file <f> | -
       sidecar lab {result|tail|wait|list} …            async job verbs

delegate ONE instruction to a frontier model (per-CALL — session backend untouched).
the backend is OPTIONAL — omit it and the prompt goes to \`full\` (BOTH models):
  full    BOTH in parallel — answers under ── fable ── / ── sol ── sections   (DEFAULT)
  fable   Claude Fable 5    headless \`claude -p\`  (default -m claude-fable-5 · opus fallback FORBIDDEN)
  sol     OpenAI Codex 5.6  \`codex exec\`          (default -m gpt-5.6-sol)

  -m, --model <id>     override the backend's default model
  -f, --file <path>    prompt from a file   ·   -   prompt from stdin (pipe)
      --json           machine-clean answer on stdout (fable: claude json blob w/ .result;
                       sol: final message text via codex -o)
      --dry            print resolved argv + prompt size, do not run
      --cwd <dir>      working directory for the run (default: current)
      --timeout <s>    OPT-IN cap: kill after <s>s (exit 124). default UNLIMITED
      --write          IMPLEMENT tier — fable: bypassPermissions, no disallow;
                       sol: -s workspace-write. DEFAULT is INVESTIGATE — fable:
                       Write/Edit/NotebookEdit denied (bash/read free); sol: -s read-only
      --bg             fire-and-forget: detached job → prints <id>, collect below
  -c, --continue       continue latest session (sol: codex exec resume --last)
  -r, --resume <id>    resume session <id>      (sol: codex exec resume <id>)
      --sources <l>    [fable only] claude setting sources (default ${DEFAULT_SOURCES} —
                       drops global governance hooks that stall a headless child)
      -- <flags...>    verbatim passthrough to the backend CLI (not with \`full\`)

every foreground run also tees its FULL output to ~/.sidecar/lab/<ts>-<backend>.md
(path printed on stderr) — a piped/tailed/backgrounded stdout can't lose the answer.

prompt sources are exclusive: argv words | --file | - (stdin).
full: -c/-r/-- rejected; --sources applies to the fable leg only.
jobs:  sidecar lab result <id>   print if DONE, RUNNING = exit 3
       sidecar lab tail <id>     follow output live until done
       sidecar lab wait <id> [--timeout s]   block until done, then print
       sidecar lab list          all jobs + status (~/.sidecar/lab-jobs)`;

function parseArgs(sub: BackendName | "full", args: string[]): LabOpts | null {
  const o: LabOpts = { backend: sub, model: null, file: null, stdin: false, json: false, dry: false, bg: false, cwd: null, sources: DEFAULT_SOURCES, cont: false, resume: null, timeoutSec: null, write: false, words: [], extra: [] };
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
    } else if (a === "--write" || a === "--bypass" || a === "--agent") {
      o.write = true;
    } else if (a === "-") {
      o.stdin = true;
    } else if (a === "--json") {
      o.json = true;
    } else if (a === "--dry") {
      o.dry = true;
    } else if (a.startsWith("-") && a !== "-") {
      // Unrecognized flag — REJECT loudly instead of swallowing it as a prompt word
      // (which silently corrupts the prompt or trips the exclusive-sources check).
      // Flags meant for the backend CLI go AFTER `--`.
      warn(`lab ${sub}: unknown flag '${a}'. Known: -m/--model · -f/--file · - (stdin) · --json · --dry · --cwd · --sources · --timeout · --write · --bg · -c/--continue · -r/--resume. Pass backend flags AFTER '--'.`);
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

async function resolvePrompt(o: LabOpts): Promise<string | null> {
  const sources = [o.words.length > 0, o.file !== null, o.stdin].filter(Boolean).length;
  if (sources !== 1) {
    warn(sources === 0 ? "lab: no prompt — pass words, --file <f>, or - (stdin)." : "lab: prompt sources are exclusive — pick ONE of argv words | --file | -.");
    return null;
  }
  if (o.file) {
    try {
      return readFileSync(o.file, "utf8");
    } catch (e) {
      warn(`lab: cannot read --file ${o.file}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }
  if (o.stdin) return readStdin();
  return o.words.join(" ");
}

// ── async background jobs ────────────────────────────────────────────────────
// --bg launches a DETACHED backend child and returns immediately with a job id;
// the caller collects via `lab result <id>` / `wait <id>` instead of hand-rolling
// a `&` + `pgrep` poll loop. Jobs live under ~/.sidecar/lab-jobs/<id>/ :
// prompt.txt · out · err · exitcode (present ⇒ done) · status.json · (sol) last.
function jobsRoot(): string {
  return join(homedir(), ".sidecar", "lab-jobs");
}
function shq(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
// unlimited by default; only an explicit positive --timeout caps the run.
function effTimeoutSec(o: LabOpts): number | null {
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

// Launch a detached backend child, prompt fed from a file (stdin redirect), out/
// err/exit captured to the job dir. Returns the job id after printing the handle —
// never waits. Job id = `<backend>-<ts36>` so the backend is readable in the id.
function launchBg(be: Backend, prompt: string, o: LabOpts): string {
  const id = `${be.name}-${Date.now().toString(36)}`;
  const dir = join(jobsRoot(), id);
  mkdirSync(dir, { recursive: true });
  const pf = join(dir, "prompt.txt");
  const outF = join(dir, "out");
  const errF = join(dir, "err");
  const exitF = join(dir, "exitcode");
  // sol always captures its clean final message to `last` (so `result` returns the
  // answer, not raw JSONL). fable's clean output already rides stdout → out.
  const captureF = be.name === "sol" ? join(dir, "last") : null;
  const argv = be.buildArgv(o, captureF);
  writeFileSync(pf, prompt);
  const cwd = o.cwd ?? process.cwd();
  const cap = effTimeoutSec(o);
  const core = `${be.bin} ${argv.map(shq).join(" ")} < ${shq(pf)} > ${shq(outF)} 2> ${shq(errF)}`;
  const sh = cap
    ? `cd ${shq(cwd)} && { ${core} & cpid=$!; ( sleep ${cap}; kill -9 $cpid 2>/dev/null; echo 124 > ${shq(exitF)} ) & wpid=$!; wait $cpid; ec=$?; kill $wpid 2>/dev/null; [ -f ${shq(exitF)} ] || echo $ec > ${shq(exitF)}; }`
    : `cd ${shq(cwd)} && ${core}; echo $? > ${shq(exitF)}`;
  const child = spawn("bash", ["-lc", sh], { detached: true, stdio: "ignore" });
  child.unref();
  writeFileSync(
    join(dir, "status.json"),
    JSON.stringify({ id, backend: be.name, bin: be.bin, pid: child.pid, started: new Date().toISOString(), cwd, promptChars: prompt.length, json: o.json, timeoutSec: cap }),
  );
  ok(`lab: launched bg job ${id} (pid ${child.pid ?? "?"})`);
  info(`  collect → sidecar lab result ${id}   ·   block → sidecar lab wait ${id}`);
  return id;
}

interface JobStatus {
  done: boolean;
  code: number | null;
  alive: boolean;
  started?: string;
  pid?: number;
  backend?: string;
}
function readJob(id: string): { dir: string; st: JobStatus } | null {
  if (!id) return null; // empty id would resolve join(root,"") === jobsRoot() and falsely pass existsSync
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
    return { dir, st: { done: true, code: Number.isFinite(code) ? code : 0, alive: false, started: meta.started, pid: meta.pid, backend: meta.backend } };
  }
  const alive = typeof meta.pid === "number" && isAlive(meta.pid);
  return { dir, st: { done: false, code: null, alive, started: meta.started, pid: meta.pid, backend: meta.backend } };
}

// A finished sol job's CLEAN answer is in `last`; everything else is `out`.
function jobOutFile(dir: string): string {
  const last = join(dir, "last");
  return existsSync(last) ? last : join(dir, "out");
}

// Print a finished job's output, or its RUNNING/crashed status. Returns the child
// exit code when done, 3 when still RUNNING (pollable), 1 on no-such-job.
function jobResult(id: string): number {
  const j = readJob(id);
  if (!j) {
    warn(`lab: no job '${id}' (list: sidecar lab list)`);
    return 1;
  }
  if (!j.st.done) {
    if (j.st.alive) {
      info(`⏳ lab ${id}: RUNNING (pid ${j.st.pid}, since ${j.st.started ?? "?"}) — sidecar lab wait ${id}`);
      return 3;
    }
    warn(`⚠ lab ${id}: process gone but no exitcode — likely crashed. stderr:`);
    process.stderr.write(existsSync(join(j.dir, "err")) ? readFileSync(join(j.dir, "err"), "utf8") : "(none)\n");
    return 1;
  }
  const outF = jobOutFile(j.dir);
  process.stdout.write(existsSync(outF) ? readFileSync(outF, "utf8") : "");
  if (j.st.code !== 0) {
    warn(`lab ${id}: exit ${j.st.code}${j.st.code === 124 ? " (stalled)" : ""} — stderr:`);
    process.stderr.write(existsSync(join(j.dir, "err")) ? readFileSync(join(j.dir, "err"), "utf8") : "");
  }
  return j.st.code ?? 0;
}

async function jobWait(id: string, timeoutSec: number | null): Promise<number> {
  if (!readJob(id)) {
    warn(`lab: no job '${id}' (list: sidecar lab list)`);
    return 1;
  }
  const deadline = timeoutSec ? Date.now() + timeoutSec * 1000 : Infinity;
  for (;;) {
    const j = readJob(id);
    if (j?.st.done || (j && !j.st.alive)) return jobResult(id);
    if (Date.now() >= deadline) {
      warn(`lab wait ${id}: still RUNNING after ${timeoutSec}s — sidecar lab result ${id} later.`);
      return 3;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

function jobList(): number {
  const root = jobsRoot();
  if (!existsSync(root)) {
    info("lab: no background jobs.");
    return 0;
  }
  const ids = readdirSync(root).filter((d) => existsSync(join(root, d, "status.json")));
  if (!ids.length) {
    info("lab: no background jobs.");
    return 0;
  }
  info(`lab jobs (${ids.length}):`);
  for (const id of ids.sort()) {
    const j = readJob(id);
    if (!j) continue;
    const status = j.st.done ? (j.st.code === 0 ? "✅ done" : `🔴 exit ${j.st.code}`) : j.st.alive ? "⏳ running" : "⚠ crashed";
    info(`  ${id}  [${j.st.backend ?? "?"}]  ${status}  (${j.st.started ?? "?"})`);
  }
  info("  collect: sidecar lab result <id>");
  return 0;
}

// Follow a job's `out` stream live until it finishes (the "watch progress" verb).
// A streaming (non-json) job fills `out` incrementally so you see it type; a
// clean-capture job emits only at the end. Poll ~300ms; Ctrl-C stops the VIEW,
// not the detached job. Exits with the job's code (1 on no-such-job).
async function jobTail(id: string): Promise<number> {
  const j0 = readJob(id);
  if (!j0) {
    warn(`lab: no job '${id}' (list: sidecar lab list)`);
    return 1;
  }
  const outF = join(j0.dir, "out");
  info(`⏳ lab ${id}: tailing output — Ctrl-C stops the view, the job keeps running.`);
  let printed = 0;
  const flush = () => {
    if (!existsSync(outF)) return;
    const buf = readFileSync(outF);
    if (buf.length > printed) {
      process.stdout.write(buf.subarray(printed));
      printed = buf.length;
    }
  };
  for (;;) {
    flush();
    const j = readJob(id);
    if (j?.st.done || (j && !j.st.alive)) {
      flush();
      const code = j?.st.code ?? 0;
      if (code !== 0) {
        warn(`— lab ${id}: exit ${code}${code === 124 ? " (stalled)" : ""} — stderr:`);
        process.stderr.write(existsSync(join(j!.dir, "err")) ? readFileSync(join(j!.dir, "err"), "utf8") : "");
      } else {
        info(`— lab ${id}: ✅ done (exit ${code})`);
      }
      return code;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}

// ── durable answer log ───────────────────────────────────────────────────────
// EVERY foreground lab run (fable/sol/full) tees its FULL output to a timestamped
// file under ~/.sidecar/lab/ and announces the path on STDERR. This is a pure
// safety net: stdout behavior is untouched, but a stdout that gets truncated —
// piped to `tail`, moved to the background by a harness, or lost when the parent
// exits — can never lose the answer, because a second copy already landed on disk.
// The announce goes to stderr (via info/ok) so --json stdout stays machine-clean.
function labLogDir(): string {
  return join(homedir(), ".sidecar", "lab");
}
interface LabLog {
  path: string;
  write: (s: string) => void;
  close: () => void;
}
function openLabLog(backend: string, o: LabOpts, promptChars: number): LabLog {
  const dir = labLogDir();
  const ts = new Date().toISOString().replace(/[:.]/g, "-"); // 2026-07-18T12-34-56-789Z
  const path = join(dir, `${ts}-${backend}.md`);
  let fd: number | null = null;
  try {
    mkdirSync(dir, { recursive: true });
    fd = openSync(path, "a");
    writeSync(fd, `<!-- sidecar lab ${backend} · model=${o.model ?? "(default)"} · cwd=${o.cwd ?? process.cwd()} · prompt=${promptChars} chars · ${new Date().toISOString()} -->\n\n`);
  } catch (e) {
    // A log we cannot open must never break the actual run — degrade to no-op.
    warn(`lab: durable log unavailable (${e instanceof Error ? e.message : String(e)}) — output not persisted to disk.`);
    fd = null;
  }
  return {
    path,
    write: (s) => {
      if (fd === null) return;
      try {
        writeSync(fd, s);
      } catch {
        /* best-effort — a write failure mid-run must not abort the run */
      }
    },
    close: () => {
      if (fd === null) return;
      try {
        closeSync(fd);
      } catch {
        /* ignore */
      }
      fd = null;
    },
  };
}

// ── foreground run of ONE backend ────────────────────────────────────────────
// Prompt goes through the child's stdin. Default: stdout teed live to terminal +
// durable log.
// sol --json: codex has no single-blob json, so we route the clean final message
// to a temp file via -o, silence stdout, and print the file on exit 0.
function runForeground(be: Backend, o: LabOpts, prompt: string): Promise<number> {
  const solJsonCapture = be.name === "sol" && o.json ? join(tmpdir(), `lab-sol-${Date.now().toString(36)}.txt`) : null;
  const argv = be.buildArgv(o, solJsonCapture);
  const log = openLabLog(be.name, o, prompt.length);
  info(`lab ${be.name}: durable copy → ${log.path}`);
  return new Promise<number>((resolve) => {
    // stdout is PIPED (not inherited) so we can tee it to BOTH the real stdout
    // (live stream preserved) and the durable log. The sol --json path keeps
    // stdout ignored — its clean answer is captured to a temp file and teed into
    // the log at settle instead.
    const child = spawn(be.bin, argv, {
      cwd: o.cwd ?? process.cwd(),
      stdio: ["pipe", solJsonCapture ? "ignore" : "pipe", "inherit"],
    });
    if (!solJsonCapture) {
      child.stdout?.on("data", (c: Buffer) => {
        process.stdout.write(c);
        log.write(c.toString());
      });
    }
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
      if (solJsonCapture) {
        if (code === 0 && existsSync(solJsonCapture)) {
          const ans = readFileSync(solJsonCapture, "utf8");
          process.stdout.write(ans);
          log.write(ans);
        }
        try {
          if (existsSync(solJsonCapture)) rmSync(solJsonCapture);
        } catch {
          /* best-effort cleanup */
        }
      }
      log.close();
      // Confirm the durable path on stderr once more so it's the last thing the
      // caller sees even if stdout was piped away — the answer is never lost.
      (code === 0 ? ok : info)(`lab ${be.name}: output saved → ${log.path}`);
      resolve(code);
    };
    child.on("error", (e: NodeJS.ErrnoException) => {
      warn(e.code === "ENOENT" ? `lab ${be.name}: \`${be.bin}\` CLI not found on PATH — install it first.` : `lab ${be.name}: ${be.bin} spawn failed: ${e.message}`);
      settle(127);
    });
    child.on("close", (code) => {
      if (timedOut) {
        warn(`lab ${be.name}: killed after ${cap}s timeout. Causes: auth wait, or a stalled headless child. Raise with --timeout <s> or disable with --timeout 0.`);
        settle(124);
        return;
      }
      settle(code ?? 1);
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// Capture a backend's combined output to a buffer (for `full`, where two legs run
// concurrently and live-interleaving would be garbage). Returns {code, out}.
function runCaptured(be: Backend, o: LabOpts, prompt: string): Promise<{ code: number; out: string }> {
  const solJsonCapture = be.name === "sol" && o.json ? join(tmpdir(), `lab-sol-${Date.now().toString(36)}-${be.name}.txt`) : null;
  const argv = be.buildArgv(o, solJsonCapture);
  return new Promise((resolve) => {
    let buf = "";
    const child = spawn(be.bin, argv, { cwd: o.cwd ?? process.cwd(), stdio: ["pipe", "pipe", "pipe"] });
    const cap = effTimeoutSec(o);
    let timedOut = false;
    const timer = cap
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, cap * 1000)
      : null;
    child.stdout?.on("data", (c) => (buf += c.toString()));
    child.stderr?.on("data", (c) => (buf += c.toString()));
    const settle = (code: number) => {
      if (timer) clearTimeout(timer);
      if (solJsonCapture && existsSync(solJsonCapture)) {
        try {
          buf += readFileSync(solJsonCapture, "utf8");
          rmSync(solJsonCapture);
        } catch {
          /* best-effort */
        }
      }
      resolve({ code: timedOut ? 124 : code, out: buf });
    };
    child.on("error", (e: NodeJS.ErrnoException) => {
      buf += e.code === "ENOENT" ? `\`${be.bin}\` CLI not found on PATH.\n` : `${be.bin} spawn failed: ${e.message}\n`;
      settle(127);
    });
    child.on("close", (code) => settle(code ?? 1));
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// `lab full` — ask BOTH backends the same prompt in parallel, print labeled
// sections. Exit = fable's code if nonzero, else sol's, else 0.
async function runFull(o: LabOpts, prompt: string): Promise<number> {
  if (o.cont || o.resume !== null) {
    warn("lab full: -c/--continue and -r/--resume are rejected — the two backends keep unrelated session stores (ambiguous). Run each backend separately to resume.");
    return 1;
  }
  if (o.extra.length) {
    warn("lab full: `-- <flags>` passthrough is rejected — backend-specific flags can't go to both. Run each backend separately.");
    return 1;
  }
  if (o.sources !== DEFAULT_SOURCES) info(`(--sources ${o.sources}: fable leg only — n/a for sol)`);
  const [f, s] = await Promise.all([runCaptured(FABLE, o, prompt), runCaptured(SOL, o, prompt)]);
  // Build both sections once, then write them to stdout AND the durable log — a
  // truncated/backgrounded stdout (the very failure that motivated this) can never
  // lose the fable/sol answers.
  const combined =
    `── fable (${o.model ?? FABLE.defaultModel}) · exit ${f.code} ──\n` +
    (f.out.endsWith("\n") ? f.out : f.out + "\n") +
    `\n── sol (${o.model ?? SOL.defaultModel}) · exit ${s.code} ──\n` +
    (s.out.endsWith("\n") ? s.out : s.out + "\n");
  const log = openLabLog("full", o, prompt.length);
  process.stdout.write(combined);
  log.write(combined);
  log.close();
  ok(`lab full: both sections saved → ${log.path}`);
  return f.code !== 0 ? f.code : s.code !== 0 ? s.code : 0;
}

// Backend when the caller names none: BOTH models. One call buys two independent
// takes and the caller reconciles — the better default than silently picking a
// side. Narrow it by naming a backend.
const DEFAULT_BACKEND = "full";
const BACKEND_WORDS = ["fable", "sol", "full"];

// Same-length words differing by ONE substitution, or by ONE adjacent transposition
// ("fable"→"fabel" — the most common real typo, which plain Levenshtein scores 2).
function oneEditApart(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const diff: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push(i);
  if (diff.length === 1) return true; // substitution
  if (diff.length !== 2 || diff[1] !== diff[0] + 1) return false;
  return a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]; // transposition
}
// A backend-name typo, NOT a prompt. Deliberately NARROW — same length AND same
// first letter AND one edit — because a false positive would reject a legitimate
// prompt. That keeps prompts starting with "null"/"table"/"sole" (each one plain
// edit from a backend name) flowing through to `full` as the prompt text they are.
function backendTypo(w: string): string | null {
  if (!/^[A-Za-z]{2,8}$/.test(w)) return null;
  const lower = w.toLowerCase();
  return BACKEND_WORDS.find((b) => lower[0] === b[0] && oneEditApart(lower, b)) ?? null;
}

function dryLine(be: Backend, o: LabOpts): string {
  const argv = be.buildArgv(o, be.name === "sol" && o.json ? "<capture>" : null);
  return `  ${be.bin} ${argv.join(" ")}`;
}

export async function runLab(args: string[]): Promise<number> {
  // job-management verbs (async collection) — checked before subcommand parsing.
  const verb = args[0];
  if (verb === "result") return jobResult(args[1] ?? "");
  if (verb === "tail" || verb === "watch") return jobTail(args[1] ?? "");
  if (verb === "list") return jobList();
  if (verb === "wait") {
    const id = args[1] ?? "";
    const ti = args.indexOf("--timeout");
    const t = ti >= 0 ? Number(args[ti + 1]) : null;
    return jobWait(id, Number.isFinite(t as number) && (t as number) > 0 ? (t as number) : null);
  }
  if (args.length === 0 || ["help", "-h", "--help"].includes(verb)) {
    info(USAGE);
    return args.length === 0 ? 1 : 0;
  }
  // Backend is OPTIONAL: a first word that isn't one of the three is the START OF
  // THE PROMPT, not a bad subcommand — the whole argv goes to `full`. The one thing
  // that must NOT slip through as prompt text is a near-miss TYPO of a backend name
  // ("fabel"), which would silently prepend a stray word AND fan out to both models.
  const named = verb === "fable" || verb === "sol" || verb === "full";
  if (!named) {
    const typo = backendTypo(verb);
    if (typo) {
      warn(`lab: '${verb}' looks like a typo of '${typo}' — did you mean \`sidecar lab ${typo} …\`? If '${verb}' really is the first word of your prompt, name the backend (\`sidecar lab ${DEFAULT_BACKEND} "${verb} …"\`) or pass the prompt via --file/stdin.`);
      return 1;
    }
  }
  const sub = (named ? verb : DEFAULT_BACKEND) as BackendName | "full";
  const o = parseArgs(sub, named ? args.slice(1) : args);
  if (!o) {
    info(USAGE);
    return 1;
  }
  if (o.cont && o.resume !== null) {
    warn("lab: --continue and --resume are mutually exclusive — pick one (continue = most recent in --cwd; resume = a specific session id).");
    return 1;
  }
  const prompt = await resolvePrompt(o);
  if (prompt === null) return 1;
  if (prompt.trim() === "") {
    warn(o.stdin ? "lab: stdin delivered 0 bytes — if you wrapped this in a `timeout` shim, it may have eaten the pipe; use the native `--timeout <s>` flag instead." : "lab: prompt is empty.");
    return 1;
  }

  // ── full: fan out to both backends ──
  if (sub === "full") {
    if (o.dry) {
      info(`lab full --dry:`);
      info(dryLine(FABLE, o));
      info(dryLine(SOL, o));
      info(`  prompt: ${prompt.length} chars via child stdin${o.cwd ? ` · cwd=${o.cwd}` : ""}`);
      return 0;
    }
    if (o.bg) {
      const fid = launchBg(FABLE, prompt, o);
      const sid = launchBg(SOL, prompt, o);
      info(`  full: two jobs — collect both: sidecar lab result ${fid} · sidecar lab result ${sid}`);
      return 0;
    }
    return runFull(o, prompt);
  }

  // ── single backend (fable | sol) ──
  const be = BACKENDS[sub];
  const na = be.naFlags(o);
  if (na.length) {
    warn(`lab ${sub}: ${na.join(", ")} is claude-only (fable backend). Pass ${be.bin} flags after --.`);
    return 1;
  }
  if (o.dry) {
    info(`lab ${sub} --dry:`);
    info(dryLine(be, o));
    info(
      `  prompt: ${prompt.length} chars via child stdin${o.cwd ? ` · cwd=${o.cwd}` : ""} · timeout=${effTimeoutSec(o) === null ? "off" : effTimeoutSec(o) + "s"}${o.cont ? " · continue" : o.resume !== null ? ` · resume=${o.resume}` : ""}${o.bg ? " · bg" : ""} · ${o.write ? "write=on" : "write=off(investigate)"}${sub === "fable" ? " · opus-fallback=off" : ""}`,
    );
    return 0;
  }
  if (o.bg) {
    launchBg(be, prompt, o);
    return 0;
  }
  return runForeground(be, o, prompt);
}
