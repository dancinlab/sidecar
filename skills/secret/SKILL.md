---
name: secret
description: |
  Wrap the `secret` CLI (macOS Keychain-backed credential store with
  dual-channel sync — `dancinlab/secret`). Use for credential management:
  storing tokens, retrieving for tool invocations, listing/deleting
  entries, and the admin verbs (`init`, `backup`, `sync`, `migrate`).
  Triggers on phrases like "secret get", "secret set", "토큰 저장",
  "키체인", "credential 가져와", "API key 등록", "store this token",
  "백업 push", "secret 동기화".
allowed-tools: Bash
---

# secret — wrap the `secret` CLI for macOS Keychain credentials

## When to use

- Store a new credential (API token, key) in macOS Keychain.
- Retrieve a credential for a tool invocation (env var pattern).
- List or delete credentials in the active service namespace.
- Bootstrap on a new Mac (`init` + optionally `backup enable`) or push current state to the github mirror (`backup` / `sync`).

## Verbs (pass-through to `secret`)

```
/secret get <key>                            print the value (stdout) ⚠
/secret set [--allow-mnemonic] <key> [value] store (hidden prompt if value omitted)
/secret rotate <key> [--bytes N|--hex N]     generate random + replace (value NEVER printed)
/secret check <key>                          exit 0 if exists, 1 otherwise
/secret delete <key>                         remove
/secret list                                 list keys in $SECRET_SERVICE
/secret service                              print active service / keychain / backend
```

### Admin verbs

```
/secret init icloud                          one-time per-device — primary in iCloud Drive
/secret init github <git-url>                one-time per-device — primary inside a git checkout
/secret backup enable <git-url> [<path>]     add github mirror (auto-push ON by default)
/secret backup disable                       remove mirror config (clone preserved)
/secret backup status                        show backup configuration
/secret backup                               manual push to mirror
/secret sync                                 git pull --rebase + push + restore primary
/secret migrate [--apply] [--purge-source]   copy entries from login keychain (one-time)
```

**rotate** / **check** / **list** / **delete** / **service** / **backup status** = safe (no value returned). **set** with hidden prompt = safe (value entered, not displayed). **get** = ⚠ value flows to conversation.

**Dual-channel sync.** The keychain file is encrypted at rest with the master password. Two independent sync channels can be active in any combination:
- **iCloud Drive** — primary file lives in iCloud Drive folder, macOS does file-level sync between the user's Macs.
- **GitHub mirror** — encrypted blob pushed to a private git repo. `secret backup enable <url>` sets it up; auto-push fires after every modify.

Both push the SAME encrypted blob — same master password unlocks it on every device. No extra crypto layer; no plaintext export.

**High-value protection** (`set`): BIP39 mnemonic (12/15/18/21/24 words, validated against bundled wordlist) · xprv/xpub/yprv/ypub/zprv/zpub · WIF · 64-hex privkey → default REFUSE. Override = `--allow-mnemonic` + stdin/tty only (argv refused — `ps aux` leak).

## ⚠ Security: prefer inline `$(secret get ...)` for tool-use

The slash form `/secret get <k>` will surface the value as stdout INTO the conversation context (and thus into model context + cache). For agent-driven tool invocations (e.g. `gh auth login`, `curl -H 'Authorization: Bearer …'`), use direct bash command substitution INSTEAD — the value flows into the subshell env without becoming conversation content:

```bash
TOKEN=$(secret get github_token) gh repo view
curl -H "Authorization: Bearer $(secret get openai_key)" ...
```

Slash form is most appropriate for **management** verbs (`list`, `delete`, `service`, `set`, `backup status`, `migrate`) where the value either isn't returned or the user is intentionally entering it.

## Auto-push opt-out

Auto-push is ON by default once `backup enable` has been run. To skip one invocation:

```bash
SECRET_BACKUP_AUTO=0 secret set scratch_var local_only
```

To stop mirroring entirely: `/secret backup disable` (removes config; local clone preserved).

## Namespacing

`$SECRET_SERVICE` partitions entries (default `dancinlab.secret`):

```
SECRET_SERVICE=work /secret list
SECRET_SERVICE=ci-bot /secret set deploy_key
```

## Related

- `dancinlab/secret` — the underlying CLI (public, MIT, bash + zero deps).
- For cross-platform (non-mac), use `op` (1Password CLI) or `bw` (Bitwarden CLI) directly.
