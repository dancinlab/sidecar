---
name: domain
description: Maintain UPPERCASE <NAME>.md (snapshot = final-goal milestone checkboxes) + sister <NAME>.log.md (append-only step log). `/domain <NAME>` selects the session's active domain (later verbs default to it) and shows a final-goal progress bar (snapshot [x]/total). NAME defaults to git-root basename. Triggers — "domain log", "도메인 선택", "기록해줘", "체크 추가", "이거 todo로", "이것 완료 처리", "진행도", "ROADMAP 업데이트".
allowed-tools: Bash
---

@D domain := "select active <NAME> · snapshot final-goal checkboxes → progress % · log step checkboxes" :: skill
  do   = "`/domain <NAME>` selects the active domain · snapshot holds final-goal `- [ ]`/`- [x]` → progress % · log newest-first"
  dont = "changelog / `Last updated:` in the snapshot · edit prior log entries · prose log"
