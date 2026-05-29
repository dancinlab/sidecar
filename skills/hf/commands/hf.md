---
description: /hf <flags> — 🤗 HuggingFace upload wrapper (pure-hexa). Thin wrapper around `hexa-lang stdlib/hf/upload.hexa`. README + repo-naming 검증 → find walk + sha256 → `hf` CLI repo create/upload/tag → audit + ledger. 토큰 file-backed HF_HOME/token (ps-invisible). --selftest / --dry-run (no network) → --upload.
argument-hint: "[--selftest | --dry-run --repo <org/name> --ckpt <path> --readme <path> [--tag <s>] | --upload [--private] | --validate-readme <p> | --validate-naming <org/name>]"
allowed-tools: Bash, Read, Edit, Write, Skill
---

# /hf — 🤗 HuggingFace upload wrapper

Input: `$ARGUMENTS`

## 하는 일

checkpoint 디렉터리를 **HuggingFace model repo** 에 업로드하는 순수-hexa 래퍼. anima `tool/hf_upload_mk2.hexa` 를 hexa-lang stdlib 로 흡수한 1급 verb.

1. **README 검증** — 5 required H2 (`## Origin · ## Falsifiers · ## Substrate · ## Caveats · ## Composability`) + Caveats 섹션 ≥3 honest bullets.
2. **repo naming 검증** — `<org>/<family>-<version>-<stage>[-<mod>]` (family = clm·alm·blm·vlm·slm·tlm·nlm·mlm·llm·hexad·composite · stage = sft-stage·dpo·merged·base·preview·dev·paradigm- · §3.7 `mk\d+-v\d+` grace until 2026-06-02).
3. **walk + sha256** — `/usr/bin/find` 로 파일 walk (dot-file/dir prune) + stdlib sha256 builtin (audit truth, 업로드 전 기록).
4. **`hf` CLI** (huggingface_hub v1.8.0+) — `repo create --repo-type model --exist-ok` → `upload` (single commit) → `repo tag create`.
5. **audit + ledger** — `$HOME/.hexa/hf_upload_audit/<ts>_<repo>.jsonl` + ledger (`HF_UPLOAD_AUDIT_DIR`/`HF_UPLOAD_LEDGER` env override).

## 토큰 (ps-invisible)

토큰은 file-backed `HF_HOME/token` (umask 077 · chmod 600) 로 전달 — 토큰 **VALUE** 가 argv·`sh -c` 명령문·`ps` 어디에도 안 뜬다. `--token <value>` 와 inline `HF_TOKEN=<value>` 둘 다 ps-visible 이라 회피.

3-tier 해석: (1) `secret get huggingface.token` (SSOT) → (2) `~/.cache/huggingface/token` → (3) `HF_TOKEN` env.

## 사용법

```bash
/hf --selftest                                          # 자가검사 (no network)
/hf --dry-run --repo <org/name> --ckpt <p> --readme <p> [--tag <s>]   # walk+sha256 (no network)
/hf --upload  --repo <org/name> --ckpt <p> --readme <p> [--tag <s>] [--private]   # 실제 업로드
/hf --validate-readme <path>
/hf --validate-naming <org/name>
```

### 예시

```bash
# 검증만 (네트워크 0)
/hf --dry-run --repo dancinlab/clm-v4-sft-stage1 --ckpt ./out/ckpt --readme ./README.md --tag step-25k

# 실제 업로드 (token 필요)
/hf --upload --repo dancinlab/clm-v4-sft-stage1 --ckpt ./out/ckpt --readme ./README.md --tag step-25k --private
```

## flow

```bash
hexa run $HOME/.hx/install/hexa-lang/stdlib/hf/upload.hexa $ARGUMENTS
```

- `hf` 는 self/main.hexa 에 1급 verb 로도 등록됨 → 차세대 toolchain build 후 `hexa hf <flags>` 직접 호출 가능.
- 현재는 dojo 와 동일하게 `hexa run …/stdlib/hf/upload.hexa` 경로 (stdlib hot-swap · 바이너리 재빌드 불필요).
- 성공 게이트 = 실제 commit URL (`https://huggingface.co/` 시작 + Traceback/Error/401/Unauthorized 무) — `echo $?` 불신.

## 의존 (upstream)

이 plugin 은 **thin wrapper**. 실제 로직 = `hexa-lang stdlib/hf/upload.hexa` (별 PR · raw#9 strict 순수 hexa).

- 미설치 → `hexa run` 가 stdlib/hf not found 안내
- 설치 후 자동 동작 (sidecar plugin 재배포 불필요 · stdlib hot-swap)

## triggers

`/hf`, `HF 업로드`, `huggingface 업로드`, `checkpoint 업로드`, `ckpt HF에 올려`, `hf upload`, `model repo push`
