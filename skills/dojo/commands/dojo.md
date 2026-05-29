---
description: /dojo <domain> <slug> '<spec-json>' [--lang=hexa|py|both] — 🥋 cloud training-job 빵틀 generator. Thin wrapper around `hexa-lang stdlib/dojo/cli.hexa`. job.hexa(.hexa 드라이버) + train.py(.py HF Trainer) + run.sh(.sh 글루) emit. Output = exports/<domain>/dojo/<slug>/. llm full · vision/rl/tabular stub. d16 dry-run hint reported after emit.
argument-hint: "[domains | <domain> <slug> '<spec-json>' [--lang=hexa|py|both]]"
allowed-tools: Bash, Read, Edit, Write, Skill
---

# /dojo — 🥋 학습 빵틀 (cloud training-job generator)

Input: `$ARGUMENTS`

## 하는 일

도메인 + slug + spec-json 받아서 cloud pod에서 돌릴 **training-job 한 세트**를 자동 생성. deck(DFT input deck)의 학습 형제 — 정적 `.in` deck 대신 학습 잡 세트를 굽는다.

- **llm** = HuggingFace Trainer causal-LM fine-tune full impl (3 files: `job.hexa` · `train.py` · `run.sh`)
- **vision · rl · tabular** = stub (TODO — 첫 llm impl 이 패턴 확정 후 graduation)

빵틀 = 같은 model + 같은 dataset 라도 lr / epochs / batch_size 만 바꿔서 N개 학습 잡을 자동 emit 하는 빵 굽기 machine.

## 산출 3파일

```
exports/llm/dojo/<slug>/
  ├─ job.hexa   (.hexa 드라이버 — hexa cloud nohup <host> <log> -- python3 train.py 디스패치)
  ├─ train.py   (.py 페이로드 — AutoModelForCausalLM + Trainer fine-tune + ppl eval)
  └─ run.sh     (.sh 글루 — cd $(dirname $0) + d16 free pool dry-run hint + hexa run job.hexa)
```

`.py` / `.sh` 는 hexa 제너레이터가 `write_text` 로 써내는 **emit-string 산출물** — agent Write/Edit 가 아니라 hexa 런타임이 쓴다 → hexa-native 가드 범위 밖 (deck `run.sh` emit 과 동일 원리).

## 사용법

```bash
/dojo                                       # = /dojo domains
/dojo domains                               # 등록 도메인 (llm=full · 그 외 stub)
/dojo <domain> <slug> '<spec-json>'         # emit (default --lang=both)
/dojo <domain> <slug> '<spec-json>' --lang=hexa   # job.hexa 만
/dojo <domain> <slug> '<spec-json>' --lang=py     # train.py 만
```

### 예시

```bash
# gpt2 wikitext fine-tune
/dojo llm gpt2_wikitext '{"model":"gpt2","dataset":"wikitext","epochs":1,"batch_size":4,"lr":"5e-5"}'

# lr sweep (3 jobs)
/dojo llm gpt2_lr1 '{"model":"gpt2","lr":"3e-5"}'
/dojo llm gpt2_lr2 '{"model":"gpt2","lr":"5e-5"}'
/dojo llm gpt2_lr3 '{"model":"gpt2","lr":"1e-4"}'
```

### stub 도메인 (TODO)

```bash
/dojo vision ...      # 🥋 dojo: vision emitter is TODO — llm first impl only
/dojo rl ...
/dojo tabular ...
```

stub 은 honest exit-1 + graduation TODO. 경로: `stdlib/dojo/gen.hexa` 에 `emit_<domain>()` 추가 + dispatch 브랜치 flip.

## flow

### Step 1 — domain routing (generic dispatch · d4)

```bash
hexa run $HOME/.hx/install/hexa-lang/stdlib/dojo/cli.hexa \
  "<domain>" "<slug>" '<spec-json>' --lang=<lang>
```

- `dojo` 는 self/main.hexa 에 1급 verb 로도 등록됨 → 차세대 toolchain build 후 `hexa dojo <domain> <slug> '<spec>'` 직접 호출 가능.
- 현재는 deck 과 동일하게 `hexa run …/stdlib/dojo/cli.hexa` 경로 (stdlib hot-swap · 바이너리 재빌드 불필요).

### Step 2 — post-emit report

```
🥋 dojo staged: exports/llm/dojo/<slug>/
   job.hexa  <N> lines · train.py <N> · run.sh <N>
   spec: {...}  (--lang=both)
   run:  cd exports/llm/dojo/<slug>/ && bash run.sh   (d16: free `pool on <host>` import dry-run first)
```

## spec keys (llm)

| key | default | 뜻 |
|---|---|---|
| `model` | `gpt2` | base 모델 id |
| `dataset` | `wikitext` | HF dataset id |
| `dataset_config` | `wikitext-2-raw-v1` | dataset config |
| `epochs` | `1` | 학습 epoch |
| `batch_size` | `4` | per-device batch |
| `lr` | `5e-5` | learning rate (pre-formatted str) |
| `max_steps` | (없음=full epochs) | 하드 step cap |
| `host` | `ubu-1` | run.sh 디스패치 pool host |
| `output_dir` | `out` | remote 학습 output dir |

## 의존 (upstream)

이 plugin 은 **thin wrapper**. 실제 emit 로직 = `hexa-lang stdlib/dojo/{gen,llm,cli}.hexa` (별 PR).

- `stdlib/dojo/cli.hexa` 미설치 → "🛑 stdlib/dojo not found · install hexa-lang ≥ 0.1.0" 안내
- 설치 후 자동 동작 (sidecar plugin 재배포 불필요 · stdlib hot-swap)

## triggers

`/dojo`, `학습 빵틀`, `dojo-gen`, `training job 생성`, `cloud 학습 굽기`, `dojo 만들어`, `train job 빵틀`
