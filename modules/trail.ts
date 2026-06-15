// harness trail {push <note> | pop | show | drop <n> | clear}
// Main-flow return stack (sidecar trail parity). When you deviate from the active
// goal into a side-task, `push` where you were; `pop` when you return. The stack
// lives in a git-tracked repo-root TRAIL.md (newest on top) so it survives across
// sessions and is preserved on GitHub — not a volatile /tmp note.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { info, ok, warn } from "../lib/log.ts";

const HEADER = `# TRAIL — main-flow return stack

> 📍 SSOT: [ARCHITECTURE.md](ARCHITECTURE.md) · 곁가지로 새기 전 \`harness trail push <where>\`, 돌아오면 \`pop\`.
> git-tracked (committed) → 세션/리부트 넘어 보존. newest on top.

`;

function trailPath(): string {
  return resolve(REPO_ROOT, "TRAIL.md");
}

function readStack(): string[] {
  const p = trailPath();
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split("\n")
    .filter((l) => /^\d+\.\s/.test(l))
    .map((l) => l.replace(/^\d+\.\s/, ""));
}

function writeStack(items: string[]): void {
  const body = HEADER + (items.length ? items.map((it, i) => `${i + 1}. ${it}`).join("\n") + "\n" : "_(empty)_\n");
  writeFileSync(trailPath(), body, "utf8");
}

export async function runTrail(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";
  const stack = readStack();

  if (sub === "push") {
    const note = args.slice(1).join(" ").trim();
    if (!note) {
      info("usage: harness trail push <where-you-were>");
      return 1;
    }
    writeStack([note, ...stack]); // newest on top
    ok(`trail: pushed (depth ${stack.length + 1}) → TRAIL.md (commit to persist)`);
    return 0;
  }

  if (sub === "pop") {
    if (!stack.length) {
      info("trail: empty — nothing to return to.");
      return 0;
    }
    const [top, ...rest] = stack;
    writeStack(rest);
    ok(`trail: ↩ return to → ${top}`);
    info(`  (depth ${rest.length} left · commit TRAIL.md)`);
    return 0;
  }

  if (sub === "drop") {
    const n = parseInt(args[1] ?? "", 10);
    if (!n || n < 1 || n > stack.length) {
      info(`usage: harness trail drop <1..${stack.length}>`);
      return 1;
    }
    const removed = stack.splice(n - 1, 1)[0];
    writeStack(stack);
    info(`trail: dropped #${n} — ${removed}`);
    return 0;
  }

  if (sub === "clear") {
    writeStack([]);
    ok("trail: cleared.");
    return 0;
  }

  // show
  if (!stack.length) {
    info("trail: empty — main flow is the only flow.");
    return 0;
  }
  info(`trail: ${stack.length} deviation(s) on the stack (top = most recent):`);
  stack.forEach((it, i) => info(`  ${i + 1}. ${it}`));
  if (stack.length > 2) warn("trail: deep stack — consider returning (pop) before going deeper.");
  return 0;
}
