// Per-turn dedup for hook additionalContext injects.
//
// The SAME inject is wired on TWO Claude Code surfaces at once — the GLOBAL
// settings.json hooks (installed by `sidecar install`) AND the plugin hooks.json
// (installed via /plugin). A user who has both (the common case) gets every inject's
// FULL block emitted TWICE every turn — ~2x the per-turn inject tokens, which is exactly
// the context-rot / prompt-bloat that makes the agent dumber (commons `commons-md-1`).
//
// `emitInject` makes emission idempotent per turn: the FIRST caller this turn wins (an
// atomic mkdir lock keyed by the inject name + the $CLAUDE_USER_PROMPT that ALL
// UserPromptSubmit hooks on both surfaces share), and later identical callers emit
// nothing. This is NOT truncation — the full block is still emitted once, so the
// no-truncate inject-lint rule is honoured; it just isn't emitted twice.
//
// A 30s TTL guards both ways: the two near-simultaneous surface calls (ms apart) dedup
// to one, but a later turn (or a repeated prompt) past the TTL re-emits — so an injection
// can never silently VANISH across turns if the key ever repeats.
import { mkdirSync, statSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TTL_MS = 30_000;

function lockPath(name: string): string {
  const turn = process.env.CLAUDE_USER_PROMPT ?? "";
  const key = createHash("sha1").update(name + "\0" + turn).digest("hex").slice(0, 20);
  return join(tmpdir(), "sidecar-inject-once", `${name}-${key}`);
}

// True the FIRST time (this turn) → caller should emit; false when a fresh lock already
// exists (the other surface already emitted this turn).
function firstThisTurn(name: string): boolean {
  const lock = lockPath(name);
  try {
    mkdirSync(join(tmpdir(), "sidecar-inject-once"), { recursive: true });
  } catch {
    /* dir exists */
  }
  try {
    mkdirSync(lock); // atomic create — throws EEXIST if another surface got here first
    return true;
  } catch {
    // Lock exists. Emit only if it is STALE (older than the TTL) — that means it's a
    // leftover from a previous turn with the same key, not the sibling surface call.
    try {
      if (Date.now() - statSync(lock).mtimeMs > TTL_MS) {
        rmSync(lock, { recursive: true, force: true });
        mkdirSync(lock);
        return true;
      }
    } catch {
      /* racing sibling — treat as already emitted */
    }
    return false;
  }
}

// Emit a hook additionalContext block AT MOST ONCE per turn across all wired surfaces.
export function emitInject(name: string, hookEventName: string, additionalContext: string): void {
  if (!firstThisTurn(name)) return;
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext } }) + "\n",
  );
}
