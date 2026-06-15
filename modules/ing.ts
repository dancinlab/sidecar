// harness ing {show|add <text>|done <id|match>|next <text>|pod ...|inject}
// In-progress board at repo-root ING.jsonl (was ING.md) — the "now" board, one
// JSON line per item so it's machine-readable and append/scrub-friendly. Kinds:
//   work  — in-progress task   · next — queued task   · pod — running GPU pod
// `done` SCRUBS the item (completed work graduates to CHANGELOG; ING holds only
// what's ACTIVE). SessionStart `inject` surfaces open work + running pods so the
// board is actually seen each session (it went unused as a passive .md file).
import { existsSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { appendJsonl, info, ok, nowIso } from "../lib/log.ts";
import { readStdin } from "../lib/exec.ts";
import { readJsonl } from "../lib/json.ts";

interface Item {
  kind: "work" | "next" | "pod";
  id: string;
  ts: string;
  text?: string;
  provider?: string;
  gpu?: string;
  purpose?: string;
  cost?: string;
}

function ingPath(): string {
  return resolve(REPO_ROOT, "ING.jsonl");
}
function items(): Item[] {
  return readJsonl<Item>(ingPath()).filter((x) => x && x.kind && x.id);
}
function writeAll(rows: Item[]): void {
  const p = ingPath();
  if (!rows.length) {
    if (existsSync(p)) rmSync(p);
    return;
  }
  writeFileSync(p, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
}
function nextId(rows: Item[]): string {
  return String(rows.reduce((m, r) => Math.max(m, parseInt(r.id, 10) || 0), 0) + 1);
}
function today(): string {
  return nowIso().slice(0, 10);
}

export async function runIng(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";

  if (sub === "add" || sub === "next") {
    const text = args.slice(1).join(" ").trim();
    if (!text) return usage();
    const rows = items();
    appendJsonl(ingPath(), { kind: sub === "add" ? "work" : "next", id: nextId(rows), ts: nowIso(), text });
    ok(`ing: + ${sub === "add" ? "작업" : "다음"} — ${text} (commit ING.jsonl)`);
    return 0;
  }

  if (sub === "done") {
    const m = args.slice(1).join(" ").trim();
    const rows = items();
    const kept = rows.filter((r) => !(r.kind !== "pod" && (r.id === m || (r.text ?? "").includes(m))));
    if (!m || kept.length === rows.length) {
      info(`ing: no work/next item matching "${m}". open ids: ${rows.filter((r) => r.kind !== "pod").map((r) => r.id).join(", ") || "none"}`);
      return 1;
    }
    writeAll(kept); // scrub — graduate completed work to CHANGELOG
    ok(`ing: ✓ done "${m}" scrubbed — 완료분은 CHANGELOG 로 (commit ING.jsonl)`);
    return 0;
  }

  if (sub === "pod") return pod(args.slice(1));

  if (sub === "inject") {
    try {
      const j = JSON.parse(readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      const rows = items();
      const work = rows.filter((r) => r.kind === "work");
      const pods = rows.filter((r) => r.kind === "pod");
      if (!work.length && !pods.length) return 0; // silent when nothing active
      const parts: string[] = [];
      if (work.length) parts.push(`작업 ${work.length}: ` + work.map((r) => `#${r.id} ${r.text}`).join(" · "));
      if (pods.length) parts.push(`POD ${pods.length}: ` + pods.map((r) => `${r.id}(${r.gpu ?? "?"})`).join(" · "));
      const ctx = `🔵 ING (진행중) — ${parts.join("  |  ")}  · \`harness ing show\` / done <id>`;
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: ev, additionalContext: ctx } }) + "\n");
    } catch {
      return 0;
    }
    return 0;
  }

  // show
  const rows = items();
  if (!rows.length) {
    info("ing: empty (ING.jsonl). add: harness ing add <text> · next <text> · pod add ...");
    return 0;
  }
  const work = rows.filter((r) => r.kind === "work");
  const pods = rows.filter((r) => r.kind === "pod");
  const next = rows.filter((r) => r.kind === "next");
  info(`ING — 진행중 (repo-root ING.jsonl) · 완료→CHANGELOG · 최종설계→ARCHITECTURE`);
  info(`작업 (in-progress): ${work.length || "—"}`);
  for (const r of work) info(`  • #${r.id} ${r.text}   (since ${r.ts.slice(0, 10)})`);
  if (pods.length) {
    info(`POD (running): ${pods.length}`);
    for (const r of pods) info(`  • ${r.id} | ${r.provider ?? "-"} | ${r.gpu ?? "-"} | ${r.purpose ?? "-"} | ${r.cost ?? "-"} | since ${r.ts.slice(0, 10)}`);
  }
  if (next.length) {
    info(`다음 (next): ${next.length}`);
    for (const r of next) info(`  • #${r.id} ${r.text}`);
  }
  return 0;
}

function pod(args: string[]): number {
  const verb = args[0] ?? "list";
  const rows = items();
  if (verb === "list") {
    const pods = rows.filter((r) => r.kind === "pod");
    if (!pods.length) info("ing pod: no running pods.");
    else for (const r of pods) info(`  ${r.id} | ${r.provider ?? "-"} | ${r.gpu ?? "-"} | ${r.purpose ?? "-"} | ${r.cost ?? "-"}`);
    return 0;
  }
  if (verb === "add") {
    const [, id, provider, gpu, ...rest] = args;
    if (!id) {
      info("usage: harness ing pod add <id> <provider> <gpu> <purpose> [cost/hr]");
      return 1;
    }
    const cost = rest.length && /^[\d.$]/.test(rest[rest.length - 1]) ? rest.pop()! : "-";
    const purpose = rest.join(" ") || "-";
    const kept = rows.filter((r) => !(r.kind === "pod" && r.id === id));
    kept.push({ kind: "pod", id, ts: nowIso(), provider: provider ?? "-", gpu: gpu ?? "-", purpose, cost });
    writeAll(kept);
    ok(`ing pod: + ${id} (${gpu ?? "-"} · ${purpose})`);
    return 0;
  }
  if (verb === "rm") {
    const id = args[1];
    if (!id) {
      info("usage: harness ing pod rm <id>");
      return 1;
    }
    writeAll(rows.filter((r) => !(r.kind === "pod" && r.id === id)));
    info(`ing pod: removed ${id}`);
    return 0;
  }
  info("usage: harness ing pod {add <id> <provider> <gpu> <purpose> [cost]|rm <id>|list}");
  return 1;
}

function usage(): number {
  info("usage: harness ing {show|add <text>|done <id|match>|next <text>|pod {add|rm|list}|inject}");
  return 1;
}
