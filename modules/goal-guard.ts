// sidecar goal-guard stop-check
// Stop-hook guard that CATCHES an agent punting the work instead of continuing
// now. Three catches share one gate:
//  1. FUTURE-SESSION defer — the reply CLOSES with "이건 다음 세션에서 이어가겠습니다"
//     (deferral phrase in the last ~8 non-empty lines).
//  2. LIVE REMNANT — the reply mentions '잔여' (leftover work) anywhere without
//     negating it ("잔여 없음"/"잔여 작업 완료했" pass), i.e. it reports remaining
//     work and stops instead of finishing it.
//  3. INFRA PUNT — the reply mentions an 'infra'/'인프라' wall (keyword + a
//     failure signal on the SAME line) AND a punt verb (우회/격리/미룸/fallback…)
//     without fixing it, i.e. it works AROUND an infra defect instead of fixing
//     the cause. commons `upstream-fix`: fix the cause in its canonical repo now.
// All three block the stop so the model presses on.
//
// Precision + escape (so it never wedges a genuine multi-session handoff):
//  - Defer fires ONLY on the closing tail (mirrors recommend `endsOnBox`);
//    remnant excludes negated/already-finished mentions.
//  - Remnant is EXEMPT when the reply declares a CONCRETE session-terminal blocker
//    (CI/checks wait · human approval/input · external dep/service/API · another
//    machine) AND names the resume point (`ing next`) — commons `session-terminal`
//    defines exactly that as a VALID stop, so it passes on the FIRST stop instead
//    of eating a block cycle. Excuse-shaped closes (size · rate-limit) are NOT
//    blockers — they stay with DEFER_RE, which runs independently of this exemption.
//  - A keyword wrapped in quotes/backticks ('잔여' · `잔여`) is meta-discussion of
//    the keyword itself, not live work → skipped (else a reply ABOUT the guard
//    false-blocks).
//  - Fires ONCE per chain: the native `stop_hook_active` flag on a block-induced
//    Stop short-circuits it, so a GENUINE blocker (external dep / human input /
//    another machine) that restates and re-stops passes through on the 2nd stop —
//    commons `session-terminal` stays valid.
import { readStdin } from "../lib/exec.ts";
import { info } from "../lib/log.ts";
import { lastAssistantText } from "./recommend.ts";

// Deferral-to-a-FUTURE-SESSION phrases (KO + EN). Scoped to session-punting only
// (not generic "나중에/later") to stay precise. Case-insensitive. Also catches
// excuse-shaped closes: rate-limit ("rate limit에 걸려서 나중에…" — a wait, not
// a session boundary) and scale ("규모가 커서 여기까지…" — size is a reason to
// keep going in chunks, not to stop).
const DEFER_RE =
  /다음\s*세션|다음\s*번\s*세션|다음번\s*세션|추후\s*세션|이후\s*세션|별도\s*세션|새\s*세션에|다른\s*세션에서|다세션|다중\s*세션|멀티\s*세션|여러\s*세션|next session|future session|later session|another session|separate session|new session|following session|multi.?session|rate.?limit|레이트\s*리밋|규모/i;

// True when the message CLOSES by deferring — deferral phrase within the last ~8
// non-empty lines (the conclusion). Mid-message mentions don't count.
export function endsWithDefer(text: string): boolean {
  if (!text) return false;
  const lines = text.replace(/\s+$/, "").split("\n").filter((l) => l.trim());
  const tail = lines.slice(-8).join("\n");
  return DEFER_RE.test(tail);
}

// A remnant-keyword mention is NEGATED (= not live work) when the same line,
// right after the keyword, says there is none or it is already finished. Window
// kept short so an unrelated later clause can't accidentally clear a live mention.
const REMNANT_NEG_RE =
  /^[^\n]{0,24}?(없|아니|0\s*[건개%]|완료(했|됐|됨|되었)|마무리(했|됐|됨|되었)|처리(했|됐|됨|되었)|해소(했|됐|됨|되었))/;

// Leftover-work keywords, scanned whole-message ('남은'/'잔존' = plain-word and
// formal synonyms of '잔여').
const REMNANT_KEYWORDS = ["잔여", "남은", "잔존"];

// Quote/backtick chars that wrap a META-mention of the keyword (a reply DISCUSSING
// '잔여', e.g. guard docs, is not live work). Straight + curly + backtick.
const QUOTE_CHARS = new Set(["`", "'", '"', "‘", "’", "“", "”"]);
function isQuotedMention(text: string, i: number, len: number): boolean {
  return QUOTE_CHARS.has(text[i - 1]) && QUOTE_CHARS.has(text[i + len]);
}

