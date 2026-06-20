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
// @convergence state=ossified id=CODE_GUARD_DESTRUCTIVE_BYPASS value="--no-verify (gate bypass), git reset --hard/clean -fd (working-tree destroy), rm -rf / ~ $HOME (catastrophic), curl|wget|sh (remote code exec) are blocked in CODE before config rules — not regex-only — so a profile edit can't disable them; inline `# ...-ok` markers still allow an explicit per-command override" threshold="these were block-policy but enforcement.json-only; a regex/profile edit (or the stdin-input bug that disabled the whole pre layer) would have left the irreversible/gate-bypass commands unguarded"
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
    re: /\brm\s+-(?=[a-zA-Z]*[rR])(?=[a-zA-Z]*[fF])[a-zA-Z]+\s+(\/|~|\*|\$HOME)/,
    ok: "# rm-ok",
    why: "`rm -rf` targeting `/`, `~`, `$HOME`, or a bare `*` — catastrophic, irreversible delete. Narrow the path to the exact dir, or add `# rm-ok <reason>`.",
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
  for (const r of RULES) {
    if (r.re.test(rawCmd) && !rawCmd.includes(r.ok)) return { id: r.id, reason: r.why };
  }
  return null;
}
