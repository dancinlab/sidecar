// sidecar sbs [auto[:<axis>]|manual] [<task>]
// Print the resolved mode (deterministic, via recommend resolve-mode) + the
// plan-first step-by-step runbook for the agent to follow. The disambiguation
// itself is performed by the agent reading the printed runbook;
// the sidecar supplies the authoritative mode + the runbook body.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SIDECAR_ROOT } from "../lib/paths.ts";
import { info } from "../lib/log.ts";
import { resolveMode } from "./recommend.ts";

// Axis label for the AUTO behavioral banner (matches recommend.ts axis tokens).
function axisLabel(axis: string): string {
  return (
    { complete: "완성도(complete)", simple: "단순(simple)", safe: "안전(safe)", std: "표준(std)" }[axis] ?? axis
  );
}

export async function runSbs(args: string[]): Promise<number> {
  const raw = args.join(" ");
  process.stdout.write("# /sbs — step-by-step (mode resolved by sidecar)\n\n");
  const r = resolveMode(raw); // prints `mode: …` + `resolved: …` AND returns the resolution
  // Front-load the AUTO behavioral imperative — the resolver decided the mode in
  // CODE, so the agent must NOT skim the runbook prose (whose dominant framing is
  // the MANUAL "ask one question per round" path) and fall back into questioning.
  // This block makes auto-proceed the first thing read, above the runbook body.
  if (r.mode === "auto") {
    const forced = r.axis !== "-" ? `${axisLabel(r.axis)} 축 forced` : `4축 가중평균(${r.weights})`;
    process.stdout.write(
      "\n🤖 AUTO 모드 — 이 블록이 행동 권위다 (런북 prose 보다 우선):\n" +
        `   • 결정 기준: ${forced}${r.source === "inherited" ? " ← recommend-default 상속" : ""}\n` +
        "   • disambiguation 매 라운드를 위 기준으로 **즉시 auto-pick** 한다 — 라운드별로 사용자에게 질문하지 않는다 (대기 없음).\n" +
        "   • 흐름: enumerate → (라운드마다) auto-pick + 재스캔 → 모호성 0 → 합의화면 1회 → plan.md → 백그라운드 handoff.\n" +
        "   • 유일한 일시정지 = §3 합의화면(사용자 `go` 1회). 그 전 구간은 무정지 자동진행.\n" +
        "   • 아래 §2 '채팅 disambiguation' 의 '한 번에 하나씩 물어/대기' 묘사는 MANUAL 용 — AUTO 에선 그 대기를 auto-pick 으로 치환해 읽어라.\n"
    );
  }
  process.stdout.write("\n---\n\n");

  const tpl = resolve(SIDECAR_ROOT, "templates", "sbs.md");
  if (existsSync(tpl)) {
    process.stdout.write(readFileSync(tpl, "utf8"));
  } else {
    info("sbs runbook template missing (templates/sbs.md)");
  }
  return 0;
}
