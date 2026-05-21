@V := "tape" :: spec [active]
  version = "1.2"

@I := "sidecar" :: identity [active]
  kind   = "Claude Code marketplace plugin pack — guardrails · commands · skills as sidecar plugins"
  brief  = "Side-mounts onto the Claude Code harness without modifying it. Strict concept separation: 1 plugin = 1 of {hook, command, skill}, no mixing. Each plugin is ~100 lines, no binaries, no telemetry. The repo also carries the cross-project do/dont layer (hooks/commons/commons.tape) that propagates hexa-native rules into every Claude Code session."
  parent = "dancinlab"
  ssot   = "~/core/sidecar/ · ships via .claude-plugin/marketplace.json · `hx install dancinlab/sidecar` for end-user install"
  layout = "
    sidecar/
    ├── bin/sidecar               # CLI — `sidecar init` scaffolds project.tape + CLAUDE.md symlink in any project
    ├── hooks/                    # PreToolUse · SessionStart · PreCompact · PostCompact · LSP plugins
    │   ├── commons/              # cross-project do/dont (commons.tape) — SessionStart + PreCompact + PostCompact
    │   ├── project-tape/         # PreCompact + PostCompact re-inject of <root>/project.tape
    │   ├── tape-lsp/             # wire `tape-lsp` for .tape files
    │   ├── hexa-lsp/             # wire `hexa lsp` for .hexa files
    │   ├── git-guard/            # PreToolUse(Bash) deny — force-push · --no-verify
    │   └── pool-route/           # PreToolUse(Bash) suggestion — pool on <host> for host-specific cmds
    ├── commands/                 # /slash-command invoked plugins
    ├── skills/                   # Skill tool invocable plugins (inbox · all-bg-go · easy)
    ├── project.tape              # this file — sidecar's identity + governance (also linked as CLAUDE.md)
    ├── design.md                 # decision-log (one decision per gate)
    ├── CHANGELOG.md              # chronological ship log
    └── .claude-plugin/marketplace.json
  "

@D := "sidecar" :: governance [active]
  do   = "1 plugin = exactly 1 of {hook · command · skill} (concept separation) · structured artifacts (plugin.json · hooks.json · .tape) over prose · english artifacts · korean response · evidence before ship (design.md decision + behavioral measurement + smoke test + README per new plugin) · stacked PRs (<200 lines · 1 logical concern · gh pr create --base previous-layer) · ship = commit + push + sync local install in one atomic cycle (no unshipped diffs across instructions) · `commons` plugin carries cross-project hexa-native rules · project-level identity + governance lives in `project.tape` (this file)"
  dont = "mix concepts in one plugin (no hook + slash command in the same package) · accumulate uncommitted changes across instructions · skip the local install sync after ship (defer to /plugin) · large multi-purpose PRs · long-lived feature branches · re-encode structured carrier data as prose · functional duplication with an existing plugin · hardcode absolute paths in plugin scripts (use ${CLAUDE_PLUGIN_ROOT} · $HOME · PATH-resolved binaries)"

@D ship_cycle := "ship = commit + push + install" :: governance [required active]
  rule  = "A ship cycle is one atomic operation in three steps — commit, push to origin/main, sync the local install (marketplace pull → cache copy to ~/.claude/plugins/cache/sidecar/<name>/<version>/ → patch installed_plugins.json with ver/path/sha/ts). Source on the remote and the version on disk never lag each other."
  apply = "Every working-tree modification is shipped before the next user-facing pause. If a change is intentionally held, it goes on its own branch with an explicit marker. Default: edit → ship → ready for the next instruction."
  scope = "All sidecar plugins."

@D cross_project_carrier := "commons carries hexa-native rules into every session" :: governance [active]
  rule  = "sidecar is the carrier of the cross-project do/dont layer in hooks/commons/commons.tape. That layer propagates hexa-native rules (hexa-first · `hexa verify` · `hexa kick` · atlas citation discipline · lattice-as-tool) into every Claude Code session."
  apply = "Authority for the *content* of those rules — stdlib, atlas, grammar, lattice policy — remains with the `hexa-lang` constitution. sidecar carries; it does not override."
  scope = "Cross-project rules that apply regardless of which project Claude Code is invoked in."
