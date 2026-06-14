# /dojo — 🥋 학습 빵틀 (cloud training-job generator)

> `dojo <slug> [--lang=hexa|py|both]` — cloud 학습 잡 스캐폴드를 찍어낸다. 산출 = `exports/dojo/<slug>/` 에 드라이버 + 트레이너 + 글루 스크립트.

## 산출물 (scaffold)
```
exports/dojo/<slug>/
├─ job.<ext>     — 학습 드라이버(설정·하이퍼파라미터·데이터/모델 경로·체크포인트 정책)
├─ train.<ext>   — 트레이너 본체(루프·옵티마이저·로깅·ckpt save)
└─ run.sh        — 글루(env 셋업 → preflight → fire → poll → harvest → down 순서)
```
`--lang` 으로 드라이버/트레이너 언어 선택(hexa 드라이버 · py 트레이너 · both). llm full · vision/rl/tabular 은 stub.

## 흐름
1. `harness dojo <slug>` → `exports/dojo/<slug>/` 에 3 파일 스캐폴드(이미 있으면 보존, `--force` 만 덮어쓰기).
2. spec(데이터·모델·하이퍼) 채움.
3. `run.sh` 가 `harness pod` 흐름(preflight→fire→poll→harvest→down)을 호출하도록 작성 — 비용 발생은 명시 `go`.
4. 산출 ckpt/로그는 회수 후 레지스트리(예: HF) 등록, teardown 전 pull 완료.

## 원칙
- 임시 스크래치는 `scripts/scratch/`(tmp 휘발 금지).
- 생성물은 단일 디렉토리(`exports/dojo/<slug>/`)에 모음 — 흩뿌리지 말 것.
- GPU 잡은 `harness pod` 의 회수-우선·wall-time-first·비용 go 규칙을 따른다.
