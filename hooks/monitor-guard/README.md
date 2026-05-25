# monitor-guard

배경/장기 셸 작업이 **rate-limit으로 강제종료**될 때 진행분을 잃지 않도록, 발사 시점에 while-monitor 패턴을 권고하는 `PreToolUse(Bash)` advisory 훅.

## 동작

Bash 명령이 배경 작업을 띄우면(끝에 단일 `&` · `nohup`/`setsid`/`disown` · Bash 툴의 `run_in_background`) 감지한다. **durable 패턴이 빠졌을 때만** non-blocking `additionalContext`로 commons `@D g10`을 상기시킨다. 이미 detach + 로그가 갖춰졌으면 침묵한다.

| 점검 | 빠졌을 때 권고 |
|---|---|
| detach (`nohup`/`setsid`, 또는 `run_in_background`) | 세션 rate-limit 사망 시 작업이 SIGHUP → 분리 필요 |
| progress log (`.log`/`.out`/`tee`/`>>`) | durable 기록 + Monitor 재첨부 지점 없음 |
| Monitor 부착 지점 | 🛰️ Monitor는 live 프로세스가 아니라 **LOG 파일**에 — 토큰 경량·재첨부 가능 |

liveness는 모델 sleep-poll이 아니라 detached OS `while` heartbeat로 확인한다.

## 위치

- pod(`hexa cloud nohup/run`)는 [`pod-monitor`](../pod-monitor) 담당 — `monitor-guard`는 **일반 로컬 배경작업** 담당 (자매 훅).
- 사후 복구(Agent가 limit 신호를 안고 돌아온 뒤 checkpoint-commit + `RESUME.md`)는 [`limit-guard`](../limit-guard) 담당 — `monitor-guard`는 그 **proactive 짝**(죽기 전 durable화).

## 구현

hexa-lang `bin/_monitor_guard.hexa` (`hexa run`으로 실행). opt-out 없음 — env var·config·예외목록 없음.
