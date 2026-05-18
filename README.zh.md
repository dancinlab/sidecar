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
| `wilson-guards` | `PreToolUse`（`Write`·`Edit`·`MultiEdit`） | dancinlab 工作流护栏 3 合 1 包 —— `ssot-lock`（拒绝编辑被最近 `AGENTS.md ## Governance` 中 `ssot-lock:` 条目匹配的文件）、`tape-append-only`（`.log.tape` 事件历史仅追加 —— 拒绝重写的 Edit / 覆盖式 Write；按 tape v1.2 的 architecture-vs-history 拆分，plain `.tape` 是可编辑架构，故护栏对其 inert）、`domain-lint`（根 `UPPERCASE.md` 主题路线图须为 `Head + --- + ## Log` 结构） —— 独立移植，**可用**；各护栏在对应约定缺失时 inert（opt out: `SIDECAR_NO_GUARDS=1`） |
| `wilson-ssot` | `SessionStart` · `UserPromptSubmit` | 注入 `AGENTS.md` 向上查找的 SSOT 作为上下文（等价于 wilson `agents-md`） — **可用** |
| `wilson-readme-format` | `PreToolUse`（`Write`·`Edit`） | 拒绝违反 readme-format 的仓库根 `README.md`（散文中表情 / 多字形 H1 / 非英文 At-a-glance / `####`）— wilson `guard-readme-format` 的独立移植，**可用** |
| `wilson-hexa-verify` | `PreToolUse` + `PostToolUse`（`Bash`） | PreToolUse: 拒绝对非 hexa 校验器（sympy/PyPhi/wolframscript/mathematica）的 Bash 调用 → 引导改用 hexa CLI。PostToolUse: 当 `hexa verify` 报告新的 SUPPORTED 方程（🔵/🟢）时，**自动向** `dancinlab/hexa-lang` **开 PR** —— 把方程烘焙进二进制内置 atlas（补全 `hexa atlas promote` 的桩 `pr` 步骤，PR 留待人工审查、不自动合并）。无法自动开 PR 时回退为引导 `worktree-pr` 工作流。wilson `guard-hexa-verify` 的独立移植+扩展，**可用**。⚠ `hexa` 不在 PATH 时 inert |
| `wilson-dangerous-path` | `PreToolUse`（`Write`·`Edit`） | 拒绝对受保护系统路径（`/etc` `/usr` `/bin` `/sbin` `/System` `/.git` `/.gnupg`）与凭据路径（`~/.ssh`·`~/.aws`·gh config·keychain·credentials）的 Write/Edit/MultiEdit — wilson `guard-dangerous-path` 的独立移植，**可用** |
| `wilson-git-guard` | `PreToolUse`（`Bash`） | 拒绝 force-push —— `git push` 带 `--force`/`-f`/`+refspec`（以及 `--force-with-lease`，除非 `SIDECAR_ALLOW_FORCE_WITH_LEASE=1`）即拦截 — wilson `git-guard` 的独立移植，**可用** |
| `wilson-secret-guard` | `PreToolUse`（`Write`·`Edit`·`MultiEdit`） + `UserPromptSubmit` | 拒绝写入真实 `.env` 文件，或拒绝含高置信凭据（AWS / GitHub / GitLab / Anthropic / OpenAI / Slack / Google / Stripe 令牌、PEM 私钥）的内容；拦截粘贴此类凭据的提示 —— 仅高置信模式、几乎零误报，**可用**（opt out: `SIDECAR_NO_SECRET_GUARD=1`） |
| `wilson-bash-guard` | `PreToolUse`（`Bash`） | 拒绝灾难性 shell 命令 —— pipe-to-shell（`curl … \| sh`）、对根/家目录的 `rm -rf`、fork bomb、磁盘销毁（`dd of=/dev/disk`·`mkfs`·`>/dev/sd*`）、对 `/` `~` `.` 的递归 `chmod`/`chown` —— 仅高置信破坏模式、几乎零误报，**可用**（opt out: `SIDECAR_NO_BASH_GUARD=1`） |
| `wilson-prefs` | `/wilson-prefs:prefs` 命令 + `SessionStart`·`UserPromptSubmit` | 设置回复语言 / 代码语言 / 回复风格 —— 语言值可用 `auto`（镜像用户所用语言）→ 持久化到插件数据，注入上下文。wilson `prefs` 的独立移植 —— **可用**（未设置前不注入任何内容） |
| `wilson-output-trim` | `PreToolUse` (`Bash`) | 重写 Bash 命令（`updatedInput`），让 stdout 先经 TF-IDF 显著性 + MinHash 去重过滤再进入模型 —— wilson `compaction-prefilter` 精神移植，**可用**（小输出原样 · 退出码经 `pipefail` 保留） |
| `wilson-pool` | `/wilson-pool:pool` 命令 + `PreToolUse`(`Bash`) + `SessionStart`·`UserPromptSubmit` | 把重型 Bash 命令经 ssh 路由到远程**主机 roster** —— 每台主机带 platform 标签，macOS 专用 / Linux 专用命令送往对应平台主机，其余按 round-robin 分摊 —— wilson `pool` roster 精神移植，**可用**。⚠ roster 至少 1 台主机+workdir 设置前 OFF（`workdir auto` 跨主机镜像当前项目）· 仅 Bash · 所有主机的远程 workdir 同步由**用户负责**（CC hook 无法像 wilson 的 9P/sshfs 那样挂载 fs） |
| `wilson-checkpoint` | `Stop`·`PreCompact`·`SessionEnd`·`SessionStart` | usage limit / 崩溃也不丢工作 —— 每轮 `git stash create` 快照 WIP（dangling commit · 工作树/index/分支无接触），固定到 `refs/wilson-checkpoint/` + resume 笔记;`SessionStart` 重新注入未消费快照。`/wilson-checkpoint:checkpoint` 进行 status/restore/clear（restore 仅打印 · 不自动应用）—— **可用** · 仅 git · 去抖（opt out: `SIDECAR_NO_CHECKPOINT=1`） |
| `wilson-gpu` | `/wilson-gpu` 命令 + `SessionStart` | RunPod / Vast.ai 租用 GPU 成本护栏 —— `SessionStart` 显示计费中实例（运行时长 + 累计估算成本）→ 防止遗忘的 pod 漏钱;`down` 是急停开关，`attach` 把实例接入 `wilson-pool` roster。策略 `watch`/`budget`/`idle-reaper`/`ephemeral`;花钱·自动 down 由独立默认-OFF 开关双重门控（`up` 需 `provisioning`+`--yes`，自动停止需 `reaping`）;`fanout` 是 shardable 作业的成本容差决策辅助。**可用** · 无 `runpodctl`/`vastai` 时 inert（opt out: `SIDECAR_NO_GPU=1`） |
| `wilson-decision-gate` | `SessionStart`·`UserPromptSubmit` + `/wilson-decision-gate` | 逐步决策门 —— 多决策工作是 **一个决策一个用户确认门、禁止批处理**（选项+推荐+理由 3+ → 等待选择 → 下一个），在 `design.md` 以 `### Decision N` 块记录。wilson `step-by-step-decision-gate` 独立移植（同 wilson 仅 text）。SessionStart 注入原则一次 · UserPromptSubmit 仅在 **像 branch-point 的提示** 加简短提醒（非每条提示）。`/wilson-decision-gate decide\|log\|on\|off\|sample` · 5 语言 canonical 样例同梱 —— **可用** · 默认 ON（opt out: `SIDECAR_NO_DECISION_GATE=1`） |
| `wilson-tape-recorder` | `SessionStart`·`UserPromptSubmit`·`PreToolUse`·`PostToolUse`·`SessionEnd` + `/wilson-tape-recorder` | 把 Claude Code 会话记录为 `.tape` v1.2 执行轨迹（dancinlab `tape` 格式）—— 每会话一文件 `<DATA>/sessions/<id>.tape`：SessionStart `@S start` · UserPromptSubmit `@U` · PreToolUse `@T` · PostToolUse `@R` · SessionEnd `@S end`。17-type 字母表中 CC 钩子实际给的诚实子集（`@A` 响应文本·`@K` 成本无信号 → 排除）。**与 `wilson-guards/tape-append-only` 成对**（录像机 produces、护栏 protects）。`/wilson-tape-recorder status\|ls\|tail\|cat\|on\|off` —— **可用** · 默认 ON（opt out: `SIDECAR_NO_TAPE_RECORDER=1`） |
| `wilson-goal` | `SessionStart`·`UserPromptSubmit` + `/wilson-goal` | **会话目标的持久化 + 再注入** —— 让高层目标跨越长会话与上下文 compaction 不丢。目标存于 `<DATA>/goal.json`（在转录之外）持久化，每次 `SessionStart` 复原、`UserPromptSubmit` 一行简短提醒（≤ 180B）。项目根的 `GOAL.md` 为用户未设时的默认。`/wilson-goal set\|status\|show\|clear\|path` — **可用** · 默认 ON。**与 wilson `loop` 相比的诚实缺口**：仅可移植持久化半部，自治续行（`loop_tick`+QUEUE）受 CC 钩子限制不可（opt out: `SIDECAR_NO_GOAL=1`） |
| `wilson-inbox` | `SessionStart` + `/wilson-inbox:inbox` | 跨项目交接 inbox —— 当某个缺口或请求影响另一个 SSOT repo 时，将其作为结构化的 `inbox/<kind>/<slug>.md` 条目（kind: `notes`/`patches`/`poc`/`rfc_drafts`）提交到那个 repo，而非在下游悄悄绕过。`/wilson-inbox:inbox` 脚手架并管理条目 —— `add`/`list`/`show`/`path`/`verify`/`apply`/`archive`/`rm`；目标 repo 为 `--to <name>`（`~/core/<name>`）或从 cwd 向上找到的最近 `.git`。light-mode 仅文件夹+条目，heavy-mode 增加 `inbox/PATCHES.yaml` 状态生命周期（`apply`/`archive` 迁移）。`SessionStart` 显示当前 repo 的 inbox 条目 → 交接不被遗忘 —— **可用** · repo 无 `inbox/` 则 inert（opt out: `SIDECAR_NO_INBOX=1`） |
| `wilson-lsp` | `.lsp.json` LSP 服务器（非 hook） | `.hexa` → `hexa lsp` · `.tape`·`.n6`·`.hxc`·`.kosmos` → 接到各格式 repo 的 canonical 服务器（`tape-lsp`/`n6-lsp`/`hxc-lsp`/`kosmos-lsp`，随 `github.com/dancinlab/{tape,n6,hxc,kosmos}` 提供）。graceful —— 不在 PATH 只在 `/plugin` Errors 显示。LSP 生命周期由 CC 管理（用 `/plugin` 切换，非 `/sidecar`） |
| `sidecar` | `/sidecar` 命令（控制） | 其余插件的运行时 on/off —— `/sidecar status\|on\|off <name>`（名称: ssot readme-format hexa-verify dangerous-path git-guard secret-guard bash-guard prefs output-trim pool checkpoint gpu decision-gate tape-recorder goal inbox guards，或 `all`）。共享 `~/.claude/sidecar/disabled.json` 由各 hook 检查 · 跨会话持久 · 补充原生 `/plugin` |
| `worktree-pr` | `/worktree-pr:wt` 命令（工作流） | 安全的 **worktree → PR → merge → 清理** 工作流 —— `start <name>`（从 origin 默认分支建隔离 worktree+分支）、`ship <name> "<title>"`（push + 开 PR）、`finish <name>`（合并 PR + 移除 worktree + 删除分支 + 刷新 base）、`status`、`abort`。绝不触碰主工作树或并行会话的分支 |

