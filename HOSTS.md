# HOSTS — 3-tier 호스트 분리 아키텍처 (타세션 참고용 SSOT)

> 작업을 **어느 호스트에서** 돌릴지의 단일 기준. 2026-05-30 확정. mac 워크스테이션 부하를 0에 수렴시키기 위한 역할 분리.

## 🏛 3-tier

| tier | 호스트 | 맡는 작업 |
|---|---|---|
| **제어** | 현 mac (워크스테이션) | claude agent 추론·오케스트레이션·`Edit`/`Read`/`Write` (CPU 거의 0) |
| **코드** | `mini` (arm64 macOS) | codegen(`hexa cc --regen`)·worktree·hexa build·**arm64-native 측정** |
| **자원** | `ubu` pool (linux x86) | heavy build·full-suite·`hexa drill`·**x86 측정**·QE 학습 |

```
mac[claude] ──편집──▶ 코드 ──빌드/측정──▶ 자원
            제어        mini(arm64)        ubu(x86 linux)
   CPU≈0    ssh/마운트   cc·worktree       full-suite·drill·QE
```

## 핵심 사실 (Stage 0 실측, 2026-05-30)

- **workdir-sync 는 존재하지 않는다.** pool-route 의 `(workdir is user-synced)` 는 명명 규약일 뿐 — sidecar 는 아무것도 자동 sync 하지 않음(`_pool_route.hexa` L11 "does NOT sync it"). 각 호스트는 **독립 git clone** (mac·mini·ubu 가 서로 다른 커밋 = 결정적 반증). 호스트 간 코드 전달 = `git push/pull` 또는 `scp` **명시 운반**.
- **mac 부하 root-cause**: `/tmp`·`/private/tmp` ∈ `~/.sidecar/local-paths` 화이트리스트 → pool-route 0.10.0 이 argv 에 그 prefix 토큰 있으면 **LOCAL 강제**. 측정 agent 가 `/tmp/bench` 직접 실행 → 라우팅 도달 전 LOCAL 고정 → mac CPU 소비. (라우팅 로직 자체는 건전; 화이트리스트 short-circuit 이 측정 offload 와 충돌.)

## 타세션 가이드 (지킬 것)

- **측정/빌드는 `ssh mini`(arm64) 또는 ubu(x86) 로** — mini/ubu **로컬 경로**(`~/core/hexa-lang`)에서 실행. `/tmp/bench` 직접 실행 금지(화이트리스트 LOCAL 함정).
- arm64-native 측정(aprime_cc→arm64 asm) = **mini 만** (ubu 는 x86 이라 arm64 emit 실행 불가).
- 격리 worktree 도 `/tmp` 대신 mini/ubu 로컬에 두면 빌드가 거기서 돎.
- **mini 는 sudo 권한 있음** — 설치/마운트 셋업 자유(macFUSE 등). ubu 도 동일.
- **vast RTSC 학습 pod(@demiurge) 절대 미접촉** — `down`/`destroy`/`rm`/`stop` 금지. adopt/list 만.

## 진행 중 (2026-05-30)

- **2번 경로 셋업 중**: claude=현 mac 유지 · 코드 파일=mini 에만 · mini `~/core/hexa-lang` 를 mac 에 **sshfs 마운트**(별도 경로 `~/mnt/mini-hexa`) → claude 편집은 마운트, 빌드/측정은 `ssh mini` 로 mini 로컬. plan = `hexa-lang/drafts/mini-sshfs-code-tier-plan.md`.
- **macFUSE = mac 커널확장** → 설치 시 `시스템 설정 > 개인정보·보안` **사용자 수동 승인 + 재부팅 가능**. 막히면 mutagen/syncthing(커널확장 불필요) 대안.
- 기존 mac `~/core/hexa-lang` clone 은 점진 전환(즉시 삭제 금지 · 미커밋 작업 보존).
