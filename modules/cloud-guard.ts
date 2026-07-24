// cloud-guard — built-in code-level block for raw GPU-provider CLI/API use in
// `pre bash`. The canonical path is hexa's `hexa cloud` builtin (commons
// canonical-cli); calling a provider's own CLI/API directly bypasses that layer
// (and its cost accounting). This is enforced in CODE — before
// config rules, default-on, NO `# raw-cloud-ok`-style escape — so a regex profile
// edit can't silently weaken it (unlike an enforcement.json rule).
//
// NOTE: raw training-launcher forcing (route `python train.py`/`torchrun`/
// `deepspeed`/`accelerate launch`/`dojo` run.sh through `hexa dojo`) was REMOVED —
// there is no longer a `hexa dojo` mandate here.
//

// strip ' and " so a quoted token still resolves to its bare form
export function stripQuotes(s: string): string {
  let out = "";
  for (const c of s) if (c !== "'" && c !== '"') out += c;
  return out;
}

// Split a command line into segments on shell separators (; | & newline ( )) that
// are NOT inside single/double quotes. Critical: a quoted regex like
// `grep -E "vast|runpod"` must stay ONE segment — the `|` there is DATA, not a
// pipe — otherwise `vast`/`runpod` get mis-read as a command head and false-block.
// (Stripping quotes first then splitting on `|`, the old approach, lost that
// boundary.) Each returned segment still carries its quotes; callers stripQuotes.
export function segments(raw: string): string[] {
  const segs: string[] = [];
  let cur = "";
  let q: string | null = null;
  for (const c of raw) {
    if (q) {
      if (c === q) q = null;
      cur += c;
    } else if (c === '"' || c === "'") {
      q = c;
      cur += c;
    } else if (c === ";" || c === "|" || c === "&" || c === "\n" || c === "(" || c === ")") {
      segs.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  segs.push(cur);
  return segs;
}

// A hexa-builtin invocation is the SANCTIONED path — never flag it even though it
// contains "cloud". Matches `hexa cloud …`, `hexa dojo …`, `hexa deck …`.
function isHexaBuiltin(cmd: string): boolean {
  return /(^|[\s;&|(])hexa\s+(cloud|dojo|deck)\b/.test(cmd);
}

// Provider CLI is the BLOCKED COMMAND only when it sits in command position —
// the first word of a command segment — not when it's merely an argument
// (`grep runpodctl logs`, `echo runpodctl`). We split the line into command
// segments on shell operators, then inspect each segment's leading token (after
// stripping a `sudo ` prefix and any leading VAR=val env-assignments).
// All three provider CLIs are blocked UNCONDITIONALLY in command position — no
// per-verb whitelist. `vast` used to gate on a fixed VAST_VERBS list, but vast.ai
// keeps adding subcommands (`set api-key`, `scp`, `attach`, `execute`, `logs`,
// `label`, `reboot`, …) so any whitelist leaks the moment a new verb ships — the
// exact recurring bypass. `vast` as a literal command head is essentially always
// the vast.ai CLI (a path collision would be `./vast`/`/usr/bin/vast`, which do
// NOT match the bare head), so on this no-override guard we bias to the
// false-positive and block bare `vast` outright.
// RunPod ships TWO CLIs — the Go `runpodctl` and the official Python `runpod`
// (`runpod config`/`project deploy`/`pod create`/`exec`) — so both heads must be
// blocked; listing only `runpodctl` left the entire `runpod` CLI surface open.
const CLI_COMMANDS = new Set(["runpodctl", "runpod", "vastai", "vast"]);

export function leadToken(segment: string): { head: string; rest: string[] } {
  let toks = segment.trim().split(/\s+/).filter(Boolean);
  if (toks[0] === "sudo") toks = toks.slice(1);
  while (toks[0] && /^[A-Za-z_][A-Za-z0-9_]*=/.test(toks[0])) toks = toks.slice(1); // env-assignments
  // strip quotes per-token AFTER segmentation (segments() preserved quote-bounded
  // separators); a quoted head like `"vast"` still resolves to its bare form.
  return { head: stripQuotes(toks[0] ?? ""), rest: toks.slice(1).map(stripQuotes) };
}

// Returns a human label for a raw provider CLI/API invocation, or null.
//   • provider CLI in command position: `runpodctl …`, `vastai …`, `vast …`
//   • the legacy wrapper verb `cloud rent` (the exact command a past session ran)
//   • provider control endpoints anywhere: api.runpod.io / rest.runpod.io /
//     api.runpod.ai (serverless) / console.vast.ai
export function detectRawCloudCli(rawCmd: string): string | null {
  // SEGMENT-LOCAL sanctioning: sanction only the hexa-builtin SEGMENT, not the whole
  // command string. A blanket `if (isHexaBuiltin(cmd)) return null` at the top let a
  // chained `hexa cloud pods; vastai create instance …` sail through — one sanctioned
  // token exempted the raw-provider tail. Judge each segment on its own head (same
  // whitelist-too-broad failure mode as VAST_VERBS / BOTH_RUNPOD_CLIS, one level up).
  for (const seg of segments(rawCmd)) {
    if (isHexaBuiltin(seg)) continue; // this segment is the sanctioned path — skip it
    const { head, rest } = leadToken(seg);
    if (head) {
      if (CLI_COMMANDS.has(head)) return `raw provider CLI \`${head}\``;
      if (head === "cloud" && rest[0] === "rent") return "`cloud rent` (raw provider rent)";
    }
    // provider control-plane API endpoints (curl/wget/python hitting them) — anywhere
    // in a NON-sanctioned segment (a legit `hexa cloud …` arg mentioning one is skipped).
    const api = /\b(api\.runpod\.io|rest\.runpod\.io|api\.runpod\.ai|console\.vast\.ai)\b/.exec(stripQuotes(seg));
    if (api) return `provider API endpoint \`${api[1]}\``;
  }

  return null;
}

// A GPU-pod RENT invocation via the sanctioned hexa builtin — `hexa cloud rent` (or
// alias `hexa cloud up`). This COSTS MONEY, so `pre bash` gates it behind a fresh user
// consent token (see modules/sign.ts). Two shapes:
//   • direct   — the rent is a top-level simple command (head-position, quote-aware):
//                `hexa cloud rent vast …`, `/opt/hexa/bin/hexa cloud up …`,
//                `VAR=x hexa cloud rent …`. Only THIS shape can be sign-gated + allowed.
//   • indirect — the rent verb hides inside an execution wrapper (`bash -c '…'`, `eval`,
//                `ssh host '…'`, `sidecar pool … -- …`) the gate can't see through, so it
//                is BLOCKED with "issue it directly" — NOT a mere mention (echo/grep of the
//                words stay null because their segment head is echo/grep, not a wrapper).
export type RentHit = { kind: "direct"; verb: "rent" | "up" } | { kind: "indirect"; via: string };

function baseName(head: string): string {
  const s = stripQuotes(head);
  return s.slice(s.lastIndexOf("/") + 1);
}

export function detectCloudRent(rawCmd: string): RentHit | null {
  // direct: a simple-command segment headed by `hexa` (any path) → `cloud rent|up`.
  for (const seg of segments(rawCmd)) {
    const { head, rest } = leadToken(seg);
    if (baseName(head) === "hexa" && rest[0] === "cloud" && (rest[1] === "rent" || rest[1] === "up")) {
      return { kind: "direct", verb: rest[1] as "rent" | "up" };
    }
  }
  // indirect: the rent string appears, but only flag it inside an EXECUTION wrapper
  // (so plain echo/grep/commit-message mentions never trip). Require both the wrapper
  // head AND the rent verb in that same segment's payload.
  const rentRe = /hexa\s+cloud\s+(rent|up)\b/;
  if (!rentRe.test(stripQuotes(rawCmd))) return null;
  for (const seg of segments(rawCmd)) {
    const { head, rest } = leadToken(seg);
    const b = baseName(head);
    const isShellC = ["bash", "sh", "zsh", "dash", "ksh"].includes(b) && rest.includes("-c");
    const isEval = b === "eval";
    const isSsh = b === "ssh";
    const isPool = b === "sidecar" && rest[0] === "pool";
    if ((isShellC || isEval || isSsh || isPool) && rentRe.test(stripQuotes(seg))) {
      return { kind: "indirect", via: isSsh ? "an ssh remote command" : isPool ? "a `sidecar pool` remote command" : `a \`${b}${isEval ? "" : " -c"}\` wrapper` };
    }
  }
  return null;
}

// Hand-rolled SHARD-FANOUT launcher — the exact pattern that defeats the raw-cloud
// block: instead of a sanctioned dispatch verb, a session writes a launcher loop
// that splits an input into N shards and stagger-launches each as a detached job,
// then `hexa cloud copy-to`s it (whitelisted) and runs it remotely — so the fanout
// never crosses this guard. We catch the LOOP itself (wherever it is authored: a
// bash heredoc, an inline `bash -c`, or a script body running in command position),
// not the copy-to. This is HEURISTIC and a local CPU-parallel batch is legitimate
// (pod.md allows CPU-local work) — so it is a WARN that REDIRECTS, never a block.
//
// Trigger requires FOUR corroborating signals so a benign loop won't trip it:
//   1. a loop / parallel-spawn construct: `for`/`while … do`, or `xargs -P`
//   2. a detach: `nohup` or `setsid`
//   3. backgrounding: a trailing `&`
//   4. an engine/training job launcher in the body: `hexa run`, torchrun/deepspeed/
//      `accelerate launch`, or `python[3] …`
// The line-balanced `split -n l/<N>` (the shard-split signature) raises confidence
// but is not required — `xargs -P` fanouts skip it.
export function detectHandrolledShardFanout(rawCmd: string): string | null {
  const cmd = stripQuotes(rawCmd);

  const hasLoop = /(^|[\s;&|])(for|while)\b[^\n]*?\bdo\b/.test(cmd) || /\bxargs\b[^\n]*-P\s*\d/.test(cmd);
  if (!hasLoop) return null;

  const hasDetach = /(^|[\s;&|])(nohup|setsid)\b/.test(cmd);
  if (!hasDetach) return null;

  const hasBackground = /&\s*($|[\n;)]|\bdone\b|\bsleep\b)/.test(cmd) || /&\s*$/m.test(cmd);
  if (!hasBackground) return null;

  const hasJobLauncher =
    /(^|[\s;&|(])hexa\s+run\b/.test(cmd) ||
    /(^|[\s;&|(])(torchrun|deepspeed)\b/.test(cmd) ||
    /(^|[\s;&|(])accelerate\s+launch\b/.test(cmd) ||
    /(^|[\s;&|(])python3?\s+[^\s|;&]*\.py\b/.test(cmd);
  if (!hasJobLauncher) return null;

  const sharded = /\bsplit\b[^\n]*-n\s+l?\/?\d/.test(cmd);
  return `hand-rolled ${sharded ? "shard-fanout" : "fanout"} launcher loop (detached \`nohup\`/\`setsid\` job launches in a loop)`;
}
