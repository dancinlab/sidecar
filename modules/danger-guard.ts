// danger-guard — code-level block for IRREVERSIBLE / gate-bypass bash commands.
//
// Mirrors the enforcement.json regex rules H-NO-VERIFY · H-RESET-HARD ·
// H-RM-RF-ROOT · H-CURL-PIPE-SH, but runs in CODE (in `pre bash`, before the
// config-regex layer, default-on) so a profile edit to enforcement.json can't
// silently weaken them — the same reasoning that put raw-cloud-CLI (c11) and
// force-push in code. Each rule still honors its INLINE escape marker
// (`# no-verify-ok` / `# reset-ok` / `# rm-ok` / `# curl-pipe-ok`) — an explicit,
// per-command, visible opt-out (c16-compatible) — but is NOT a config toggle.
//
//
// EXCEPTION: the rm-rf-root rule is opt-in via `config.dangerGuard.rmRfRoot` (default
// false = OFF, the user opted out). The other three (no-verify · reset-hard · curl|sh)
// stay code-level always-on — they're cheaper to false-trip and easy to escape inline.
import { config } from "../lib/config.ts";

type Hit = { id: string; reason: string };

const RULES: { id: string; re: RegExp; ok: string; why: string }[] = [
  {
    id: "DANGER-NO-VERIFY",
    re: /git\s+(commit|push)\b[\s\S]*(--no-verify|\s-n\b)/,
    ok: "# no-verify-ok",
    why: "`git --no-verify`/`-n` skips the pre-commit lint + CHANGELOG/doc gate (commons c14) — the gate is the point. Don't bypass it; if truly unavoidable add `# no-verify-ok <reason>` to the command.",
  },
  {
    id: "DANGER-RESET-HARD",
    re: /git\s+(reset\s+--hard|clean\s+-[a-z]*f[a-z]*d|checkout\s+--\s+\.)\b/,
    ok: "# reset-ok",
    why: "working-tree-destroying command (`git reset --hard` / `git clean -fd` / `git checkout -- .`) — unrecoverable, loses uncommitted work. Narrow it (specific paths) or add `# reset-ok <reason>`.",
  },
  {
    id: "DANGER-RM-RF-ROOT",
    // Block only when the target IS the root/home/wildcard itself — bare `/` · `/*` ·
    // `~` · `~/` · `~/*` · `$HOME`(/, /*) · `${HOME}` · bare `*`. A boundary lookahead
    // means specific subpaths (`/tmp/x`, `/Users/me/build`, `~/foo`, `$HOME/scratch`)
    // are NOT blocked — they're normal deletes. (Was over-blocking every absolute path.)
    re: /\brm\s+-(?=[a-zA-Z]*[rR])(?=[a-zA-Z]*[fF])[a-zA-Z]+\s+(?:-{1,2}[a-zA-Z-]+\s+)*(?:\/\*?|~(?:\/\*?)?|\$\{?HOME\}?(?:\/\*?)?|\*)(?=$|\s|[;&|])/,
    ok: "# rm-ok",
    why: "`rm -rf` targeting the ROOT itself — bare `/` · `/*` · `~` · `~/` · `$HOME` · `*` — catastrophic, irreversible. (Specific subpaths like `/tmp/x` or `~/foo` are allowed.) For an intentional root-level delete add `# rm-ok <reason>`.",
  },
  {
    id: "DANGER-CURL-PIPE-SH",
    re: /(curl|wget)\s+[^|]*\|\s*(sudo\s+)?(ba)?sh\b/,
    ok: "# curl-pipe-ok",
    why: "piping a remote download straight into a shell (`curl … | sh`) = remote arbitrary-code execution, unreviewed. Download, inspect, then run — or add `# curl-pipe-ok <reason>`.",
  },
];

// Returns the first matching destructive/bypass rule (honoring its inline marker), or null.
export function detectDangerousBash(rawCmd: string): Hit | null {
  const rmRfRoot = config().dangerGuard.rmRfRoot;
  for (const r of RULES) {
    if (r.id === "DANGER-RM-RF-ROOT" && !rmRfRoot) continue; // opted out (default)
    if (r.re.test(rawCmd) && !rawCmd.includes(r.ok)) return { id: r.id, reason: r.why };
  }
  return null;
}
