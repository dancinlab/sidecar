// sidecar ing {show|add <text>|done <id|match>|next <text>|pod ...|inject}
// In-progress board stored on a DEDICATED git ref (refs/heads/ing) as a single
// ING.jsonl file — NOT in the working tree.
// The `ing` ref is a board-only branch: read via `git show ing:ING.jsonl`, write via
// plumbing (hash-object→mktree→commit-tree→update-ref) + best-effort `push origin ing`.
// → branch-switch-proof (never in worktree) · committed · shared (push) · protected-safe.
// `done` SCRUBS (completed work graduates to CHANGELOG; ING holds only what's ACTIVE).
// SessionStart `inject` surfaces open work + running pods so the board is seen.
import { execFileSync } from "node:child_process";
import { emitInject } from "../lib/inject.ts";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { info, ok, warn, nowIso } from "../lib/log.ts";
import { readStdin, execArgs } from "../lib/exec.ts";
import { config, inGitRepo } from "../lib/config.ts";
import { ingStalenessWarn, resetIngStaleness } from "./ing-staleness.ts";
import { lastAssistantText } from "./recommend.ts";

const ING_REF = "ing";
const ING_FILE = "ING.jsonl";

// Worktree-aware board root. The `ing` ref lives in the SHARED common git dir, so a
// linked worktree's git ops must run with the CURRENT worktree as cwd — otherwise the
// ancestry-walked REPO_ROOT (from $PWD, which can be stale or in a mismatched realpath
// namespace, or which walks past a config-less worktree) silently points the write at
// the wrong checkout and the board edit lands nowhere the worktree can see (repro:
// `sidecar ing add` in a linked worktree, then `git add ING.jsonl` = nothing to commit).
// `git rev-parse --show-toplevel` is git's OWN authoritative answer for the worktree
// containing cwd, so it's correct in linked worktrees, nested subdirs, and the
// /tmp↔/private/tmp namespace. Falls back to REPO_ROOT (current behavior) when git
// can't answer (no repo / git missing).
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

export interface Item {
  kind: "work" | "next" | "pod";
  id: string;
  ts: string;
  text?: string;
  branch?: string; // git branch the entry was added on (≠main) — links a stranded branch/worktree back to its task (worktree inject · end)
  provider?: string;
  gpu?: string;
  purpose?: string;
  cost?: string;
}

function git(args: string[], cwd: string, input?: string) {
  return execArgs("git", args, { cwd, input, timeoutMs: 30_000 });
}

function parseJsonl(raw: string): Item[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l) as Item;
      } catch {
        return null;
      }
    })
    .filter((x): x is Item => !!x && !!x.kind && !!x.id);
}

// Read the board from the `ing` ref. Falls back to a legacy working-tree ING.jsonl
// (one-time migration — the pre-ref local file) when the ref doesn't exist yet, so
// existing items survive the switch to ref-backed storage; the first write graduates
// them onto the ref and the fallback is never read again.
async function readItems(cwd: string = BOARD_ROOT): Promise<Item[]> {
  const r = await git(["show", `${ING_REF}:${ING_FILE}`], cwd);
  if (r.code === 0) return parseJsonl(r.stdout);
  const legacy = resolve(cwd, ING_FILE);
  if (existsSync(legacy)) {
    try {
      return parseJsonl(readFileSync(legacy, "utf8"));
    } catch {
      /* unreadable → empty */
    }
  }
  return [];
}

// Public reader for other modules (worktree inject · end) that want to link a stranded
// branch/worktree back to its ING task. Read-only, board-format-owner stays here.
export async function loadIngItems(): Promise<Item[]> {
  return readItems();
}

