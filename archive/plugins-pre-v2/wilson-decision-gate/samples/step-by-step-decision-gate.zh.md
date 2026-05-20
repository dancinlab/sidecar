# 逐步决策门 — canonical 参考

> sidecar 插件 **`wilson-decision-gate`**（wilson `step-by-step-decision-gate` 治理原则的独立移植）的 long-form 样例。
> 默认 = 安装即 **ON**。关闭用 `/wilson-decision-gate off`、`/sidecar off decision-gate`、或 `SIDECAR_NO_DECISION_GATE=1`。
> 本文件是 canonical 的 *如何应用* 参考 —— 读一次，多决策任务开始时作模板。`/wilson-decision-gate sample [en|ko|ja|zh|ru]` 打印。

## 此原则何时生效

此原则在 **多决策工作** —— 用户须选择的分支点有 N 个的任务 —— 触发。例:

- 新 spec 落地（决策 = 命名、falsifier 集、强制层、审计格式、…）
- 有范围选择的非平凡重构（哪些文件 in/out、抽象形态、迁移顺序、deprecation 期、…）
- API 设计（动词名、参数形、错误模型、版本策略、…）
- 迁移计划（步骤顺序、回滚门、中间态形态、…）
- 任何浮现 ≥ 2 个可行方案的 Plan-mode 工作

一次性任务（单 bug 修复、简短 Q&A、机械编辑）**不触发** —— 没有要瓦解的批处理。

## "一个决策 = 一个用户门"的含义

每个分支点，agent **必须**:

1. **单独呈现分支点** —— 绝不把两个决策捆成一个 yes/no。
2. **列出选项**（≥ 2）各一行说明。
3. **推荐一个**（`### 🎯 추천:` 或等价标题）+ **3 条以上要点理由**置于 "**근거**:" / "**Why**:" 之下。
4. 进入下一决策前 **等待用户选择**。可用 `AskUserQuestion`，否则停下用纯文本询问。
5. 边做边在 `design.md`（或会话日志）**记录所选 + 理由** —— `/wilson-decision-gate decide "<所选>" "<理由>"` 按下方格式 append。

审计轨迹（`design.md` 决策段 + 适用时 spec / PR 双向链接）是 **交付物的一部分**，非事后补。

## 为何禁止批处理

批处理把 N 个选择塌缩为一个 yes/no。具体:

- 多数选择未经审慎即通过 —— 用户只读标题"全部 yes"，沉重的选择被橡皮图章。
- 事后追责不可避免 —— 捆绑选择之一出错时，"你说过 yes"是脆弱的审计锚。
- 门不再是门 —— 沦为确认表演。step-by-step 的核心是把每个分支点放慢到它自己的决策。

故此原则所一般化的协议定义了硬规则: **每门所选超过一个 → 阻断**。

## 决策记录格式

在 design.md / 会话日志内，每个决策落为:

```markdown
### 决定 N — <一行说明>
- **picked**: ⭐ <选项标签>（多项排名时 🥇 / ✅ / ❌）
- **理由**:
  - <要点 1 —— 为何优于备选>
  - <要点 2 —— 接受何种权衡>
  - <要点 3 —— 日后什么会 falsify 此选择>
```

3 条为最小。承重决策可更多。少于此 = 理由太薄，3 周后的读者（你）无法重建权衡。

## 双向链接

- 决策所属的 spec / PR 应带一行 `decision_audit_ref: <design.md 路径>`（双向 —— spec → design.md，design.md 头 → spec/PR）。
- 若保留会话日志，上述决策记录格式作为其中一节嵌入。

## Worked example

把真实的多决策 spec/设计会话当 worked example: 每个分支点有自己的门、`picked` 行、3 条理由，并经单一 `decision_audit_ref` 链回 spec/PR。读一份这样的 design.md 体会模式，再复用本模板。

## 反例（何时不适用）

- 根因明确的一次性 bug 修复 —— 无决策可门。
- 机械重构（rename、格式化、lint 修复）—— 无分支点。
- Q&A / 解释 / 状态报告 —— 无交付物。
- 速度 > 审慎的紧急热修（会话期间用 `/wilson-decision-gate off` / `SIDECAR_NO_DECISION_GATE=1` kill-switch，并记录原因）。

## 与 `wilson-prefs` 响应风格的关系

此原则所一般化的协议沿自然轴捆绑两样:

1. **响应风格**（如 friendly 7-element 模式、推荐格式、emoji 枚举）—— *怎么写*。作为响应风格单独存在于 sidecar `wilson-prefs` 插件。
2. **Step-by-step 用户确认门** —— *本* 原则，*怎么决策*。

**作用域独立**（一方开着另一方可关）**，但呈现是自动继承的**:

- 门的选项 + 推荐 + 理由会**以 `wilson-prefs` 当前声明的响应风格渲染** —— 代理从注入的 `## Prefs` 块（`Active response style: **<name>**`）读取活动风格，并在**用户无需再次要求**的情况下应用。若 `wilson-prefs` 已声明 `style=friendly` 却还要手动说"用 friendly 版展示门"，那是 **bug**，不是预期工作流。
- 当活动风格为 **friendly** 时，每个选项和推荐使用 **完整 friendly 7-element 模式**（emoji 图标 · 别名 · 一句白话 · 日常类比 · fenced ASCII 图 · 与最接近工具的对比）—— 不是 bare terse table。
- 当 `wilson-prefs` **缺失 / 未设置 / 禁用** 时，门回退到宿主默认呈现。没有硬运行时耦合 —— 门可独立工作，只是无法继承从未设置过的风格。

简言之: *是否设门* 是本原则；*门怎么读* 继承自活动 prefs 风格，无需手动提醒。

## 启用速查

```sh
# 默认: 安装即 ON（SessionStart 注入原则; UserPromptSubmit 仅在
# 像 branch-point 的提示上加简短提醒 —— 非每条提示）。

/wilson-decision-gate off          # 关闭原则注入
/wilson-decision-gate on           # 重新开启
/sidecar off decision-gate         # 经控制插件运行时切换
SIDECAR_NO_DECISION_GATE=1         # 会话 kill switch（env，恒优先）

/wilson-decision-gate decide "<所选>" "<理由>"   # append 一条 Decision
/wilson-decision-gate log          # 打印 design.md 决策段
/wilson-decision-gate path <file>  # 指向另一个 design.md
```
