import { appendFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export function nowIso(): string {
  return new Date().toISOString();
}

export function appendJsonl(path: string, record: Record<string, unknown>): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const line = JSON.stringify({ ts: nowIso(), ...record });
  appendFileSync(path, line + "\n", "utf8");
}

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
} as const;

// H1: success is quiet (no stdout), failure is loud (stderr JSON).
export function silentSuccess(): void {}

export function loudFail(msg: string, detail?: Record<string, unknown>): void {
  const payload = { level: "error", msg, ...(detail ?? {}) };
  process.stderr.write(`${COLORS.red}${JSON.stringify(payload)}${COLORS.reset}\n`);
}

export function warn(msg: string, detail?: Record<string, unknown>): void {
  const payload = { level: "warn", msg, ...(detail ?? {}) };
  process.stderr.write(`${COLORS.yellow}${JSON.stringify(payload)}${COLORS.reset}\n`);
}

export function info(msg: string): void {
  process.stderr.write(`${COLORS.dim}${msg}${COLORS.reset}\n`);
}

export function ok(msg: string): void {
  process.stderr.write(`${COLORS.green}${msg}${COLORS.reset}\n`);
}
