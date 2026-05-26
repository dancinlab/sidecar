# POOL-OFFLOAD — current state

@goal: pool-route 분류기 확장 — Mac 워크스테이션 부하의 원천을 더 많이 Linux pool로 위임. false-positive(local-bound 오라우팅) 0건 유지 + 라우팅율 측정 가능
@title: 🚚 POOL-OFFLOAD — Mac 짐 덜기 (Linux pool 위임 확장)

(edit me — describe current state in completed-form; no history, no changelog inside this file)
- [ ] 베이스라인 측정 도구 — 최근 N개 Bash 중 routed/local-bound/heavy-but-failed 비율 집계 (route-log.jsonl 확장 + /check 노출)
- [ ] Node 생태계 런타임 분류 추가 — node/tsx/ts-node/deno/bun script 실행을 heavy로 인식 (npm/pnpm/yarn 은 0.7.4 처럼 local-bound 유지)
- [ ] JVM 계열 컴파일/실행 분류 추가 — java/javac/kotlinc/scalac/sbt heavy 인식 (gradle/mvn 은 이미 있음)
- [ ] 미디어 도구 분류 추가 — ffmpeg/magick/convert/sox/imagemagick heavy 인식 (Mac 인코딩 부하 큰 작업)
- [ ] big-tree find 일반화 — 현재 ~/core/anima 단일 substring → ~/core/* 전체 + rg/fd 큰 트리 스캔까지 확장 (preflight test -d 로 비-mirrored 호스트 자동 스킵 유지)
- [ ] 추가 hexa 무거운 verb 분류 — hexa cycle / hexa atlas register --from-drill / hexa-fast 등 fork-storm 잠재 verb 식별 후 heavy_pairs 합류
- [ ] false-positive 회귀 검증 — 각 분류기 확장 PR 머지 후 24시간 route-log.jsonl 모니터링, local-bound 오라우팅 0건 확인 + 회귀 시 즉시 word/pair 후퇴
