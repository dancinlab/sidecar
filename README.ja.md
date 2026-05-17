<h1 align="center">🏍️ sidecar</h1>

<p align="center"><strong>実戦検証済みの Claude Code ガードレール — hexa-native エージェントから移植。</strong></p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Status" src="https://img.shields.io/badge/status-v0.1.0-orange">
  <img alt="Marketplace" src="https://img.shields.io/badge/claude--code-plugin_marketplace-informational">
  <img alt="Sibling" src="https://img.shields.io/badge/sibling-wilson-blueviolet">
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">中文</a> · <a href="README.ru.md">Русский</a> · <strong>日本語</strong> · <a href="README.ko.md">한국어</a>
</p>

---

> **ホストに触れず Claude Code の横に取り付けてガードレールを足すサイドカー。**
> 手書きの hook スニペットではなく、本番運用の hexa-native エージェント
> [`wilson`](https://github.com/dancinlab/wilson) で検証されたガードセットを
> Claude Code プラグインマーケットプレイスへ移植したもの。

`sidecar` はホストハーネス（Claude Code）をそのままに、サイドマウントで
governance だけを追加する **プラグインマーケットプレイス repo** です。wilson の
`governance` / `guard-*` / `agents-md` プラグインの価値を Claude Code の hook
プリミティブへ 1:1 でマッピングします。

## Why sidecar?

- **移植された実証済みガード** — その場しのぎの dotfiles hook 寄せ集めではなく、
  wilson バンドルで実運用・検証された拒否ルール（危険パス・SSOT 追記専用・
  ドメイン lint）。
- **ホスト非侵襲** — Claude Code の設定/コアを変更しない。マーケットプレイスから
  インストール・有効/無効のみ。
- **wilson への入口** — Claude Code 内で wilson の governance を試し、フルの
  `wilson`（hexa-native・plugin-everything）へ進む導線。

## Plugins

| プラグイン | CC hook | 動作 |
|---|---|---|
| `wilson-guards` | `PreToolUse` (`Bash`·`Write`·`Edit`) | 危険パス・SSOT 追記専用・ドメイン lint 違反を拒否 |
| `wilson-ssot` | `SessionStart` · `UserPromptSubmit` | `AGENTS.md` の上方探索 SSOT をコンテキスト注入（wilson `agents-md` 相当） — **動作** |
| `wilson-readme-format` | `PreToolUse` (`Write`·`Edit`) | repo ルート `README.md` の readme-format 違反を拒否（emoji-in-prose / multi-glyph H1 / 非英語 At-a-glance / `####`）— wilson `guard-readme-format` の standalone 移植、**動作** |
| `wilson-hexa-verify` | `PreToolUse` (`Bash`) | 非 hexa 検証器（sympy/PyPhi/wolframscript/mathematica）の Bash 呼び出しを拒否 → hexa CLI へ誘導 — wilson `guard-hexa-verify` の standalone 移植、**動作**。⚠ `hexa` が PATH に無ければ inert |
| `wilson-dangerous-path` | `PreToolUse` (`Write`·`Edit`) | 保護システムパス（`/etc` `/usr` `/bin` `/sbin` `/System` `/.git` `/.gnupg`）・資格情報パス（`~/.ssh`・`~/.aws`・gh config・keychain・credentials）への Write/Edit/MultiEdit を拒否 — wilson `guard-dangerous-path` の standalone 移植、**動作** |
| `wilson-git-guard` | `PreToolUse` (`Bash`) | force-push を拒否 — `git push` に `--force`/`-f`/`+refspec`（および `--force-with-lease`、`SIDECAR_ALLOW_FORCE_WITH_LEASE=1` でなければ）が付くとブロック — wilson `git-guard` の standalone 移植、**動作** |
| `wilson-prefs` | `/wilson-prefs:prefs` コマンド + `SessionStart`·`UserPromptSubmit` | 応答言語 / コード言語 / 応答スタイルを設定 → プラグインデータに永続化、コンテキスト注入。wilson `prefs` の standalone 移植 — **動作**（設定するまで何も注入しない） |
| `wilson-output-trim` | `PreToolUse` (`Bash`) | Bash コマンドを書き換え（`updatedInput`）、stdout を TF-IDF salience + MinHash 重複除去フィルタに通してからモデルに渡す — wilson `compaction-prefilter` の精神移植、**動作**（小出力は verbatim・exit code は `pipefail` で保持） |
| `wilson-pool` | `/wilson-pool:pool` コマンド + `PreToolUse`(`Bash`) + `SessionStart`·`UserPromptSubmit` | 重い Bash コマンドをリモートホストへ ssh ルーティング — wilson `pool` の精神移植、**動作**。⚠ host+workdir 設定まで OFF・Bash のみ・リモート workdir の同期は**ユーザー責任**（CC hook は wilson の 9P/sshfs のように fs マウント不可） |
| `wilson-lsp` | `.lsp.json` LSP サーバ（hook ではない） | `.hexa` → `hexa lsp` · `.tape`·`.n6`·`.hxc`·`.kosmos` → 各フォーマット repo の canonical サーバ（`tape-lsp`/`n6-lsp`/`hxc-lsp`/`kosmos-lsp`、`github.com/dancinlab/{tape,n6,hxc,kosmos}` 同梱）に接続。graceful — PATH に無ければ `/plugin` Errors に表示。LSP ライフサイクルは CC 管理（切替は `/plugin`、`/sidecar` ではない） |
| `sidecar` | `/sidecar` コマンド（コントロール） | 他プラグインのランタイム on/off — `/sidecar status\|on\|off <name>`（名前: ssot readme-format hexa-verify prefs output-trim pool guards、または `all`）。共有 `~/.claude/sidecar/disabled.json` を各 hook が確認・セッション跨ぎ永続・ネイティブ `/plugin` を補完 |
| `worktree-pr` | `/worktree-pr:wt` コマンド（ワークフロー） | 安全な **worktree → PR → merge → クリーンアップ** ワークフロー — `start <name>`（origin 既定ブランチから隔離 worktree+ブランチ）、`ship <name> "<title>"`（push + PR 作成）、`finish <name>`（PR merge + worktree 削除 + ブランチ削除 + base 更新）、`status`、`abort`。メイン作業ツリー・並行セッションのブランチに非接触 |

ロードマップ候補: `wilson-memory`（SessionStart/SessionEnd ファイル memory）·
`wilson-recap`（PreCompact/SessionEnd 要約）。

## Install

```bash
/plugin marketplace add dancinlab/sidecar
/plugin install wilson-guards@sidecar
/plugin install wilson-ssot@sidecar
```

## Status

**v0.1.0 — 最初の guard 移植。** `wilson-ssot`（AGENTS.md 上方探索）と
`wilson-readme-format`（4-lint README ガード、wilson `guard-readme-format` の忠実な
standalone 移植）は **動作** します。`wilson-guards` はまだ **スタブ**（パススルー —
偽のブロックを捏造しない）。wilson は単一の静的バイナリ（プラグイン dispatch は内部
ABI）のため、残る `wilson-guards` の移植経路は次の 2 つから決定します:

1. **harness-rpc 経由** — wilson の `harness-rpc`（JSONL stdin/stdout）で特定の
   guard プラグイン action を呼ぶ薄いラッパー。
2. **standalone 移植** — guard 述語（危険パス・SSOT 追記専用・ドメイン lint）だけ
   を切り出してここで直接再実装（wilson バイナリ依存なし、マーケットプレイス単体動作）。

決定までは hook は拒否せず通過 — **偽のブロックを捏造しません**（設計上正直）。

## Repo layout

```
sidecar/
├── .claude-plugin/marketplace.json   # マーケットプレイス マニフェスト
├── plugins/
│   ├── wilson-guards/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse 配線
│   │   └── bin/guard.sh              # スタブ (TODO: wilson 移植)
│   ├── wilson-ssot/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # SessionStart/UserPromptSubmit 配線
│   │   └── bin/_ssot.py              # AGENTS.md 上方探索 (動作)
│   ├── wilson-readme-format/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) 配線
│   │   └── bin/_readme_format.py     # 4-lint README ガード (動作)
│   ├── wilson-hexa-verify/
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) 配線
│   │   └── bin/_hexa_verify.py       # 非 hexa 検証器ガード (動作)
│   ├── wilson-dangerous-path/
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) 配線
│   │   └── bin/_dangerous_path.py    # 保護パスガード (動作)
│   ├── wilson-git-guard/
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) 配線
│   │   └── bin/_git_guard.py         # force-push ガード (動作)
│   ├── wilson-prefs/
│   │   ├── commands/prefs.md         # /wilson-prefs:prefs スラッシュコマンド
│   │   ├── bin/_prefs.py             # 設定 set/show (動作)
│   │   ├── bin/_inject.py            # 設定コンテキスト注入 (動作)
│   │   └── styles/friendly.{md,*.md} # 応答スタイル サンプル (5言語)
│   ├── wilson-output-trim/
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) 配線
│   │   ├── bin/_trim.py              # updatedInput でコマンド書換 (動作)
│   │   └── bin/_salience.py          # TF-IDF + MinHash フィルタ (動作)
│   ├── wilson-pool/
│   │   ├── commands/pool.md          # /wilson-pool:pool スラッシュコマンド
│   │   ├── hooks/hooks.json          # PreToolUse(Bash)+SessionStart 配線
│   │   ├── bin/_route.py             # 重いコマンド → ssh 書換 (動作)
│   │   └── bin/_inject.py            # ## Pool ブロック (動作)
│   ├── wilson-lsp/
│   │   ├── .claude-plugin/plugin.json
│   │   └── .lsp.json                 # hexa lsp + tape/n6/hxc/kosmos repo LSP 接続
│   ├── sidecar/                      # コントロールプラグイン
│   │   ├── commands/sidecar.md       # /sidecar status|on|off <name>
│   │   └── bin/_sidecar.py           # 共有 disabled.json 書込 (動作)
│   └── worktree-pr/
│       ├── commands/wt.md            # /worktree-pr:wt start|ship|finish|...
│       └── bin/worktree-pr.sh        # worktree → PR → merge → 整理 (動作)
└── LICENSE
```

## Sibling

- 🐦 [`dancinlab/wilson`](https://github.com/dancinlab/wilson) — hexa-native AI コーディングエージェント。sidecar が移植するガードの原本。

## License

MIT. [LICENSE](LICENSE) を参照。
