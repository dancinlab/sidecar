// sidecar ship [--no-doc]
// SIDECAR-REPO-ONLY propagation: ship is NOT a generic per-repo command. Steps 2-3
// (self-update the global sidecar CLI · re-mirror sidecar's own commands/) only make
// sense in the sidecar SOURCE repo — it propagates SIDECAR's own changes across the
// surfaces a sidecar install lives on. In any other repo, use `sidecar pr-cycle` for a
// plain verified merge.
//
//   pre. sidecar-repo gate — refuse outside the sidecar source repo
//   0. inject-bloat guard — context-rot recurrence guard (re-injected sources under cap)
//   1. pr-cycle    — doc-gate → push → PR → verified merge → local main ff-sync
//   2. self-update — git-pull the GLOBAL CLI clone (~/.sidecar/cli) to the just-merged main
//   3. shadow      — re-mirror commands/ → ~/.claude/commands/ as bare /cmd delegators
//
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { info, ok, loudFail } from "../lib/log.ts";
import { repoPath, inGitRepo } from "../lib/config.ts";
import { REPO_ROOT } from "../lib/paths.ts";
import { readStdin, execShell } from "../lib/exec.ts";
import { injectCapViolations } from "./lint.ts";
import { lastAssistantText } from "./recommend.ts";
import { BLOCKER_RE, ING_NEXT_RE, isQuotedMention } from "./goal-guard.ts";
import { runPrCycle } from "./pr-cycle.ts";
import { runSelfUpdate } from "./setup.ts";
import { runShadow } from "./shadow.ts";

// The sidecar SOURCE repo is the one that carries the CLI itself (cli/index.ts) and the
// shadow source (commands/) — uniquely identifying it, config-free.
function isSidecarRepo(): boolean {
  return existsSync(repoPath("cli/index.ts")) && existsSync(repoPath("modules/shadow.ts")) && existsSync(repoPath("commands"));
}

