// ing-staleness — c6 nudge: warn (at session Stop) when many code files were edited
// without the ing board being touched. The inject (every-turn `ing inject`) only
// SHOWS the board; nothing makes the agent UPDATE it as work moves. We can't force
// an update (no ground truth for "this edit should change ing"), so this is a soft
// counter: each code edit bumps it, any ing mutation (add/next/done) resets it, and
// the Stop hook warns once when it crosses the threshold (then resets, so it nags at
// most once per N edits — not every Stop). warn-only, never blocks.
//

import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { LOG_DIR } from "../lib/paths.ts";

const COUNTER = resolve(LOG_DIR, "ing-staleness.json");

// code-ish files whose edits count toward "work moved" (docs/config edits don't).
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|c|h|cpp|hpp|cc|java|kt|swift|rb|php|sh|hexa|tape|sql)$/i;

function read(): { edits: number } {
  try {
    const j = JSON.parse(readFileSync(COUNTER, "utf8"));
    return { edits: Number.isFinite(j.edits) ? j.edits : 0 };
  } catch {
    return { edits: 0 };
  }
}
function write(edits: number): void {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    writeFileSync(COUNTER, JSON.stringify({ edits }) + "\n");
  } catch {
    /* best-effort */
  }
}

// post edit → bump the counter when the edited file is code (not docs/config).
export function bumpEditIfCode(file: string): void {
  if (!file || !CODE_EXT.test(file)) return;
  write(read().edits + 1);
}

// any ing board mutation (add/next/done) → the board is current; clear the counter.
export function resetIngStaleness(): void {
  try {
    if (existsSync(COUNTER)) unlinkSync(COUNTER);
  } catch {
    /* best-effort */
  }
}

// Stop-hook check: if edits ≥ threshold, return a one-line warn and RESET (so the
// nudge fires once per threshold-crossing, not on every Stop). threshold 0 disables.
export function ingStalenessWarn(threshold: number): string | null {
  if (!threshold || threshold <= 0) return null;
  const { edits } = read();
  if (edits < threshold) return null;
  write(0); // reset so we don't nag every Stop
  return (
    `이번 세션에 코드 ${edits}개 파일을 편집했는데 ing 보드는 한 번도 안 건드렸다 (c6) ` +
    `— 작업 상태가 바뀌었으면 \`sidecar ing add/next/done\` 으로 보드를 현행화하라. ` +
    `(끝난 작업은 done, 새 작업은 add — 방치하면 다음 세션 inject 가 낡은 상태를 띄운다.)`
  );
}