路线图候选：`wilson-memory`（SessionStart/SessionEnd 文件 memory）、
`wilson-recap`（PreCompact/SessionEnd 摘要）。

## Install

```bash
# 1. 注册市场
/plugin marketplace add dancinlab/sidecar

# 2. 安装需要的插件 —— 各自独立
/plugin install wilson-secret-guard@sidecar    # 拦截实时密钥 / .env 写入
/plugin install wilson-bash-guard@sidecar      # 拦截灾难性 Bash 命令
/plugin install wilson-dangerous-path@sidecar  # 保护系统 / 凭据路径
/plugin install wilson-git-guard@sidecar       # 拦截 force-push
/plugin install wilson-readme-format@sidecar   # repo-root README lint 护栏
/plugin install wilson-hexa-verify@sidecar     # 非 hexa 校验器 → 引导至 hexa
/plugin install wilson-guards@sidecar          # ssot-lock / tape / domain-lint 包
/plugin install wilson-ssot@sidecar            # AGENTS.md SSOT 注入
/plugin install wilson-prefs@sidecar           # 回复语言 / 代码 / 风格设置
/plugin install wilson-output-trim@sidecar     # Bash stdout 显著性过滤
/plugin install wilson-pool@sidecar            # 重型 Bash → 路由到远程主机
/plugin install wilson-checkpoint@sidecar      # 每轮 WIP 快照 (limit/崩溃安全)
/plugin install wilson-gpu@sidecar             # RunPod/Vast 成本护栏 + 急停开关
/plugin install wilson-decision-gate@sidecar   # 逐步决策门 + design.md 账本
/plugin install wilson-tape-recorder@sidecar   # 把会话记录为 .tape v1.2 轨迹
/plugin install wilson-goal@sidecar            # 会话目标的持久化（跨 compaction）
/plugin install wilson-inbox@sidecar           # 跨项目交接 inbox (inbox/<kind>/<slug>.md)
/plugin install wilson-lsp@sidecar             # .hexa / .tape / .n6 / .hxc / .kosmos LSP
/plugin install worktree-pr@sidecar            # /worktree-pr:wt 工作流命令
/plugin install sidecar@sidecar                # /sidecar 运行时 on/off 控制
```

