import { spawn, type SpawnOptions } from "node:child_process";

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
  ms: number;
  killed: boolean;
}

export interface ExecOpts {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  input?: string;
}

export function execShell(cmd: string, opts: ExecOpts = {}): Promise<ExecResult> {
  return execArgs("bash", ["-lc", cmd], opts);
}

export function execArgs(bin: string, args: string[], opts: ExecOpts = {}): Promise<ExecResult> {
  const t0 = Date.now();
  return new Promise<ExecResult>((resolve) => {
    const spawnOpts: SpawnOptions = {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
    };
    const child = spawn(bin, args, spawnOpts);
    let stdout = "";
    let stderr = "";
    let killed = false;

    const timer = opts.timeoutMs
      ? setTimeout(() => {
          killed = true;
          child.kill("SIGKILL");
        }, opts.timeoutMs)
      : null;

    child.stdout?.on("data", (b: Buffer) => {
      stdout += b.toString();
    });
    child.stderr?.on("data", (b: Buffer) => {
      stderr += b.toString();
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr, ms: Date.now() - t0, killed });
    });
    if (opts.input !== undefined) {
      child.stdin?.write(opts.input);
      child.stdin?.end();
    } else {
      child.stdin?.end();
    }
  });
}

// Bounded-concurrency parallel map.
export async function pmap<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = new Array(Math.min(concurrency, items.length || 1)).fill(0).map(async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export function tail(text: string, n: number): string {
  return text.split("\n").filter(Boolean).slice(-n).join("\n");
}
