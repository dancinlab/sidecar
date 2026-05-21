---
name: hexa-help
description: |
  Wrap `hexa --help` (no arg) or `hexa <verb> --help` (with arg).
  Per `commons.tape g7`, consult the help before guessing
  unfamiliar hexa verbs. Triggers on phrases like "hexa 뭐있어",
  "hexa <verb> 뭐야", "hexa help", "hexa --help", "hexa 사용법".
allowed-tools: Bash
---

# hexa-help — wrap `hexa --help` / `hexa <verb> --help`

## When to use

Before invoking an unfamiliar `hexa <verb>` — consult help first per `commons.tape g7` (don't guess signatures).

## Forms

```
/hexa-help              hexa --help (top-level catalog: 80+ verbs)
/hexa-help <verb>       hexa <verb> --help (verb-specific signature)
```

## Related

- `commons.tape g7` — surfaces this rule.
- `/verify` · `/kick` · `/cloud` — specific verb wrappers when you already know what you want.
