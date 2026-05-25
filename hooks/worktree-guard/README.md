# worktree-guard

`git worktree add` 시 한 번 뜨는 비차단 advisory. 격리 워크트리에서 작업하다 디렉터리가 사라져 **미커밋 편집을 잃는** 사고를 막는 수칙을 주입한다.

## 왜

격리 워크트리는 편하지만, 동시 에이전트가 많은 repo나 동기화되는 워크스페이스에서는 디렉터리가 통째로 증발할 수 있다:

- 다른 에이전트의 `git worktree prune`
- 워크스페이스 sync 가 한쪽에만 있는 디렉터리를 정리
- macOS `/tmp` reaper

이때 **origin 에 push 되지 않은 커밋·미커밋 편집은 함께 사라진다.**

## 수칙 (주입 내용)

```
편집 → stage → commit → push → PR → git worktree remove
                         └── 여기까지 와야 origin 에 안전
검증 빌드/테스트는 commit 뒤에 (빌드 실패해도 작업은 보존)
```

- 편집 직후 commit+push — 미커밋분을 턴에 걸쳐 들고 있지 않기
- 경로가 `/tmp`·`/private/tmp`·`/var/folders` 면 더 휘발적 → repo 형제 경로(`<repo>-<slug>`) 권장

## 범위

`git worktree add` 만 트리거. advisory-only(deny 아님). opt-out 없음. workdir-guard(공유 트리)·worktree-gc(merged prune)의 자매.