// Match a branch name to its ING entry (#7). Deterministic, false-positive-averse — a
// wrong match mis-directs a resume, which is worse than no match, so every fuzzy path is
// conservative and ambiguity resolves to null:
//   Tier 1 (authoritative): an entry STAMPED with this exact branch (newest wins).
//   Tier 2 (legacy, unstamped): the full branch literal appears in the text, but ONLY when
//     the name is distinctive (len ≥ 8 OR contains "/") and the match is unique.
// Returns null on no/ambiguous match → the caller shows nothing extra.
export function findIngForBranch(branch: string, items: Item[]): Item | null {
  if (!branch) return null;
  const tasks = items.filter((i) => i.kind !== "pod");
  const stamped = tasks.filter((i) => i.branch === branch);
  if (stamped.length) return stamped[stamped.length - 1]; // newest (append-order)
  if (branch.length >= 8 || branch.includes("/")) {
    const hits = tasks.filter((i) => (i.text ?? "").includes(branch));
    if (hits.length === 1) return hits[0];
  }
  return null;
}

// Write the board to the `ing` ref via plumbing (no working-tree touch) + best-effort
// push. Offline / no-push-perm → the local ref still advances and we warn once.
async function writeItems(rows: Item[], msg: string, cwd: string = BOARD_ROOT): Promise<boolean> {
  const content = rows.length ? rows.map((r) => JSON.stringify(r)).join("\n") + "\n" : "";
  const blob = (await git(["hash-object", "-w", "--stdin"], cwd, content)).stdout.trim();
  if (!blob) {
    warn("ing: git hash-object 실패 — git repo 가 맞는지 확인");
    return false;
  }
  const tree = (await git(["mktree"], cwd, `100644 blob ${blob}\t${ING_FILE}\n`)).stdout.trim();
  const parent = (await git(["rev-parse", "--verify", "--quiet", ING_REF], cwd)).stdout.trim();
  const ctArgs = ["commit-tree", tree, ...(parent ? ["-p", parent] : [])];
  const commit = (await git(ctArgs, cwd, msg)).stdout.trim();
  await git(["update-ref", `refs/heads/${ING_REF}`, commit], cwd);
  const p = await git(["push", "origin", ING_REF], cwd);
  if (p.code !== 0) {
    warn(`ing: 로컬 ing ref 갱신 OK · push 실패(오프라인/권한?) — 나중에 동기화: git push origin ing`);
  }
  return true;
}

function nextId(rows: Item[]): string {
  return String(rows.reduce((m, r) => Math.max(m, parseInt(r.id, 10) || 0), 0) + 1);
}

// c17 resume markers: a task stashed before a (possibly long) upstream fix carries a
// leading `↩`; these sort to the FRONT so the thing to return to is surfaced first.
function resumeRank(r: Item): number {
  return (r.text ?? "").startsWith("↩") ? 0 : 1;
}

// whole days since an item's `ts` (ISO). Unparseable ts → 0 (never flag a bad stamp).
function ageDays(ts: string, now: number): number {
  const t = Date.parse(ts);
  if (!t) return 0;
  return Math.floor((now - t) / 86_400_000);
}

// Pileup signal for the board: any work item older than `staleDays`, or an open-work
// count over `maxActive`, means completed lines are likely NOT being scrubbed. Returns
// a loud one-line scrub directive (or "" when the board is healthy). Surfaced every
// turn by `inject` so a finished-but-unscrubbed item can't sit quietly forever.
function bloatDirective(work: Item[], staleDays: number, maxActive: number, now: number): string {
  const stale = work.filter((r) => ageDays(r.ts, now) >= staleDays);
  const over = work.length > maxActive;
  if (!stale.length && !over) return "";
  const parts: string[] = [];
  if (stale.length) {
    const tags = stale.map((r) => `#${r.id}(⏳${ageDays(r.ts, now)}d)`).join(" · ");
    parts.push(`${stale.length}건 ${staleDays}일+ 묵음 — ${tags}`);
  }
  if (over) parts.push(`보드 ${work.length}건(>${maxActive} 적체)`);
  return (
    `🧹 ING 적체 — ${parts.join(" · ")}. 끝난 항목은 **지금** \`sidecar ing done <id>\` 로 scrub하라 ` +
    `(보드는 ACTIVE 만 · 완료분은 CHANGELOG 로 graduate). 아직 진행중이면 그 한 줄을 현행화하라(방치 금지).`
  );
}

