// sidecar goal-guard stop-check
// Stop-hook guard that CATCHES an agent punting the work instead of continuing
// now. Two catches share one gate:
//  1. FUTURE-SESSION defer — the reply CLOSES with "이건 다음 세션에서 이어가겠습니다"
//     (deferral phrase in the last ~8 non-empty lines).
//  2. LIVE REMNANT — the reply mentions '잔여' (leftover work) anywhere without
//     negating it ("잔여 없음"/"잔여 작업 완료했" pass), i.e. it reports remaining
//     work and stops instead of finishing it.
// Both block the stop so the model presses on.
//
// Precision + escape (so it never wedges a genuine multi-session handoff):
//  - Defer fires ONLY on the closing tail (mirrors recommend `endsOnBox`);
//    remnant excludes negated/already-finished mentions.
//  - Fires ONCE per chain: the native `stop_hook_active` flag on a block-induced
//    Stop short-circuits it, so a GENUINE blocker (external dep / human input /
//    another machine) that restates and re-stops passes through on the 2nd stop —
//    commons `session-terminal` stays valid.
import { readStdin } from "../lib/exec.ts";
import { info } from "../lib/log.ts";
import { lastAssistantText } from "./recommend.ts";

// Deferral-to-a-FUTURE-SESSION phrases (KO + EN). Scoped to session-punting only
// (not generic "나중에/later") to stay precise. Case-insensitive.
const DEFER_RE =
  /다음\s*세션|다음\s*번\s*세션|다음번\s*세션|추후\s*세션|이후\s*세션|별도\s*세션|새\s*세션에|다른\s*세션에서|다세션|다중\s*세션|멀티\s*세션|여러\s*세션|next session|future session|later session|another session|separate session|new session|following session|multi.?session/i;

// True when the message CLOSES by deferring — deferral phrase within the last ~8
// non-empty lines (the conclusion). Mid-message mentions don't count.
export function endsWithDefer(text: string): boolean {
  if (!text) return false;
  const lines = text.replace(/\s+$/, "").split("\n").filter((l) => l.trim());
  const tail = lines.slice(-8).join("\n");
  return DEFER_RE.test(tail);
}

// A '잔여' mention is NEGATED (= not live work) when the same line, right after
// the keyword, says there is none or it is already finished. Window kept short
// so an unrelated later clause can't accidentally clear a live mention.
const REMNANT_NEG_RE =
  /^[^\n]{0,24}?(없|아니|0\s*[건개%]|완료(했|됐|됨|되었)|마무리(했|됐|됨|되었)|처리(했|됐|됨|되었)|해소(했|됐|됨|되었))/;

// True when the message mentions '잔여' (leftover work) ANYWHERE without negating
// it — whole-message scan (a remnant reported mid-summary is still unfinished
// work), unlike the tail-scoped defer check.
export function hasLiveRemnant(text: string): boolean {
  if (!text) return false;
  for (let i = text.indexOf("잔여"); i !== -1; i = text.indexOf("잔여", i + 2)) {
    if (!REMNANT_NEG_RE.test(text.slice(i + 2))) return true;
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
  if (!defer && !hasLiveRemnant(last)) return 0;
  const reason = defer
    ? "당신의 답변이 작업을 '다음 세션'으로 미루며 끝났다 — 그건 멈출 지점이 아니다. " +
      "goal/작업이 아직 살아있으면 지금 이어서 실제로 진행하라(되묻지 말 것) — 다음 할 일의 도구 호출/변경/결과로 이어가라. " +
      "정말 이번 세션에서 불가한 CONCRETE 블로커(외부 의존·CI 대기·사람 승인·다른 머신 필요)일 때만 그 블로커를 명시하고 " +
      "재개지점을 `sidecar ing next <지점>`에 기록한 뒤 멈춰라(session-terminal). 근거 없는 미루기는 금지."
    : "당신의 답변에 '잔여'(남은 작업)가 언급됐다 — 잔여를 남긴 채 멈추지 마라. " +
      "지금 그 잔여 작업을 이어서 실제로 마무리하라(되묻지 말 것) — 잔여 항목 각각의 도구 호출/변경/결과로 이어가라. " +
      "정말 이번 세션에서 불가한 CONCRETE 블로커(외부 의존·CI 대기·사람 승인·다른 머신 필요)일 때만 그 블로커를 명시하고 " +
      "재개지점을 `sidecar ing next <지점>`에 기록한 뒤 멈춰라(session-terminal). 잔여가 이미 없으면 '잔여 없음'으로 명시하라.";
  // decision:block = FORCE continuation. Fires only on a closing-deferral (tail
  // precise) or a live '잔여' mention (negation-aware), and only once per chain
  // (stop_hook_active), so correct operation never trips it and a genuine
  // terminal passes on the second stop.
  process.stdout.write(JSON.stringify({ decision: "block", reason }) + "\n");
  return 0;
}

export async function runGoalGuard(args: string[]): Promise<number> {
  const sub = args[0];
  if (sub === "stop-check") return runStopCheck();
  info("usage: sidecar goal-guard stop-check");
  return sub === "help" || sub === "--help" || sub === "-h" ? 0 : 1;
}
