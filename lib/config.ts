import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { REPO_ROOT, SIDECAR_CONFIG_DIR } from "./paths.ts";

// harness.config.json (at REPO_ROOT) declares everything project-specific.
// Anything omitted falls back to the bundled defaults below, so a repo with
// NO config file still gets sensible cross-project behavior.

export interface VerifyCheck {
  id: string;
  cmd: string;
  timeoutMs?: number;
  slow?: boolean; // skipped by `verify fast`
}

// One step in the scaffolded CI workflow (`sidecar ci scaffold` / init).
// Serialized verbatim into .github/workflows/ci.yml between checkout and `sidecar ci`.
export interface CiStep {
  name?: string;
  uses?: string;
  with?: Record<string, string>;
  run?: string;
  shell?: string;
}

export interface FreshnessFile {
  path: string; // repo-relative
  maxAgeDays: number;
  rule?: string;
}

export interface SidecarConfig {
  project: string;
  // L0 "lockdown" files — editing one emits an onEdit reminder (post edit) and
  // is flagged by `lint` when staged. Optionally parsed from a markdown 🔴 L0 block.
  lockdown: {
    files: string[];
    fromMarkdown?: string; // repo-relative .md to scan for a "🔴 L0" block
    onEditReminder?: string;
  };
  // Filenames (repo-relative) of the rule configs. If the repo file is absent,
  // the bundled default under SIDECAR_CONFIG_DIR is used.
  enforcementFile: string;
  keywordsFile: string;
  severityMapFile: string;
  verify: { checks: VerifyCheck[] };
  // CI scaffold (`sidecar ci scaffold` / `init`) — emits a GitHub
  // Actions workflow that runs `sidecar ci` (verify.checks) on `runner`. `setup`
  // = the stack-specific steps (node/hexa/python …) injected before the verify.
  // `fallback` (when set) turns on the cost-free fast path: a tiny dispatch job
  // prefers the self-hosted pool when a runner is ONLINE+idle, else falls back to
  // this github-hosted runner — safe by construction (probe error → fallback, so CI
  // never queues forever). `cachePaths` emits an actions/cache step (warm reuse).
  ci: { runner: string; setup: CiStep[]; enforceRunner?: boolean; fallback?: string; cachePaths?: string[] };
  lint: {
    freshnessFiles: FreshnessFile[];
    // staged code changes REQUIRE the changelog file to also be staged
    changelog?: { file: string; triggerPattern: string; ignore?: string[] };
    // committing directly on one of these branches is a violation
    protectedBranches?: string[];
    // do/dont line length cap (chars/codepoints) for commons.md + CLAUDE.md —
    // a new or LENGTHENED `- do:` / `- dont:` line over this is gated (diff-aware:
    // legacy long lines are grandfathered, only new/grown ones block). 0 = off.
    dodontCap?: number;
    // minimal cap (chars/codepoints) for a `commands/*.md` (or SKILL.md)
    // `description:` — keeps the plugin slash-command surface minimal (lead with
    // what it does + a `Triggers —` clause; move flag tables / sub-verb catalogues
    // into the body or `--help`). Separate from the 1400 Claude Code skill-listing
    // ceiling (SHADOW-DESC): this is the much tighter "minimal" line. 0 = off.
    cmdDescCap?: number;
    // ARCHITECTURE.json design-tree hygiene (c4): max chars for a single leaf
    // cell (상세/역할/note) before it must be trimmed to its crisp kernel or split
    // into child nodes (ARCH-BIG-CELL) · max " · "-joined items in one leaf before
    // it must decompose (ARCH-PILED). 0 = off.
    archCellCap?: number;
    archPiledMax?: number;
    // per-inject byte-cap MAP — EACH source sidecar injects to the agent (re-injected
    // every turn/session) gets its OWN size lint (INJECT-OVERSIZED), so prose bloat is
    // caught per inject, not as a lump. Keyed by repo-relative path; a key ending "/"
    // caps every `*.md` directly under that dir INDIVIDUALLY at that value. Each entry
    // = that inject's own budget. 0 (or absent) = that inject not size-capped here.
    // (commons.md / ARCHITECTURE.json are each linted by their OWN format lint — do/dont ·
    // cell-cap — which is their inject lint. CLAUDE.md gets a dedicated ALWAYS-ON byte cap
    // below (claudeMdCap) since it is re-injected EVERY turn in every repo.)
    injectCaps?: Record<string, number>;
    // aggregate ceiling on the SUM of single-file inject sources (per-turn re-injection
    // total = context-rot driver). per-source caps stop one file; this stops the sum.
    injectBudgetBytes?: number;
    // extra files re-injected every turn that have their OWN format lint (so not in
    // injectCaps) but still spend the per-turn token budget — counted toward the SUM
    // only (e.g. ["CLAUDE.md"]). Makes injectBudgetBytes reflect the TRUE per-turn total.
    injectBudgetExtra?: string[];
    // ADDITIONAL english-only governance docs beyond the ALWAYS-ON built-in baseline
    // (CLAUDE.md · .harness/commons.md · config/commons.md — enforced in EVERY repo with no
    // config). This list is ADDITIVE: it extends the baseline, never shrinks it. Each entry
    // is either an exact repo-relative path, OR a bare filename with no "/" meaning "every
    // tracked file with that basename". Korean (Hangul) PROSE in a re-injected doc costs
    // ~3 bytes/char (2-3x token budget every turn) and prefs mandate english docs; Korean
    // literals inside `backticks` are exempt. diff-aware: only a STAGED target blocks.
    injectEnglishOnly?: string[];
    // ALWAYS-ON byte cap on EVERY tracked CLAUDE.md (root + subfolder guides) — it is
    // re-injected every turn (claudemd inject) in every repo, so an oversized one silently
    // taxes ALL future turns (context-rot · the "agent gets dumber" failure). Default below;
    // a per-repo override extends but the default applies with no config. diff-aware: only a
    // STAGED CLAUDE.md over cap blocks (legacy bloated files grandfathered until touched).
    // 0 = off (explicit opt-out only). CLAUDE-MD-OVERSIZED.
    claudeMdCap?: number;
    // ALWAYS-ON byte cap on every tracked commons.md (config/commons.md · .harness/commons.md)
    // — the governance SSOT re-injected EVERY turn (commons inject), same context-rot risk as
    // CLAUDE.md, so it is held to the SAME lean bar. diff-aware (staged only · legacy
    // grandfathered until touched). 0 = off. COMMONS-OVERSIZED.
    commonsCap?: number;
  };
  // optional shared-file sync: a shell script the repo runs to fan files out
  sync?: { script: string };
  // upstream dependencies to fix IN-SESSION (not defer to an inbox memo) when a
  // downstream task surfaces an upstream bug/improvement. `sidecar upstream`.
  upstreams: { name: string; repo: string; branch?: string }[];
  // markdown guides whose relative links `gc` checks for drift
  guides: string[];
  // nudge per-subfolder CLAUDE.md authoring: `folders` command + post-edit hint
  folderGuides: {
    enabled: boolean;
    roots: string[];
    depth: number;
    minFiles: number;
    filename: string;
    ignore: string[];
    ext: string[];
  };
  // single-doc discipline — keep AI output in two canonical files instead of
  // scattering reports/notes. Active only when `architecture` file exists (opt-in
  // by presence). architecture = UPDATE-in-place SSOT; log = APPEND-only.
  docs: {
    architecture: string; // 최종 아키텍처 SSOT (업데이트형, 추가형 아님)
    log: string; // 추가형 로그 (append-only)
    scratchDir: string; // 임시 산출물 보관 (tmp 휘발 금지)
    scatterPatterns: string[]; // 흩어진 문서로 간주하는 .md 작명 패턴
    allow: string[]; // SSOT/허용 문서 (scatter·quickref 검사 제외)
    // optional: limit scatter/quickref enforcement to these top-level dirs
    // ("" = repo-root files). Undefined = whole repo. CLAUDE-MD check is unaffected.
    // Use for research repos with a large legit doc corpus.
    scopeDirs?: string[];
    // required headings in the repo-root CLAUDE.md (commit-time gate · block). Each
    // listed heading MUST appear (level-agnostic match on the heading TEXT) AND carry
    // a non-empty body before the next heading — so a project map can't ship without
    // them. Default ["## Project","## Tree"]: a project blurb + a brief orientation
    // tree. A heading whose text contains tree/구조/트리/structure additionally warns
    // when its body lacks ├─/└─ nodes or per-node descriptions; the DEEP structure
    // SSOT still lives in ARCHITECTURE.json (## Tree is a top-level entry map, not a
    // duplicate of it). [] disables the named-section gate → legacy heuristic (H1-prose
    // blurb + tree-only-when-no-architecture-SSOT). Active only when docs discipline is
    // (architecture file present).
    claudeMdSections?: string[];
    // write-time enforcement (PreToolUse Write/Edit on .md). "warn" surfaces the
    // violation the moment a scattered/quickref-less doc is created (default —
    // the lint/commit check alone fires too late to be followed); "block" vetoes
    // the write; "off" disables write-time checks (lint still reports).
    enforce?: "off" | "warn" | "block";
  };
  // LSP wiring for the agent's editor. `wire` writes a Claude-Code `.lsp.json`
  // (canonical filename) mapping file extensions → a language server. `rebuild`
  // (default true) auto-recompiles a prebuilt hexa-native LSP binary in the
  // background when its grammar source is edited.
  lsp: {
    servers: { lang: string; extensions: string[]; command: string; args: string[] }[];
    rebuild: boolean;
  };
  // git safety guards evaluated in `pre bash` BEFORE the config enforcement rules.
  // guardForcePush DENIES force-type push (--force / -f / --force-with-lease /
  // `git push <remote> +<refspec>`) which rewrites or bypasses shared history.
  // `--no-verify` is intentionally NOT blocked (left to user discipline).
  // guardBranchSwitch DENIES a HEAD-moving `git checkout`/`git switch` to a
  // different branch when cwd is the MAIN worktree — switching the shared primary
  // checkout out from under a parallel session/the user clobbers untracked work
  // (the parallel-worktree incident, #3559). Linked/temp worktrees are exempt
  // (they are MEANT to switch). Working-tree-only restores are left alone.
  // guardOffMainEdit DENIES a Write/Edit (pre write) when the MAIN worktree is
  // parked on a NON-default branch (HEAD ≠ origin/main|master). guardBranchSwitch
  // stops you LEAVING main; this stops you WORKING while the main checkout is
  // already off-default — the stale-branch trap where a session starts parked on
  // an old feature branch and edits outdated code (git-context warns, this blocks).
  // Return with `git checkout <default>`, or do parallel work in an isolated
  // worktree (`git worktree add <path> -b <branch>`). Linked worktrees are exempt.
  git: { guardForcePush: boolean; guardBranchSwitch: boolean; guardOffMainEdit: boolean };
  // tmpGuard warns (pre bash/write) when progress/working data is written to a
  // volatile tmp location (/tmp · /private/tmp · /var/folders · $TMPDIR) — that
  // data is discarded on reboot/reaper. Steer it to docs.scratchDir, which is
  // git-tracked and committed, so progress is preserved on GitHub. Warn-only.
  tmpGuard: boolean;
  // handoffGuard BLOCKS scattered hand-off markdown (HANDOFF.md / INBOX.md /
  // inbox/*.md at any depth) on Write/Edit — hand-offs route through the
  // repo-root ING.jsonl board (`sidecar ing add <text>`), not ad-hoc files.
  handoffGuard: boolean;
  // namingGuard BLOCKS (pre write AND pre bash) when a new file/dir name carries a
  // version/copy suffix (`_v2` · `_final` · `_copy` · `_old` · `foo 2` …) instead of
  // a canonical native name. Versioned siblings ARE the history — and history belongs
  // to git, not the filename. Steer to one canonical file updated in place. The
  // `@canonical-ok` (Write/Edit content) / `# canonical-ok` (bash) marker overrides.
  namingGuard: boolean;
  // portablePathGuard WARNS (pre write) when a SHIPPED runtime script (under a
  // hooks/·commands/·skills/·bin/·pi/ dir, ext .sh/.py/.hexa/.ts/.js/.rb/.pl)
  // hardcodes an absolute machine home path (`/Users/<you>/…` · `/home/<you>/…`)
  // instead of resolving at runtime ($HOME · ${CLAUDE_PLUGIN_ROOT} · PATH) — a
  // hardcode breaks the moment the plugin runs on another host/user. Advisory
  // (non-block) — a nudge to the portable form. Ported from archive portable-path-guard.
  portablePathGuard: boolean;
  // askqText DENIES the AskUserQuestion option-box tool (PreToolUse) and tells
  // the agent to ask in plain CHAT text instead (options inline, mark the
  // recommended one, accept a free-form answer). A FORM redirect, not anti-punt.
  askqText: boolean;
  // dojo scaffolder defaults. The sidecar engine is DOMAIN-AGNOSTIC, so the
  // preferred training/kernel stack is carried HERE (per-repo config), never
  // hardcoded in the engine. Absent → the generic py stub (back-compat).
  //   defaultLang — driver language when `--lang` is not passed (default "py").
  //   stack       — human label surfaced in the scaffold + pod/dojo runbook
  //                 (e.g. "flame+forge+hexa-cuda" for the hexa-native GPU path).
  //   delegate    — when set AND the `hexa` binary is on PATH, `sidecar dojo
  //                 <slug>` shells out to `hexa dojo <delegate> <slug>` to emit
  //                 the REAL domain artifacts (e.g. flame_forge → train.hexa over
  //                 the flame/forge substrate; hexa_cuda → nvptx kernel) instead
  //                 of the generic stub. Falls back to the stub if hexa is absent.
  dojo?: {
    defaultLang?: "py" | "hexa" | "both";
    stack?: string;
    delegate?: string;
  };
  ledger: { staleSec: number };
  // ing staleness (c6) — warn at session Stop when ≥ `editThreshold` code files were
  // edited since the ing board was last touched (add/next/done). 0 disables the nudge.
  // ing.editThreshold — Stop-hook warn when ≥N code files edited without a board
  // touch. ing.staleDays — a work item open ≥ this many days is flagged 묵음(stale)
  // in the per-turn inject + show, pushing a `done` scrub (the board holds only
  // ACTIVE work; completed lines graduate to CHANGELOG — they must NOT pile up).
  // ing.maxActive — when the open work count exceeds this, inject shouts 적체(bloat).
  ing: { editThreshold: number; staleDays: number; maxActive: number };
  // worktree gc — `[gone]` upstream only catches pushed+deleted branches; squash-merge /
  // no-push agent worktrees never get it and pile up. `maxAgeDays` is the age backstop:
  // a clean, unlocked, not-recently-touched AGENT worktree whose HEAD is older than this
  // is reaped (its tip preserved under refs/reaped/ first, so work is recoverable). 0 disables.
  worktree: { maxAgeDays: number };
  // danger-guard — code-level destructive-command blocks. rmRfRoot gates ONLY the
  // catastrophic `rm -rf /` · `~` · `$HOME` · `*` block; default false = NOT guarded
  // (the user opted out). no-verify / reset-hard / curl|sh remain always-on (code).
  dangerGuard: { rmRfRoot: boolean };
  // mem-guard — OOM prevention. PreToolUse preflight warns (warnPct) / blocks
  // (blockPct) a background-spawn (`&`/nohup) when system available RAM is low; the
  // opt-in launchd watchdog (`sidecar mem-guard install`) notifies every
  // watchdogIntervalSec. blockPct=0 = warn-only (never block). enabled=false off.
  memGuard: { enabled: boolean; warnPct: number; blockPct: number; watchdogIntervalSec: number };
  // annotation-guard — the ONLY sidecar guard on MCP tool calls (PreToolUse
  // matcher `mcp__.*` → `pre tool`). The hook payload does NOT expose an MCP
  // tool's annotations, so sidecar carries a CONFIG-declared registry (`file`,
  // bundled `config/tool-annotations.json`, repo override) mapping tool-name
  // patterns → declared hints (readOnly/destructive/openWorld/sensitive) and
  // applies that file's Rule-of-Two policy (warn on mutation · block on the
  // destructive+openWorld combo). enabled=false off. See modules/annotation-guard.ts.
  annotationGuard: { enabled: boolean; file: string };
  // convergence enforce — when ON, the Stop hook `architecture convergence stop-check`
  // BLOCKS (not just advisory-warns) when the agent's OWN last message carries a
  // recurrence signal (config/convergence-triggers.json) but no `🧬 CONVERGENCE`
  // accounting line — forcing the root-cause learning to be either recorded into
  // ARCHITECTURE.json convergence.records[] (`🧬 CONVERGENCE 기록: <id>`) or
  // consciously dismissed (`🧬 CONVERGENCE: 해당 없음`). Mirrors the ing/architecture
  // stop-check marker gate; stop_hook_active bounds it to one block per chain (no
  // wedge). false = legacy advisory warn-only. See modules/architecture.ts.
  convergenceEnforce: boolean;
  // convergenceOnTouch surfaces a file's recorded recurrence-prevention learnings as
  // INJECTED context (PreToolUse additionalContext) the moment the agent Writes/Edits
  // that file, so it can't reintroduce a defect already learned-from. Keyed by the
  // record's `source` filename (see convergenceForFile). false = no per-touch inject.
  convergenceOnTouch: boolean;
  // companions — sibling-CLI command catalogs surfaced at SessionStart (`sidecar
  // companions inject`). DOMAIN-AGNOSTIC engine: this lists adjacent project CLIs
  // (e.g. `hexa`) by DATA, never hardcoded, so an agent knows their command surface
  // without re-probing. Each entry: a bare cmd name (probed via `--help`) or
  // { cmd, args, label, lines }. Merged with host-wide ~/.sidecar/companions.json.
  companions?: (string | { cmd: string; args?: string[]; label?: string; lines?: number })[];
}

