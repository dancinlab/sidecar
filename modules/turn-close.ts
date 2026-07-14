// sidecar turn-close {check|inject} — the turn-close TRIO gate.
//
// EVERY reply must carry three report lines together — `🔄 ING`, `🏛️ ARCHITECTURE`,
// `🧬 CONVERGENCE` — each either a `갱신`/`기록` claim or an explicit no-change
// affirmation. This REPLACES the four signal-driven Stop gates it supersedes
// (`ing stop-check`, `architecture stop-check`, `architecture convergence stop-check`,
// `architecture gate-stop-check`), and with them the whole keyword-scan mechanism.
//
// Why the scanners died: a keyword net over the agent's own last message fires
// unpredictably and LATE — it ambushes the turn AFTER the reply is written, so the
// three reports never land together. Worse, they could not all be enforced anyway:
// each gate was bounded by `stop_hook_active` (anti-wedge), so the FIRST gate to block
// consumed the chain and the other two silently skipped — two thirds of the trio was
// structurally unenforceable. One gate, one block, one reason listing every missing or
// forged leg: deterministic, repairable in a single re-turn, still exactly one block
// per stop-chain.
//
// `🔬 GATE` is gone with them: a gate verdict IS an ARCHITECTURE.json `type:"gate"` node
// edit, which the mandatory `🏛️` line already reports and forgery-verifies against the
// same file (single-doc). The gate id goes in the free text of the `갱신:` claim.
//
// Claims are diff-verified (a marker alone is self-report forgery · commons verify-done);
// no-change affirmations never are (false-positive-averse asymmetry). Legs with nothing to
// protect are inert, so a plain repo with no design tree and no board sees nothing.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT, LOG_DIR } from "../lib/paths.ts";
import { readStdin, execShell } from "../lib/exec.ts";
import { inGitRepo } from "../lib/config.ts";
import { emitInject } from "../lib/inject.ts";
import { info } from "../lib/log.ts";
import { lastAssistantText } from "./recommend.ts";
import { designSsot, loadConvergence } from "./architecture.ts";
import { ingBoardActive, ingRefSha } from "./ing.ts";

// The three markers. `갱신`/`기록` = a verified claim; the no-change form = an affirmation.
// The classical-building emoji carries an optional VS16 (U+FE0F) — accept it either way so a
// stripped-variation-selector render never reads as a missing line.
const MARK = {
  ing: {
    label: "🔄 ING",
    claim: /🔄\s*ING\s*갱신\s*[:：]\s*\S/u,
    none: /🔄\s*ING\s*[:：]\s*변동\s*없음/u,
  },
  arch: {
    label: "🏛️ ARCHITECTURE",
    claim: /\u{1F3DB}\u{FE0F}?\s*ARCHITECTURE\s*갱신\s*[:：]\s*\S/u,
    none: /\u{1F3DB}\u{FE0F}?\s*ARCHITECTURE\s*[:：]\s*변동\s*없음/u,
  },
  conv: {
    label: "🧬 CONVERGENCE",
    claim: /🧬\s*CONVERGENCE\s*기록\s*[:：]\s*([A-Za-z0-9][A-Za-z0-9-]*)/u,
    none: /🧬\s*CONVERGENCE\s*[:：]\s*해당\s*없음/u,
  },
};

// Which legs this repo actually has. No design tree ⇒ no 🏛️/🧬 demand; no board ⇒ no 🔄.
// All three off ⇒ the gate is a silent no-op (a plain repo is never gated).
interface Legs {
  ing: boolean;
  arch: boolean;
  conv: boolean;
  archRel: string;
}

async function activeLegs(): Promise<Legs> {
  const found = designSsot();
  return {
    ing: await ingBoardActive(),
    arch: !!found,
    // convergence records live in the JSON tree only — an ARCHITECTURE.md repo has no store.
    conv: !!found && found.rel.endsWith(".json"),
    archRel: found?.rel ?? "ARCHITECTURE.json",
  };
}

