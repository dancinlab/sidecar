// sidecar frontier {show|set <text>|go [note]|swap <text>|clear|inject}
// The single "north-star" objective (최전선) the session/repo is pushing — ONE active
// frontier at a time (single-slot), distinct from `ing` (a multi-item board of ALL
// active work). 지정(set) · 진행(go) · 교체(swap) · 해제(clear).
//
// Stored on a DEDICATED git ref (refs/heads/frontier) as a single FRONTIER.jsonl file —
// NOT in the working tree. Mirrors the `ing` ref pattern exactly: read via
// `git show frontier:FRONTIER.jsonl`, write via plumbing (hash-object→mktree→commit-tree
// →update-ref) + best-effort `push origin frontier`. → branch-switch-proof · committed ·
// shared (push) · protected-main-safe. `clear`/`swap` retire the old frontier (its record
// graduates to CHANGELOG; the ref holds only what's ACTIVE, like `ing done`).
// SessionStart + per-turn `inject` surfaces the frontier so the north-star stays in view
// (SILENT — 0 bytes — when none is designated, like git-context/worktree).
import { execFileSync } from "node:child_process";
import { emitInject } from "../lib/inject.ts";
import { REPO_ROOT } from "../lib/paths.ts";
import { info, ok, warn, nowIso } from "../lib/log.ts";
import { readStdin, execArgs } from "../lib/exec.ts";

const FRONTIER_REF = "frontier";
const FRONTIER_FILE = "FRONTIER.jsonl";

// Worktree-aware board root — the `frontier` ref lives in the SHARED common git dir, so a
// linked worktree's git ops must run with the CURRENT worktree as cwd (git's own
// authoritative answer), else the write lands where the worktree can't see it. Same
// rationale as `ing` boardRoot (see ing.ts). Falls back to REPO_ROOT when git can't answer.
function boardRoot(): string {
  try {
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      timeout: 10_000,
    }).trim();
    if (top) return top;
  } catch {
    /* not a git repo / git unavailable → fall back */
  }
  return REPO_ROOT;
}

const BOARD_ROOT = boardRoot();

interface Note {
  ts: string;
  note: string;
}
interface Frontier {
  id: string;
  ts: string; // when designated
  text: string; // the objective
  notes?: Note[]; // 진행(go) progress notes, append-order
}

function git(args: string[], cwd: string, input?: string) {
  return execArgs("git", args, { cwd, input, timeoutMs: 30_000 });
}

// Read the single active frontier from the `frontier` ref (first valid JSONL line).
// Returns null when unset / ref absent.
async function readFrontier(cwd: string = BOARD_ROOT): Promise<Frontier | null> {
  const r = await git(["show", `${FRONTIER_REF}:${FRONTIER_FILE}`], cwd);
  if (r.code !== 0) return null;
  for (const line of r.stdout.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const f = JSON.parse(t) as Frontier;
      if (f && f.text) return f;
    } catch {
      /* skip malformed */
    }
  }
  return null;
}

// Write the frontier to the ref via plumbing (no working-tree touch) + best-effort push.
// null clears it (empty file). Offline / no-push-perm → local ref still advances + warns once.
async function writeFrontier(f: Frontier | null, msg: string, cwd: string = BOARD_ROOT): Promise<boolean> {
  const content = f ? JSON.stringify(f) + "\n" : "";
  const blob = (await git(["hash-object", "-w", "--stdin"], cwd, content)).stdout.trim();
  if (!blob) {
    warn("frontier: git hash-object 실패 — git repo 가 맞는지 확인");
    return false;
  }
  const tree = (await git(["mktree"], cwd, `100644 blob ${blob}\t${FRONTIER_FILE}\n`)).stdout.trim();
  const parent = (await git(["rev-parse", "--verify", "--quiet", FRONTIER_REF], cwd)).stdout.trim();
  const ctArgs = ["commit-tree", tree, ...(parent ? ["-p", parent] : [])];
  const commit = (await git(ctArgs, cwd, msg)).stdout.trim();
  await git(["update-ref", `refs/heads/${FRONTIER_REF}`, commit], cwd);
  const p = await git(["push", "origin", FRONTIER_REF], cwd);
  if (p.code !== 0) {
    warn("frontier: 로컬 frontier ref 갱신 OK · push 실패(오프라인/권한?) — 나중에 동기화: git push origin frontier");
  }
  return true;
}

// Free-text extraction shared by set/swap/go — STDIN path for ANY shell-special chars
// (parens·quotes·$·→) that break unquoted argv via a slash command's `$ARGUMENTS`.
// Opt-in via `--stdin` or a lone `-` (an interactive no-text call still shows usage).
function textOf(parts: string[]): string {
  const wantStdin = parts.includes("--stdin") || (parts.length === 1 && parts[0] === "-");
  return wantStdin ? readStdin().trim() : parts.filter((a) => a !== "--stdin").join(" ").trim();
}

// Korean verb aliases → canonical English (the user thinks 지정/진행/교체/해제).
function canonVerb(v: string): string {
  const map: Record<string, string> = {
    지정: "set",
    진행: "go",
    advance: "go",
    교체: "swap",
    replace: "swap",
    해제: "clear",
    release: "clear",
    designate: "set",
  };
  return map[v] ?? v;
}

function ageDays(ts: string, now: number): number {
  const t = Date.parse(ts);
  if (!t) return 0;
  return Math.floor((now - t) / 86_400_000);
}