const DEFAULTS: SidecarConfig = {
  project: "unknown",
  // L0 is OPT-IN: empty by default — there is NO L0 until a repo explicitly
  // designates files (via `sidecar lockdown add` → harness.config.json, or by
  // setting lockdown.fromMarkdown to a guide that carries a 🔴 L0 block).
  lockdown: {
    files: [],
    onEditReminder: "L0 file edited — update your changelog / issue tracker in the same change.",
  },
  enforcementFile: ".harness/enforcement.json",
  keywordsFile: ".harness/keywords.json",
  severityMapFile: ".harness/severity-map.json",
  verify: { checks: [] },
  ci: { runner: "ubuntu-latest", setup: [], enforceRunner: false },
  lint: {
    freshnessFiles: [],
    dodontCap: 200,
    cmdDescCap: 320,
    archCellCap: 300,
    archPiledMax: 6,
    // ALWAYS-ON byte cap for every tracked CLAUDE.md (re-injected every turn → context-rot).
    // ~2x a lean governance CLAUDE.md; diff-aware so legacy bloated ones block only on touch.
    claudeMdCap: 8000,
    // commons.md held to the SAME lean bar as CLAUDE.md (both re-injected every turn).
    commonsCap: 8000,
    // each sidecar inject source → its own size budget
    injectCaps: { "config/recommend.md": 7000, "styles/": 9000, ".harness/prefs.json": 2000 },
  },
  upstreams: [{ name: "hexa-lang", repo: "dancinlab/hexa-lang" }],
  guides: ["CLAUDE.md", "AGENTS.md", "README.md"],
  folderGuides: {
    enabled: true,
    roots: ["src", "lib", "app", "packages", "modules", "components", "services"],
    depth: 2,
    minFiles: 3,
    filename: "CLAUDE.md",
    ignore: ["node_modules", ".git", ".next", "dist", "build", "coverage", ".harness", "__pycache__", "vendor", "target", ".build", "DerivedData", "Pods"],
    ext: [
      ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte",
      ".py", ".rb", ".php",
      ".go", ".rs", ".java", ".kt", ".kts", ".scala",
      ".c", ".h", ".cpp", ".cc", ".cxx", ".hpp", ".m", ".mm",
      ".swift", ".dart", ".hexa",
    ],
  },
  docs: {
    architecture: "ARCHITECTURE.json",
    log: "CHANGELOG.md",
    scratchDir: "state",
    scatterPatterns: [
      "-(report|summary|notes|note|audit|status|plan|analysis|design|spec|overview|guide)\\.md$",
      "(REPORT|SUMMARY|NOTES|TODO|AUDIT|STATUS|ANALYSIS)\\.md$",
      "\\d{6,8}[-_].*\\.md$",
    ],
    allow: ["README.md", "CHANGELOG.md", "ARCHITECTURE.md", "ING.md", "ATLAS.md", "CLAIMS.md", "CLAUDE.md", "AGENTS.md", "LICENSE", "CONTRIBUTING.md", "SECURITY.md"],
    claudeMdSections: ["## Project", "## Tree"],
    enforce: "warn",
  },
  lsp: {
    // hexa-lang LSP: cd into the FIRST candidate dir
    // that actually contains self/lsp.hexa, then `exec hexa lsp`. A `-f` presence
    // guard (not bare `cd … 2>/dev/null`) avoids booting from the wrong cwd.
    servers: [
      {
        lang: "hexa",
        extensions: [".hexa"],
        command: "sh",
        args: [
          "-c",
          'for d in "$HEXA_LANG" "$HOME/.hx/packages/hexa" "$HOME/.hx/packages/hexa-lang" "$HOME/.hx/src"; do [ -n "$d" ] && [ -f "$d/self/lsp.hexa" ] && cd "$d" && break; done; exec hexa lsp',
        ],
      },
      // kosmos-lsp: prebuilt `kosmos-lsp` on PATH for `.kosmos`.
      { lang: "kosmos", extensions: [".kosmos"], command: "kosmos-lsp", args: [] },
    ],
    rebuild: true,
  },
  git: { guardForcePush: true, guardBranchSwitch: true, guardOffMainEdit: true },
  tmpGuard: true,
  handoffGuard: true,
  namingGuard: true,
  portablePathGuard: true,
  askqText: true,
  ledger: { staleSec: 3600 },
  ing: { editThreshold: 5, staleDays: 5, maxActive: 12 },
  worktree: { maxAgeDays: 3 },
  memGuard: { enabled: true, warnPct: 15, blockPct: 0, watchdogIntervalSec: 45 },
  dangerGuard: { rmRfRoot: false },
  annotationGuard: { enabled: true, file: ".harness/tool-annotations.json" },
  convergenceEnforce: true,
  convergenceOnTouch: true,
};

