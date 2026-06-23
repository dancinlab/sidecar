# 설치 / 통합

> 📍 SSOT: 설계 [ARCHITECTURE.json](../ARCHITECTURE.json) · 이력 [CHANGELOG.md](../CHANGELOG.md). 본 문서는 보조 설치 가이드.

## 공용(전역) 설치 — `sidecar install`

머신 전역에 사이드카를 깔아 **어느 repo 에서든** `sidecar` 명령을 쓰고, 모든 Claude Code 세션에 가드/주입 훅을 배선한다 (per-repo 스캐폴드인 `init` 과 별개 — 이쪽은 머신 1벌 공용 세팅).

```bash
# 사이드카가 아직 없을 때 (curl 부트스트랩)
curl -fsSL https://raw.githubusercontent.com/dancinlab/sidecar/main/scripts/install.sh | bash

# 이미 사이드카가 깔려 있으면 동일 동작
sidecar install
```

| 단계 | 한 일 | 기본 경로 |
|------|-------|-----------|
| clone | `dancinlab/sidecar` 클론(있으면 ff 갱신) | `~/.sidecar/cli` (`--dir`/`SIDECAR_DIR`) |
| link | `sidecar` 실행 래퍼 작성 (심볼릭 아님 — 런처 dir 오인 방지) | `~/.local/bin/sidecar` (`--bin`/`SIDECAR_BIN`) |
| hooks | `sidecar install-hooks --global` (모든 세션 가드/주입) | `~/.claude/settings.json` |

- 멱등 — 재실행하면 클론을 최신으로 fast-forward + 래퍼/훅 재확인.
- 플래그: `--no-hooks`(클론·래퍼만) · `--ref=<branch|tag>`(기본 main) · `--dir=`/`--bin=` · `--dry-run`.
- `~/.local/bin` 이 PATH 에 없으면 안내 줄을 출력한다 (`export PATH="$HOME/.local/bin:$PATH"`).
- 갱신: `sidecar self-update` (또는 `sidecar install` 재실행). SSOT 부트스트랩: [`scripts/install.sh`](../scripts/install.sh) — `sidecar install` 이 이를 위임 실행.

## 배치 옵션 (per-repo — 엔진 벤더링)

사이드카 엔진은 repo 안 어디에 두든 동작한다(`lib/paths.ts` 가 repo 루트를 상향 탐색). 세 가지 권장 배치:

### A. git submodule (권장 — 버전 고정 + 업데이트 추적)

```bash
cd your-repo
git submodule add https://github.com/dancinlab/sidecar .harness-engine
git commit -m "chore: add sidecar engine"
# 업데이트: cd .harness-engine && git pull && cd .. && git add .harness-engine
```

### B. vendor (복사 — 오프라인/단순)

```bash
cd your-repo
git clone --depth 1 https://github.com/dancinlab/sidecar .harness-engine
rm -rf .harness-engine/.git
```

### C. 중앙 1벌 + 심볼릭링크 (멀티 repo, 로컬)

```bash
git clone https://github.com/dancinlab/sidecar ~/tools/sidecar
ln -s ~/tools/sidecar your-repo/.harness-engine
```

## 런타임 (tsx)

`bin/sidecar` 가 `tsx` 를 자동 탐색한다:

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

매번 `bash .harness-engine/bin/sidecar` 치기 번거로우면 repo 에 얇은 래퍼를 둔다:

```bash
# scripts/sidecar
#!/usr/bin/env bash
exec bash "$(dirname "$0")/../.harness-engine/bin/sidecar" "$@"
```

```bash
chmod +x scripts/sidecar
bash scripts/sidecar audit
```

## 멀티 repo 운영

각 repo 는 **자기 `harness.config.json` + 자기 `.harness/logs/`** 를 갖는다(per-repo 격리, H5). 엔진만 공유한다.

```
~/work/edge/   harness.config.json · .harness/logs/   ┐
~/work/anima/  harness.config.json · .harness/logs/   ┼─▶ 같은 엔진(submodule/symlink)
~/work/foo/    harness.config.json · .harness/logs/   ┘
```

repo 간 공유 파일(예: 공통 규칙 라이브러리)을 동기화하려면 각 repo 의 `sync.script` 에 그 절차를 적고 `sidecar sync run` 으로 돌린다 — 엔진은 동기화 "방법"을 강제하지 않고 실행만 한다.

## .gitignore

repo 의 `.gitignore` 에 로그 디렉토리를 추가한다:

```
.harness/logs/
```

규칙 파일(`.harness/enforcement.json` 등)과 `harness.config.json` 은 **커밋한다**(팀 공유 SSOT).

## 제거 (uninstall)

사이드카가 repo 에 **주입한 것만** 되돌린다 — 사용자 콘텐츠는 보존.

```bash
bash .harness-engine/bin/sidecar uninstall --dry-run   # 무엇을 지울지 미리보기
bash .harness-engine/bin/sidecar uninstall             # 실제 제거
bash .harness-engine/bin/sidecar uninstall --keep-logs # 로그만 남김
```

| 제거 | 보존 (절대 안 건드림) |
|------|----------------------|
| `harness.config.json` · `.harness/`(규칙·prefs·logs) | `ARCHITECTURE.md` · `CHANGELOG.md` · `CLAUDE.md` |
| `scripts/sidecar` 래퍼 (시그니처 확인된 것만) | `scripts/scratch/` · 소스 코드 |
| `.git/hooks/pre-commit`·`pre-push` (sidecar 설치분만) | 사용자 커스텀 git hook |
| `.gitignore` 의 sidecar 추가 2줄 | |
| `.claude/settings.json` (전부 sidecar hook 일 때만 삭제, 섞이면 보존+안내) | |

엔진 자체(submodule/vendor 디렉토리)는 건드리지 않는다 — `git submodule deinit` 등으로 별도 제거.

## 점검

```bash
bash .harness-engine/bin/sidecar            # 도움말
bash .harness-engine/bin/sidecar audit      # 6축 스코어
bash .harness-engine/bin/sidecar ci list
bash .harness-engine/bin/sidecar lint
```
