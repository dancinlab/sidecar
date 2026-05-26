# LIMIT — Claude rate-limit 우회 경로 카탈로그

Claude(Code) 5h/7d rate-limit 완화 경로를 **정식(저위험)** 과 **비정식(grey·밴리스크)** 으로 분류한 레퍼런스. 운영 how-to가 아니라 **리스크 라벨이 붙은 사실 카탈로그** (sidecar project.tape s14 참조 — 용량 해소는 CLI 경유, Anthropic API 키 제안 금지).

## ⚠ 2026 단속 현황 (모든 판단의 전제)

- 2025 H2: Anthropic 약 **1.45M 계정 차단** · 이의신청 인용률 **3.3%** (52k 중 1.7k).
- **2026-01~**: 구독 자격증명으로 **third-party 하네스 접근 차단** 시작 (OpenCode·Cline 등 타깃). Anthropic 엔지니어 "Claude Code 하네스 스푸핑 안전장치 강화" 확인. 결제 직후 분 단위 밴 사례 다수 (결제가 계정 심층검토 트리거).
- 다계정·병렬세션으로 tier 초과 우회 = **ToS 명시 금지**. 단속은 자동(패턴 플래그) · 오탐 빈번.

## 표 1 — 정식 경로 (저위험·권장)

| 방식 | 작동 | 비용 | ToS/리스크 | 추천도 |
|---|---|---|---|---|
| **공식 API 키** (pay-go) | rate cap 없음(tier RPM/TPM만), `ANTHROPIC_API_KEY` | 토큰당 종량 | ✅ 합법, 밴 없음 | ★★★ (s14는 금지 — 유저 룰) |
| **AWS Bedrock** | 별도 쿼터풀, `CLAUDE_CODE_USE_BEDROCK=1` | 토큰당 종량 | ✅ 공식 백엔드 | ★★★ (쿼터 승인 필요) |
| **GCP Vertex AI** | 별도 쿼터풀, `CLAUDE_CODE_USE_VERTEX=1` | 토큰당 종량 | ✅ 공식 백엔드 | ★★★ |
| **Max / extra-usage** | 상위 플랜·초과 사용분 공식 구매 | 정액+초과금 | ✅ 공식 | ★★ |
| **대체 프로바이더** (z.ai GLM·Moonshot Kimi 등) | Claude Code UI 유지, `ANTHROPIC_BASE_URL`만 교체 | flat 코딩플랜(~$18/월~) | ✅ Anthropic ToS 무관(타사) · 모델은 Claude 아님 | ★★ |
| **공식 무료** (Poe·Brave Leo·DuckDuckGo AI·Cursor/Windsurf 번들·guest pass) | 각 서비스 무료 티어 | 무료 | ✅ 합법 | ★ (한도 작음) |

## 표 2 — 비정식 경로 (grey·밴 리스크 · 비권장)

| 방식 | 작동 | 비용 | ToS/밴 리스크 | 비고 |
|---|---|---|---|---|
| **다계정 구독 라우팅** (ccflare·CLIProxyAPI 등) | 여러 구독 OAuth를 프록시로 묶어 429 자동 failover | 정액(추가 0) | 🔴 **높음** — 2026-01 하네스 스푸핑 차단 직격, tier-초과 다계정=ToS 금지 | 결제 직후 밴 사례. 직전 추천 정정 대상 |
| **브라우저 자동화** (claude.ai 웹 UI 스크립트) | 웹 세션에 rapid-fire 요청 | 정액 | 🔴 **높음** — ToS 명시 위반 | 자동 단속 플래그 |
| **리버스-엔지니어드 엔드포인트** | 비공식 OAuth/내부 API 직접 호출 | — | 🔴 **높음** — 스푸핑 안전장치에 차단·밴 | quota 스킬류 read-only 조회와 구분(쓰기/우회는 위험) |
| **계정 farming / 풀링** | 무료·트라이얼 계정 대량 생성·공유 | 무료/저가 | 🔴 **매우 높음** — 명백 악용, 즉시 밴 | 카탈로그 기재만 (운영법 제외) |

## 결론

- **즉시·안전**: 대체 프로바이더(GLM/Kimi) 또는 Bedrock/Vertex(쿼터 승인 후). 공식 API는 s14로 유저가 금지.
- **밴 리스크 직시**: "8 구독계정 라우터"는 2026-01 단속으로 **고위험**이 됨 — 비용 0이지만 계정 영구정지 가능(이의신청 3.3%). Occam·안전 관점에서 비권장.
- **정식 ↔ 비정식 분기점**: *공식 백엔드/타사*를 쓰면 안전, *구독 자격증명을 비공식 하네스로 우회*하면 밴.

## CLI-only 해결 순위 (s14 · 밴-안전 우선)

| 순위 | 방식 | CLI 설정 | 즉시성 | 비용 | 모델 | 밴 안전? |
|---|---|---|---|---|---|---|
| 🥇 | 대체 프로바이더 (z.ai GLM / Kimi) | `ANTHROPIC_BASE_URL` | ✅ 즉시 | flat ~$18/월 | ❌ Claude 아님 | ✅ 타사 ToS |
| 🥈 | Bedrock | `CLAUDE_CODE_USE_BEDROCK=1` | ⏳ 쿼터 대기 | 종량 | ✅ Claude | ✅ 공식 |
| 🥉 | Vertex | `CLAUDE_CODE_USE_VERTEX=1` | GCP 셋업 | 종량 | ✅ Claude | ✅ 공식 |
| ⚠ 4 | quota switch (수동 계정 교체) | `quota switch <ref>` (공식 `claude`) | ✅ 즉시 | 추가 0 | ✅ Claude | 🟡 다계정 ToS-gray(공식 하네스라 프록시보단 저위험) |
| 🔴 5 | ccflare 자동 다계정 라우터 | 프록시 BASE_URL | ✅ | 추가 0 | ✅ Claude | 🔴 밴 직격 (제외) |

**픽**: 밴 없이 CLI로 가는 길은 🥇 타사(즉시·싸게·모델 타협) 또는 🥈🥉 공식 백엔드(Claude 유지·종량) 둘. 계정 묶기는 공짜지만 ToS-gray~밴.

## Sources

- [Anthropic — Claude Code on Bedrock](https://code.claude.com/docs/en/amazon-bedrock) · [on Vertex](https://code.claude.com/docs/en/google-vertex-ai)
- [TokenMix — Bypass Claude 5h limit, 5 legal options 2026](https://tokenmix.ai/blog/bypass-claude-5-hour-limit-legal-methods-2026)
- [HN — Anthropic blocks third-party use of Claude Code subscriptions](https://news.ycombinator.com/item?id=46549823)
- [TrueFoundry — Claude Code rate limits & quotas 2026](https://www.truefoundry.com/blog/claude-code-limits-explained)
- [Apiyi — Claude account ban prevention 2026](https://help.apiyi.com/en/claude-account-ban-prevention-china-2026-guide-en.html)
- [ccflare](https://ccflare.com/) · [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) (다계정 — 밴리스크 라벨)
- [Verdent — Claude free options 2026](https://www.verdent.ai/guides/how-to-use-claude-ai-for-free-2026) · [Alorse/cc-compatible-models](https://github.com/Alorse/cc-compatible-models)