// True when the message mentions leftover work ANYWHERE without negating it —
// whole-message scan (a remnant reported mid-summary is still unfinished work),
// unlike the tail-scoped defer check. A quote-wrapped keyword is meta-discussion,
// not live work, so it is skipped.
export function hasLiveRemnant(text: string): boolean {
  if (!text) return false;
  for (const kw of REMNANT_KEYWORDS) {
    for (let i = text.indexOf(kw); i !== -1; i = text.indexOf(kw, i + kw.length)) {
      if (isQuotedMention(text, i, kw.length)) continue;
      if (!REMNANT_NEG_RE.test(text.slice(i + kw.length))) return true;
    }
  }
  return false;
}

// A CONCRETE session-terminal blocker (commons `session-terminal`): CI/checks wait ·
// human approval/input · external dep/service/API · another machine — the exact list
// the block reason enumerates. Excuse-shaped closes (size · rate-limit) are NOT here —
// they stay with DEFER_RE, and the defer check runs independently of this exemption,
// so an excuse-shaped close still blocks. KO + EN, case-insensitive.
const BLOCKER_RE =
  /CI\s*(대기|기다|통과)|checks?\s*(pending|running|대기)|waiting\s+(on|for)\s+(ci|checks?|approval|review)|(사람|사용자)\s*의?\s*(승인|입력|확인|응답)|승인\s*(대기|필요)|(human|user)\s+(approval|input|review)|approval\s+(pending|required|needed)|외부\s*(의존|서비스|API|시스템)|external\s+(dependenc|service|API|system)|API\s*(응답\s*)?대기|다른\s*머신|(another|other)\s+machine/i;

// The resume point must be named (`sidecar ing next <지점>`) — session-terminal
// requires recording where to pick up. Loose match on the verb pair.
const ING_NEXT_RE = /ing\s+next/i;

// True when the reply closes with a genuine session-terminal: a CONCRETE blocker
// AND a recorded resume point. Raises the abuse cost so a bare "블로커: 규모가 큼"
// (no concrete noun, no resume point) can NOT slip a remnant through.
export function hasSessionTerminalBlocker(text: string): boolean {
  return BLOCKER_RE.test(text) && ING_NEXT_RE.test(text);
}

// INFRA PUNT (commons `upstream-fix` · `infra-wall-noneval`): the reply reports an
// infra/toolchain wall and STOPS by working around it (우회·격리·미룸·fallback)
// instead of fixing the cause. 'infra'/'인프라' is a very common word, so this is
// a TRIPLE AND to stay precise: (a) a punt verb somewhere in the message, (b) the
// infra keyword and (c) a wall/failure signal on the SAME line (a bare infra
// mention is harmless). A kebab-slug (`infra-wall-noneval`) or quote-wrapped
// mention is meta-discussion → excluded. Negated when the same line already shows
// a fix/green — line-scoped (not the remnant 24-char window) because a fix clause
// ("infra 링크 에러를 upstream에서 직접 고쳐 머지했다") sits far from the keyword.
const INFRA_KW_RE = /(?<![\w-])(infra(structure)?|인프라)(?![\w-])/gi;
const INFRA_WALL_RE =
  /실패|에러|오류|결함|깨(짐|져|졌)|안\s*됨|불가|막(힘|혀)|벽|블로커|타임아웃|누락|OOM|missing|broken|fail(ed|ure|ing)?|error|blocker|wall|timeout|link(er)?\s*(error|fail)|FFI|env|build\s*(fail|error|결함)/i;
const INFRA_PUNT_RE =
  /우회|격리|보류|스킵|미루|미룸|미뤄|나중에|추후|별도\s*(레포|repo|이슈|issue|트랙|작업|세션)|넘(김|겨)|남겨|폴백|fallback|래퍼|wrapper|shadow|fork|vendored|cached-?bin|symbol-?dodge|reimpl|workaround|bypass|skip|defer|park(ed|ing)?|punt|later|separate\s+(repo|issue|track)/i;
const INFRA_FIX_RE =
  /고(쳤|침|쳐)|수정(했|됐|됨|완료)|해결(했|됐|됨|완료)|해소(했|됐|됨)|복구(했|됐|됨)|정상|그린|green|머지(했|됐|됨)|merged|fixed|resolved/i;

