# pods-route

PreToolUse(Bash) 자동-등록 hook. `hexa cloud nohup` 또는 `hexa cloud fire` 가 `--register` 플래그 없이 호출되면 자동으로 `--register` 를 명령에 끼워넣어, 런치된 pod/job 이 cwd `./pods.json` 매니페스트(`/system` control-tower SSOT)에 자동 등록되도록 보장합니다.

## 왜 필요한가

`./pods.json` 은 cwd-local SSOT — `hexa-lang/stdlib/cloud/pods_local.hexa` 가 관리하는 per-project pod/job 매니페스트로, `/system` 의 모든 추적 (watch · harvest · auto-redispatch · pursue) 의 기반입니다. 그런데 매니페스트가 cwd-local 이라 세션마다 별도이고, agent 가 매번 `hexa cloud nohup … --register` 의 `--register` 플래그를 기억해서 붙여줘야 했습니다. 실제로는 자주 잊었고 → pod 이 등록되지 않은 채로 떠 있고 → `/system` 이 추적 못함 → ghost pod (billing 누수) + 결과 회수 불가능.

이 hook 은 그 인지 부담을 시스템 레벨에서 해소합니다. 자동으로 `--register` 가 끼워들어가기 때문에 agent 는 더 이상 그 플래그를 신경 쓸 필요가 없습니다.

## 어떻게 동작

```
입력:  hexa cloud nohup <host> <log> -- <argv...>
       hexa cloud fire  <host>       -- <argv...>

       (env-prefix · wrapper 허용)
       FOO=bar hexa cloud nohup …
       nice -n 10 hexa cloud fire …

분류기: 첫 토큰 = hexa{,.real,c,drv,…} · 두번째 = cloud · 세번째 = nohup|fire
       AND `--` 직전 영역에 --register 부재

rewrite: --register 를 `--` 바로 앞에 삽입 (post-argv 분리자 보존)
       → hexa cloud nohup <host> <log> --register -- <argv...>

방출:  hookSpecificOutput.updatedInput (transparent rewrite)
       + additionalContext (rewrite 이유 한 줄)
```

## 동작 분기표

| 입력 명령 | 동작 |
|---|---|
| `hexa cloud nohup <host> <log> -- <argv>` | ✅ `--register` 자동 삽입 |
| `hexa cloud fire <host> -- <argv>` | ✅ `--register` 자동 삽입 |
| `hexa cloud nohup … --register -- <argv>` | ⏩ no-op (idempotent · 이미 있음) |
| `hexa cloud nohup … --register=myjob -- <argv>` | ⏩ no-op (`=` 형태도 인식) |
| `hexa cloud run <host> -- <argv>` | ⏩ skip (동기 잡 · pod 추적 의미 약함) |
| `hexa cloud rent --gpu A100` | ⏩ skip (글로벌 `~/.hexa-cloud/pods.jsonl` 가 담당) |
| `hexa cloud poll` · `tail` · `down` · 기타 verb | ⏩ skip (이미 등록된 상태 조작) |
| 비-hexa Bash 명령 | ⏩ skip (분류기 통과) |

## 동반 기능

`hooks/commons` 0.12.0 의 `_pods_snapshot()` 이 매 턴 cwd `./pods.json` 의 한 줄 요약을 context 에 주입합니다 (Layer 1 인지). pods-route 는 Layer 2 — agent 가 그래도 잊고 그냥 `nohup`/`fire` 만 입력해도 시스템이 등록을 보장.

| Layer | 이름 | 역할 |
|---|---|---|
| 1 | commons `_pods_snapshot()` | 매 턴 manifest 한 줄 inject — agent 가 SSOT 를 본다 |
| 2 | pods-route `_pods_route.hexa` | 누락 시 명령에 `--register` 자동 삽입 — SSOT 등록 보장 |

## opt-out 없음

`@D s11` 패턴 — env var/config/예외 리스트 없음. 좁은 화이트리스트(`nohup`/`fire` 만 rewrite)가 안전 가드. 다른 모든 cloud verb · 다른 모든 Bash 명령은 통과합니다. 명시적으로 다른 jid 를 쓰고 싶으면 `--register <jid>` 를 직접 붙이면 됩니다 — hook 이 idempotent 하므로 추가 rewrite 안 일어남.
