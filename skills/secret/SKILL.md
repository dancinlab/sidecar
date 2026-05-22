---
name: secret
description: |
  Wrap the `secret` CLI (macOS Keychain-backed credential store —
  `dancinlab/secret`). Use for credential management: storing tokens,
  retrieving for tool invocations, listing/deleting entries. Triggers
  on phrases like "secret get", "secret set", "토큰 저장", "키체인",
  "credential 가져와", "API key 등록", "store this token".
allowed-tools: Bash
---

# secret — wrap the `secret` CLI for macOS Keychain credentials

## When to use

- Store a new credential (API token, key) in macOS Keychain.
- Retrieve a credential for a tool invocation (env var pattern).
- List or delete credentials in the active service namespace.

## Verbs (pass-through to `secret`)

```
/secret get <key>                            print the value (stdout) ⚠
/secret set [--allow-mnemonic] <key> [value] store (hidden prompt if value omitted)
/secret rotate <key> [--bytes N|--hex N]     generate random + replace (value NEVER printed)
/secret check <key>                          exit 0 if exists, 1 otherwise
/secret delete <key>                         remove
/secret list                                 list keys in $SECRET_SERVICE
/secret service                              print active service name
```

**rotate** / **check** / **list** / **delete** / **service** = safe (no value returned). **set** with hidden prompt = safe (value entered, not displayed). **get** = ⚠ value flows to conversation.

**High-value protection** (`set`): BIP39 mnemonic (12/15/18/21/24 words, validated against bundled wordlist) · xprv/xpub/yprv/ypub/zprv/zpub · WIF · 64-hex privkey → default REFUSE. Override = `--allow-mnemonic` + stdin/tty only (argv refused — `ps aux` leak).

## ⚠ Security: prefer inline `$(secret get ...)` for tool-use

The slash form `/secret get <k>` will surface the value as stdout INTO the conversation context (and thus into model context + cache). For agent-driven tool invocations (e.g. `gh auth login`, `curl -H 'Authorization: Bearer …'`), use direct bash command substitution INSTEAD — the value flows into the subshell env without becoming conversation content:

```bash
TOKEN=$(secret get github_token) gh repo view
curl -H "Authorization: Bearer $(secret get openai_key)" ...
```

Slash form is most appropriate for **management** verbs (`list`, `delete`, `service`, `set`) where the value either isn't returned or the user is intentionally entering it.

## Namespacing

`$SECRET_SERVICE` partitions entries (default `dancinlab.secret`):

```
SECRET_SERVICE=work /secret list
SECRET_SERVICE=ci-bot /secret set deploy_key
```

## Related

- `dancinlab/secret` — the underlying CLI (public, MIT, single bash script).
- For cross-platform (non-mac), use `op` (1Password CLI) or `bw` (Bitwarden CLI) directly.
