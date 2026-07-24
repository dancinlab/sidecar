# sign — user-consent gate for cost / irreversible actions

A tiny host-global token store (`~/.sidecar/signs/<key>.sign`) lets the HUMAN pre-authorize an
action the agent must not take on its own. Today the one key is `rent`: a GPU-pod rent
(`hexa cloud rent` / alias `hexa cloud up`) costs real money, so `pre bash` refuses it until a
fresh `rent` token exists.

## Security model (why the agent can't self-authorize)

The token is minted ONLY by the human typing the TUI bang `!sidecar sign rent`. The `!` bang runs
outside the PreToolUse hook, so it mints freely; the agent's own `sidecar sign rent` tool call
routes THROUGH the hook and is denied (`SIGN-SELF-MINT`), as is any write into the store
(`SIGN-FORGE`). So the gate rests on one fact: **the agent cannot emit a `!` bang** (it is
user-only input) — not on the text parser being airtight. This is enforcement within the hook
threat model, not an OS boundary.

## The agent's protocol when a rent is blocked (`CLOUD-RENT-UNSIGNED`)

1. Tell the user WHAT you intend to rent: provider · GPU type/count · est. $/hr · purpose ·
   expected duration (say "estimate" when no exact quote is available — never invent a figure).
2. Ask the user to type, in the prompt:  `!sidecar sign rent`
3. WAIT for their confirmation, then retry the SAME rent command ONCE. Do NOT loop — if it
   blocks again the token expired or was already consumed; go back to step 1.

Agent-safe verbs (never blocked): `sidecar sign` (list) · `sidecar sign check rent` ·
`sidecar sign clear [<key>]`.

## Semantics

- **One-shot**: the token is consumed atomically the moment a direct `hexa cloud rent|up` command
  is admitted (not on rent success — there is no reliable Bash post-hook, and pre-consume stops
  two parallel sessions double-spending one sign). One sign = one rent-issuing command.
- **TTL 10 min**: the guard fires at command LAUNCH, so the TTL need not cover the multi-minute
  ssh-ready wait — only the agent's preamble between the user signing and issuing the rent.
- **Indirect rents are blocked, not gated**: a rent hidden inside `bash -c` / `eval` / `ssh` /
  `sidecar pool … --` (`CLOUD-RENT-INDIRECT`) can't be seen through — issue the rent as one direct
  top-level command so the gate can gate it.
- **No override**: no env-var, flag, or inline marker weakens this. TTL/one-shot are code
  constants, not config (a config-tunable TTL would be an opt-out the agent could edit).

## Phase-2 follow-up (out of this repo's scope, documented not built)

Text-guard enforcement can't reach base64/eval-constructed commands or a remote pool host that
holds its own provider credentials. The structural closure is to make `hexa cloud rent|up` itself
require a valid `sidecar sign check rent` before provisioning — then scripts, `eval`, and remote
rents all fail without a local token, and the human can still self-sign in their own terminal.
