# quota-autoadd

`SessionStart` 훅 — 새 계정으로 `claude /login` 한 뒤 첫 세션에서, 아직 레지스트리에 없는 활성 계정을 quota 레지스트리에 **자동 등록**한다.

## 동작

```
claude /login (새 이메일)
      │
      ▼
~/.claude.json 활성계정 교체
      │
      ▼
다음 세션 SessionStart
      │
      ▼
_quota.hexa autoadd ─→ 활성 uuid가 레지스트리에 있나?
                        ├ 있음 → 무출력 (no-op)
                        └ 없음 → add (creds 캡처) + 1줄 알림
```

- 멱등 · 항상 `exit 0` (세션 시작을 절대 깨지 않음).
- 새 계정이 등록될 때만 한 줄 출력 · 기존 계정 세션은 완전 무출력.
- add 경로가 OAuth blob을 백업 저장소에 캡처 → 등록 즉시 `/quota switch` 가능.
- quota 바이너리는 `$HOME/.claude/plugins/cache/sidecar/quota/<version>/bin/_quota.hexa`로 해석 (portable).

## 관계

| 플러그인 | 역할 |
|---|---|
| `quota` (skill) | 수동 `/quota add` · status · switch · 레지스트리 SSOT |
| `quota-autoadd` (hook) | 기본 ON 자동 등록 레이어 — 수동 add를 대체하지 않고 보완 |

opt-out 변수 없음 (commons g11).