export function hasInfraPunt(text: string): boolean {
  if (!text) return false;
  if (!INFRA_PUNT_RE.test(text)) return false; // no punt verb anywhere → never fires
  for (const line of text.split("\n")) {
    for (const m of line.matchAll(INFRA_KW_RE)) {
      if (isQuotedMention(line, m.index!, m[0].length)) continue; // '인프라'·`infra` meta
      if (!INFRA_WALL_RE.test(line)) break; // no wall signal on this line → harmless
      if (INFRA_FIX_RE.test(line)) break; // already fixed/green on the same line → negated
      return true;
    }
  }
  return false;
}

// Stop-hook entry. Best-effort: any parse/IO failure is a silent no-op (never
// wedge a session on this backstop).
function runStopCheck(): number {
  let payload: any;
  try {
    payload = JSON.parse(readStdin());
  } catch {
    return 0;
  }
  if (payload?.stop_hook_active) return 0; // single-fire — genuine blockers pass on re-stop
  const tp = payload?.transcript_path ?? payload?.transcriptPath;
  if (!tp) return 0;
  const last = lastAssistantText(String(tp));
  const defer = endsWithDefer(last);
  // Remnant + infra-punt block UNLESS the reply is a genuine session-terminal
  // (concrete blocker + recorded resume point) — commons `session-terminal`. Defer
  // stays independent: a "다음 세션에" close still blocks even with a blocker phrase.
  const term = hasSessionTerminalBlocker(last);
  const remnant = hasLiveRemnant(last) && !term;
  const infra = hasInfraPunt(last) && !term;
  if (!defer && !remnant && !infra) return 0;
  // Message priority: defer (closing punt) > infra (specific, actionable) > remnant.
  const reason = defer
    ? "당신의 답변이 작업을 '다음 세션'으로 미루며 끝났다 — 그건 멈출 지점이 아니다. " +
      "goal/작업이 아직 살아있으면 지금 이어서 실제로 진행하라(되묻지 말 것) — 다음 할 일의 도구 호출/변경/결과로 이어가라. " +
      "정말 이번 세션에서 불가한 CONCRETE 블로커(외부 의존·CI 대기·사람 승인·다른 머신 필요)일 때만 그 블로커를 명시하고 " +
      "재개지점을 `sidecar ing next <지점>`에 기록한 뒤 멈춰라(session-terminal). 근거 없는 미루기는 금지."
    : infra
    ? "당신의 답변이 infra/인프라 벽·결함을 언급한 채 우회·격리·미룸으로 멈췄다 — 벽은 덮는 게 아니라 지금 고치는 것이다. " +
      "그 원인을 canonical repo에서 이번 세션에 직접 수정하라(upstream-fix · 고위험 변경은 isolated worktree) — 수정→세션 내 검증→해당 repo pr-cycle 머지까지 진행하라(되묻지 말 것). " +
      "벽 덮기(reimpl·cached-bin·symbol-dodge·fallback·wrapper/shadow/fork)·vendored copy만 패치·upstream으로 미루기는 금지. " +
      "정말 이번 세션에서 불가한 CONCRETE 블로커(외부 의존·CI 대기·사람 승인·다른 머신 필요)일 때만 그 블로커를 명시하고 " +
      "재개지점을 `sidecar ing next <지점>`에 기록한 뒤 멈춰라(session-terminal). 이미 고쳤으면 같은 줄에 '수정 완료/그린'을 명시하라."
    : "당신의 답변에 '잔여'(남은 작업)가 언급됐다 — 잔여를 남긴 채 멈추지 마라. " +
      "지금 그 잔여 작업을 이어서 실제로 마무리하라(되묻지 말 것) — 잔여 항목 각각의 도구 호출/변경/결과로 이어가라. " +
      "정말 이번 세션에서 불가한 CONCRETE 블로커(외부 의존·CI 대기·사람 승인·다른 머신 필요)일 때만 그 블로커를 명시하고 " +
      "재개지점을 `sidecar ing next <지점>`에 기록한 뒤 멈춰라(session-terminal). 잔여가 이미 없으면 '잔여 없음'으로 명시하라.";
  // decision:block = FORCE continuation. Fires only on a closing-deferral (tail
  // precise), a live '잔여' mention (negation-aware), or an infra-punt (keyword +
  // wall + punt verb, negation-aware), and only once per chain (stop_hook_active),
  // so correct operation never trips it and a genuine terminal passes on the 2nd stop.
  process.stdout.write(JSON.stringify({ decision: "block", reason }) + "\n");
  return 0;
}

export async function runGoalGuard(args: string[]): Promise<number> {
  const sub = args[0];
  if (sub === "stop-check") return runStopCheck();
  info("usage: sidecar goal-guard stop-check");
  return sub === "help" || sub === "--help" || sub === "-h" ? 0 : 1;
}
