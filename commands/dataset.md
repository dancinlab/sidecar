---
description: /dataset {list|show|add|set|feat|rm} [--lang ko|en] [--register general|sns] — per-repo 데이터셋 레지스트리 (단일 SSOT = ARCHITECTURE.json .datasets[], 모델 레지스트리의 데이터-짝). 핵심 필드 + 유연축 lang_verified(언어검증)·features[](특징). list=4칸 lang×register 그리드. Triggers — "데이터셋 관리", "dataset add", "코퍼스 등록", "데이터셋 레지스트리", "/dataset".
argument-hint: "{list|show|add|set|feat|rm} [--lang ko|en] [--register general|sns]"
allowed-tools: Bash
---

# /dataset — per-repo 데이터셋 레지스트리 (단일 SSOT)

프로젝트(repo)마다 **자체** 데이터셋/코퍼스 관리 — `sidecar model` 의 데이터-짝. SSOT = repo-root `ARCHITECTURE.json` 의 top-level `datasets` 배열(설계 SSOT 한곳 · `models`/`meta`/`sections`/`convergence` 와 형제 키 · 별도 jsonl scatter 없음). sidecar는 핵심 필드 + 유연축만 고정하고, register/role 라벨·특징 태그는 각 repo가 자기 도메인대로 채운다(프로젝트 결합 0).

## 데이터셋 레코드
핵심: `id` · `repo_id`(HF) · `lang`(ko|en) · `register`(general|sns) · `rows` · `size` · `visibility` · `role`(예 chat-4cell).
유연축:
- **`lang_verified` — 언어검증**: ko/en 주장이 *측정*된 것인지(a_chat_registers — 의도만 아님). `✓lang`/`✗lang` 표시.
- **`features[]` — 특징**: 태그. 예 `["ko","general","fineweb2"]`.

## 서브커맨드
```
sidecar dataset list [--lang ko|en] [--register general|sns] [--json]   모든 데이터셋 + 4칸 lang×register 그리드
sidecar dataset show <id>                      한 데이터셋 전체 JSON
sidecar dataset add  <id> [--repo_id --lang --register --rows --size --visibility --role --note --lang-verified --features a,b,c]
sidecar dataset set  <id> <field> <value...>   핵심 필드 갱신
sidecar dataset feat <id> <tag...> [--add]     특징 set (--add=추가)
sidecar dataset rm <id> --yes                  registry 항목 제거 (데이터 파일은 그대로)
```

## 관례
- SSOT = repo-root `ARCHITECTURE.json` 의 top-level `datasets` 배열, git-tracked (single-doc 설계 SSOT · 최소-diff 제자리 갱신 = `datasets` 블록만 splice, 나머지 트리 byte-불변 · `models` 옆에 인접 삽입). 커밋은 `sidecar pr-cycle` 사이클로.
- **4칸 chat 표준**: anima 류 chat 코퍼스는 언어 2(ko·en) × register 2(general·sns) = 4칸 모두 커버해야 완성(`a_chat_registers`). `list` 그리드가 빈 칸(⚪)을 한눈에 드러낸다.
- DOMAIN-AGNOSTIC: register/role 라벨·특징 태그는 repo가 자유 정의. sidecar는 스키마만 강제. `sidecar model` 과 동일한 splice writer·flag 파서·idiom 으로 미러.
