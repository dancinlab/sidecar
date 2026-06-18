// harness ing {show|add <text> [--to <repo>]|done <id|match>|next <text>|pod ...|inject}
// In-progress board stored on a DEDICATED git ref (refs/heads/ing) as a single
// ING.jsonl file — NOT in the working tree.
// @convergence state=ossified id=ING_BOARD_DEDICATED_REF value="board lives on a dedicated `ing` ref via plumbing, never the working tree" threshold="tracked worktree file: branch-switch/reset clobbers session edits (happened); untracked: unshared"
// @convergence state=failed id=ING_NO_DIRECT_MAIN_PUSH value="never store/push the board on main" threshold="protectedBranches repo blocks direct main push so the board is unusable; a dedicated ref is protected-main-safe"
// The `ing` ref is a board-only branch: read via `git show ing:ING.jsonl`, write via
// plumbing (hash-object→mktree→commit-tree→update-ref) + best-effort `push origin ing`.
// → branch-switch-proof (never in worktree) · committed · shared (push) · protected-safe.
// `done` SCRUBS (completed work graduates to CHANGELOG; ING holds only what's ACTIVE).
// SessionStart `inject` surfaces open work + running pods so the board is seen.
import { existsSync, readFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { info, ok, warn, nowIso } from "../lib/log.ts";
import { readStdin, execArgs } from "../lib/exec.ts";
import { config } from "../lib/config.ts";
import { setLiveMarker, staleLongRunnerWarn } from "./heartbeat-guard.ts";

// live long-runner labels (ing-board pods) for the c21 heartbeat guard.
export async function liveLongRunnerLabels(cwd: string = REPO_ROOT): Promise<string[]> {
  const rows = await readItems(cwd);
  return rows.filter((r) => r.kind === "pod").map((r) => `pod ${r.id}(${r.gpu ?? "?"})`);
}

const ING_REF = "ing";
const ING_FILE = "ING.jsonl";

interface Item {
  kind: "work" | "next" | "pod";
  id: string;
  ts: string;
  text?: string;
  from?: string; // set when forwarded from another repo (harness ing add --to <repo>)
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
async function readItems(cwd: string = REPO_ROOT): Promise<Item[]> {
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

// Write the board to the `ing` ref via plumbing (no working-tree touch) + best-effort
// push. Offline / no-push-perm → the local ref still advances and we warn once.
async function writeItems(rows: Item[], msg: string, cwd: string = REPO_ROOT): Promise<boolean> {
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

export async function runIng(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";

  if (sub === "add" || sub === "next") {
    // `--to <repo>` forwards the item to a SIBLING project's `ing` ref (cross-repo
    // hand-off — lands directly on the target repo's board branch, tagged `from`).
    const toIdx = args.indexOf("--to");
    let to = "";
    let parts = args.slice(1);
    if (toIdx >= 1) {
      to = args[toIdx + 1] ?? "";
      parts = args.slice(1).filter((_, i) => i + 1 !== toIdx && i + 1 !== toIdx + 1);
    }
    const text = parts.join(" ").trim();
    if (!text) return usage();
    if (to) {
      const destRoot = resolve(REPO_ROOT, "..", to);
      if (!existsSync(destRoot)) {
        info(`ing: 대상 repo 없음 — ${to} (형제 디렉토리 ${resolve(REPO_ROOT, "..")}/ 에서 확인)`);
        return 1;
      }
      const from = basename(REPO_ROOT);
      const destRows = await readItems(destRoot);
      const item: Item = { kind: "work", id: nextId(destRows), ts: nowIso(), text, from };
      await writeItems([...destRows, item], `ing: + (from ${from}) ${text}`, destRoot);
      ok(`ing: → ${to} 의 ing ref 에 전달 (from ${from}) — 그 repo 다음 세션 SessionStart 에 📥 표면화`);
      return 0;
    }
    const rows = await readItems();
    const item: Item = { kind: sub === "add" ? "work" : "next", id: nextId(rows), ts: nowIso(), text };
    await writeItems([...rows, item], `ing: + ${sub === "add" ? "work" : "next"} ${text}`);
    ok(`ing: + ${sub === "add" ? "작업" : "다음"} — ${text}`);
    return 0;
  }

  if (sub === "done") {
    const tokens = args.slice(1).filter(Boolean);
    const m = tokens.join(" ");
    const rows = await readItems();
    const openIds = () => rows.map((r) => r.id + (r.kind === "pod" ? "(pod)" : "")).join(", ") || "none";
    if (!tokens.length) {
      info(`ing: usage — harness ing done <id|id...|match>. open ids: ${openIds()}`);
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
    setLiveMarker(afterDone.some((r) => r.kind === "pod")); // c21: clear marker when no pod remains
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
      const parts: string[] = [];
      if (work.length) parts.push(`작업 ${work.length}: ` + work.map((r) => `#${r.id}${r.from ? ` 📥${r.from}` : ""} ${r.text}`).join(" · "));
      if (pods.length) parts.push(`POD ${pods.length}: ` + pods.map((r) => `${r.id}(${r.gpu ?? "?"})`).join(" · "));
      let ctx = `🔵 ING (진행중 · ing ref) — ${parts.join("  |  ")}  · \`harness ing show\` / done <id>`;
      // c21 heartbeat: flag live long-runners (pods) left unchecked past maxSilenceSec.
      const hb = staleLongRunnerWarn(
        pods.map((r) => `pod ${r.id}(${r.gpu ?? "?"})`),
        config().poll.maxSilenceSec,
        Date.now()
      );
      if (hb) ctx += `\n⏰ ${hb}`;
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: ev, additionalContext: ctx } }) + "\n");
    } catch {
      return 0;
    }
    return 0;
  }

  // show
  const rows = await readItems();
  if (!rows.length) {
    info("ing: empty (ing ref). add: harness ing add <text> · next <text> · pod add ...");
    return 0;
  }
  const work = rows.filter((r) => r.kind === "work");
  work.sort((a, b) => resumeRank(a) - resumeRank(b)); // c17: ↩resume first
  const pods = rows.filter((r) => r.kind === "pod");
  const next = rows.filter((r) => r.kind === "next");
  info(`ING — 진행중 (ing ref · git show ing:ING.jsonl) · 완료→CHANGELOG · 최종설계→ARCHITECTURE`);
  info(`작업 (in-progress): ${work.length || "—"}`);
  for (const r of work) info(`  • #${r.id}${r.from ? ` 📥${r.from}` : ""} ${r.text}   (since ${r.ts.slice(0, 10)})`);
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
      info("usage: harness ing pod add <id> <provider> <gpu> <purpose> [cost/hr]");
      return 1;
    }
    const cost = rest.length && /^[\d.$]/.test(rest[rest.length - 1]) ? rest.pop()! : "-";
    const purpose = rest.join(" ") || "-";
    const kept = rows.filter((r) => !(r.kind === "pod" && r.id === id));
    kept.push({ kind: "pod", id, ts: nowIso(), provider: provider ?? "-", gpu: gpu ?? "-", purpose, cost });
    await writeItems(kept, `ing: pod + ${id}`);
    setLiveMarker(true); // c21: a live long-runner now exists
    ok(`ing pod: + ${id} (${gpu ?? "-"} · ${purpose})`);
    return 0;
  }
  if (verb === "rm") {
    const id = args[1];
    if (!id) {
      info("usage: harness ing pod rm <id>");
      return 1;
    }
    const afterRm = rows.filter((r) => !(r.kind === "pod" && r.id === id));
    await writeItems(afterRm, `ing: pod rm ${id}`);
    setLiveMarker(afterRm.some((r) => r.kind === "pod")); // c21: clear marker when no pod remains
    info(`ing pod: removed ${id}`);
    return 0;
  }
  info("usage: harness ing pod {add <id> <provider> <gpu> <purpose> [cost]|rm <id>|list}");
  return 1;
}

function usage(): number {
  info("usage: harness ing {show|add <text> [--to <repo>]|done <id|match>|next <text>|pod {add|rm|list}|inject}");
  return 1;
}
