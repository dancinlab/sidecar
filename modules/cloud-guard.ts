// cloud-guard — built-in code-level block for raw GPU-provider CLI/API use AND
// raw training-job / input-deck launches in `pre bash`. The canonical path is
// hexa's builtins (`hexa cloud` / `hexa dojo` / `hexa deck`, commons canonical-cli); calling
// a provider's own CLI/API — or hand-running a train script / deck generator —
// directly bypasses that layer (and the `ing pod` board / cost accounting). This
// is enforced in CODE — before config rules, default-on, NO `# raw-cloud-ok`-style
// escape — so a regex profile edit can't silently weaken it (unlike an
// enforcement.json rule).
//
// @convergence state=ossified id=NO_RAW_CLOUD_CLI value="raw runpodctl/vastai/`cloud rent`/provider-API calls are blocked in code (pre bash), not just by an enforcement regex rule" threshold="a session ran `runpodctl pod create`/`cloud rent` directly because c11 was only a hint+warn; code guard runs before config rules with no override"
// @convergence state=ossified id=NO_RAW_DOJO_DECK value="raw `python train.py`/`torchrun`/`accelerate launch`/`deepspeed` training launches AND hand-run run.sh in a dojo/decks tree are blocked in code — use `hexa dojo`/`hexa deck`" threshold="c11 named dojo/deck builtins but only cloud CLI was code-guarded; training launches and deck run.sh slipped through"
// @convergence state=in_flight id=NO_HANDROLLED_SHARD_FANOUT value="a hand-rolled launcher loop (split -n l/N + a for/while loop that setsid/nohup-backgrounds repeated `hexa run`/training launches) is the exact bypass that defeated NO_RAW_CLOUD_CLI — copy-to is whitelisted so the .sh sails through, then the fanout runs remotely unseen. Detected as a WARN that redirects to `hexa cloud fire-shards`" threshold="a session wrote /tmp/h1305_launch.sh (12-shard staggered `hexa run` decode loop) + `hexa cloud copy-to` + remote run, bypassing structured dispatch/register/cost-accounting; the guard only saw the whitelisted copy-to"

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
// All three provider CLIs are blocked UNCONDITIONALLY in command position — no
// per-verb whitelist. `vast` used to gate on a fixed VAST_VERBS list, but vast.ai
// keeps adding subcommands (`set api-key`, `scp`, `attach`, `execute`, `logs`,
// `label`, `reboot`, …) so any whitelist leaks the moment a new verb ships — the
// exact recurring bypass. `vast` as a literal command head is essentially always
// the vast.ai CLI (a path collision would be `./vast`/`/usr/bin/vast`, which do
// NOT match the bare head), so — like DOJO_TRAIN_NAME_BROAD on this no-override
// guard — we bias to the false-positive and block bare `vast` outright.
// @convergence state=ossified id=NO_VAST_VERB_WHITELIST value="`vast` is blocked unconditionally in command position, same as `vastai`/`runpodctl` — NO verb whitelist" threshold="a verb whitelist (VAST_VERBS) only blocked ~10 verbs; `vast set api-key`/`vast scp`/`vast execute`/literally `vast cli` all leaked because their verb wasn't listed — the guard 're-unlocked' every time vast.ai added a subcommand"
const CLI_COMMANDS = new Set(["runpodctl", "vastai", "vast"]);

function leadToken(segment: string): { head: string; rest: string[] } {
  let toks = segment.trim().split(/\s+/).filter(Boolean);
  if (toks[0] === "sudo") toks = toks.slice(1);
  while (toks[0] && /^[A-Za-z_][A-Za-z0-9_]*=/.test(toks[0])) toks = toks.slice(1); // env-assignments
  return { head: toks[0] ?? "", rest: toks.slice(1) };
}

// Returns a human label for a raw provider CLI/API invocation, or null.
//   • provider CLI in command position: `runpodctl …`, `vastai …`, `vast …`
//   • the legacy wrapper verb `cloud rent` (the exact command a past session ran)
//   • provider control endpoints anywhere: api.runpod.io / rest.runpod.io / console.vast.ai
export function detectRawCloudCli(rawCmd: string): string | null {
  const cmd = stripQuotes(rawCmd);
  if (isHexaBuiltin(cmd)) return null;

  // segment on shell command separators: ; & | && || newline ( )
  for (const seg of cmd.split(/[\n;|&()]+/)) {
    const { head, rest } = leadToken(seg);
    if (!head) continue;
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
//
// @convergence state=ossified id=DOJO_TRAIN_NAME_BROAD value="the `(train|finetune|sft|pretrain)*.py` script match is INTENTIONALLY broad — it over-blocks helpers like `train_utils.py`/`trainer.py` too. Name alone can't separate a launcher (train_lora.py) from a helper (train_utils.py), and this guard is no-override, so we bias to false-positive: a missed launch (FN) leaks uncounted GPU $, a false block (FP) is recoverable (route via `hexa dojo`, or rename the non-launch script)" threshold="someone proposes narrowing the regex (e.g. only `train.py`) to cut FPs — DON'T: it reopens the FN hole (run_training.py, train_model.py launchers slip through). Keep broad; accept the FP."
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
