<h1 align="center">🏍️ sidecar</h1>

<p align="center"><strong>经实战验证的 Claude Code 护栏 —— 从 hexa-native 智能体移植。</strong></p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Status" src="https://img.shields.io/badge/status-v0.1.0-orange">
  <img alt="Marketplace" src="https://img.shields.io/badge/claude--code-plugin_marketplace-informational">
  <img alt="Sibling" src="https://img.shields.io/badge/sibling-wilson-blueviolet">
</p>

<p align="center">
  <a href="README.md">English</a> · <strong>中文</strong> · <a href="README.ru.md">Русский</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
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
| `wilson-ssot` | `SessionStart` · `UserPromptSubmit` | 注入 `AGENTS.md` 向上查找的 SSOT 作为上下文（等价于 wilson `agents-md`） — **可用** |
| `wilson-readme-format` | `PreToolUse`（`Write`·`Edit`） | 拒绝违反 readme-format 的仓库根 `README.md`（散文中表情 / 多字形 H1 / 非英文 At-a-glance / `####`）— wilson `guard-readme-format` 的独立移植，**可用** |
| `wilson-prefs` | `/wilson-prefs:prefs` 命令 + `SessionStart`·`UserPromptSubmit` | 设置回复语言 / 代码语言 / 回复风格 → 持久化到插件数据，注入上下文。wilson `prefs` 的独立移植 —— **可用**（未设置前不注入任何内容） |
| `wilson-output-trim` | `PreToolUse` (`Bash`) | 重写 Bash 命令（`updatedInput`），让 stdout 先经 TF-IDF 显著性 + MinHash 去重过滤再进入模型 —— wilson `compaction-prefilter` 精神移植，**可用**（小输出原样 · 退出码经 `pipefail` 保留） |
| `wilson-pool` | `/wilson-pool:pool` 命令 + `PreToolUse`(`Bash`) + `SessionStart`·`UserPromptSubmit` | 把重型 Bash 命令经 ssh 路由到远程主机 —— wilson `pool` 精神移植，**可用**。⚠ 未设置 host+workdir 前 OFF · 仅 Bash · 远程 workdir 同步由**用户负责**（CC hook 无法像 wilson 的 9P/sshfs 那样挂载 fs） |
| `sidecar` | `/sidecar` 命令（控制） | 其余插件的运行时 on/off —— `/sidecar status\|on\|off <name>`（名称: ssot readme-format prefs output-trim pool guards，或 `all`）。共享 `~/.claude/sidecar/disabled.json` 由各 hook 检查 · 跨会话持久 · 补充原生 `/plugin` |

路线图候选：`wilson-memory`（SessionStart/SessionEnd 文件 memory）、
`wilson-recap`（PreCompact/SessionEnd 摘要）。

## Install

```bash
/plugin marketplace add dancinlab/sidecar
/plugin install wilson-guards@sidecar
/plugin install wilson-ssot@sidecar
```

## Status

**v0.1.0 —— 首个 guard 已移植。** `wilson-ssot`（AGENTS.md 向上查找）与
`wilson-readme-format`（4-lint README 护栏，wilson `guard-readme-format` 的忠实独立
移植）**可用**。`wilson-guards` 仍为 **桩**（透传 —— 不伪造虚假拦截）。由于 wilson
是单个静态二进制（插件 dispatch 为内部 ABI），剩余的 `wilson-guards` 移植路径将在
以下两者中决定：

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
│   ├── wilson-ssot/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # SessionStart/UserPromptSubmit 接线
│   │   └── bin/_ssot.py              # AGENTS.md 向上查找 (可用)
│   ├── wilson-readme-format/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) 接线
│   │   └── bin/_readme_format.py     # 4-lint README 护栏 (可用)
│   ├── wilson-prefs/
│   │   ├── commands/prefs.md         # /wilson-prefs:prefs 斜杠命令
│   │   ├── bin/_prefs.py             # 设置 set/show (可用)
│   │   ├── bin/_inject.py            # 设置上下文注入 (可用)
│   │   └── styles/friendly.{md,*.md} # 回复风格样本 (5 语言)
│   ├── wilson-output-trim/
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) 接线
│   │   ├── bin/_trim.py              # 用 updatedInput 重写命令 (可用)
│   │   └── bin/_salience.py          # TF-IDF + MinHash 过滤 (可用)
│   ├── wilson-pool/
│   │   ├── commands/pool.md          # /wilson-pool:pool 斜杠命令
│   │   ├── hooks/hooks.json          # PreToolUse(Bash)+SessionStart 接线
│   │   ├── bin/_route.py             # 重型命令 → ssh 重写 (可用)
│   │   └── bin/_inject.py            # ## Pool 块 (可用)
│   └── sidecar/                      # 控制插件
│       ├── commands/sidecar.md       # /sidecar status|on|off <name>
│       └── bin/_sidecar.py           # 写共享 disabled.json (可用)
└── LICENSE
```

## Sibling

- 🐦 [`dancinlab/wilson`](https://github.com/dancinlab/wilson) —— hexa-native AI 编码智能体。sidecar 所移植护栏的原本。

## License

MIT。参见 [LICENSE](LICENSE)。
