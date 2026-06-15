# /upstream — 업스트림(의존성) 개선·수정 (해당 세션에서 바로)

> 다운스트림 작업 중 업스트림(hexa-lang 등)의 버그/개선이 필요하면 **inbox 메모로 미루지 말고 이 세션에서** root-cause 수정 → verify → PR(+merge) 까지 진행한다.

## 원칙
- 결함 출처가 업스트림이면 **그 repo 에서** 고친다 — 다운스트림에 우회/shadow 가드 금지 (g11 no gap workarounds).
- inbox/patches 메모만 남기고 끝내지 말 것. 메모는 보조, **실수정이 본체**.
- 소유 repo(dancinlab/*) = PR+merge --admin 까지. 서드파티 = PR 만 + 다운스트림 임시 회피는 `@root-cause-ok` 마커 + 추적.

## 흐름 (in-session)
1. **재현** — 다운스트림에서 실패를 최소 재현 케이스로 좁힘.
2. **업스트림 체크아웃** — 사이블링/서브모듈 있으면 그걸로, 없으면:
   `gh repo clone <upstream-repo> /tmp/<name> && cd /tmp/<name> && git checkout -B fix/<slug> origin/main`
3. **root-cause 수정** — 증상 아닌 원인. 업스트림 컨벤션 따름.
4. **verify** — 업스트림 검증(`harness ci` / `hexa verify` / build/test) + 회귀 없음. 가능하면 `harness verdict record` 로 기록.
5. **PR + merge** — `harness pr-cycle` 또는 `gh pr create --fill` → `gh pr merge --squash --admin --delete-branch` (소유 repo). 서드파티면 PR 만.
6. **다운스트림 반영** — 업스트림을 submodule 로 핀하면 `harness update`(submodule bump) + 재검증. inbox 메모 있으면 `fixed upstream #PR` 로 마감.

## hexa-lang
hexa-lang = 컴파일러/언어/`hx`. 컴파일러 버그·stdlib 누락·lint 오탐 등은 **dancinlab/hexa-lang 에서 직접** 고친다(소유 repo → PR+merge --admin). 다운스트림(.hexa 사용 repo)에 컴파일러 우회 코드 넣지 말 것.

## Halts
- 외부노출/파괴적/되돌릴수없는 단계 → 확인 후 진행. 서드파티 머지 권한 없음 → PR 까지만.
