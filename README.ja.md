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
| `wilson-guards` | `PreToolUse` (`Write`·`Edit`·`MultiEdit`) | dancinlab ワークフローのガード 3 種バンドル — `ssot-lock`（最も近い `AGENTS.md ## Governance` の `ssot-lock:` 箇条書きにマッチするファイルの編集を拒否）、`tape-append-only`（`.tape` トレースは追記専用 — 既存内容を書き換える Edit / 上書き Write を拒否）、`domain-lint`（ルート `UPPERCASE.md` トピックロードマップは `Head + --- + ## Log` 構造であること） — standalone 移植、**動作**；各ガードは該当する規約が無ければ inert（opt out: `SIDECAR_NO_GUARDS=1`） |
| `wilson-ssot` | `SessionStart` · `UserPromptSubmit` | `AGENTS.md` の上方探索 SSOT をコンテキスト注入（wilson `agents-md` 相当） — **動作** |
| `wilson-readme-format` | `PreToolUse` (`Write`·`Edit`) | repo ルート `README.md` の readme-format 違反を拒否（emoji-in-prose / multi-glyph H1 / 非英語 At-a-glance / `####`）— wilson `guard-readme-format` の standalone 移植、**動作** |
| `wilson-hexa-verify` | `PreToolUse` + `PostToolUse` (`Bash`) | PreToolUse: 非 hexa 検証器（sympy/PyPhi/wolframscript/mathematica）の Bash 呼び出しを拒否 → hexa CLI へ誘導。PostToolUse: `hexa verify` が新しい SUPPORTED 方程式（🔵/🟢）を報告したら `dancinlab/hexa-lang` に **PR を自動作成** — 方程式を binary built-in atlas に焼き込む（`hexa atlas promote` の stub な `pr` を補完、PR は人手レビュー用・自動マージなし）。自律 PR が不可なら `worktree-pr` ワークフロー誘導に fallback。wilson `guard-hexa-verify` の standalone 移植+拡張、**動作**。⚠ `hexa` が PATH に無ければ inert |
| `wilson-dangerous-path` | `PreToolUse` (`Write`·`Edit`) | 保護システムパス（`/etc` `/usr` `/bin` `/sbin` `/System` `/.git` `/.gnupg`）・資格情報パス（`~/.ssh`・`~/.aws`・gh config・keychain・credentials）への Write/Edit/MultiEdit を拒否 — wilson `guard-dangerous-path` の standalone 移植、**動作** |
| `wilson-git-guard` | `PreToolUse` (`Bash`) | force-push を拒否 — `git push` に `--force`/`-f`/`+refspec`（および `--force-with-lease`、`SIDECAR_ALLOW_FORCE_WITH_LEASE=1` でなければ）が付くとブロック — wilson `git-guard` の standalone 移植、**動作** |
| `wilson-secret-guard` | `PreToolUse` (`Write`·`Edit`·`MultiEdit`) + `UserPromptSubmit` | 実際の `.env` ファイルの書き込み、または高信頼クレデンシャル（AWS / GitHub / GitLab / Anthropic / OpenAI / Slack / Google / Stripe トークン、PEM 秘密鍵）を含む内容を拒否；そのクレデンシャルを貼り付けたプロンプトをブロック — 高信頼パターンのみ、誤検出ほぼゼロ、**動作**（opt out: `SIDECAR_NO_SECRET_GUARD=1`） |
| `wilson-bash-guard` | `PreToolUse` (`Bash`) | 破壊的なシェルコマンドを拒否 — pipe-to-shell（`curl … \| sh`）、ルート/ホームパスの `rm -rf`、fork bomb、ディスク破壊（`dd of=/dev/disk`・`mkfs`・`>/dev/sd*`）、`/` `~` `.` への再帰 `chmod`/`chown` — 高信頼の破壊パターンのみ、誤検出ほぼゼロ、**動作**（opt out: `SIDECAR_NO_BASH_GUARD=1`） |
| `wilson-prefs` | `/wilson-prefs:prefs` コマンド + `SessionStart`·`UserPromptSubmit` | 応答言語 / コード言語 / 応答スタイルを設定 — 言語値は `auto`（ユーザーの言語をミラー）可 → プラグインデータに永続化、コンテキスト注入。wilson `prefs` の standalone 移植 — **動作**（設定するまで何も注入しない） |
| `wilson-output-trim` | `PreToolUse` (`Bash`) | Bash コマンドを書き換え（`updatedInput`）、stdout を TF-IDF salience + MinHash 重複除去フィルタに通してからモデルに渡す — wilson `compaction-prefilter` の精神移植、**動作**（小出力は verbatim・exit code は `pipefail` で保持） |
| `wilson-pool` | `/wilson-pool:pool` コマンド + `PreToolUse`(`Bash`) + `SessionStart`·`UserPromptSubmit` | 重い Bash コマンドをリモート**ホスト roster** へ ssh ルーティング — 各ホストに platform タグがあり、macOS 専用・Linux 専用コマンドはそのプラットフォームのホストへ、それ以外は round-robin で分散 — wilson `pool` roster の精神移植、**動作**。⚠ roster にホスト 1 台+workdir 設定まで OFF（`workdir auto` は現在のプロジェクトをホスト間でミラー）・Bash のみ・全ホストのリモート workdir 同期は**ユーザー責任**（CC hook は wilson の 9P/sshfs のように fs マウント不可） |
| `wilson-checkpoint` | `Stop`·`PreCompact`·`SessionEnd`·`SessionStart` | usage limit / クラッシュでも作業を失わない — 毎ターン `git stash create` で WIP スナップショット（dangling commit・ワーキングツリー/index/ブランチ無接触）、`refs/wilson-checkpoint/` に固定 + resume ノート;`SessionStart` が未消費スナップショットを再注入。`/wilson-checkpoint:checkpoint` で status/restore/clear（restore は表示のみ・自動適用なし）— **動作**・git 専用・デバウンス（opt out: `SIDECAR_NO_CHECKPOINT=1`） |
| `wilson-gpu` | `/wilson-gpu` コマンド + `SessionStart` | RunPod / Vast.ai レンタル GPU のコストガードレール — `SessionStart` が課金中インスタンス（稼働時間 + 累計推定コスト）を提示 → 放置 pod のコスト漏れを防ぐ;`down` がキルスイッチ、`attach` はインスタンスを `wilson-pool` roster に接続。provisioning（`up`）は**別スイッチ・デフォルト OFF** — `up` は provisioning ON **＋** `--yes` の二重ゲート。**動作**・`runpodctl`/`vastai` が無ければ inert（opt out: `SIDECAR_NO_GPU=1`） |
| `wilson-lsp` | `.lsp.json` LSP サーバ（hook ではない） | `.hexa` → `hexa lsp` · `.tape`·`.n6`·`.hxc`·`.kosmos` → 各フォーマット repo の canonical サーバ（`tape-lsp`/`n6-lsp`/`hxc-lsp`/`kosmos-lsp`、`github.com/dancinlab/{tape,n6,hxc,kosmos}` 同梱）に接続。graceful — PATH に無ければ `/plugin` Errors に表示。LSP ライフサイクルは CC 管理（切替は `/plugin`、`/sidecar` ではない） |
| `sidecar` | `/sidecar` コマンド（コントロール） | 他プラグインのランタイム on/off — `/sidecar status\|on\|off <name>`（名前: ssot readme-format hexa-verify dangerous-path git-guard secret-guard bash-guard prefs output-trim pool checkpoint gpu guards、または `all`）。共有 `~/.claude/sidecar/disabled.json` を各 hook が確認・セッション跨ぎ永続・ネイティブ `/plugin` を補完 |
| `worktree-pr` | `/worktree-pr:wt` コマンド（ワークフロー） | 安全な **worktree → PR → merge → クリーンアップ** ワークフロー — `start <name>`（origin 既定ブランチから隔離 worktree+ブランチ）、`ship <name> "<title>"`（push + PR 作成）、`finish <name>`（PR merge + worktree 削除 + ブランチ削除 + base 更新）、`status`、`abort`。メイン作業ツリー・並行セッションのブランチに非接触 |

