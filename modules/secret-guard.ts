// secret-guard — code-level block for HARDCODED credential literals at write time.
//
// Mirrors the enforcement.json `H-SECRET-LITERAL` rule (path_match · bypass_patterns ·
// exemption_markers) but runs in CODE (in `pre write`, before the config-regex layer,
// default-on) so a profile edit can't silently weaken it. A committed secret is an
// IRREVERSIBLE leak (it lives in git history even after deletion) — exactly the
// blast-radius that belongs in a no-override code guard alongside force-push / cloud-raw.
//
// Honors the same per-line exemption markers as the regex rule (`@secret-ok`, `process.env`,
// `example`, `REDACTED`, `xxxx`) so placeholders / env-var reads / fixtures are not flagged.
//
// @convergence state=ossified id=CODE_GUARD_SECRET_LITERAL value="hardcoded API keys / private keys / provider tokens are blocked in CODE at write time (before config rules) — a committed secret is an irreversible git-history leak; regex-only enforcement could be disabled by a profile edit" threshold="H-SECRET-LITERAL was block-policy but enforcement.json-only; the stdin-input bug (and any profile edit) would have left credential writes unguarded"

// code/config file extensions where an inline credential is a real leak (matches H-SECRET-LITERAL path_match)
const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|py|rb|php|go|rs|java|kt|scala|c|h|cpp|cc|hpp|m|mm|swift|dart|hexa|env|ya?ml|json|toml)$/i;

const SECRET_PATTERNS: RegExp[] = [
  /(aws_secret_access_key|aws_access_key_id)\s*[:=]\s*['"][A-Za-z0-9/+]{16,}/i,
  /(api[_-]?key|secret|password|passwd|token)\s*[:=]\s*['"][^'"\n]{12,}['"]/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
];
const EXEMPTION_MARKERS = ["@secret-ok", "process.env", "example", "REDACTED", "xxxx"];

// Returns a human label for a hardcoded credential in code-file content, or null.
export function detectSecretLiteral(filePath: string, content: string): string | null {
  if (!CODE_FILE.test(filePath)) return null;
  for (const line of content.split("\n")) {
    if (EXEMPTION_MARKERS.some((m) => line.includes(m))) continue;
    for (const p of SECRET_PATTERNS) {
      if (p.test(line)) {
        return `hardcoded credential — use an env var / the \`secret\` CLI, never an inline literal (a committed secret stays in git history forever). If it's a placeholder, add \`// @secret-ok\` to the line. (commons c1)`;
      }
    }
  }
  return null;
}