export async function runShip(args: string[]): Promise<number> {
  // stop-check (Stop hook) — pr-cycle/ship ENTRY enforce. The governance rule "impl/fix done
  // → verified merge" (commons cycle-docs-pr) was previously carried ONLY by per-turn inject
  // TEXT (advisory). This GATES the entry deterministically: uncommitted CODE in the tree →
  // block, UNLESS the reply carries a VALIDATED deferral. "done" has NO text form — the only
  // success path is a clean tree (real ship/pr-cycle → merged + ff-synced → no code diff →
  // auto-pass BEFORE any text is read), so a "완료/merged" claim over a dirty tree cannot lie
  // its way through. The lone escape is `🚢 SHIP: 보류(<사유>)` whose <사유> matches a CONCRETE
  // legitimacy class (foreign WIP · session-terminal blocker · user directive · declared
  // multi-step + `ing next`); a bare excuse ("나중에"·"귀찮음") matches none → blocks. Mirrors
  // goal-guard's remnant hardening (shared BLOCKER_RE/ING_NEXT_RE/isQuotedMention · single
  // SSOT). Anti-wedge caps it once/chain. CC-only (Pi has no blocking Stop).
  if (args[0] === "stop-check") return shipStopCheck();

  // pre. sidecar-repo gate — ship is sidecar-development-only (self-update + shadow act on
  // the sidecar install, meaningless elsewhere). Not generic; other repos use pr-cycle.
  if (!isSidecarRepo()) {
    loudFail("ship: sidecar-repo ONLY — it self-updates the global sidecar CLI + re-mirrors sidecar's commands (no-op/meaningless in other repos). For a verified merge here, use `sidecar pr-cycle`.");
    return 1;
  }

  // 0. inject-bloat guard — the "AI gets dumber" (context-rot) recurrence guard as ship's
  // FINAL pre-flight: every source re-injected to the agent each turn must stay under its
  // byte cap, or it silently degrades all future turns. sidecar-specific (injectCaps lists
  // this repo's inject sources). No bypass (no-escape-hatch): trim the source, then ship.
  info("ship: 1/4 — inject-bloat guard (context-rot · injectCaps)…");
  const bloated = injectCapViolations();
  if (bloated.length) {
    for (const v of bloated) loudFail(`ship: INJECT-OVERSIZED ${v.file} — ${v.msg}`);
    loudFail("ship: STOP — inject source over cap = context-rot risk (AI 멍청해짐 재발). trim it under cap, then re-run `sidecar ship`.");
    return 1;
  }

  // forward pr-cycle flags (e.g. --no-doc for config/data-only changes)
  info("ship: 2/4 — pr-cycle (verified merge to main)…");
  const merged = await runPrCycle(args);
  if (merged !== 0) {
    loudFail("ship: pr-cycle failed — STOP. global CLI + shadow NOT touched (nothing merged to propagate).");
    return merged;
  }

  // global CLI clone (~/.sidecar/cli) git-pulls the merged main — terminal `sidecar …` current.
  info("ship: 3/4 — self-update (global CLI ~/.sidecar/cli)…");
  const updated = await runSelfUpdate([]);
  if (updated !== 0) {
    loudFail("ship: self-update failed — merge landed but global CLI is STALE. fix then re-run `sidecar self-update`.");
    return updated;
  }

  // re-mirror commands/ so any NEW slash delegator appears in the picker (shadow is the
  // command source — plugin.json ships commands:[], so this step is what makes /cmd visible).
  info("ship: 4/4 — shadow (mirror slash commands → ~/.claude/commands)…");
  // Run shadow via the GLOBAL binary (self-update above refreshed ~/.sidecar/cli),
  // NOT in-process: pr-cycle (step 2) may have swept THIS worktree when ship ran from
  // one, so the in-process SIDECAR_ROOT/commands source can be gone. `sidecar shadow`
  // mirrors from the just-updated global clone, surviving the self-sweep. Fall back to
  // in-process only if the global binary isn't on PATH.
  // cwd=homedir: the ship process's own cwd is the worktree pr-cycle just swept, so a
  // subshell inheriting that dead cwd fails getcwd (command -v mis-fires → false NO_GLOBAL).
  const gsh = await execShell("command -v sidecar >/dev/null 2>&1 && sidecar shadow 2>&1 || echo __NO_GLOBAL_SIDECAR__", { cwd: homedir() });
  let mirrored: number;
  if (gsh.stdout.includes("__NO_GLOBAL_SIDECAR__")) {
    mirrored = runShadow([]);
  } else {
    process.stdout.write(gsh.stdout);
    mirrored = gsh.code;
  }
  if (mirrored !== 0) {
    loudFail("ship: shadow failed — merge + global CLI current, but new slash commands may be missing. re-run `sidecar shadow`.");
    return mirrored;
  }

  ok("ship: propagated to all surfaces (merge ✓ · global CLI ✓ · shadow ✓).");
  info("  • new slash commands → reload Claude Code (/reload-plugins or restart) to pick them up.");
  info("  • plugin-install users (/plugin) refresh separately via `/plugin update` after a version bump.");
  return 0;
}

