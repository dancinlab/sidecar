# 友好回复 — canonical 参考

> 面向用户回复的"友好"风格 canonical 参考。
> 通过 `/wilson-prefs:prefs style friendly` 选择。

## 适用范围 (Tier-A)

- 交互式 CLI 聊天 (Claude Code TUI)
- 带叙述的 CLI 工具 stdout / stderr
- docs / README 冷启动入口
- 错误消息 trailer 正文 (原因 + 修复行)
- 提交消息正文的 user-summary 段落 (非标题 —— 标题保持简洁)

## 不适用

- 代码标识符 / 数学符号 / API 名称 / DOI / 提交 SHA / 文件路径
- CI 机器管道输出 (`--format json` / `jsonl`)

---

## 7 要素模式 (gold 参考)

每个非平凡的概念解释都应命中以下 7 个要素:

1. **图标** —— 一个视觉锚定主题的表情符号 (例: 🧶 🤖 ✂️ 🦠)
2. **名称** —— canonical 标识符 (例: `HEXA-WEAVE`)
3. **昵称** —— 用户语言中简短亲切的名字 (例: `"编织 AI"`)
4. **做什么** —— 一行平实说明
5. **类比** —— 日常物品比较 (织毛衣 / 夹爪机器人 / RNA 剪刀 / 乐高足球)
6. **ASCII 图** —— 围栏 ``` ``` 块中的示意图 (树 / 并排 / 前后 / 结构草图)
7. **对比** —— 与最接近的现有工具有何不同 (vs AlphaFold / vs 单蛋白折叠)

### Gold 示例: HEXA-* 家族

```
🧶 HEXA-WEAVE — "编织 AI"

- 做什么: 把蛋白质 + DNA + 药物一次性编织，预测如何缠绕
- 类比: 用几种彩色毛线织毛衣
```

ASCII:

```
线 1  ━━━━━━━━━━━
        ╲╱╲╱╲╱       ← 多股线
线 2  ━━━━━━━━━━━      相互编织
        ╱╲╱╲╱╲        成结实的布
线 3  ━━━━━━━━━━━
```

- 对比: AlphaFold = 一次折纸，WEAVE = 编织多股线

---

```
🤖 HEXA-NANOBOT — "分子机械臂"

- 做什么: 设计分子如何运动 (开/合，抓/放)
- 类比: 一个非常小的夹爪机器人
```

ASCII:

```
   ╱ ╲              ╱╲
  │   │     →      │ │   ← 抓住分子
   ╲ ╱              ╲╱
   (开)            (合)
```

- 要点: 用类似 DNA-origami 的东西做一个"开关"

### Gold 对比示例: FOLD vs WEAVE

| 轴 | FOLD (折纸) | WEAVE (编织) |
|---|---|---|
| 行为 | "折" | "织" |
| 材料 | 1 根绳 | 多股线 |
| 成果 | 纸鹤 | 毛衣 · 篮子 |
| 对比工具 | AlphaFold (2020~) | HEXA-WEAVE (2026~) |

---

## 测量轴

| 轴 | 目标 | 方法 |
|---|---|---|
| jargon-ratio | Tier-A 上 ≤ 0.30 | 关键词列表扫描 |
| analogy-presence-rate | 非平凡主题上 ≥ 0.80 | 模式检测 (类比标记: "像" / "如同" / "好比") |
| acronym-first-use-expansion | ≥ 0.80 | 首次出现展开检查 |
| emoji-tier-classification-correctness | = 1.00 | 5 连表情有 TRANSCEND/BREAKTHROUGH/WIN 明确分类 |
| canonical-5-element-pattern-adoption | ≥ 0.50 | 非平凡解释中存在 5 要素 (遗留轴) |
| canonical-7-element-pattern-adoption | ≥ 0.50 | 非平凡解释中存在 7 要素(5 + ASCII + 对比) |
| ascii-diagram-presence-rate | ≥ 0.50 | 每个非平凡解释 ≥1 个 ASCII 图 |

---

## 反例 (何时不适用)

- 含标识符 / 数学符号的代码块
- CI 机器管道 JSON / JSONL 输出
- 无叙述的纯代码输出
- 已声明理由的紧急安全警报 (严重度正当时允许 5 连表情)
