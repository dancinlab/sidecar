# /demi — 설계 아키텍처 프로그램 (7-verb spine)

> 도메인 무관 기술-설계 진행기. 명세→구조→설계→해석⟲→합성→검증→인계 7단계 척추를 순서대로 밟아 "무엇을 만들지"를 굳힌다. (sbs 가 "어떻게 실행할지"라면 demi 는 "무엇을/어떤 구조로"의 상류.)

## 7-verb spine
```
① 명세(spec)    — 요구·제약·성공기준을 1차 확정 (가정 명시, 모호하면 질문)
② 구조(struct)  — 컴포넌트/경계/인터페이스 분해 (트리·박스다이어그램)
③ 설계(design)  — 각 컴포넌트 내부 설계 + 데이터흐름 + 불변식
④ 해석(analyze)⟲ — 트레이드오프·실패모드·대안 검토 → ②③로 되돌이(수렴까지 반복)
⑤ 합성(synth)   — 확정 설계를 단일 SSOT 트리로 합성 (ARCHITECTURE.json 갱신·검증)
⑥ 검증(verify)  — 설계 주장(성능·정합성)을 `harness verify`(tier 🔵🟢🟡🟠🔴⚪)·atlas 로 확인 (LLM 자가판정 금지)
⑦ 인계(handoff) — 다음 세션/구현자에게 인계 (ARCHITECTURE.json + ARCHITECTURE.html `python3 serve.py` + CHANGELOG)
```

## 산출 규약 (harness 단일문서 규율과 일치)
- 최종 설계 = **ARCHITECTURE.json** 단일 SSOT(JSON-트리·업데이트형) — ⑤합성 단계가 여기에 갱신. 사람-열람은 **ARCHITECTURE.html** (`python3 serve.py`) 로 렌더. (`ARCHITECTURE.md` 는 2026-06-16 은퇴 → .json+.html 로 대체.)
- 결정 이력 = **CHANGELOG.md**(추가형). 분리 문서 부득이하면 상단 quickref 로 ARCHITECTURE.json 연결.
- ⑤합성 후 JSON 유효성 확인 (`python3 -m json.tool ARCHITECTURE.json`) — 깨진 트리로 ⑦인계 금지.
- ④해석 반복은 수렴(추가 모호성 0)까지 — 미수렴 상태로 ⑤합성/⑦인계 진입 금지.

## 추천 (4축)
설계 분기마다 4축(완성도·단순·안전·표준) 박스로 제시(recommend 규약). 도메인 플러그인(materials/chip/bio 등)은 ②구조 단계에서 도메인별 컴포넌트 어휘를 주입.

## Halts
- 명세 모호 → 질문(추측 금지). 외부영향/파괴적 → 확인 후 진행.