ロードマップ候補: `wilson-memory`（SessionStart/SessionEnd ファイル memory）·
`wilson-recap`（PreCompact/SessionEnd 要約）。

## Install

```bash
# 1. マーケットプレイスを登録
/plugin marketplace add dancinlab/sidecar

# 2. 必要なプラグインをインストール — 各々独立
/plugin install wilson-secret-guard@sidecar    # ライブシークレット / .env 書き込み拒否
/plugin install wilson-bash-guard@sidecar      # 破壊的 Bash コマンド拒否
/plugin install wilson-dangerous-path@sidecar  # システム / 認証情報パス保護
/plugin install wilson-git-guard@sidecar       # force-push 拒否
/plugin install wilson-readme-format@sidecar   # repo-root README lint ガード
/plugin install wilson-hexa-verify@sidecar     # 非 hexa 検証器 → hexa へ誘導
/plugin install wilson-guards@sidecar          # ssot-lock / tape / domain-lint バンドル
/plugin install wilson-ssot@sidecar            # AGENTS.md SSOT 注入
/plugin install wilson-prefs@sidecar           # 応答言語 / コード / スタイル設定
/plugin install wilson-output-trim@sidecar     # Bash stdout salience フィルタ
/plugin install wilson-pool@sidecar            # 重い Bash → リモートホストへルーティング
/plugin install wilson-checkpoint@sidecar      # 毎ターン WIP スナップショット (limit/クラッシュ安全)
/plugin install wilson-gpu@sidecar             # RunPod/Vast コストガードレール + キルスイッチ
/plugin install wilson-lsp@sidecar             # .hexa / .tape / .n6 / .hxc / .kosmos LSP
/plugin install worktree-pr@sidecar            # /worktree-pr:wt ワークフローコマンド
/plugin install sidecar@sidecar                # /sidecar ランタイム on/off コントロール
```

`/plugin` でいつでも閲覧・トグル。新リリース後のアップグレード:

```bash
/plugin marketplace update sidecar
/plugin update
```

