# secret

`/secret <args>` — wrap the `secret` CLI ([dancinlab/secret](https://github.com/dancinlab/secret), macOS Keychain-backed).

## Verbs

```
/secret get <key>                            print the value (stdout) ⚠
/secret set [--allow-mnemonic] <key> [value] store (hidden prompt if value omitted)
/secret rotate <key> [--bytes N|--hex N]     generate random + replace (value NEVER printed)
/secret check <key>                          exit 0 if exists, 1 otherwise
/secret delete <key>                         remove
/secret list                                 list keys in $SECRET_SERVICE
/secret service                              print active service name
```

**High-value protection** (on `set`): BIP39 mnemonic (12/15/18/21/24 words, wordlist-validated) · xprv/xpub/yprv/ypub/zprv/zpub · WIF · 64-hex privkey → default REFUSE. Override = `--allow-mnemonic` + stdin/tty only (argv refused — `ps aux` leak).

**Rotate** emits sentinel only — value read separately via `secret get <key>`.

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
