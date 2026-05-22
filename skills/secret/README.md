# secret

`/secret <args>` — wrap the `secret` CLI ([dancinlab/secret](https://github.com/dancinlab/secret), macOS Keychain-backed).

## Verbs

```
/secret get <key>             print the value (stdout)
/secret set <key> [value]     store (hidden prompt if value omitted)
/secret delete <key>          remove
/secret list                  list keys in $SECRET_SERVICE
/secret service               print active service name
```

## ⚠ Security

`/secret get <k>` exposes the value in conversation context (slash output → model context). For agent-driven tool invocations, use direct bash inline instead:

```bash
TOKEN=$(secret get github_token) gh repo view
```

Slash form is best for **management** verbs (`list`, `delete`, `service`, `set`) where the value isn't returned or is intentionally being entered.

## Trigger

- Slash: `/secret <args>` — pass-through
- Natural language: *"secret get"*, *"secret set"*, *"키체인"*, *"토큰 저장"*, *"credential 가져와"*, *"API key 등록"*

## Related

- [`dancinlab/secret`](https://github.com/dancinlab/secret) — underlying CLI.
- For cross-platform, use `op` (1Password) / `bw` (Bitwarden) directly.
