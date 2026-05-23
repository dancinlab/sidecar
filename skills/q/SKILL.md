---
name: q
description: Quick side-question alias — `/q <text>` is a short alias for the built-in `/btw <text>` (ask a quick side question without interrupting the current task). Triggers — "/q", "quick question", "잠깐", "사이드 질문".
---

@D q := "quick side-question (alias for built-in /btw)" :: skill
  do   = "`/q <text>` → answer briefly (1-3 sentences) · don't pivot main task · resume after"
  dont = "treat /q as a task switch · long-form answer · derail the current work"