// Stop-hook gate: force pr-cycle/ship at the END of a turn that produced impl/fix code.
// TWO earlier defects (see convergence ship-ts-1): (1) SURFACE — the old `/🚢 SHIP/` check
// was keyword-existence, not validation, so a bare `보류(귀찮음)` cost one line; (2) STRUCTURAL
// — that check ran BEFORE the dirty-tree trigger, making the marker a global bypass that also
// let a "완료/merged" claim pass over a dirty tree (text faking a state the tree could prove).
// Fix: DETERMINISTIC TRIGGER FIRST (clean tree = the only "done", text-unfakeable), then the
// marker as a validated LAST-RESORT deferral. "done" has no text form; the marker means
// deferral ONLY, and its <사유> must match a CONCRETE legitimacy class.
//
// Deferral legitimacy classes (a bare excuse matches none → blocks · commons no-escape-hatch):
//   (a) foreign WIP  — uncommitted files THIS session did not author
//   (b) session-terminal blocker — CI wait · human approval · external dep · another machine
//       (reuses goal-guard BLOCKER_RE verbatim — the class list is single-SSOT across gates)
//   (c) explicit user directive — the user told the agent to hold/stage the work
//   (d) declared multi-step WIP — intent phrase AND an `ing next` resume point (the only
//       self-granted class, so it alone carries the ing-next tax, mirroring goal-guard)
const SHIP_DEFER_MARKER_RE = /🚢\s*SHIP\s*[:：]\s*보류\s*[(（]\s*([^)）\n]{2,160})\s*[)）]/g;
const SHIP_FOREIGN_RE =
  /(다른|타|이전|형제)\s*(세션|소유|주인|에이전트|작업자)|(내|이\s*세션)(가|이|의|에서)?\s*(만들|생성|작성|수정)(하지|치)?\s*않|기존\s*(미커밋|WIP|변경)|사전\s*존재|(another|other|sibling|previous)\s+(session|owner|agent)('s)?|pre-?existing|not\s+(mine|created|authored)|foreign\s+WIP/i;
const SHIP_USER_RE =
  /(사용자|유저)\s*의?\s*(지시|요청|결정|승인|보류)|명시(적)?\s*지시|(user|owner)\s+(direct(ed|ive)|request(ed)?|decision|asked|told)|per\s+user/i;
const SHIP_WIP_RE =
  /(다단계|멀티\s*스텝|여러\s*단계|단계\s*\d|다음\s*(턴|단계)에\s*(이어|계속)|계속\s*진행|이어서\s*진행|multi-?step|in\s+progress|continu(e|ing)|step\s+\d+\s*(of|\/)\s*\d+|next\s+(turn|step))/i;

async function shipStopCheck(): Promise<number> {
  let payload: { stop_hook_active?: boolean; transcript_path?: string; transcriptPath?: string };
  try {
    payload = JSON.parse(readStdin());
  } catch {
    return 0;
  }
  if (payload?.stop_hook_active) return 0; // already nudged this chain — don't wedge
  if (!inGitRepo()) return 0; // any git repo (managed-marker abolished · config.ts inGitRepo)

  // DETERMINISTIC TRIGGER FIRST — uncommitted CODE in the tree. A completed pr-cycle/ship
  // leaves it clean (verified merge + local main ff-sync) → no diff → auto-pass here, before
  // any text is read (success is text-unfakeable). Restricted to code extensions so pure-
  // doc/config turns don't nag (config-only merges use `pr-cycle --no-doc` on their own cadence).
  let changed = "";
  try {
    changed = (await execShell("git diff --name-only && git diff --cached --name-only", { cwd: REPO_ROOT })).stdout;
  } catch {
    return 0;
  }
  const CODE = /\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|c|h|cpp|hpp|cc|java|kt|swift|rb|php|sh|hexa)$/i;
  if (!changed.split("\n").some((f) => CODE.test(f.trim()))) return 0; // no code change → pass

  // dirty code remains — the ONLY exit now is a VALIDATED deferral marker.
  const tp = payload?.transcript_path ?? payload?.transcriptPath;
  if (!tp) return 0;
  const text = lastAssistantText(String(tp));
  if (!text) return 0;
  for (const m of text.matchAll(SHIP_DEFER_MARKER_RE)) {
    if (isQuotedMention(text, m.index ?? 0, m[0].length)) continue; // quoted = meta-discussion, not live
    const why = m[1];
    if (SHIP_FOREIGN_RE.test(why) || BLOCKER_RE.test(why) || SHIP_USER_RE.test(why)) return 0;
    if (SHIP_WIP_RE.test(why) && ING_NEXT_RE.test(text)) return 0;
  }

  const reason =
    "이번 턴에 impl/fix(미커밋 코드 변경)를 남긴 채 verified merge 없이 턴을 끝내려 한다 — `sidecar ship`(sidecar 레포)/" +
    "`sidecar pr-cycle`(그 외)로 머지해 tree 를 정리하라. 머지가 진짜면 tree 는 깨끗해져 이 게이트는 자동 통과한다 " +
    "(dirty tree + '완료/merged' 주장만으로는 통과 불가). 정당한 보류일 때만 `🚢 SHIP: 보류(<사유>)` 를 쓰되, <사유>는 다음 중 하나가 " +
    "CONCRETE 하게 명시돼야 한다: ① 다른 세션/소유자의 기존 WIP(내가 만들지 않음) ② CI 대기·사람 승인·외부 의존 등 " +
    "session-terminal 블로커 ③ 사용자의 명시 지시 ④ 다단계 진행 중 + `sidecar ing next <지점>` 기록. 근거 없는 보류(나중에·귀찮음 등)는 통과하지 않는다.";
  process.stdout.write(JSON.stringify({ decision: "block", reason }) + "\n");
  return 0;
}
