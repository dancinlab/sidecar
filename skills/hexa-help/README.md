# hexa-help

`/hexa-help [verb]` — wrap `hexa --help` or `hexa <verb> --help`.

## Forms

| Form | Output |
|---|---|
| `/hexa-help` | `hexa --help` — top-level catalog (80+ verbs) |
| `/hexa-help <verb>` | `hexa <verb> --help` — verb-specific signature |

## Trigger

- Slash: `/hexa-help [verb]`
- Natural language: *"hexa 뭐있어"*, *"hexa &lt;verb&gt; 뭐야"*, *"hexa help"*, *"hexa 사용법"*

## Related

- `commons.tape g7` — consult `hexa --help` for unfamiliar verbs before guessing.
- `/verify` · `/kick` · `/cloud` · `/pool` — specific verb wrappers when the verb is already known.
