// git-guard — force-push detection for `pre bash` (layer-1 code guard).
// DENIES a BLIND force-type push, which clobbers shared history:
//   git push --force / -f
//   git push <remote> +<refspec>     (refspec-level force, the leading `+`)
// ALLOWS `git push --force-with-lease[=<arg>]` — the SAFE form (refuses to
// overwrite if the remote moved since your last fetch); it is the standard
// rebase-then-push workflow and is EXEMPT in config enforcement.json, so the
// code guard must agree (the two SSOTs were out of sync — lease was double-
// blocked with no override). An inline `# force-ok <reason>` marker overrides
// a bare-force block (escape parity with config's `# force-ok`).
// Quotes are stripped before tokenizing so a quoted flag (e.g. '--force' or
// +"refspec") still resolves to its bare form. `--no-verify` is NOT a force
// operation and is left alone. Returns a human label, or null when not a
// blockable force push — the caller decides how to block.
//
// @convergence state=ossified id=FORCE_LEASE_DUAL_SSOT value="`--force-with-lease` is ALLOWED by both the code guard (git-guard.ts) and config enforcement.json (H-FORCE-PUSH exceptions) — only blind --force/-f/+refspec is blocked, with a `# force-ok` escape" threshold="QA found git-guard blocked --force-with-lease while config exempted it → lease hard-blocked with no override, breaking the rebase→lease-push workflow; aligned code guard to config intent"

// strip ' and " so a quoted flag still tokenizes to its bare form
function stripQuotes(s: string): string {
  let out = "";
  for (const c of s) if (c !== "'" && c !== '"') out += c;
  return out;
}

function tokens(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

export function detectForcePush(rawCmd: string): string | null {
  // inline escape: `# force-ok <reason>` overrides a bare-force block (config parity)
  if (/#\s*force-ok\b/.test(rawCmd)) return null;
  const toks = tokens(stripQuotes(rawCmd));
  const n = toks.length;

  // find `git … push`, allowing git-level options (`-c key=val`, `--flag`)
  // between `git` and the `push` subcommand — so `git -c x=y push --force` is
  // not a blind spot. `gp` = index of the `push` token.
  let gp = -1;
  for (let i = 0; i < n; i++) {
    if (toks[i] !== "git") continue;
    let j = i + 1;
    while (j < n && toks[j].startsWith("-")) {
      if (toks[j] === "-c" || toks[j] === "--config") j++; // -c takes a value
      j++;
    }
    if (j < n && toks[j] === "push") {
      gp = j;
      break;
    }
  }
  if (gp < 0) return null;

  // flag-form force
  for (let j = gp + 1; j < n; j++) {
    const t = toks[j];
    // --force-with-lease is the SAFE form — allowed (config-exempt). Skip it.
    if (t === "--force-with-lease" || t.startsWith("--force-with-lease=")) continue;
    if (t === "-f" || t === "--force") return "git push --force / -f";
  }

  // refspec-level force — a positional (non-flag) token after `git push` whose
  // first char is `+` (e.g. `git push origin +main`, `+HEAD:refs/heads/x`).
  for (let j = gp + 1; j < n; j++) {
    const t = toks[j];
    if (t.startsWith("-")) continue; // a flag, not a refspec
    if (t.length > 1 && t[0] === "+") return "git push <remote> +<refspec> (refspec-level force)";
  }

  return null;
}
