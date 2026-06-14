import { readFileSync, writeFileSync, existsSync } from "node:fs";

export function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function readJsonOr<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// Read append-only JSONL; skips blank/corrupt lines. Optional tail = last N records.
export function readJsonl<T = Record<string, unknown>>(path: string, tail?: number): T[] {
  if (!existsSync(path)) return [];
  let lines = readFileSync(path, "utf8").split("\n").filter((l) => l.trim());
  if (tail && tail > 0) lines = lines.slice(-tail);
  const out: T[] = [];
  for (const l of lines) {
    try {
      out.push(JSON.parse(l) as T);
    } catch {
      /* skip corrupt line */
    }
  }
  return out;
}
