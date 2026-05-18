---
name: security
description: Avoid tripping the wilson security guards by following the convention up front — no real secrets in writes or prompts, no writes to protected/credential paths, no destructive shell. Use when handling secrets, env files, system paths, or shell commands. Companion to wilson-secret-guard, wilson-dangerous-path, wilson-bash-guard.
---

# Security convention (companion to the wilson security guards)

## Overview

Three guards block a real security mistake at the moment it would happen.
They are deny-only and deliberately quiet — so the failure mode is a *wasted
recovery turn* when you trip one without knowing the rule. This skill teaches
the convention up front so the block never fires. One threat surface, three
guards: **secrets · paths · destructive shell**.

## When to Use

- Writing or generating any `.env`, config, or file that could carry a token
- About to write under a system or credential path
- Constructing a shell command that deletes, overwrites, or pipes-to-shell
- Pasting logs/snippets into a prompt that might contain a live key

## The Convention (how not to trip each guard)

```
secret-guard      .env / live token / PEM key  ──✗──  in a write or a prompt
dangerous-path    /etc /usr /sbin /System /.git ──✗──  Write/Edit/MultiEdit
                  ~/.ssh ~/.aws gh/keychain creds
bash-guard        rm -rf / · fork bomb · curl|sh ──✗──  destructive Bash
```

- **Secrets** — never write a real `.env` or a high-confidence credential
  (AWS / GitHub / GitLab / Anthropic / OpenAI / Slack / Google / Stripe
  tokens, PEM private keys). Use `.env.example` with placeholder values;
  reference secrets by env-var name, never by literal. Redact before pasting
  logs into a prompt.
- **Paths** — never Write/Edit a protected system path or a credential store
  (`/etc`, `/usr`, `/sbin`, `/System`, `/.git`, `~/.ssh`, `~/.aws`, gh
  config, keychain). Work inside the project tree; if a system change is
  truly needed, surface it to the user instead of writing it.
- **Destructive shell** — no `rm -rf /` or unbounded recursive delete, no
  fork bomb, no `curl … | sh` pipe-to-shell. Scope deletes to a known
  subdir; download then inspect then run, never pipe network → shell.

## If you are blocked anyway

The guard tells you which rule fired. Do not retry the same call — fix the
cause (placeholder instead of literal, project path instead of system path,
scoped command instead of unbounded) and proceed. Each guard has a documented
per-session opt-out env var, but reach for the convention first; the opt-out
is for the rare false positive, not the normal path.
