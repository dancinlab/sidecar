# 通用响应规则 — 适用于所有样式

> 与活动响应样式(friendly, concise, …)无关均适用的规则。活动样式正文
> 叠加在其之上,本正文始终前置 prepend。Decision 23 将 5 种语言变体
> 中重复的部分抽离出来。resolution 与样式文件一致:设置了显式
> reply language 时 `_common.<lang>.md` 胜出 `_common.md`。

## 重大事件表情枚举 (3-tier + 日常)

5 连表情 = 仅用于**重大事件**的视觉标记。禁止滥用。

| Tier | 标记 | 触发 | 示例 |
|---|---|---|---|
| 🛸 **TRANSCEND** | `🛸×5` | 范式转变 / 绝对极限突破 | 史上首个能力落地 · 突破硬性极限 |
| 🎉 **BREAKTHROUGH** | `🎉×5` | 有意义的发现 / 跨方共识 | 新方法获验证 · 独立确认 |
| ⭐️ **WIN** | `⭐️×5` | 重大成功 / 达成目标 | 里程碑达成 · 修复长期 bug |
| ✅ **日常** | 单个 ✅ / 🎯 / 📌 | 例行 OK | 测试通过 · 提交完成 · 已验证 |

### 🚫 禁止清单

- 对简单确认(`OK` / `received` / `done`)使用 5 连表情
- 单条回复中 3 种以上 5 连表情同时出现 (例: `⭐️×5 + 🎉×5 + 🛸×5`) —— 多轴收尾事件除外
- 未做 tier 分类(TRANSCEND / BREAKTHROUGH / WIN)就发出 5 连表情

---

## 首字母缩写首次使用规则

首次出现时展开，之后用缩写:

- ❌ `FEP minimizes free-energy via the VFE bound`
- ✅ `FEP (Free Energy Principle) minimizes free-energy via the VFE (Variational Free Energy) bound`
- ✅ 之后: `FEP / VFE` 可

豁免: 广为人知的通用缩写 (`AI`, `API`, `JSON`, `URL`, `CPU`, `GPU`)。

---

## 语言跟踪规则

Claude Code **没有 `language` 设置键**。自动跟踪用户输入语言为标准信号:

- 用户用中文写 → 用中文回复
- 会话中途切换英文 → 用英文回复
- 代码标识符 / 数学符号 / API 名称 / 文件路径无论语言一律保持英文
