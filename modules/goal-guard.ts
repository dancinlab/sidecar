// sidecar goal-guard stop-check
// Stop-hook guard that CATCHES an agent punting the work to a future session
// ("이건 다음 세션에서 이어가겠습니다") instead of continuing now. When a goal is
// set or a substantive task is still in flight, deferring to "the next session"
// is usually a punt, not a real terminal. This blocks that stop so the model
// presses on.
//
// Precision + escape (so it never wedges a genuine multi-session handoff):
//  - Fires ONLY when the CLOSING of the last assistant message defers to a next
//    session (deferral phrase in the last ~8 non-empty lines), so a mid-message
//    mention in analysis does not trip it (mirrors recommend `endsOnBox`).
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
  if (!endsWithDefer(lastAssistantText(String(tp)))) return 0;
  const reason =
    "당신의 답변이 작업을 '다음 세션'으로 미루며 끝났다 — 그건 멈출 지점이 아니다. " +
    "goal/작업이 아직 살아있으면 지금 이어서 실제로 진행하라(되묻지 말 것) — 다음 할 일의 도구 호출/변경/결과로 이어가라. " +
    "정말 이번 세션에서 불가한 CONCRETE 블로커(외부 의존·CI 대기·사람 승인·다른 머신 필요)일 때만 그 블로커를 명시하고 " +
    "재개지점을 `sidecar ing next <지점>`에 기록한 뒤 멈춰라(session-terminal). 근거 없는 미루기는 금지.";
  // decision:block = FORCE continuation. Fires only on a closing-deferral (tail
  // precise) and only once per chain (stop_hook_active), so correct operation
  // never trips it and a genuine terminal passes on the second stop.
  process.stdout.write(JSON.stringify({ decision: "block", reason }) + "\n");
  return 0;
}

export async function runGoalGuard(args: string[]): Promise<number> {
  const sub = args[0];
  if (sub === "stop-check") return runStopCheck();
  info("usage: sidecar goal-guard stop-check");
  return sub === "help" || sub === "--help" || sub === "-h" ? 0 : 1;
}
