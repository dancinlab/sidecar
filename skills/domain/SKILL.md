---
name: domain
description: Maintain UPPERCASE <NAME>.md (snapshot = final-goal milestone checkboxes) + sister <NAME>.log.md (append-only step log). `/domain set <NAME>` selects the session's active domain (later verbs default to it); `/domain goal <text>` adds a final-goal milestone (`/domain goal done <match>` flips it); progress bar = snapshot [x]/total. NAME defaults to git-root basename. Triggers — "domain set", "도메인 선택", "골 지정", "goal 추가", "기록해줘", "체크 추가", "이것 완료 처리", "진행도".
allowed-tools: Bash
---

@D domain := "set active <NAME> · goal milestones in snapshot → progress % · log step checkboxes" :: skill
  do   = "`set <NAME>` selects active domain · `goal <text>` adds a snapshot milestone (`done <match>` flips → progress %) · log newest-first"
  dont = "changelog / `Last updated:` in the snapshot · edit prior log entries · prose log"
