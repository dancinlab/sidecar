# 설치 / 통합

## 배치 옵션

하네스 엔진은 repo 안 어디에 두든 동작한다(`lib/paths.ts` 가 repo 루트를 상향 탐색). 세 가지 권장 배치:

### A. git submodule (권장 — 버전 고정 + 업데이트 추적)

```bash
cd your-repo
git submodule add https://github.com/dancinlab/harness .harness-engine
git commit -m "chore: add harness engine"
# 업데이트: cd .harness-engine && git pull && cd .. && git add .harness-engine
```

### B. vendor (복사 — 오프라인/단순)

```bash
cd your-repo
git clone --depth 1 https://github.com/dancinlab/harness .harness-engine
rm -rf .harness-engine/.git
```

### C. 중앙 1벌 + 심볼릭링크 (멀티 repo, 로컬)

```bash
git clone https://github.com/dancinlab/harness ~/tools/harness
ln -s ~/tools/harness your-repo/.harness-engine
```

## 런타임 (tsx)

`bin/harness` 가 `tsx` 를 자동 탐색한다:

```
1. $PWD 에서 위로 올라가며 node_modules/.bin/tsx
2. 엔진 자체 node_modules/.bin/tsx
3. npx tsx (자동 다운로드)
```

repo 에 이미 `tsx`(또는 Next/Vite 등 tsx 의존)가 있으면 그걸 쓰고, 없으면 엔진에서 `pnpm i` 한 번 해두거나 npx 에 맡긴다.

```bash
# 엔진 자체에 런타임 설치 (선택)
cd .harness-engine && pnpm install
```

## 편의 래퍼 (선택)

매번 `bash .harness-engine/bin/harness` 치기 번거로우면 repo 에 얇은 래퍼를 둔다:

```bash
# scripts/harness
#!/usr/bin/env bash
exec bash "$(dirname "$0")/../.harness-engine/bin/harness" "$@"
```

```bash
chmod +x scripts/harness
bash scripts/harness audit
```

## 멀티 repo 운영

각 repo 는 **자기 `harness.config.json` + 자기 `.harness/logs/`** 를 갖는다(per-repo 격리, H5). 엔진만 공유한다.

```
~/work/edge/   harness.config.json · .harness/logs/   ┐
~/work/anima/  harness.config.json · .harness/logs/   ┼─▶ 같은 엔진(submodule/symlink)
~/work/foo/    harness.config.json · .harness/logs/   ┘
```

repo 간 공유 파일(예: 공통 규칙 라이브러리)을 동기화하려면 각 repo 의 `sync.script` 에 그 절차를 적고 `harness sync run` 으로 돌린다 — 엔진은 동기화 "방법"을 강제하지 않고 실행만 한다.

## .gitignore

repo 의 `.gitignore` 에 로그 디렉토리를 추가한다:

```
.harness/logs/
.harness/handoff/
```

규칙 파일(`.harness/enforcement.json` 등)과 `harness.config.json` 은 **커밋한다**(팀 공유 SSOT).

## 제거 (uninstall)

하네스가 repo 에 **주입한 것만** 되돌린다 — 사용자 콘텐츠는 보존.

```bash
bash .harness-engine/bin/harness uninstall --dry-run   # 무엇을 지울지 미리보기
bash .harness-engine/bin/harness uninstall             # 실제 제거
bash .harness-engine/bin/harness uninstall --keep-logs # 로그/handoff 만 남김
```

| 제거 | 보존 (절대 안 건드림) |
|------|----------------------|
| `harness.config.json` · `.harness/`(규칙·prefs·logs·handoff) | `ARCHITECTURE.md` · `CHANGELOG.md` · `CLAUDE.md` |
| `scripts/harness` 래퍼 (시그니처 확인된 것만) | `scripts/scratch/` · 소스 코드 |
| `.git/hooks/pre-commit`·`pre-push` (harness 설치분만) | 사용자 커스텀 git hook |
| `.gitignore` 의 harness 추가 2줄 | |
| `.claude/settings.json` (전부 harness hook 일 때만 삭제, 섞이면 보존+안내) | |

엔진 자체(submodule/vendor 디렉토리)는 건드리지 않는다 — `git submodule deinit` 등으로 별도 제거.

## 점검

```bash
bash .harness-engine/bin/harness            # 도움말
bash .harness-engine/bin/harness audit      # 6축 스코어
bash .harness-engine/bin/harness ci list
bash .harness-engine/bin/harness lint
```