// Every path this turn touched: working tree + staged + the commit just made. The
// last-commit leg keeps the check false-positive-averse in the worktree/ship flow — an
// agent that updated the tree AND already merged mid-turn passes via that commit's files.
async function gitFootprint(): Promise<Set<string>> {
  const out = new Set<string>();
  const add = (s: string) =>
    s
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean)
      .forEach((f) => out.add(f));
  try {
    add((await execShell("git diff --name-only && git diff --cached --name-only", { cwd: REPO_ROOT })).stdout);
  } catch {
    /* not a git repo / git missing → empty footprint, claims can't be verified */
  }
  try {
    add((await execShell("git log -1 --name-only --pretty=format:", { cwd: REPO_ROOT })).stdout);
  } catch {
    /* no commits yet */
  }
  return out;
}

// ING baseline — the `ing` ref sha as of the START of the turn, snapshotted by `inject`
// (UserPromptSubmit) and keyed by transcript. A board mutation always advances the ref
// (ing writes via plumbing), so sha-unchanged + a `갱신` claim = forgery. No baseline
// (Pi · inject failed · fresh session) ⇒ verification is SKIPPED, never a false block.
const BASE_FILE = resolve(LOG_DIR, "turn-close-base.json");

function readBase(transcript: string): { ingSha: string } | null {
  try {
    const j = JSON.parse(readFileSync(BASE_FILE, "utf8")) as { transcript?: string; ingSha?: string };
    if (j.transcript === transcript) return { ingSha: j.ingSha ?? "" };
  } catch {
    /* no snapshot → skip verification */
  }
  return null;
}

function writeBase(transcript: string, ingSha: string): void {
  try {
    mkdirSync(LOG_DIR, { recursive: true }); // LOG_DIR is <repo>/.harness/logs — absent in a fresh
    // clone/worktree, and a silent write failure would disable ING forgery verification for good.
    writeFileSync(BASE_FILE, JSON.stringify({ transcript, ingSha }) + "\n");
  } catch {
    /* best-effort — a missing snapshot only skips ING forgery verification */
  }
}

const FIX_ING =
  "`🔄 ING` — 진행이 바뀌었으면(코드 편집뿐 아니라 측정·verdict·벤치·에이전트 착륙 포함) `sidecar ing add/next/done` 후 `🔄 ING 갱신: <무엇을>`, 아니면 `🔄 ING: 변동 없음`.";
const FIX_ARCH =
  "`🏛️ ARCHITECTURE` — 설계·구조·게이트 verdict·실험 결과가 바뀌었으면 ARCHITECTURE.json 해당 노드를 update-in-place 갱신 후 `🏛️ ARCHITECTURE 갱신: <무엇을>`, 아니면 `🏛️ ARCHITECTURE: 변동 없음`.";
const FIX_CONV =
  "`🧬 CONVERGENCE` — 진짜 재발(첫 발생 아님)이면 `sidecar architecture convergence for <원인파일>` 로 기존 학습을 먼저 꺼내 `edit <id>`(갱신) 또는 `add --source … --value … --threshold …`(신규) 후 `🧬 CONVERGENCE 기록: <id>`, 아니면 `🧬 CONVERGENCE: 해당 없음`.";

