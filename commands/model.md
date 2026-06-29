---
description: /model {list|show|add|set|gate|feat|verify|prune|rm} — per-repo 모델 레지스트리 (단일 SSOT = ARCHITECTURE.json .models[]). 핵심 필드 + 3 유연축 gates{}(검증충족도)·progress(진행척도)·features[](특징). verify=sha256 무결성, prune=HF+sha 가드. Triggers — "모델 관리", "model add", "모델 등록", "검증 충족도", "/model".
argument-hint: "{list|show|add|set|gate|feat|verify|prune|rm}"
allowed-tools: Bash
---

# /model — per-repo 모델 레지스트리 (단일 SSOT)

프로젝트(repo)마다 **자체** 모델 관리. SSOT = repo-root `ARCHITECTURE.json` 의 top-level `models` 배열(설계 SSOT 한곳 · `meta`/`sections`/`convergence` 와 형제 키 · 별도 jsonl scatter 없음). sidecar는 핵심 필드 + 3개 유연축만 고정하고, 게이트 이름·특징 태그는 각 repo가 자기 도메인대로 채운다(프로젝트 결합 0).

## 모델 레코드
핵심: `id` · `arch` · `version`(아키텍처-family SemVer, 예 ByteGPT 1.0 · ConvMoE 2.1 — 레지스트리 META 필드지 파일명 접미사 아님) · `params` · `base` · `tier` · `sha256` · `path`(로컬 weight) · `hf`(repo_id) · `visibility`.
3 유연축:
- **`gates{}` — 검증 충족도**: 게이트별 통과 정도. 예 `{"C1":"pass","C2":"fail","C4":"fail","heldout":"4/4 DESCENT"}`. `pass/fail`은 `✓/✗`로 표시, 그 외는 `K=V`.
- **`progress` — 진행척도**: 자유텍스트 생애주기. 예 `"trained·serialized·DIRECTIONAL(engine-native pending)"`.
- **`features[]` — 특징**: 태그. 예 `["ko","en","sns","ConvMoE","303M"]`.

## 서브커맨드
```
sidecar model list [--tier T] [--json]      모든 모델 (검증·진행·특징 한눈)
sidecar model show <id>                      한 모델 전체 JSON
sidecar model add  <id> [--arch --version --params --base --tier --sha --path --hf --visibility --progress --note --features a,b,c]
sidecar model set  <id> <field> <value...>   핵심 필드 갱신
sidecar model gate <id> <K=V> [K=V...]       검증 충족도 기록 (예: C1=pass C4=fail heldout='4/4 DESCENT')
sidecar model feat <id> <tag...> [--add]     특징 set (--add=추가)
sidecar model verify <id>                    weight sha256 재계산→기록값 대조 (무결성·드리프트 탐지)
sidecar model prune <id>                     HF 업로드 AND sha 일치 확인 후 로컬 weight 삭제 (registry 항목 보존, pruned=true)
sidecar model rm <id> --yes                  registry 항목 제거 (weight 파일은 그대로)
```

## 안전장치
- `verify` = weight 파일 sha256 ↔ 기록값. 불일치 = 손상/드리프트 loud-fail (verdict-integrity).
- `prune` = `hf` 기록 + sha 일치일 때만 로컬 삭제 (HF 없으면 거부 — "업로드 먼저"). 영구저장 확인 전 weight 소실 방지.
- `rm` = `--yes` 필수 (registry 라인만 제거, git 복구 가능).

## 관례
- SSOT = repo-root `ARCHITECTURE.json` 의 top-level `models` 배열, git-tracked (single-doc 설계 SSOT · 최소-diff 제자리 갱신 = `models` 블록만 splice, 나머지 트리 byte-불변). 커밋은 `sidecar pr-cycle` 사이클로.
- DOMAIN-AGNOSTIC: 게이트 이름(C1/G6/heldout…)·특징 태그는 repo가 자유 정의. sidecar는 스키마만 강제.
