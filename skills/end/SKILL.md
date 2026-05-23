---
name: end
description: Session closure safety check — /end prints a single-shot dashboard of dangling residue in the current repo (uncommitted · unpushed · stash · open PRs by me · marketplace ↔ plugin version drift) with ✓/⚠ marks + recommended actions, and a closing ✅ `100% closure — safe to end` verdict when every line is green. Read-only. Triggers — "/end", "끝", "마무리", "종료", "클로저", "close out", "wrap up", "100% closure".
allowed-tools: Bash
---

@D end := "session closure safety dashboard — single-shot residue check" :: skill
  do   = "`/end` aggregates uncommitted · unpushed · stash · open PRs (mine) · mp↔plugin version drift · verdict"
  dont = "wing a custom closure summary when /end already enumerates the canonical residue surfaces"
