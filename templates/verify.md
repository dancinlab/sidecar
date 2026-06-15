# harness verify — tier-rubric claim verification

주장(correctness · purity · grade · identity · 성능·정합성 claim)을 **LLM 자가판정으로
"맞다" 하지 말고**, 아래 6단계 티어 루브릭으로 등급을 매겨 그 배지를 **그대로(verbatim)**
보고한다. 코드/빌드/테스트가 실제로 도는지 검증하는 명령 실행은 `harness ci` 가 담당하고,
그 결과를 ledger 에 박제하려면 `harness verdict record <id> <cmd>` 를 쓴다.

## 티어 루브릭 (badge — verbatim 으로 인용)

| 배지 | 의미 | 근거 기준 |
|---|---|---|
| 🔵 SUPPORTED-FORMAL | 형식적 증명/유도로 뒷받침 | 증명·타입·불변식 등 형식 근거 |
| 🟢 SUPPORTED-NUMERICAL | 수치 실행/측정으로 뒷받침 | 재현 가능한 측정·벤치·테스트 출력 |
| 🟡 SUPPORTED-BY-CITATION | 신뢰 출처 인용으로 뒷받침 | 1차 출처·명세·표준 (모델 기억 아님) |
| 🟠 INSUFFICIENT/DEFERRED | 근거 부족 — 보류 | 더 모아야 등급 가능 |
| 🔴 FALSIFIED | 반증됨 | 대조/재현이 주장을 깸 — **결과로 보고**(은폐 금지) |
| ⚪ SPECULATION-FENCED | 검증 안 된 추측 — 울타리 침 | 정직하게 "미검증"으로 표시 |

## forms

- `harness verify` · `harness verify rubric` — 이 루브릭을 출력(레퍼런스).
- `harness verify fence "<claim>"` — 검증 안 된 주장을 ⚪ SPECULATION-FENCED 로 ledger 에 박제.
- 자연어 주장은 위 6배지 중 하나로 직접 등급 + 한 줄 근거를 붙여 보고.

## 규율 (commons c2·c9)

- **LLM 자가판정 금지** — "내 생각에 맞다"로 🔵/🟢 주지 말 것. 형식근거(🔵)·실행출력(🟢)·인용(🟡)이
  없으면 🟠 또는 ⚪.
- **배지 자동 승격 금지** — ⚪→🟡→🟢→🔵 로 근거 없이 올리지 말 것.
- **claim 마다 (claim / proof / severity)** 3종을 명시 (honesty-triad).
- 🔴 FALSIFIED · 🟠 INSUFFICIENT 도 **유효한 결과** — skip·은폐 금지.
- 형식·수치로 확인할 수 있는 주장은 `harness ci`(명령 실행) + `harness verdict record`(박제)로
  실제 증거를 남긴 뒤 🟢/🔵 를 부여.
