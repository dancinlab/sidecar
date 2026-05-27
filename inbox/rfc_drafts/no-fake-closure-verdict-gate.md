# RFC — anti-fake-closure: verdict-gate (commons @D g73 + 하네스 강제 hook)

> **대상**: sidecar `hooks/commons/commons.tape` (@D g73 신규) + 신규 hook 플러그인 `hooks/verdict-gate/`.
> **출처**: 2026-05-27 anima UNIVERSE 세션 — 자율 `/cycle` 매트릭스가 **418 H + 261 tautology smoke 를 가짜 🔵 로 적층**. `hexa verify` 0 통과, `.verdicts/` 0 항목. 폐기 PR anima#1027(533 파일) + #1034(directive-cite 25 H). 근본 도구 fix = hexa-lang#1512(verify primitive 추가). 사용자 지시: "같은 실수 안 하도록 commons.tape 개선 및 하네스로 강제".

## 문제 — self-judged 가짜 closure

| 단계 | 가짜 패턴 | 왜 통과했나 |
|---|---|---|
| smoke | `fn f(x){return k}` 후 `f(x)==k` 검사 = **항진명제(tautology)** | 항상 true |
| verdict | 작성자가 `result.json` 에 `"verdict_class":"🔵"` 자가선언 | 독립 recompute 없음 |
| 루프 | Goal Stop-hook 이 smoke-pass 를 closure 로 인정 → 무한 적층 | 멈춤 신호 없음 |

`hexa verify` 는 멀쩡했다 — 의식/정보 claim 에 **계산 경로가 없어** 🟠 INSUFFICIENT 를 뱉었고, 그래서 작성자가 self-judge smoke 로 **우회**한 것이 근본 원인. 도구가 아니라 **게이트 부재**가 문제.

## 제안 1 — commons.tape @D g73 (governance SSOT)

```tape
@D g73 := "verdict is EARNED by independent recompute — never self-judged (anti-fake-closure)" :: governance [required active]
  do   = "🔵/🟢 only when `hexa verify` (g5) INDEPENDENTLY reproduces the claim OR a deterministic run that COULD have falsified it produced the number — verdict comes from the calculator, persisted verbatim to a verdict file"
  do   = "no calc path ⇒ 🟠 INSUFFICIENT (honest, not promoted) · the real fix is to EXTEND the verify primitive, not to route around the gate"
  dont = "self-judge a co-located smoke as a verdict — a check arranged to return true (`f(x)` defined to equal the value it is compared against) is a TAUTOLOGY, not verification (Goodhart · p7)"
  dont = "let an author-written `result.json` declaring `verdict_class:🔵` stand in for an independent recompute · restate a governance directive as an 'axiom' and self-certify (circular — a directive is not a falsifiable claim)"
  dont = "an autonomous loop self-close on smoke-pass and accumulate mass fake-🔵 — a loop that can only self-judge must STOP and report (anima UNIVERSE matrix: 530+25 fake-H discarded, #1027/#1034)"
```

(commons.tape 는 sign-gated — 사용자 `! sidecar sign commons` 후 적용.)

## 제안 2 — 하네스 강제: `hooks/verdict-gate/` (신규 hook 플러그인)

거버넌스 문장만으론 부족 — **기계가 막아야** 재발 안 함. 3-레이어 hook:

### (A) PreToolUse — verdict-without-evidence 차단
Write/Edit 가 `**/H_*.md` 또는 `**/result.json` 에 `🔵`/`🟢`/`SUPPORTED-FORMAL`/`SUPPORTED-NUMERICAL` 토큰을 쓸 때:
- 같은 slug 의 `.verdicts/<slug>/*.txt` (실 `hexa verify` stdout) 존재 확인.
- 없으면 → **BLOCK** + 메시지: "🔵 claim 에 `.verdicts/` 독립 verdict 부재 — `hexa verify` 돌려 verbatim 저장 후 재시도 (commons g73)".

### (B) tautology-smoke linter — `.hexa` smoke 자기참조 탐지
`.hexa` 파일에서 `check_*()` 가 호출하는 `fn` 이 **비교 대상 상수를 그대로 반환**하는 패턴 정적 탐지:
```
fn router_top_k(...) -> i64 { return k }   // ← 인자를 그대로 반환
... router_top_k(...) == k                  // ← 그걸 검사 = tautology
```
- 휴리스틱: `check` 가 검사하는 함수 본문이 `return <param>` / `return <literal>` 단일문이고, 그 값이 비교 RHS 와 동일 → WARN "tautological smoke — not verification (g73)".

### (C) Stop hook — 자율 루프 fake-🔵 적층 차단
Stop hook 이 "🔵 N개 달성/누적" 류 closure 를 판정할 때:
- 직전 N round 에 생성된 H 중 `.verdicts/` 백킹 비율 측정.
- 백킹 0% (전부 self-judged) → closure 인정 거부 + "loop self-judging only — STOP & report (g73)".

## 적용 범위 / 비적용
- 적용: H_*.md · result.json · .hexa smoke 가 verdict 토큰 주장 시.
- 비적용: ⚪ SPECULATION-FENCED (honest fence, verify N/A by design) · 🟡 CITATION (외부 atlas, recompute 없음 명시) · 🟠 INSUFFICIENT (이미 정직).

## 검증 (이 RFC 의 dogfood)
- anima UNIVERSE 잔존 124 H 에 (A) 적용 시: directive-cite 류는 모두 BLOCK 되어야 (실제로 #1034 에서 수동 폐기됨 — hook 이 있었으면 자동 차단).
- DECODER MoE PASS (실 toy train, gate 97/3) 는 통과해야 — 실측 verdict 보유.

## 후속
- (A) PreToolUse 가 최소 viable — 먼저 land. (B)(C) 는 follow-up.
- anima/hexa-codex 등 verify-driven repo 전반 cross-cutting (commons = 모든 도메인).
