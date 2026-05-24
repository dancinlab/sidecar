# sidecar-auto-sync

SessionStart 훅 — Claude Code 세션 시작 시마다 `sidecar sync`를 자동 실행해서 마켓플레이스 캐시를 origin/main과 lockstep 유지.

## 왜

수동 `sidecar sync` 없이는 origin/main에 새 PR이 머지돼도 사용자의 로컬 캐시는 그대로. 예전 버전이 살아 있어서 picker · `/reload-plugins` 모두 stale을 봄. 이 훅이 그 갭을 메움.

## 동작

```
CC 세션 시작
    │
    ▼
SessionStart 훅 발화
    │
    ▼
_sidecar_auto_sync.hexa
    │
    ├─ sidecar binary 없음 ? → exit (fresh machine — 실제 precondition)
    └─ sidecar sync 실행 → 성공 시 silent · 실패 시 stderr advisory
```

`sidecar sync` 자체가 PR#9 self-heal 포함이므로 stale 브랜치 / silent-no-op 모두 자동 복구.

## 동작 결과

| 시나리오 | 효과 |
|---|---|
| 새 PR이 머지된 후 CC 재시작 | 자동으로 최신 캐시 적용. `/reload-plugins`만으로 새 surface 보임 |
| origin/main에 변동 없음 | sync 무동작 (10-50ms). 알아채지 못할 수준 |
| 네트워크 끊김 | sync 실패 → stderr 한 줄 advisory · session은 정상 진행 |
| sidecar 미설치 (fresh box) | skip · session 정상 진행 |

## 비용

매 SessionStart 약 1-2초 (git pull + cache copy + json 패치). 1회 만의 짧은 lag.

## 끄는 법

**우회 변수 없음** (@D s11). disable 스위치를 두면 자동으로 켜져 룰을 무력화하므로 의도적으로 안 만듦. 끄려면 `~/.claude/plugins/installed_plugins.json`에서 `sidecar-auto-sync` 항목을 제거 (= plugin uninstall).

## 거버넌스

- @D s1 (concept separation): 1 plugin = 1 hook (SessionStart 하나만)
- @D s3 (portable paths): `$CLAUDE_PLUGIN_ROOT`, `$HOME`, `$PATH` 만 사용
- @D s7 (governance + enforcement together): "stale lock 풀라"는 별도 룰이 아니라 plugin 자체가 실행
- @D s11 (no opt-out): 우회 env var 없음 — precondition(binary 부재)에서만 skip
- 실패 시 fail-loud (stderr) but non-blocking — SessionStart는 무조건 진행
