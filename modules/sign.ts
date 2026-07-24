// sign — user-consent token gate (money/irreversible actions need a HUMAN sign-off).
//
// A tiny host-global token store lets the USER pre-authorize a cost action the agent
// must not take unilaterally. Today the one key is `rent` — a GPU-pod rent
// (`hexa cloud rent|up`) costs real money, so `pre bash` refuses it until a fresh
// `rent` token exists. The token is minted ONLY by the human typing the TUI bang
// `!sidecar sign rent` (the `!` bang bypasses PreToolUse, so it mints freely); the
// agent's OWN `sidecar sign rent` is DENIED by the sign-guard in `pre.ts`
// (detectSelfMint) and any write under the store is denied (signForgeBashTarget /
// isSignsPath). So the gate rests on "the agent cannot emit a `!` bang", exactly like
// the archive `_sign_guard.hexa` it ports (verified 2026-05-25 on Claude Code).
//
// This is enforcement WITHIN the hook threat model, not an OS boundary: base64/eval/
// remote hosts holding their own provider creds are out of reach of a text guard. The
// realistic channels (direct mint, token forge, common wrappers) are closed here; the
// structural closure (hexa itself requiring the token) is a documented phase-2 follow-up.
import { homedir } from "node:os";
import { resolve, sep } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync, renameSync } from "node:fs";
import { info, ok, warn, loudFail } from "../lib/log.ts";
import { segments, leadToken, stripQuotes } from "./cloud-guard.ts";

// Host-global store (NOT repo-local): a rent can be launched from any cwd / linked
// worktree, so the consent token must be found regardless of where the agent runs —
// same rationale as `~/.sidecar/accounts.json`. Resolve home via os.homedir(), never
// $HOME (an agent-controllable env var must not relocate the root of trust).
const SIGNS_DIR = resolve(homedir(), ".sidecar", "signs");

// Per-key policy is a CODE constant, deliberately NOT config: a config-tunable TTL is
// an opt-out with extra steps (the agent edits harness.config.json freely, so
// `sign.ttl: 9e9` would neuter the gate). Guard parameters of a no-override guard live
// in code — same doctrine as cloud-guard.ts having no config gate at all.
//   TTL rent=600s: the guard fires at command LAUNCH (PreToolUse), so it need NOT cover
//   the multi-minute ssh-ready wait — only the agent's preamble between the user signing
//   and issuing the rent. 10 min is comfortable for that and still a real window.
const POLICY: Record<string, { ttlSec: number }> = {
  rent: { ttlSec: 600 },
};
const DEFAULT_TTL = 300;
const ttlFor = (key: string): number => POLICY[key]?.ttlSec ?? DEFAULT_TTL;

function signPath(key: string): string {
  return resolve(SIGNS_DIR, `${key}.sign`);
}