// One-line description of the active frontier, e.g. "#3 <text> (⏳2d · 노트 1)".
function summary(f: Frontier, now: number): string {
  const n = f.notes?.length ?? 0;
  return `#${f.id} ${f.text}  (⏳${ageDays(f.ts, now)}d · since ${f.ts.slice(0, 10)}${n ? ` · 노트 ${n}` : ""})`;
}

export async function runFrontier(args: string[]): Promise<number> {
  const sub = canonVerb(args[0] ?? "show");

  // 지정 — designate THE frontier. Refuse to clobber an existing one (use swap) so a
  // north-star can't be silently lost.
  if (sub === "set") {
    const text = textOf(args.slice(1));
    if (!text) return usage();
    const cur = await readFrontier();
    if (cur) {
      warn(`frontier: 이미 지정됨 — ${summary(cur, Date.now())}`);
      info("  교체하려면: sidecar frontier swap <새 목표>  ·  해제: sidecar frontier clear");
      return 1;
    }
    const f: Frontier = { id: "1", ts: nowIso(), text };
    await writeFrontier(f, `frontier: set ${text}`);
    ok(`frontier: 🎯 지정 — ${text}`);
    return 0;
  }

  // 교체 — retire the current frontier (→ graduate to CHANGELOG) + designate a new one.
  // Works even when none is set (acts as set). The new id increments so history is legible.
  if (sub === "swap") {
    const text = textOf(args.slice(1));
    if (!text) return usage();
    const cur = await readFrontier();
    const nextId = String((parseInt(cur?.id ?? "0", 10) || 0) + 1);
    const f: Frontier = { id: nextId, ts: nowIso(), text };
    await writeFrontier(f, `frontier: swap ${text}`);
    if (cur) ok(`frontier: 🔁 교체 — 은퇴 "${cur.text}" → 신규 🎯 "${text}" (완료·은퇴분은 CHANGELOG 로)`);
    else ok(`frontier: 🎯 지정 — ${text} (기존 없음 → set)`);
    return 0;
  }

  // 해제 — release the frontier (retire to CHANGELOG · ref holds only ACTIVE).
  if (sub === "clear") {
    const cur = await readFrontier();
    if (!cur) {
      info("frontier: 지정된 최전선 없음 (해제할 것 없음)");
      return 0;
    }
    await writeFrontier(null, `frontier: clear ${cur.text}`);
    ok(`frontier: ✓ 해제 — "${cur.text}" (완료분은 CHANGELOG 로 graduate)`);
    return 0;
  }

  // 진행 — surface the frontier as a strong "push THIS now" directive; an optional note
  // arg appends a progress note. No frontier → tell the user to set one first.
  if (sub === "go") {
    const cur = await readFrontier();
    if (!cur) {
      warn("frontier: 지정된 최전선 없음 — 먼저 지정: sidecar frontier set <목표>");
      return 1;
    }
    const note = textOf(args.slice(1));
    if (note) {
      const notes = [...(cur.notes ?? []), { ts: nowIso(), note }];
      await writeFrontier({ ...cur, notes }, `frontier: go note ${note}`);
      ok(`frontier: 📌 진행노트 + "${note}"`);
    }
    const now = Date.now();
    info(`🎯 프런티어 진행 (최전선 목표를 지금 민다) — ${summary(cur, now)}`);
    if (cur.notes?.length) for (const n of cur.notes) info(`  · ${n.note}  (${n.ts.slice(0, 10)})`);
    info("  → 이 목표를 향해 다음 구체 작업을 지금 실행하라. 완료·교체 시 sidecar frontier swap/clear.");
    return 0;
  }

  // SessionStart + per-turn inject — surface the frontier so it stays in view. SILENT
  // (0 bytes) when none is set (no context-rot when idle · like git-context/worktree).
  if (sub === "inject") {
    try {
      const j = JSON.parse(readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      const cur = await readFrontier();
      if (!cur) return 0; // nothing designated → emit nothing
      const now = Date.now();
      const n = cur.notes?.length ?? 0;
      const ctx =
        `🎯 프런티어 (최전선 목표 · frontier ref) — ${cur.text} (⏳${ageDays(cur.ts, now)}d${n ? ` · 진행노트 ${n}` : ""}) ` +
        "· `sidecar frontier go` 로 밀기 / show / swap <새목표> / clear";
      emitInject("frontier", ev, ctx);
    } catch {
      return 0;
    }
    return 0;
  }

  // show (default)
  const cur = await readFrontier();
  if (!cur) {
    info("frontier: 지정된 최전선 없음. 지정: sidecar frontier set <목표>");
    return 0;
  }
  const now = Date.now();
  info("🎯 프런티어 — 최전선 목표 (frontier ref · git show frontier:FRONTIER.jsonl) · 완료→CHANGELOG");
  info(`  ${summary(cur, now)}`);
  if (cur.notes?.length) {
    info(`진행노트 (go): ${cur.notes.length}`);
    for (const nt of cur.notes) info(`  · ${nt.note}  (${nt.ts.slice(0, 10)})`);
  }
  info("  진행: sidecar frontier go [노트]  ·  교체: swap <새목표>  ·  해제: clear");
  return 0;
}

function usage(): number {
  info("usage: sidecar frontier {show|set <목표>|go [노트]|swap <새목표>|clear|inject}");
  info("  지정=set · 진행=go · 교체=swap · 해제=clear (한글 별칭도 허용)");
  info("  셸 특수문자(괄호·따옴표·$·→) 포함 텍스트: printf '%s' \"<목표>\" | sidecar frontier set --stdin");
  return 1;
}
