# throttle-guard

여러 세션/와이드 fan-out이 **동시에** API를 두드려 터지는 **일시적 서버 throttle**("Server is temporarily limiting requests · not your usage limit · Rate limited")을, **세션 간 공유 쿨다운**으로 조율하는 `PostToolUse(Task|Agent)` advisory 훅.

## limit-guard와의 분담

| 신호 | 담당 | 처리 |
|---|---|---|
| 5h/7d **usage/session 한도** | [`limit-guard`](../limit-guard) | checkpoint-commit + `RESUME.md` |
| 일시적 **server throttle** (동시성 폭주) | **throttle-guard** | 공유 쿨다운 마커 + jitter 백오프 + WIDTH 축소 |

두 신호를 구분해 **이중발화 안 함**(usage/session 문구가 있으면 throttle-guard는 skip).

## 동작

서브에이전트 결과에 `temporarily limiting`(또는 `rate limited` ∧ ¬usage/session)이 보이면:

1. **공유 쿨다운 마커** `~/.sidecar/throttle.json` 작성/연장 — 지수 백오프(15·30·60·120·240·300s, cap). 120s 창 안의 연속 발화는 같은 storm으로 escalate. 모든 세션/라운드가 **하나의 백오프 창**을 읽어 thundering-herd 재발사 차단.
2. non-blocking `additionalContext` 주입 — ① **jitter** 백오프(lockstep 재시도 금지) ② fan-out **WIDTH ≤1**(직렬화) ③ 재개는 re-read(완료분 재실행 금지).

쓰로틀을 **존중**하는 동시성 제어(우회 아님 — in-flight 부하가 줄면 저절로 풀림).

## 구현

hexa-lang `bin/_throttle_guard.hexa` (`hexa run`). 마커 = `{until, hits, last, cooldown}` epoch. opt-out 없음.
