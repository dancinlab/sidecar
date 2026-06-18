// cloud-guard — built-in code-level block for raw GPU-provider CLI/API use AND
// raw training-job / input-deck launches in `pre bash`. The canonical path is
// hexa's builtins (`hexa cloud` / `hexa dojo` / `hexa deck`, commons c11); calling
// a provider's own CLI/API — or hand-running a train script / deck generator —
// directly bypasses that layer (and the `ing pod` board / cost accounting). This
// is enforced in CODE — before config rules, default-on, NO `# raw-cloud-ok`-style
// escape — so a regex profile edit can't silently weaken it (unlike an
// enforcement.json rule).
//
// @convergence state=ossified id=NO_RAW_CLOUD_CLI value="raw runpodctl/vastai/`cloud rent`/provider-API calls are blocked in code (pre bash), not just by an enforcement regex rule" threshold="a session ran `runpodctl pod create`/`cloud rent` directly because c11 was only a hint+warn; code guard runs before config rules with no override"
// @convergence state=ossified id=NO_RAW_DOJO_DECK value="raw `python train.py`/`torchrun`/`accelerate launch`/`deepspeed` training launches AND hand-run run.sh in a dojo/decks tree are blocked in code — use `hexa dojo`/`hexa deck`" threshold="c11 named dojo/deck builtins but only cloud CLI was code-guarded; training launches and deck run.sh slipped through"

// strip ' and " so a quoted token still resolves to its bare form
function stripQuotes(s: string): string {
  let out = "";
  for (const c of s) if (c !== "'" && c !== '"') out += c;
  return out;
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
const CLI_COMMANDS = new Set(["runpodctl", "vastai", "vast"]);
const VAST_VERBS = new Set(["create", "launch", "start", "stop", "destroy", "ssh", "show", "search", "copy", "cloud", "instance"]);

function leadToken(segment: string): { head: string; rest: string[] } {
  let toks = segment.trim().split(/\s+/).filter(Boolean);
  if (toks[0] === "sudo") toks = toks.slice(1);
  while (toks[0] && /^[A-Za-z_][A-Za-z0-9_]*=/.test(toks[0])) toks = toks.slice(1); // env-assignments
  return { head: toks[0] ?? "", rest: toks.slice(1) };
}

// Returns a human label for a raw provider CLI/API invocation, or null.
//   • provider CLI in command position: `runpodctl …`, `vastai …`, `vast <verb> …`
//   • the legacy wrapper verb `cloud rent` (the exact command a past session ran)
//   • provider control endpoints anywhere: api.runpod.io / rest.runpod.io / console.vast.ai
export function detectRawCloudCli(rawCmd: string): string | null {
  const cmd = stripQuotes(rawCmd);
  if (isHexaBuiltin(cmd)) return null;

  // segment on shell command separators: ; & | && || newline ( )
  for (const seg of cmd.split(/[\n;|&()]+/)) {
    const { head, rest } = leadToken(seg);
    if (!head) continue;
    if (head === "vast") {
      if (VAST_VERBS.has(rest[0] ?? "")) return "raw provider CLI `vast`";
      continue; // bare `vast` w/o a provider verb (e.g. a path) — not the CLI
    }
    if (CLI_COMMANDS.has(head)) return `raw provider CLI \`${head}\``;
    if (head === "cloud" && rest[0] === "rent") return "`cloud rent` (raw provider rent)";
  }

  // provider control-plane API endpoints (curl/wget/python hitting them) — match
  // anywhere, since the endpoint is the intent regardless of token position.
  const api = /\b(api\.runpod\.io|rest\.runpod\.io|console\.vast\.ai)\b/.exec(cmd);
  if (api) return `provider API endpoint \`${api[1]}\``;

  return detectRawDojoDeck(cmd);
}

// Always-a-training-launcher in command position → must go through `hexa dojo`.
// (`accelerate` is handled separately — only `accelerate launch`, not `accelerate config`.)
const DOJO_LAUNCHERS = new Set(["torchrun", "deepspeed"]);

// Raw training-job launch or hand-run dojo/deck script — bypasses `hexa dojo`/`hexa
// deck` (which scaffold + register the job). Detected:
//   • a distributed launcher in command position: `torchrun …`, `deepspeed …`,
//     `accelerate launch …`
//   • `python[3] …train….py` / `…finetune….py` / `…sft….py` in command position
//   • executing a `run.sh` that lives in a `dojo/` or `decks/` tree (the builtin's
//     own output — running it by hand skips the builtin's dispatch + ing-pod reg)
function detectRawDojoDeck(cmd: string): string | null {
  for (const seg of cmd.split(/[\n;|&()]+/)) {
    const { head, rest } = leadToken(seg);
    if (!head) continue;
    if (head === "accelerate" && rest[0] === "launch") return "raw training launcher `accelerate launch` — use `hexa dojo`";
    if (DOJO_LAUNCHERS.has(head)) return `raw training launcher \`${head}\` — use \`hexa dojo\``;
    if (/^python3?$/.test(head)) {
      const script = rest.find((t) => /\.py$/.test(t)) ?? "";
      if (/(train|finetune|fine_tune|sft|pretrain)[^/]*\.py$/i.test(script))
        return `raw training script \`${script}\` — use \`hexa dojo\``;
    }
    // hand-run dojo/deck run.sh (bash/sh/./ a script under a dojo|decks tree)
    const runsh = rest.concat(head).find((t) => /(^|\/)(dojo|decks)\/.*run\.sh$/.test(t) || /(dojo|decks)\/[^ ]*\/run\.sh$/.test(t));
    if (runsh && (/^(bash|sh)$/.test(head) || /run\.sh$/.test(head) || head.startsWith("./")))
      return `hand-run dojo/deck script \`${runsh}\` — use \`hexa dojo\`/\`hexa deck\``;
  }
  return null;
}
