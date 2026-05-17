<h1 align="center">🏍️ sidecar</h1>

<p align="center"><strong>经实战验证的 Claude Code 护栏 —— 从 hexa-native 智能体移植。</strong></p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Status" src="https://img.shields.io/badge/status-v0.0.0_scaffold-orange">
  <img alt="Marketplace" src="https://img.shields.io/badge/claude--code-plugin_marketplace-informational">
  <img alt="Sibling" src="https://img.shields.io/badge/sibling-wilson-blueviolet">
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <strong>中文</strong> · <a href="README.es.md">Español</a>
</p>

---

> **不动主体、侧挂在 Claude Code 旁为其加上护栏的边车（sidecar）。**
> 不是手写的 hook 片段，而是把生产级 hexa-native 智能体
> [`wilson`](https://github.com/dancinlab/wilson) 中验证过的护栏集，
> 移植到 Claude Code 插件市场。

`sidecar` 是一个 **插件市场仓库**，在不修改宿主框架（Claude Code）的前提下侧挂式
地仅添加 governance。它把 wilson 的 `governance` / `guard-*` / `agents-md`
插件的价值与 Claude Code 的 hook 原语做 1:1 映射。

## Why sidecar?

- **移植且验证过的护栏** —— 不是临时拼凑的 dotfiles hook，而是在 wilson 套件中
  实际使用并验证过的拒绝规则（危险路径、SSOT 仅追加、领域 lint）。
- **对宿主无侵入** —— 不修改 Claude Code 配置或核心。仅在市场中安装 /
  启用 / 停用。
- **通往 wilson 的入口** —— 在 Claude Code 内体验 wilson 的 governance，再升级到
  完整的 `wilson`（hexa-native、plugin-everything）。

## Plugins

| 插件 | CC hook | 行为 |
|---|---|---|
| `wilson-guards` | `PreToolUse`（`Bash`·`Write`·`Edit`） | 拒绝 危险路径 / SSOT 仅追加 / 领域 lint 违规 |
| `wilson-ssot` | `SessionStart` · `UserPromptSubmit` | 注入 `AGENTS.md` 向上查找的 SSOT 作为上下文（等价于 wilson `agents-md`） |

路线图候选：`wilson-memory`（SessionStart/SessionEnd 文件 memory）、
`wilson-recap`（PreCompact/SessionEnd 摘要）。

## Install

```bash
/plugin marketplace add dancinlab/sidecar
/plugin install wilson-guards@sidecar
/plugin install wilson-ssot@sidecar
```

## Status

**v0.0.0 —— scaffold（脚手架）。** 市场/插件清单与 hook 接线已就位，但 `bin/`
封装为 **桩（stub）**（当前为透传，已注明 TODO）。由于 wilson 是单个静态二进制
（插件 dispatch 为内部 ABI），真实移植路径将在以下两者中决定：

1. **经由 harness-rpc** —— 一个薄封装，通过 wilson 的 `harness-rpc`
   （JSONL stdin/stdout）调用特定 guard 插件 action。
2. **独立移植** —— 仅抽取 guard 谓词（危险路径、SSOT 仅追加、领域 lint）在此
   直接重实现（不依赖 wilson 二进制，市场可独立运行）。

在决定之前，hook 不拒绝、直接透传 —— **不伪造虚假拦截**（设计上诚实）。

## Repo layout

```
sidecar/
├── .claude-plugin/marketplace.json   # 市场清单
├── plugins/
│   ├── wilson-guards/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse 接线
│   │   └── bin/guard.sh              # 桩 (TODO: wilson 移植)
│   └── wilson-ssot/
│       ├── .claude-plugin/plugin.json
│       ├── hooks/hooks.json          # SessionStart/UserPromptSubmit 接线
│       └── bin/_ssot.py              # AGENTS.md 向上查找 (可用)
└── LICENSE
```

## Sibling

- 🐦 [`dancinlab/wilson`](https://github.com/dancinlab/wilson) —— hexa-native AI 编码智能体。sidecar 所移植护栏的原本。

## License

MIT。参见 [LICENSE](LICENSE)。
