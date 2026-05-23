# hexa-shim-regen-after-rebuild

**Source**: sidecar
**Target**: hexa-lang
**Kind**: patches
**Status**: closed (already-fixed-upstream · 2026-05-23)

## 결론

본 인박스 항목은 **upstream에 이미 해결되어 있음** — 새 PR 불필요.
sidecar 쪽 cwd가 origin/main 뒤처진 브랜치였을 때 재현됐을 뿐.

| 단계 | PR | 내용 |
|---|---|---|
| 1 | hexa-lang #421 (042c32c2) | `hexa` 래퍼 도입 — `exec -a hexa hxv2` (AMFI SIGKILL 회피, argv[0] 보존, 래퍼 위치 상대경로 resolve) |
| 2 | hexa-lang #446 (5ae9527e) | `.gitignore`에 `!hexa` 예외 추가 (cycle-8 finding — recurrence guard) |
| 3 | hexa-lang #466 (5c5c5286) | `.gitignore`에서 broad `hexa` 줄 자체 제거 (consistently tracked) |

즉 `/Users/<u>/core/hexa-lang/hexa` 는 git에 commit된 source artifact다.
삭제되더라도 `git checkout hexa` 한 줄로 즉시 복원, `git status`에 deleted로 노출.
`build_dispatch.hexa`는 별도로 매 빌드 끝에 멱등 재생성 — 다중 방어선.

## 본 세션에서의 재현 원인

| 단계 | 상태 |
|---|---|
| user 로컬 cwd: `inbox/websocat-tool-discovery-2026-05-23` 브랜치 | origin/main보다 29 commit ahead, fork 시점이 #421 도입 이전 |
| 그 브랜치의 `.gitignore` | `hexa` 라인 있음 (= 옛날 상태 보존), `!hexa` 없음 |
| 그 브랜치의 `hexa` 파일 | 추적 안 됨 (옛 상태) |
| 무엇이 삭제했나 | 브랜치 전환 시 git이 working tree에서 untracked가 된 shim을 제거(혹은 다른 도구가 정리)했을 가능성. 결과적으로 broken symlink → cascade |

## 회복

```
cd ~/core/hexa-lang
# either:
git rebase origin/main          # 29 commits 위에 main 흡수 — 권장 (다른 fix들도 같이 들어옴)
# or 최소한:
git checkout origin/main -- hexa .gitignore   # 두 파일만 가져오기 (WIP는 그대로)
```

## sidecar 측 후속

새 sidecar PR #85 (commit 833884e) 가 별개로 hooks layer에 portable hexa resolver 도입:
```
$HEXA env → $HOME/.hx/bin/hexa → command -v hexa → silent exit 0
```
hexa shim이 깨져도 cascade 대신 silent skip — defense-in-depth.
hexa 미설치 사용자(다른 marketplace 사용자) 도 cascade 안 봄.
