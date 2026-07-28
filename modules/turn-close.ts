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
import { config, inGitRepo } from "../lib/config.ts";
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

// BOOTSTRAP seeds — the demands that survive their own store's ABSENCE. Every leg here is
// keyed on a STORE EXISTENCE CHECK (`designSsot()` = repo-root file · `ingBoardActive()` =
// `refs/heads/ing`), so in a fresh repo the discipline is not "off", it is UNASKED-FOR: no
// inject, no trio line, no forgery check, and nothing anywhere says to create the store.
// One seed per absent store, emitted ONLY while it is absent (store appears → dead branch,
// zero bytes/turn), rendered whole or not at all (never truncated · inject-lint), opt-out
// `archSeed`/`ingSeed: false` (opt-OUT, never opt-IN — a marker-keyed gate is silent-dead in
// exactly the new repos it is for · config-ts-1).
// The agent AUTHORS the store; the hook must never scaffold one, because mere presence arms
// the leg and an engine-written placeholder would gate every reply against fiction
// (ARCH-PLACEHOLDER blocks that state at the commit gate too).
const ARCH_SEED =
  "🌱 설계 SSOT 부재 — repo-root `ARCHITECTURE.json` 이 없어 이 repo 의 🏛️ ARCHITECTURE · 🧬 CONVERGENCE 규율이 통째로 꺼져 있다(파일 존재로 켜짐). " +
  "코드 repo 면 지금 실제 코드를 읽고 현재상태 트리 + `\"convergence\": {\"records\": []}` 를 담은 `ARCHITECTURE.json` 을 직접 작성하라 " +
  "— 스캐폴드 placeholder 를 남기면 lint 가 막는다(ARCH-PLACEHOLDER) · 작성 후 `sidecar architecture lint` 로 확인. " +
  "설계 SSOT 가 필요없는 스크래치/비코드 repo 면 `harness.config.json` 에 `\"archSeed\": false` 로 이 줄을 끈다.";

// MD-ONLY variant — the tree exists as `ARCHITECTURE.md`, so `legs.arch` is armed and
// ARCH_SEED is silent, but `legs.conv` is NOT: convergence records live in the JSON store
// only (`activeLegs`), so recurrence learning is still silent-dead. Same seed contract,
// same `archSeed` knob (one design-SSOT demand, two states of the same store).
const ARCH_JSON_SEED =
  "🌱 설계 SSOT 가 `ARCHITECTURE.md` 뿐 — JSON 트리가 없어 🧬 CONVERGENCE(재발방지 학습 store `convergence.records[]`)가 꺼져 있다(JSON 파일에만 존재). " +
  "md 내용을 읽어 현재상태 트리 + `\"convergence\": {\"records\": []}` 를 담은 `ARCHITECTURE.json` 으로 승격하라 (작성 후 `sidecar architecture lint`). " +
  "산문 트리로 충분한 repo 면 `harness.config.json` 에 `\"archSeed\": false`.";

// ING board seed — the same absence-tolerant demand for the board. `ing add` does create the
// store on the spot, but nothing ever tells the agent that THIS repo has no board and that
// the 🔄 leg is therefore disarmed (`ing inject` is silent with no items · commons
// `ing-board` is generic, board-state-blind text). CONDITIONAL-imperative by wording: it asks
// for a board only when the turn actually HAS multi-step work — an unconditional "create a
// board" would buy the line's silence with a fabricated board, arming the Stop gate against
// fiction (the ARCH-PLACEHOLDER failure mode, with no lint to catch it).
const ING_SEED =
  "🌱 ING 보드 부재 — `refs/heads/ing` 이 없어 이 repo 의 🔄 ING 규율(진행판 · 턴마감 leg)이 꺼져 있다. " +
  "이번 일이 다단계 작업·인계면 첫 단계로 `sidecar ing add \"<작업>\"` 로 보드를 열어라 — 그 add 가 ref 와 🔄 leg 를 함께 켠다 " +
  "(작업트리에 `ING.jsonl` 을 손으로 만들지 말 것 · 저장소는 git ref). 줄 하나 끄려고 빈/가짜 항목을 넣지 말고, " +
  "일회성/스크래치 repo 면 `harness.config.json` 에 `\"ingSeed\": false`.";

// inject (UserPromptSubmit) — re-assert the trio contract every turn + snapshot the ING
// baseline the Stop-time forgery check compares against. Silent when no leg is active
// AND every store already exists (otherwise the bootstrap seeds ride alone).
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
  const cfg = config();
  // One seed per ABSENT store. arch: no tree at all → ARCH_SEED · tree but no JSON → the
  // MD-only promote line (🧬 store missing). Both ride the one `archSeed` knob.
  const seeds = [
    cfg.archSeed !== false ? (!legs.arch ? ARCH_SEED : !legs.conv ? ARCH_JSON_SEED : "") : "",
    !legs.ing && cfg.ingSeed !== false ? ING_SEED : "",
  ].filter(Boolean);
  if (!legs.ing && !legs.arch && !legs.conv && !seeds.length) return 0;
  const tp = j.transcript_path ?? j.transcriptPath;
  // ING baseline only matters when a leg is actually gated at Stop; a seed-only turn has
  // nothing to forgery-check, so it must not disturb the snapshot.
  if (tp && (legs.ing || legs.arch || legs.conv)) writeBase(String(tp), await ingRefSha());

  const lines: string[] = [];
  if (legs.ing) lines.push("`🔄 ING 갱신: <무엇을>` 또는 `🔄 ING: 변동 없음`");
  if (legs.arch) lines.push("`🏛️ ARCHITECTURE 갱신: <무엇을>` 또는 `🏛️ ARCHITECTURE: 변동 없음`");
  if (legs.conv) lines.push("`🧬 CONVERGENCE 기록: <id>` 또는 `🧬 CONVERGENCE: 해당 없음`");
  const trio = lines.length
    ? "⏱️ 턴 마감 트리오 (매 응답 필수 · `turn-close check` 가 누락/위조 시 차단) — 응답 끝에 함께: " +
      lines.join(" · ") +
      ". 갱신/기록 주장은 검증된다 (ING=ing ref 전진 · ARCHITECTURE=파일 diff · CONVERGENCE=records[] id + diff). " +
      "게이트 verdict·실험 결과는 별도 store 없이 ARCHITECTURE.json 해당 노드(type:\"gate\")에 update-in-place 후 🏛️ 갱신으로 보고."
    : "";
  emitInject("turn-close", ev, [trio, ...seeds].filter(Boolean).join("\n"));
  return 0;
}

export async function runTurnClose(args: string[]): Promise<number> {
  const sub = args[0];
  if (sub === "check") return check();
  if (sub === "inject") return injectVerb();
  info("usage: sidecar turn-close {check|inject}");
  return 1;
}
