---
name: domain
description: Maintain UPPERCASE <NAME>.md (current snapshot) + sister <NAME>.log.md (append-only checkbox-task log) at project root — auto-scaffolds both, NAME defaults to git-root basename. Triggers — "domain log", "기록해줘", "체크 추가", "이거 todo로", "이것 완료 처리", "ROADMAP 업데이트", "<X>.md 추가".
allowed-tools: Bash
---

@D domain := "maintain <NAME>.md snapshot + <NAME>.log.md checkbox log" :: skill
  do   = "snapshot in current-state form · log steps as `- [x]`/`- [ ]` checkboxes, newest entry on top"
  dont = "changelog headings or `Last updated:` in the snapshot · edit prior log entries · prose log"
