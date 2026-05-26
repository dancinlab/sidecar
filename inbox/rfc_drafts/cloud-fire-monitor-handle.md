# RFC — hexa cloud `fire` verb + `__MONITOR_HANDLE__=` JSON contract

> **대상 repo**: hexa-lang (`stdlib/cloud/`). 본 RFC는 sidecar 감사에서 발견된 Monitor↔hexa cloud 계약 약점을 닫기 위한 hexa-lang 측 작업 명세. 별도 hexa-lang 세션의 에이전트가 픽업해 main 깨끗한 base에서 구현·PR.
> **출처**: 2026-05-26 sidecar 세션의 코드 감사 — sign-local single-gate 작업 직후, 사용자 보고 "monitor, hexa cloud 연결이 코드수준으로 명확하지 않는듯".

## 문제

`hexa cloud tail`은 기술적으로 Monitor-attachable stdout stream(`exec_replace` 로 ssh-tail 프로세스 교체)이지만, `nohup → tail → Monitor` 사이의 **계약(contract)** 이 코드 수준에서 약함. caller(에이전트·유저)가 매번 logfile path를 기억해 3개 명령을 손으로 묶어야 함.

### sidecar 감사가 짚은 갭

| # | 갭 | 위치 |
|---|---|---|
| A | `cloud_nohup` 이 logfile 경로를 머신-파스 가능 형식으로 stdout echo 안 함 | `stdlib/cloud/cloud.hexa:398` (message 문자열 안에 섞임) |
| B | `CloudResult` 구조체에 `.logfile` 필드 부재 | `stdlib/cloud/cloud.hexa:19-25` |
| C | `nohup → tail → Monitor` 자동 wiring 없음 (atomic verb 부재) | (없음) |
| G | `tail` exit code 의미 미문서 (`--until` 매치 vs ssh 끊김 vs sed 실패) | `cloud_cli.hexa:789-820` |
| H | 원격 pod용 canonical log path 컨벤션 부재 | (없음 — 매 caller가 임의 경로) |
| I | atomic "fire & monitor" 편의 verb 부재 | (없음) |
| J | `--early-life-check` exit 3 미문서 | `cloud_cli.hexa:585-597` |

## 제안 변경 (hexa-lang `stdlib/cloud/`)

### 1. `CloudResult.logfile` 필드 추가 (갭 B)

```hexa
struct CloudResult {
    ok:        int,
    exit_code: int,
    pid:       int,
    stdout_:   str,
    message:   str,
    logfile:   str   // NEW: cloud_nohup/cloud_fire 후 채워짐, 그 외엔 ""
}
```

- 기존 인-프로세스 caller에는 `""` 기본값 → 비-파괴적.
- `cloud_nohup_opts` 가 반환 시 `logfile: logfile` 채움.

### 2. `__MONITOR_HANDLE__=` JSON 라인 (갭 A)

`cloud_nohup_opts` 의 성공 경로에 `_emit_message` 후 stdout에 한 줄 추가:

```
__MONITOR_HANDLE__={"host":"<h>","pid":N,"log":"<path>","tail_cmd":"hexa cloud tail <h> <path>","started_at":"<iso>"}
```

- 기존 `__CLOUD_PID__=$!` 마커와 같은 grep-able 패턴.
- 한 줄 JSON (`route-log.jsonl` 스타일과 동일 규칙).
- caller는 `grep '^__MONITOR_HANDLE__='` 로 추출.
- `cloud_fire` 도 동일 라인 emit.

### 3. `hexa cloud fire` atomic verb (갭 C·H·I)

```
hexa cloud fire <host> [--log <path>] [--early-life-check <sec>] [--env K=V]... -- <argv>
```

- `--log` 생략 시 canonical 자동: `/tmp/cloud-<host>-<unix_ts>.log` (원격 경로).
- 내부적으로 `cloud_nohup_opts` 호출 + `--early-life-check` 옵션 그대로 전달.
- stdout 출력: 기존 `[cloud] started; remote pid N · log <path>` + `__MONITOR_HANDLE__={...}` 한 줄.
- exit 0 = dispatch 성공, 그 외 = `cloud_nohup` 실패 코드 보존.

### 4. `tail` exit code 의미 문서화 (갭 G · 문서만)

`cloud_cli.hexa` `tail` 분기 + `cloud_tail_cmd_opts` 주석에 명시:

| exit | 의미 |
|---|---|
| 0 | `--until` 패턴 매치 (정상 종료 — `JOB DONE`/`OOMKilled`/… 표지로 stream 닫힘) |
| 255 | ssh transport 실패 (호스트 unreachable / 연결 끊김) |
| 그 외 non-zero | sed/tail pipeline 비정상 종료 (logfile 사라짐 등) |

- caller 권장: exit 0 받았으면 captured stdout 에서 `JOB DONE` 라인 존재 확인 → 정상/실패 구분.

### 5. `--early-life-check` exit 3 문서화 (갭 J · 문서만)

`cloud_cli.hexa:585-597` (`run_early_life_check`) `--help` 텍스트에 명시:

| exit | 의미 |
|---|---|
| 3 | early-life-check 실패 — 프로세스가 `<sec>` 내에 죽음 (silent class-1 launch failure) |

## g4 — 분할 (각 PR <200 lines)

- **PR1**: 갭 A + B + G + J — `CloudResult.logfile` 필드 + `__MONITOR_HANDLE__=` echo + exit-code docs (~80 lines, 작은 코어). 기존 cloud_nohup 사용자 그대로 작동.
- **PR2**: 갭 C + H + I — `cloud_fire` verb + canonical log path. PR1 base.

PR1 만으로도 caller는 `hexa cloud nohup ... | grep __MONITOR_HANDLE__ | ...` 로 Monitor handle 추출 가능 → 즉시 가치. PR2 는 편의.

## 검증 계획

- `cloud_e2e_smoke.hexa` 에 fire 테스트 (mock host).
- `cloud_tail_test.hexa` 에 exit code assertion (mock log file로 `--until` 매치 검증).
- `__MONITOR_HANDLE__=` 라인은 `json_parse(line.substring(len("__MONITOR_HANDLE__=")))` 로 valid JSON 확인.

## sidecar 측 동반 변경 (이 RFC 와 함께 ship된 sidecar PR)

- `hooks/monitor-guard/_monitor_guard.hexa` — cmd 가 `hexa cloud nohup`/`hexa cloud fire` 면 advisory에 "`__MONITOR_HANDLE__=` 라인 grep 후 `tail_cmd` 로 Monitor attach" 한 줄 추가.
- `skills/cloud/SKILL.md` — 현재 manual 3-step 워크플로우 + fire verb 도입 후 atomic 워크플로우 둘 다 명시.

## 비-목표

- `eval 'hexa cloud …'` quoted-string 처리 (별도 작업, 실제 shell parser 필요).
- commons.tape `@D g57` amend (sign-gated — 사용자 `! sidecar sign commons` 후 별도 follow-up).
- `cloud run` 동기 verb 변경 (사용 패턴이 다름, 별도 검토).

## 참조

- sidecar 감사 보고 (2026-05-26 세션 transcript)
- commons.tape `@D g57` (Monitor bridge 룰)
- `stdlib/cloud/cloud.hexa:377-399` (`cloud_nohup_opts` 현 구현)
- `stdlib/cloud/cloud.hexa:449-469` (`cloud_tail_cmd_opts` 현 구현)
- `stdlib/cloud/cloud_cli.hexa:744-820` (CLI dispatcher)
- recent cloud PRs: #1120 (early-life-check) · #1164 (creds resolver) · #1165 (tail verb)
