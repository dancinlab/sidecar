# /pod — GPU 클라우드 pod 디스패치 (runbook)

> runpod/vast.ai 등 GPU pod 표면. 구조화된 흐름으로만 다루고 raw runpodctl/vastai/ssh/scp/curl 직접 호출은 지양(가드 대상). 비용 발생 = 명시 `go` 필요.

## 서브흐름
- **preflight** — closed-form GPU mem 예산 체크(파라미터·배치·옵티마이저 상태 → VRAM 추정). pod spinup 없이 OOM 사전 판정.
- **rent** — pod 임대(provider·GPU·디스크 명시). **비용 발생 → 4축 박스로 surface 후 명시 `go` 대기**(자동 rent 금지).
- **run / nohup / fire** — 잡 실행. fire/nohup = 백그라운드 fire + 모니터 핸들 emit. CPU-local 폴링 가능(detached nohup → /tmp log).
- **fire-shards** — 잡 리스트를 N샤드로 line-split(원격 `split -n l/N`) 후 각 샤드를 stagger 로 detached 발사 = `hexa cloud fire-shards <host> --jobs <file> --shards <N> --cmd '<tmpl>' [--stagger S] [--register] [--dry-run]`. placeholder `{shard}`(필수)·`{i}`·`{out}`·`{log}`. **❌ 손수 `/tmp/<x>_launch.sh` 런처 루프 금지** — copy-to 는 통과돼도 그 안의 fanout 은 구조화 dispatch·`pods.json` 등록·비용계상을 통째로 우회한다(cloud-guard `CLOUD-HANDROLLED-FANOUT` warn). 다샤드 디코드/배치는 반드시 이 verb 로.
- **poll / tail** — 결과 폴링 / 원격 로그 라이브 스트림.
- **copy-to / copy-from** — 입력 업로드 / 산출물(ckpt·로그·결과) 회수.
- **down** — 산출물 **전부 회수 + (해당 시) HF 업로드 후** teardown. (회수 전 teardown 금지)
- **monitor** — repo 별 작업 매니페스트(`pods.json`) 렌더.

## 원칙
- **회수 우선** — pod teardown 전 ckpt+result+log+anchor pull + verify. PULL_FAILED ≠ pod dead.
- **wall-time first** — 병렬이 빠르면 비용 더 들어도 병렬 채택(의미없는 cost-min 지양). 단 rent 자체는 명시 go.
- **벽/실패 정직** — OOM·실패는 closed-negative 로 기록, 필러 재시도 금지.
- 트러블 발견 → 인프라 repo inbox 에 패치 기록(해당 repo 에만 가두지 말 것).

## Halts
- rent/임의 spend → 4축 박스 + 명시 `go`.
- 파괴적/되돌릴수없는 → 확인 후 재개.
