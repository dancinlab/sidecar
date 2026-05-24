# quota

Claude 계정 5시간 / 7일 사용 한도 조회 — read-only.

## 무엇

`/quota` 슬래시 명령. 현재 활성 계정(`~/.claude.json`)의 라이브 5h/7d util %와 reset 시각을 비공식 OAuth usage endpoint에서 가져와 표시. 등록된 계정이 여러 개면 각 계정의 마지막 캐시된 util도 함께 본다.

## 0.3.0 — view + 레지스트리 + cred-store + switch

| 동사 | 결과 |
|---|---|
| `/quota` | 기본 → status |
| `/quota status` | 활성 계정 + 라이브 5h/7d (45초 캐시) |
| `/quota list` | 등록된 계정 목록 (`*` = 활성, 캐시된 util) |
| `/quota add` | 현재 계정을 레지스트리에 스냅샷 + 자격증명 백업 캡처 |
| `/quota switch <ref>` | 라이브 계정 전환 (검증 + 실패시 rollback) |
| `/quota remove <ref>` | 레지스트리에서 제거 + 백업 cred 삭제 (alias: rm) |
| `/quota refresh [<ref>]` | 사용량 재조회 → 계정별 캐시 갱신 (만료 토큰 자동 갱신) |
| `/quota help` | 도움말 |

`<ref>` = 이메일 또는 `/quota list`의 인덱스.

## 데이터 소스 (dancinlab/wilson `RESEARCH.tape c_endpoints` 12-repo 조사 결과)

| 항목 | 위치 |
|---|---|
| 5h/7d 한도 | `GET https://api.anthropic.com/api/oauth/usage` · `anthropic-beta: oauth-2025-04-20` |
| 토큰 갱신 | `POST https://platform.claude.com/v1/oauth/token` (refresh-token grant) |
| Live access token | `~/.claude/.credentials.json` (Linux) · macOS Keychain svc `"Claude Code-credentials"` (macOS) |
| 계정 ID | `~/.claude.json` → `oauthAccount.{emailAddress,accountUuid,...}` |
| 캐시 | `$HOME/.sidecar/quota/usage_cache_<uuid>.json` (45초 TTL) |
| 레지스트리 | `$HOME/.sidecar/quota/accounts.json` |
| **백업 cred (macOS)** | Keychain svc `"sidecar-quota"`, account = 이메일 |
| **백업 cred (Linux)** | `$HOME/.sidecar/quota/creds/<email>.json` · `chmod 600` |

## 캐시 동작 (45초 TTL)

```
첫 /quota status        →  endpoint 호출  →  캐시 write  →  표시
0~44초 내 재호출         →  캐시 hit (network skip)  →  표시
45초+                  →  endpoint 재호출
endpoint 실패 + 캐시 있음 →  "(stale Xs ago, fetch failed: ...)" 라벨로 캐시 반환
                          (honest — real data, marked stale, never faked)
```

## 한계

- ⚠ Anthropic의 **비공식** OAuth endpoint 두 곳 (`oauth/usage`, `oauth/token`)에 의존. ccmon `usage_api.py`에서 ported. Anthropic이 회전시키면 깨짐.
- `client_id`가 하드코딩(`9d1c250a-...` Claude Code public OAuth client). 동일 위험.
- Agent SDK credit (2026-06-15 이후 도입 가능성)은 데이터 소스 미상 — `not_implemented:agent-sdk-credit` 라벨로 정직하게 표시. 절대 faking 없음.

## Lineage

| 시기 | 위치 | 역할 |
|---|---|---|
| 이전 | dancinlab/wilson `plugins/quota/main.hexa` (917줄) | full multi-account + cred-store + switch |
| 0.1.0 | sidecar `skills/quota/bin/_quota.hexa` | view-only port; wilson harness 결합 제거 |
| 0.2.0 | (동일) | + `/quota add` 레지스트리 쓰기 (metadata-only) |
| **현재 (0.3.0)** | (동일) | + cred-store + `/quota switch` + `remove` + `refresh` (wilson 등가) |

## 거버넌스

- @D s1 (concept separation): 1 plugin = skill + 그 mechanism인 command
- @D s3 (portable paths): `$HOME`, `$CLAUDE_PLUGIN_ROOT`만 사용
- @D g5 (verify via hexa CLI only): 본 플러그인은 관측+계정관리 도구 — g5 verdict 대상 아님
- Wilson의 `never faked` 불변식 유지: 캐시는 stale 라벨, 미상은 stub 라벨, 거짓 숫자 절대 없음
- **ToS red-line**: own-accounts-serial only — 한 사용자의 여러 계정을 직렬로(한 번에 하나) 활성화하는 용도. 멀티-테넌트 라우팅(타인의 트래픽을 내 cred로 흘리기) 금지.

## `quota switch` 안전성 (wilson Phase 3a flow)

```
snapshot OUTGOING (cred backup)
  ↓
write LIVE store (keychain/atomic file)
  ↓
verify (re-read live store · token bytes-equal target?)
  ↓ FAIL → rollback (restore prev_blob)
apply ~/.claude.json identity block
  ↓ FAIL → rollback creds (restore prev_blob)
commit registry active = idx
  ↓
"restart `claude` for new account to take effect"
```

각 실패 시점마다 fail-loud 메시지 + rollback. ROLLBACK ALSO FAILED 시 사용자에게 `claude /login` 안내.
