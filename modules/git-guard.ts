// git-guard — force-push detection for `pre bash` (sidecar git-guard layer 1
// parity). DENIES a force-type push, which rewrites or bypasses shared history:
//   git push --force / -f
//   git push --force-with-lease[=<arg>]
//   git push <remote> +<refspec>     (refspec-level force, the leading `+`)
// Quotes are stripped before tokenizing so a quoted flag (e.g. '--force' or
// +"refspec") still resolves to its bare form. `--no-verify` is NOT a force
// operation and is left alone. Returns a human label, or null when not a force
// push — the caller decides how to block.

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
    if (t === "-f" || t === "--force") return "git push --force / -f";
    if (t === "--force-with-lease" || t.startsWith("--force-with-lease=")) return "git push --force-with-lease";
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