function deepMerge<T>(base: T, over: Partial<T>): T {
  if (over == null) return base;
  const out: Record<string, unknown> = Array.isArray(base) ? [...(base as unknown[])] as never : { ...(base as object) };
  for (const [k, v] of Object.entries(over as object)) {
    if (v === undefined) continue;
    const bv = (out as Record<string, unknown>)[k];
    if (v && typeof v === "object" && !Array.isArray(v) && bv && typeof bv === "object" && !Array.isArray(bv)) {
      (out as Record<string, unknown>)[k] = deepMerge(bv, v as Record<string, unknown>);
    } else {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out as T;
}

let _cfg: SidecarConfig | null = null;

export function config(): SidecarConfig {
  if (_cfg) return _cfg;
  const p = resolve(REPO_ROOT, "harness.config.json");
  let user: Partial<SidecarConfig> = {};
  if (existsSync(p)) {
    try {
      user = JSON.parse(readFileSync(p, "utf8")) as Partial<SidecarConfig>;
    } catch {
      /* malformed config → defaults */
    }
  }
  _cfg = deepMerge(DEFAULTS, user);
  return _cfg;
}

// Should sidecar governance (ship · ing Stop-gate · commit lint) fire in this repo? The
// managed-project MARKER is ABOLISHED: governance fires in EVERY git repo unconditionally
// — no CLAUDE.md / harness.config.json opt-in, so every project (incl. brand-new ones with
// zero sidecar setup) is covered automatically. The ONLY floor is "is this actually a git
// repo" — ship/ing/commit have no meaning outside one — keyed on a `.git` at REPO_ROOT (a
// DIR for a normal clone, a FILE for a linked worktree; existsSync catches both). REPO_ROOT
// already resolves to the git root even without harness.config.json (lib/paths.ts:43).
export function inGitRepo(): boolean {
  return existsSync(resolve(REPO_ROOT, ".git"));
}

// Resolve a rule-config file: prefer the repo override, else the bundled default.
export function resolveRuleFile(repoRelOrAbs: string, bundledName: string): string {
  const candidate = isAbsolute(repoRelOrAbs) ? repoRelOrAbs : resolve(REPO_ROOT, repoRelOrAbs);
  if (existsSync(candidate)) return candidate;
  return resolve(SIDECAR_CONFIG_DIR, bundledName);
}

export function repoPath(rel: string): string {
  return isAbsolute(rel) ? rel : resolve(REPO_ROOT, rel);
}