// Epoch seconds stored in the token, or null if absent / malformed. Plain-epoch text
// (byte-compatible with the archive) — no JSON/nonce ceremony needed for a single-user
// local consent flag; the atomic-claim unlink below covers the one real race.
function readEpoch(key: string): number | null {
  try {
    const n = Number(readFileSync(signPath(key), "utf8").trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

// A fresh (unexpired) token exists for `key`. READ-ONLY — does not consume.
export function signFresh(key: string): boolean {
  const epoch = readEpoch(key);
  if (epoch == null) return false;
  return Date.now() / 1000 - epoch <= ttlFor(key);
}

// Consume a one-shot token: atomically claim (rename) then unlink, so two parallel
// hooks can't double-spend one sign — only one racer wins the rename. Returns true iff
// THIS caller consumed a FRESH token (i.e. the action is authorized). Consume-on-
// admission (at the guard's allow path), NOT on the action's success: there is no
// reliable Bash post-hook to key success off, and pre-consume is what stops a parallel
// double-spend. A burned token on a rent that then fails is the accepted trade for a
// hard "one sign = one spend decision" invariant with zero new hook wiring.
export function consumeSign(key: string): boolean {
  if (!signFresh(key)) return false;
  const src = signPath(key);
  const claim = `${src}.claim.${process.pid}`;
  try {
    renameSync(src, claim); // atomic — the sole synchronization point
  } catch {
    return false; // lost the race, or it expired/vanished between check and rename
  }
  try {
    unlinkSync(claim);
  } catch {
    /* best-effort cleanup — the token is already spent (renamed away) */
  }
  return true;
}

// ── guard detectors (used by pre.ts) ──────────────────────────────────────────

// Subverbs the AGENT may run: they only inspect or REDUCE privilege, never mint.
const MINT_ALLOWED = new Set(["", "list", "--list", "status", "check", "clear", "help", "-h", "--help"]);
// command-position wrappers to peel before reading the real head
const WRAPPERS = new Set(["sudo", "command", "env", "nohup", "time", "xargs"]);

// A `sidecar sign <key>` MINT issued by the agent, in any command-head position and
// quote-aware (so `echo "sidecar sign rent"` / `grep 'sidecar sign rent'` never match —
// their segment head is echo/grep). Returns the offending token, or null.
export function detectSelfMint(rawCmd: string): string | null {
  for (const seg of segments(rawCmd)) {
    let { head, rest } = leadToken(seg);
    while (WRAPPERS.has(head) && rest.length) {
      head = rest[0];
      rest = rest.slice(1);
    }
    const base = head.slice(head.lastIndexOf("/") + 1); // ./bin/sidecar, abs paths → sidecar
    // A mint key is a real WORD token (`rent`, `commons`), not a shell redirect/operator:
    // `sidecar sign 2>&1` / `sidecar sign >out` / bare `sidecar sign` are LISTs, not mints,
    // so rest[1] like `2>`/`>out`/undefined must NOT be read as a key (that false-blocked a
    // routine `sidecar sign 2>/dev/null`). Only a `[A-Za-z]…` key that isn't a read verb mints.
    const key = rest[1] ?? "";
    if (base === "sidecar" && rest[0] === "sign" && /^[A-Za-z][\w-]*$/.test(key) && !MINT_ALLOWED.has(key)) {
      return `sidecar sign ${key}`;
    }
    // shell -c / eval indirection: the inner mint is quoted (masked from the head scan)
    // → scan the raw segment for a non-read `sidecar sign …`.
    if ((["bash", "sh", "zsh", "dash", "ksh"].includes(base) && rest.includes("-c")) || base === "eval") {
      if (/(^|[\s;|&(])sidecar\s+sign\s+(?!clear\b|list\b|status\b|check\b|help\b|--list\b|--help\b|-h\b)\S/.test(stripQuotes(seg))) {
        return "sidecar sign … (via shell -c/eval)";
      }
    }
  }
  return null;
}

function underSigns(absPath: string): boolean {
  return absPath === SIGNS_DIR || absPath.startsWith(SIGNS_DIR + sep);
}

// A Write/Edit file_path that lands inside the sign store (forging a consent token).
export function isSignsPath(filePath: string): boolean {
  if (!filePath) return false;
  const expanded = filePath.startsWith("~") ? filePath.replace(/^~(?=\/|$)/, homedir()) : filePath;
  return underSigns(resolve(expanded));
}

// A Bash write-channel targeting the sign store: `> f` · `>> f` · `tee f` · `cp/mv …
// dest` · `dd of=f`. Relative targets resolve against the payload cwd. Returns the
// offending absolute path, or null. Not a sandbox — narrows the common channels; a
// `python -c open(...)` / `sed -i` computed path is out of a text guard's reach (phase 2).
export function signForgeBashTarget(rawCmd: string, cwd: string): string | null {
  const base = cwd || process.env.PWD || process.cwd();
  const abs = (t: string): string => {
    const s = stripQuotes(t).replace(/^~(?=\/|$)/, homedir());
    return s.startsWith("/") ? resolve(s) : resolve(base, s);
  };
  // redirect targets: `>path` `>>path` `1>path` (glued) or `> path` (next token)
  const toks = stripQuotes(rawCmd).split(/\s+/).filter(Boolean);
  for (let i = 0; i < toks.length; i++) {
    const m = toks[i].match(/^\d*>>?(.*)$/);
    if (m) {
      const p = m[1] || toks[i + 1] || "";
      if (p && underSigns(abs(p))) return abs(p);
    }
    if (toks[i].startsWith("of=") && underSigns(abs(toks[i].slice(3)))) return abs(toks[i].slice(3));
  }
  // tee / cp / mv / install / ln / touch / truncate destination args (any non-flag)
  for (const seg of segments(rawCmd)) {
    const { head, rest } = leadToken(seg);
    const b = head.slice(head.lastIndexOf("/") + 1);
    if (["tee", "cp", "mv", "install", "touch", "ln", "truncate"].includes(b)) {
      for (const a of rest) if (a && !a.startsWith("-") && underSigns(abs(a))) return abs(a);
    }
  }
  return null;
}

// ── CLI surface (`sidecar sign …`) ────────────────────────────────────────────

function mint(key: string): number {
  mkdirSync(SIGNS_DIR, { recursive: true });
  writeFileSync(signPath(key), `${Math.floor(Date.now() / 1000)}\n`);
  const min = Math.round(ttlFor(key) / 60);
  ok(`sign: ✅ signed '${key}' — ONE ${key} action allowed for the next ${min} min (one-shot; consumed on use).`);
  info(`  (list: sidecar sign · clear early: sidecar sign clear ${key})`);
  return 0;
}

function list(): number {
  const files = existsSync(SIGNS_DIR) ? readdirSync(SIGNS_DIR).filter((f) => f.endsWith(".sign")) : [];
  if (!files.length) {
    info("sign: no active tokens");
    return 0;
  }
  const now = Date.now() / 1000;
  info("sign: active tokens");
  for (const f of files) {
    const key = f.replace(/\.sign$/, "");
    const epoch = readEpoch(key);
    if (epoch == null) {
      info(`  ${key.padEnd(10)} corrupt`);
      continue;
    }
    const remain = Math.round(ttlFor(key) - (now - epoch));
    info(remain > 0 ? `  ${key.padEnd(10)} ACTIVE  ${remain}s remaining  (one-shot)` : `  ${key.padEnd(10)} EXPIRED`);
  }
  return 0;
}

function check(key: string): number {
  const epoch = readEpoch(key);
  if (epoch != null && signFresh(key)) {
    info(`${key}: valid ${Math.round(ttlFor(key) - (Date.now() / 1000 - epoch))}s`);
    return 0;
  }
  info(`${key}: none`);
  return 1;
}

function clear(key?: string): number {
  if (!existsSync(SIGNS_DIR)) return 0;
  if (key) {
    try {
      unlinkSync(signPath(key));
      ok(`sign: cleared '${key}'`);
    } catch {
      info(`sign: no token '${key}'`);
    }
    return 0;
  }
  for (const f of readdirSync(SIGNS_DIR).filter((f) => f.endsWith(".sign") || f.includes(".sign.claim."))) {
    try {
      unlinkSync(resolve(SIGNS_DIR, f));
    } catch {
      /* ignore */
    }
  }
  ok("sign: cleared all tokens");
  return 0;
}

function usage(): void {
  info("sidecar sign — gated cost/irreversible actions need YOUR sign-off before the agent may take them.");
  info("  mint (human-only, via TUI bang):  ! sidecar sign <key>   (key: rent)");
  info("  list:                             sidecar sign            (or list / --list / status)");
  info("  check:                            sidecar sign check <key>");
  info("  clear:                            sidecar sign clear [<key>]");
}

// NOTE: when the AGENT invokes `sidecar sign <mint-key>`, pre.ts (detectSelfMint) has
// ALREADY denied the tool call — this dispatcher only ever mints for the human's TUI
// `!` bang (which bypasses PreToolUse). list/check/clear are agent-safe.
export async function runSign(args: string[]): Promise<number> {
  const sub = args[0] ?? "";
  if (sub === "" || sub === "list" || sub === "--list" || sub === "status") return list();
  if (sub === "help" || sub === "-h" || sub === "--help") {
    usage();
    return 0;
  }
  if (sub === "check") {
    if (!args[1]) {
      loudFail("sign check: needs a key (e.g. `sidecar sign check rent`)");
      return 2;
    }
    return check(args[1]);
  }
  if (sub === "clear") return clear(args[1]);
  // otherwise: a MINT of key=sub
  if (!(sub in POLICY)) warn(`sign: '${sub}' is not a known key (known: ${Object.keys(POLICY).join(", ")}) — minting anyway with default TTL`);
  return mint(sub);
}