随时用 `/plugin` 浏览或开关。新版本发布后升级:

```bash
/plugin marketplace update sidecar
/plugin update
```

### 一次性全部安装

无需逐个 `/plugin install`，可在 `settings.json`（`~/.claude/settings.json` 对所有项目、
`.claude/settings.json` 对单个项目）中声明市场与插件 —— Claude Code 在下次启动时
一次性安装并启用列出的全部插件:

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
    "wilson-decision-gate@sidecar": true,
    "wilson-tape-recorder@sidecar": true,
    "wilson-goal@sidecar": true,
    "wilson-inbox@sidecar": true,
    "wilson-lsp@sidecar": true,
    "worktree-pr@sidecar": true,
    "sidecar@sidecar": true
  }
}
```

## Status

**v0.1.0 —— 首个 guard 已移植。** `wilson-ssot`（AGENTS.md 向上查找）与
`wilson-readme-format`（4-lint README 护栏，wilson `guard-readme-format` 的忠实独立
移植）**可用**。`wilson-guards` 现已是 **独立移植** —— 三个护栏
（`ssot-lock` / `tape-append-only` / `domain-lint`）不依赖 wilson 二进制、直接
重实现 wilson 谓词。各护栏 **仅在对应约定确实存在于项目时才动作**（无 `ssot-lock:`
条目 / 无 `.tape` 文件 / 无根主题路线图 → 零动作），因此该包本身对通用安装是安全的，
仅在 dancinlab 风格工作流中才有意义。

## Repo layout

```
sidecar/
├── .claude-plugin/marketplace.json   # 市场清单
├── plugins/
│   ├── wilson-guards/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) 接线
│   │   ├── bin/guard.sh              # hook 包装器
│   │   └── bin/_guards.py            # ssot-lock + tape-append-only + domain-lint (可用)
│   ├── wilson-ssot/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # SessionStart/UserPromptSubmit 接线
│   │   └── bin/_ssot.py              # AGENTS.md 向上查找 (可用)
│   ├── wilson-readme-format/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) 接线
│   │   └── bin/_readme_format.py     # 4-lint README 护栏 (可用)
│   ├── wilson-hexa-verify/
│   │   ├── hooks/hooks.json          # PreToolUse + PostToolUse (Bash) 接线
│   │   ├── bin/_hexa_verify.py       # 非 hexa 校验器护栏 (可用)
│   │   └── bin/_verify_watch.py      # 新方程 → hexa-lang PR 触发 (可用)
│   ├── wilson-dangerous-path/
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) 接线
│   │   └── bin/_dangerous_path.py    # 受保护路径护栏 (可用)
│   ├── wilson-git-guard/
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) 接线
│   │   └── bin/_git_guard.py         # force-push 护栏 (可用)
│   ├── wilson-secret-guard/
│   │   ├── hooks/hooks.json          # PreToolUse(Write|Edit)+UserPromptSubmit
│   │   ├── bin/secret-guard.sh       # hook 包装器
│   │   └── bin/_secret_guard.py      # .env + 凭据令牌 护栏 (可用)
│   ├── wilson-bash-guard/
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) 接线
│   │   ├── bin/bash-guard.sh         # hook 包装器
│   │   └── bin/_bash_guard.py        # 灾难性命令 护栏 (可用)
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
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/pool.md          # /wilson-pool:pool 斜杠命令
│   │   ├── hooks/hooks.json          # PreToolUse(Bash)+SessionStart 接线
│   │   ├── bin/_pool.py              # 主机 roster / workdir 配置 (可用)
│   │   ├── bin/_route.py             # platform 路由 ssh 重写 (可用)
│   │   └── bin/_inject.py            # ## Pool 块 (可用)
│   ├── wilson-checkpoint/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/checkpoint.md    # /wilson-checkpoint:checkpoint
│   │   ├── hooks/hooks.json          # Stop·PreCompact·SessionEnd·SessionStart
│   │   ├── bin/checkpoint.sh         # hook + 命令入口
│   │   └── bin/_checkpoint.py        # git-stash WIP 快照/恢复 (可用)
│   ├── wilson-gpu/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/gpu.md           # /wilson-gpu
│   │   ├── hooks/hooks.json          # SessionStart (成本护栏)
│   │   ├── bin/gpu.sh                # hook + 命令入口
│   │   └── bin/_gpu.py               # RunPod/Vast 适配器 + 护栏 (可用)
│   ├── wilson-decision-gate/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/decision-gate.md # /wilson-decision-gate
│   │   ├── hooks/hooks.json          # SessionStart + UserPromptSubmit
│   │   ├── bin/dg.sh                 # hook + 命令入口
│   │   ├── bin/_dg.py                # 原则注入 + design.md 账本 (可用)
│   │   └── samples/step-by-step-decision-gate.{md,ko,ja,zh,ru}.md
│   ├── wilson-tape-recorder/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/tape-recorder.md # /wilson-tape-recorder
│   │   ├── hooks/hooks.json          # SessionStart/UserPromptSubmit/PreToolUse/PostToolUse/SessionEnd
│   │   ├── bin/tr.sh                 # hook + 命令入口
│   │   └── bin/_tr.py                # .tape v1.2 emitter (@S/@U/@T/@R) (可用)
│   ├── wilson-goal/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/goal.md          # /wilson-goal
│   │   ├── hooks/hooks.json          # SessionStart + UserPromptSubmit
│   │   ├── bin/g.sh                  # hook + 命令入口
│   │   └── bin/_g.py                 # 目标持久化 + 再注入 (可用)
│   ├── wilson-inbox/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/inbox.md         # /wilson-inbox:inbox
│   │   ├── hooks/hooks.json          # SessionStart
│   │   ├── bin/inbox.sh              # hook + 命令入口
│   │   └── bin/_inbox.py             # inbox 脚手架 + 生命周期 (8 verb) (可用)
│   ├── wilson-lsp/
│   │   ├── .claude-plugin/plugin.json
│   │   └── .lsp.json                 # 接 hexa lsp + tape/n6/hxc/kosmos repo LSP
│   ├── sidecar/                      # 控制插件
│   │   ├── commands/sidecar.md       # /sidecar status|on|off <name>
│   │   └── bin/_sidecar.py           # 写共享 disabled.json (可用)
│   └── worktree-pr/
│       ├── commands/wt.md            # /worktree-pr:wt start|ship|finish|...
│       └── bin/worktree-pr.sh        # worktree → PR → merge → 清理 (可用)
└── LICENSE
```

## Sibling

- 🐦 [`dancinlab/wilson`](https://github.com/dancinlab/wilson) —— hexa-native AI 编码智能体。sidecar 所移植护栏的原本。

## License

MIT。参见 [LICENSE](LICENSE)。
