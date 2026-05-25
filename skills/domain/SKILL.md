---
name: domain
description: Maintain UPPERCASE <NAME>.md (snapshot = `@goal:` final goal + `- [ ]` progress milestones) + sister <NAME>.log.md (append-only step log). NAME = UPPERCASE-start + UPPERCASE/digits/`-`/`+` (e.g. `TTR-LM`, `RTSC+HTS`); `_` rejected · `+` enables meta-domain composition. Subcommands — `/domain init <NAME>` scaffolds files · `/domain set <NAME>` selects session active · `/domain goal <text>` declares the FINAL goal (`@goal:` line) · `/domain milestone <text>` (alias `ms`) adds a progress milestone · `/domain title <text>` (alias `subtitle`) sets an optional `@title:` display header (icon · name · alias, e.g. `🧠 IIT4 — 의식 측정자(尺)`) · `/domain done <match>` flips a milestone (else a log task) · `/domain` shows active (title or name) + @goal + progress bar + lint. Lint warns when `@goal:` or milestones are missing (`@title:` is optional, never warned). Triggers — "domain init", "도메인 만들어", "도메인 선택", "골 지정", "milestone 추가", "진행도".
allowed-tools: Bash
---

@D domain := "active <NAME> · @goal: final goal + `- [ ]` milestones in snapshot → progress + lint" :: skill
  do   = "`init/set <NAME>` (NAME = UPPERCASE-start + UPPERCASE/digits/`-`/`+`; `+` for meta) · `goal <text>` sets @goal · `ms <text>` adds milestone · `title <text>` sets optional @title display header · `done` flips → progress"
  dont = "changelog / `Last updated:` in snapshot · edit prior log entries · skip @goal/milestone (lint warns)"