// check (Stop hook) — the whole trio in ONE gate, ONE block, ONE reason.
async function check(): Promise<number> {
  let payload: { stop_hook_active?: boolean; transcript_path?: string; transcriptPath?: string };
  try {
    payload = JSON.parse(readStdin());
  } catch {
    return 0;
  }
  if (payload?.stop_hook_active) return 0; // one block per stop-chain (anti-wedge)
  if (!inGitRepo()) return 0;
  const tp = payload?.transcript_path ?? payload?.transcriptPath;
  if (!tp) return 0;
  const transcript = String(tp);
  const text = lastAssistantText(transcript);
  if (!text) return 0;

  const legs = await activeLegs();
  if (!legs.ing && !legs.arch && !legs.conv) return 0; // nothing to protect → inert

  const missing: string[] = [];
  const forged: string[] = [];
  const fixes: string[] = [];
  let footprint: Set<string> | null = null;
  const foot = async (): Promise<Set<string>> => (footprint ??= await gitFootprint());

  if (legs.ing) {
    const claimed = MARK.ing.claim.test(text);
    if (!claimed && !MARK.ing.none.test(text)) {
      missing.push(MARK.ing.label);
      fixes.push(FIX_ING);
    } else if (claimed) {
      const base = readBase(transcript);
      if (base && base.ingSha === (await ingRefSha())) {
        forged.push("`🔄 ING 갱신` 을 주장했는데 이번 턴에 ing ref 가 전진하지 않았다 (보드 실변경 0)");
        fixes.push(FIX_ING);
      }
    }
  }

  if (legs.arch) {
    const claimed = MARK.arch.claim.test(text);
    if (!claimed && !MARK.arch.none.test(text)) {
      missing.push(MARK.arch.label);
      fixes.push(FIX_ARCH);
    } else if (claimed && !(await foot()).has(legs.archRel)) {
      forged.push(
        `\`🏛️ ARCHITECTURE 갱신\` 을 주장했는데 ${legs.archRel} 실변경이 없다 (working tree·staged·직전 커밋 모두 미포함)`,
      );
      fixes.push(FIX_ARCH);
    }
  }

  if (legs.conv) {
    const m = text.match(MARK.conv.claim);
    if (!m && !MARK.conv.none.test(text)) {
      missing.push(MARK.conv.label);
      fixes.push(FIX_CONV);
    } else if (m) {
      const id = m[1];
      if (!loadConvergence().some((r) => r.id === id)) {
        forged.push(`\`🧬 CONVERGENCE 기록: ${id}\` 를 주장했는데 convergence.records[] 에 그 id 가 없다`);
        fixes.push(FIX_CONV);
      } else if (!(await foot()).has(legs.archRel)) {
        forged.push(`\`🧬 CONVERGENCE 기록: ${id}\` 를 주장했는데 ${legs.archRel} 실변경이 없다 (레코드 미기록)`);
        fixes.push(FIX_CONV);
      }
    }
  }

  if (!missing.length && !forged.length) return 0;

  const parts = [
    "턴 마감 트리오 위반 — 매 응답은 " +
      [legs.ing && "🔄 ING", legs.arch && "🏛️ ARCHITECTURE", legs.conv && "🧬 CONVERGENCE"].filter(Boolean).join(" · ") +
      " 줄을 함께 포함해야 한다 (신호 스캔 폐기 · 무조건 트리오).",
  ];
  if (missing.length) parts.push(`누락: ${missing.join(" · ")}.`);
  if (forged.length) parts.push(`위조: ${forged.join(" · ")} — 마커만 쓰는 자기보고 위조 금지 (commons verify-done).`);
  parts.push(fixes.join(" "));
  process.stdout.write(JSON.stringify({ decision: "block", reason: parts.join(" ") }) + "\n");
  return 0;
}

// inject (UserPromptSubmit) — re-assert the trio contract every turn + snapshot the ING
// baseline the Stop-time forgery check compares against. Silent when no leg is active.
async function injectVerb(): Promise<number> {
  let j: { hook_event_name?: string; hookEventName?: string; transcript_path?: string; transcriptPath?: string };
  try {
    j = JSON.parse(readStdin());
  } catch {
    return 0;
  }
  const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
  if (!ev) return 0;
  if (!inGitRepo()) return 0;
  const legs = await activeLegs();
  if (!legs.ing && !legs.arch && !legs.conv) return 0;
  const tp = j.transcript_path ?? j.transcriptPath;
  if (tp) writeBase(String(tp), await ingRefSha());

  const lines: string[] = [];
  if (legs.ing) lines.push("`🔄 ING 갱신: <무엇을>` 또는 `🔄 ING: 변동 없음`");
  if (legs.arch) lines.push("`🏛️ ARCHITECTURE 갱신: <무엇을>` 또는 `🏛️ ARCHITECTURE: 변동 없음`");
  if (legs.conv) lines.push("`🧬 CONVERGENCE 기록: <id>` 또는 `🧬 CONVERGENCE: 해당 없음`");
  const ctx =
    "⏱️ 턴 마감 트리오 (매 응답 필수 · `turn-close check` 가 누락/위조 시 차단) — 응답 끝에 함께: " +
    lines.join(" · ") +
    ". 갱신/기록 주장은 검증된다 (ING=ing ref 전진 · ARCHITECTURE=파일 diff · CONVERGENCE=records[] id + diff). " +
    "게이트 verdict·실험 결과는 별도 store 없이 ARCHITECTURE.json 해당 노드(type:\"gate\")에 update-in-place 후 🏛️ 갱신으로 보고.";
  emitInject("turn-close", ev, ctx);
  return 0;
}

export async function runTurnClose(args: string[]): Promise<number> {
  const sub = args[0];
  if (sub === "check") return check();
  if (sub === "inject") return injectVerb();
  info("usage: sidecar turn-close {check|inject}");
  return 1;
}