### 一括で全部インストール

`/plugin install` をプラグインごとに打つ代わりに、`settings.json`
（`~/.claude/settings.json` は全プロジェクト、`.claude/settings.json` は当該プロジェクト）に
マーケットプレイスとプラグインを宣言すると — Claude Code が次回起動時に列挙された
プラグインを一括でインストール・有効化します:

```json
{
  "extraKnownMarketplaces": {
    "sidecar": { "source": { "source": "github", "repo": "dancinlab/sidecar" } }
  },
  "enabledPlugins": {
    "wilson-secret-guard@sidecar": true,
    "wilson-bash-guard@sidecar": true,
    "wilson-dangerous-path@sidecar": true,
    "wilson-git-guard@sidecar": true,
    "wilson-readme-format@sidecar": true,
    "wilson-hexa-verify@sidecar": true,
    "wilson-guards@sidecar": true,
    "wilson-ssot@sidecar": true,
    "wilson-prefs@sidecar": true,
    "wilson-output-trim@sidecar": true,
    "wilson-pool@sidecar": true,
    "wilson-checkpoint@sidecar": true,
    "wilson-gpu@sidecar": true,
    "wilson-lsp@sidecar": true,
    "worktree-pr@sidecar": true,
    "sidecar@sidecar": true
  }
}
```

## Status

**v0.1.0 — 最初の guard 移植。** `wilson-ssot`（AGENTS.md 上方探索）と
`wilson-readme-format`（4-lint README ガード、wilson `guard-readme-format` の忠実な
standalone 移植）は **動作** します。`wilson-guards` は今や **standalone 移植** —
3 つのガード（`ssot-lock` / `tape-append-only` / `domain-lint`）が wilson の述語を
バイナリ依存なしで直接再実装します。各ガードは **その規約がプロジェクトに実際に
存在するときのみ動作**（`ssot-lock:` 箇条書きなし / `.tape` ファイルなし / ルート
トピックロードマップなし → 動作ゼロ）するため、バンドル自体は汎用インストールでも
安全で、dancinlab 流ワークフローの中でのみ意味を持ちます。

## Repo layout

```
sidecar/
├── .claude-plugin/marketplace.json   # マーケットプレイス マニフェスト
├── plugins/
│   ├── wilson-guards/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) 配線
│   │   ├── bin/guard.sh              # hook ラッパー
│   │   └── bin/_guards.py            # ssot-lock + tape-append-only + domain-lint (動作)
│   ├── wilson-ssot/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # SessionStart/UserPromptSubmit 配線
│   │   └── bin/_ssot.py              # AGENTS.md 上方探索 (動作)
│   ├── wilson-readme-format/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) 配線
│   │   └── bin/_readme_format.py     # 4-lint README ガード (動作)
│   ├── wilson-hexa-verify/
│   │   ├── hooks/hooks.json          # PreToolUse + PostToolUse (Bash) 配線
│   │   ├── bin/_hexa_verify.py       # 非 hexa 検証器ガード (動作)
│   │   └── bin/_verify_watch.py      # 新方程式 → hexa-lang PR トリガー (動作)
│   ├── wilson-dangerous-path/
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) 配線
│   │   └── bin/_dangerous_path.py    # 保護パスガード (動作)
│   ├── wilson-git-guard/
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) 配線
│   │   └── bin/_git_guard.py         # force-push ガード (動作)
│   ├── wilson-secret-guard/
│   │   ├── hooks/hooks.json          # PreToolUse(Write|Edit)+UserPromptSubmit
│   │   ├── bin/secret-guard.sh       # hook ラッパー
│   │   └── bin/_secret_guard.py      # .env + クレデンシャルトークン ガード (動作)
│   ├── wilson-bash-guard/
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) 配線
│   │   ├── bin/bash-guard.sh         # hook ラッパー
│   │   └── bin/_bash_guard.py        # 破壊的コマンド ガード (動作)
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
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/pool.md          # /wilson-pool:pool スラッシュコマンド
│   │   ├── hooks/hooks.json          # PreToolUse(Bash)+SessionStart 配線
│   │   ├── bin/_pool.py              # ホスト roster / workdir 設定 (動作)
│   │   ├── bin/_route.py             # platform ルーティング ssh 書換 (動作)
│   │   └── bin/_inject.py            # ## Pool ブロック (動作)
│   ├── wilson-checkpoint/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/checkpoint.md    # /wilson-checkpoint:checkpoint
│   │   ├── hooks/hooks.json          # Stop·PreCompact·SessionEnd·SessionStart
│   │   ├── bin/checkpoint.sh         # hook + コマンド エントリポイント
│   │   └── bin/_checkpoint.py        # git-stash WIP スナップショット/復元 (動作)
│   ├── wilson-gpu/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/gpu.md           # /wilson-gpu
│   │   ├── hooks/hooks.json          # SessionStart (コストガードレール)
│   │   ├── bin/gpu.sh                # hook + コマンド エントリポイント
│   │   └── bin/_gpu.py               # RunPod/Vast アダプタ + ガードレール (動作)
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
