---
name: hf
description: /hf <flags> — 🤗 HuggingFace upload wrapper (pure-hexa). Thin wrapper around `hexa-lang stdlib/hf/upload.hexa` (invoked via `hexa run $HOME/.hx/install/hexa-lang/stdlib/hf/upload.hexa …` — stdlib hot-swap, no binary rebuild; `hf` is also registered as a first-class `hexa hf` verb in self/main.hexa for the next toolchain build). anima hf_upload_mk2 를 hexa-lang stdlib 로 흡수한 1급 verb — checkpoint 디렉터리를 HuggingFace model repo 에 업로드: README(5 required H2 + Caveats≥3) · repo naming(family-version-stage + §3.7 grace) 검증 → `find` walk + sha256 → `hf` CLI repo create/upload/tag → audit + ledger($HOME/.hexa/hf_upload_audit/). 토큰은 file-backed HF_HOME/token 으로 ps-invisible (argv·sh-c·ps 어디에도 토큰값 미노출). 3-tier 해석 (secret get huggingface.token · ~/.cache/huggingface/token · HF_TOKEN env). Flags — --selftest · --dry-run · --upload · --repo <org/name> · --ckpt <path> · --readme <path> · --tag <step> · --private · --validate-readme <path> · --validate-naming <org/name>. Triggers — '/hf', 'HF 업로드', 'huggingface 업로드', 'checkpoint 업로드', 'hf upload', 'model repo push', 'ckpt HF에 올려'.
allowed-tools: Bash, Read, Edit, Write, Skill
---

@D hf := "HuggingFace upload wrapper (`hexa stdlib/hf/upload.hexa` thin wrap)" :: skill [required active]
  do   = "/hf --dry-run|--upload --repo <org/name> --ckpt <path> --readme <path> [--tag <s>] [--private]"
  do   = "validate README(5 H2 + Caveats≥3) + repo naming(family-version-stage) BEFORE any upload"
  do   = "token via file-backed HF_HOME/token (ps-invisible) · 3-tier resolve (secret/cache/HF_TOKEN env)"
  do   = "invoke via `hexa run $HOME/.hx/install/hexa-lang/stdlib/hf/upload.hexa …` (stdlib hot-swap)"
  do   = "--selftest (no network) / --dry-run (walk+sha256, no network) to verify before --upload"
  dont = "pass the token as `--token <value>` argv or an inline `HF_TOKEN=<v>` prefix (both ps-visible)"
  dont = "--upload past a naming/README validation FAIL (wrapper gates on a real commit URL · honest)"
  dont = "hand-author a .py uploader (raw#9 strict — pure hexa · hf CLI for the network leg only)"
