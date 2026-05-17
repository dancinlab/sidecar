<h1 align="center">🏍️ sidecar</h1>

<p align="center"><strong>実戦検証済みの Claude Code ガードレール — hexa-native エージェントから移植。</strong></p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Status" src="https://img.shields.io/badge/status-v0.0.0_scaffold-orange">
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
| `wilson-ssot` | `SessionStart` · `UserPromptSubmit` | `AGENTS.md` の上方探索 SSOT をコンテキスト注入（wilson `agents-md` 相当） |

ロードマップ候補: `wilson-memory`（SessionStart/SessionEnd ファイル memory）·
`wilson-recap`（PreCompact/SessionEnd 要約）。

## Install

```bash
/plugin marketplace add dancinlab/sidecar
/plugin install wilson-guards@sidecar
/plugin install wilson-ssot@sidecar
```

## Status

**v0.0.0 — scaffold。** マーケットプレイス/プラグインのマニフェストと hook 配線は
整っていますが、`bin/` ラッパーは **スタブ** です（現在はパススルー、TODO 明記）。
wilson は単一の静的バイナリ（プラグイン dispatch は内部 ABI）のため、実際の移植
経路は次の 2 つから決定します:

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
│   └── wilson-ssot/
│       ├── .claude-plugin/plugin.json
│       ├── hooks/hooks.json          # SessionStart/UserPromptSubmit 配線
│       └── bin/_ssot.py              # AGENTS.md 上方探索 (動作)
└── LICENSE
```

## Sibling

- 🐦 [`dancinlab/wilson`](https://github.com/dancinlab/wilson) — hexa-native AI コーディングエージェント。sidecar が移植するガードの原本。

## License

MIT. [LICENSE](LICENSE) を参照。
