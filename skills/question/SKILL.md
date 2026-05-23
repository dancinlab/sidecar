---
name: question
description: Quick side-question alias — `/question <text>` (and short `/q <text>`) is a short alias for the built-in `/btw <text>` (ask a quick side question without interrupting the current task). Triggers — "/question", "/q", "quick question", "잠깐", "사이드 질문".
---

@D question := "quick side-question (alias for built-in /btw)" :: skill
  do   = "`/question <text>` or `/q` → answer briefly (1-3 sentences) · don't pivot main task · resume"
  dont = "treat /question as a task switch · long-form answer · derail the current work"