export async function runIng(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";

  if (sub === "add" || sub === "next") {
    // STDIN text path — robust for ANY characters (parens·quotes·$·→ …) that break
    // unquoted argv via the slash command's `$ARGUMENTS`. Opt-in only (`--stdin` flag
    // or a lone `-`) so an interactive no-text call still shows usage, never blocks on
    // a TTY. Agent-safe form: `printf '%s' "<free text>" | sidecar ing add --stdin`.
    const parts = args.slice(1);
    const wantStdin = parts.includes("--stdin") || (parts.length === 1 && parts[0] === "-");
    const text = wantStdin
      ? readStdin().trim()
      : parts.filter((a) => a !== "--stdin").join(" ").trim();
    if (!text) return usage();
    const rows = await readItems();
    // Stamp the branch this task was added on (BOARD_ROOT is worktree-aware) so a later
    // stranded worktree/branch can be linked back to its task (#7). Skip main/master/
    // detached — only a real feature branch is a useful resume anchor.
    const br = (await git(["rev-parse", "--abbrev-ref", "HEAD"], BOARD_ROOT)).stdout.trim();
    const branch = br && br !== "HEAD" && br !== "main" && br !== "master" ? br : undefined;
    const item: Item = { kind: sub === "add" ? "work" : "next", id: nextId(rows), ts: nowIso(), text, ...(branch ? { branch } : {}) };
    await writeItems([...rows, item], `ing: + ${sub === "add" ? "work" : "next"} ${text}`);
    resetIngStaleness(); // c6: board touched → clear the edits-since-update counter
    ok(`ing: + ${sub === "add" ? "작업" : "다음"} — ${text}`);
    return 0;
  }

  if (sub === "done") {
    const tokens = args.slice(1).filter(Boolean);
    const m = tokens.join(" ");
    const rows = await readItems();
    const openIds = () => rows.map((r) => r.id + (r.kind === "pod" ? "(pod)" : "")).join(", ") || "none";
    if (!tokens.length) {
      info(`ing: usage — sidecar ing done <id|id...|match>. open ids: ${openIds()}`);
      return 1;
    }
    // EXACT id match wins — `done 1` removes ONLY id=1, never items whose text
    // merely contains "1". ANY kind matches by id (work/next AND pods). `done 1 2 3`
    // scrubs several at once — but ONLY when EVERY token is a real id (so `done task 1`
    // still text-searches instead of the "1" token hijacking it).
    const allIds = tokens.every((t) => rows.some((r) => r.id === t));
    const byId = allIds ? rows.filter((r) => tokens.includes(r.id)) : [];
    let toRemove: Item[];
    if (byId.length) {
      toRemove = byId;
    } else {
      // Text fallback only when it resolves to EXACTLY ONE item — ambiguous
      // multi-matches are refused so a loose term can't mass-scrub the board.
      const byText = rows.filter((r) => r.kind !== "pod" && (r.text ?? "").includes(m));
      if (byText.length === 0) {
        info(`ing: no item matching "${m}". open ids: ${openIds()}`);
        return 1;
      }
      if (byText.length > 1) {
        info(`ing: "${m}" 가 ${byText.length}건 매칭 — 모호. 정확한 id 로 지정: ${byText.map((r) => r.id).join(", ")}`);
        return 1;
      }
      toRemove = byText;
    }
    const drop = new Set(toRemove.map((r) => `${r.kind} ${r.id}`));
    const afterDone = rows.filter((r) => !drop.has(`${r.kind} ${r.id}`));
    await writeItems(afterDone, `ing: done ${m}`); // scrub → CHANGELOG
    resetIngStaleness(); // c6: board touched → clear the edits-since-update counter
    ok(`ing: ✓ done "${m}" scrubbed (${toRemove.length}건) — 완료분은 CHANGELOG 로`);
    return 0;
  }

  if (sub === "pod") return pod(args.slice(1));

  if (sub === "inject") {
    try {
      const j = JSON.parse(readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      const rows = await readItems();
      const work = rows.filter((r) => r.kind === "work");
      work.sort((a, b) => resumeRank(a) - resumeRank(b)); // c17: ↩resume first
      const pods = rows.filter((r) => r.kind === "pod");
      if (!work.length && !pods.length) return 0; // silent when nothing active
      const now = Date.now();
      const parts: string[] = [];
      if (work.length) parts.push(`작업 ${work.length}: ` + work.map((r) => `#${r.id}(⏳${ageDays(r.ts, now)}d) ${r.text}`).join(" · "));
      if (pods.length) parts.push(`POD ${pods.length}: ` + pods.map((r) => `${r.id}(${r.gpu ?? "?"})`).join(" · "));
      let ctx = `🔄 ING (진행중 · ing ref) — ${parts.join("  |  ")}  · \`sidecar ing show\` / done <id>`;
      // Turn-close gate: make per-turn board upkeep + reporting actual, not on-request only.
      ctx +=
        `\n🔄 턴 마감 게이트 (매턴 필수 · Stop 게이트 강제) — 진행상황이 바뀌었으면(코드 편집뿐 아니라 측정·verdict·벤치·에이전트 착륙도 포함) **지금** \`sidecar ing done <id>\`(완료=scrub→CHANGELOG)/\`add\`/\`next\` 로 보드를 갱신하고 응답에 \`🔄 ING 갱신: <무엇을>\` 한 줄로, ` +
        "변동이 없으면 `🔄 ING: 변동 없음` 한 줄로 — 매 응답에 둘 중 하나를 반드시 포함하라 (`ing stop-check` 가 누락 시 차단).";
      // pileup gate: a finished-but-unscrubbed item shows its age every turn; once an
      // item is stale or the board overflows, shout for a scrub so it can't accumulate.
      const bloat = bloatDirective(work, config().ing.staleDays, config().ing.maxActive, now);
      if (bloat) ctx += `\n${bloat}`;
      emitInject("ing", ev, ctx);
    } catch {
      return 0;
    }
    return 0;
  }

  // staleness-check (Stop hook · c6) — warn once when many code files were edited
  // without the board being touched. warn-only, on stderr (Stop output surfaces it).
  if (sub === "staleness-check") {
    const msg = ingStalenessWarn(config().ing.editThreshold);
    if (msg) warn(`[ing-staleness] ${msg}`);
    return 0;
  }

  // stop-check (Stop hook) — per-turn ING enforce. Progress can change WITHOUT a code
  // edit (a measurement / verdict / bench result / background-agent landing), so this
  // gate is NOT tied to file edits: it requires EVERY response to carry one `🔄 ING`
  // status line — either `🔄 ING 갱신: …` (board mutated) or `🔄 ING: 변동 없음` (a
  // conscious no-change affirmation). Mirrors `recommend stop-check`: reads the last
  // assistant text, `decision:block` if the marker is absent (forcing the model to add
  // it). Scoped to sidecar-managed repos; native loop guard caps it at once per chain.
  if (sub === "stop-check") {
    let payload: { stop_hook_active?: boolean; transcript_path?: string; transcriptPath?: string };
    try {
      payload = JSON.parse(readStdin());
    } catch {
      return 0;
    }
    if (payload?.stop_hook_active) return 0; // already nudged this chain — don't wedge
    if (!inGitRepo()) return 0; // any git repo (managed-marker abolished · config.ts inGitRepo)
    const tp = payload?.transcript_path ?? payload?.transcriptPath;
    if (!tp) return 0;
    const text = lastAssistantText(String(tp));
    if (!text) return 0;
    if (/🔄\s*ING/.test(text)) return 0; // a status line is present → compliant
    const reason =
      "매턴 ING 상태 보고 필수 — 이번 응답에 `🔄 ING` 줄이 없다. 진행상황이 바뀌었으면(코드 편집뿐 아니라 " +
      "측정·verdict·벤치·에이전트 착륙도 포함) `sidecar ing add/next/done` 으로 보드를 갱신하고 `🔄 ING 갱신: <무엇을>` 로, " +
      "변동이 없으면 `🔄 ING: 변동 없음` 한 줄로 보고하라 (둘 중 하나 필수).";
    process.stdout.write(JSON.stringify({ decision: "block", reason }) + "\n");
    return 0;
  }

  // show
  const rows = await readItems();
  if (!rows.length) {
    info("ing: empty (ing ref). add: sidecar ing add <text> · next <text> · pod add ...");
    return 0;
  }
  const work = rows.filter((r) => r.kind === "work");
  work.sort((a, b) => resumeRank(a) - resumeRank(b)); // c17: ↩resume first
  const pods = rows.filter((r) => r.kind === "pod");
  const next = rows.filter((r) => r.kind === "next");
  const now = Date.now();
  info(`ING — 진행중 (ing ref · git show ing:ING.jsonl) · 완료→CHANGELOG · 최종설계→ARCHITECTURE`);
  info(`작업 (in-progress): ${work.length || "—"}`);
  for (const r of work) info(`  • #${r.id} ${r.text}   (⏳${ageDays(r.ts, now)}d · since ${r.ts.slice(0, 10)})`);
  const bloat = bloatDirective(work, config().ing.staleDays, config().ing.maxActive, now);
  if (bloat) warn(bloat.replace(/\*\*/g, ""));
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

async function pod(args: string[]): Promise<number> {
  const verb = args[0] ?? "list";
  const rows = await readItems();
  if (verb === "list") {
    const pods = rows.filter((r) => r.kind === "pod");
    if (!pods.length) info("ing pod: no running pods.");
    else for (const r of pods) info(`  ${r.id} | ${r.provider ?? "-"} | ${r.gpu ?? "-"} | ${r.purpose ?? "-"} | ${r.cost ?? "-"}`);
    return 0;
  }
  if (verb === "add") {
    const [, id, provider, gpu, ...rest] = args;
    if (!id) {
      info("usage: sidecar ing pod add <id> <provider> <gpu> <purpose> [cost/hr]");
      return 1;
    }
    const cost = rest.length && /^[\d.$]/.test(rest[rest.length - 1]) ? rest.pop()! : "-";
    const purpose = rest.join(" ") || "-";
    const kept = rows.filter((r) => !(r.kind === "pod" && r.id === id));
    kept.push({ kind: "pod", id, ts: nowIso(), provider: provider ?? "-", gpu: gpu ?? "-", purpose, cost });
    await writeItems(kept, `ing: pod + ${id}`);
    ok(`ing pod: + ${id} (${gpu ?? "-"} · ${purpose})`);
    return 0;
  }
  if (verb === "rm") {
    const id = args[1];
    if (!id) {
      info("usage: sidecar ing pod rm <id>");
      return 1;
    }
    const afterRm = rows.filter((r) => !(r.kind === "pod" && r.id === id));
    await writeItems(afterRm, `ing: pod rm ${id}`);
    info(`ing pod: removed ${id}`);
    return 0;
  }
  info("usage: sidecar ing pod {add <id> <provider> <gpu> <purpose> [cost]|rm <id>|list}");
  return 1;
}

function usage(): number {
  info("usage: sidecar ing {show|add <text>|done <id|match>|next <text>|pod {add|rm|list}|inject}");
  info("  free text with shell-special chars (parens·quotes·$·→): pipe via --stdin —");
  info("    printf '%s' \"<text>\" | sidecar ing add --stdin");
  return 1;
}
