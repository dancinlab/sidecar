# tape-lsp

Wire the canonical `.tape` v1.2 LSP server (`tape-lsp` — see [`dancinlab/tape`](https://github.com/dancinlab/tape)) into Claude Code. Diagnostics + hover, zero deps (Python 3.8+).

## Requirements

`tape-lsp` must be on `PATH`:

```
hx install dancinlab/tape
```

If `tape-lsp` is not resolvable, Claude Code surfaces the error in `/plugin` Errors.

## Scope

Only `.tape` is claimed. The server is grounded in `spec/tape.md`; unrecognised body forms are hints (sev 2), not errors, per the forward-compatibility rule.
