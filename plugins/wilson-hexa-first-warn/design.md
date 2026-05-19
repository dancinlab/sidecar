# Design

> Step-by-step decision gate audit trail. One decision per gate, never batched. See `/wilson-decision-gate sample` for the full convention.

---

## Decisions

### Decision 1 — Bash bypass 폐쇄 — PreToolUse 에 Bash matcher 추가, redirect(>·>>)·tee 패턴이 protected ext 를 가리키면 같은 결정으로 차단
- **picked**: Bash bypass 폐쇄 — PreToolUse 에 Bash matcher 추가, redirect(>·>>)·tee 패턴이 protected ext 를 가리키면 같은 결정으로 차단
- **rationale**:
  - Write hook 만 막혀 있어 cat>foo.py<<EOF 로 우회됨이 실사용에서 입증
  - 같은 plugin/같은 결정 로직(warn|block)으로 분기만 추가하므로 새 플러그인 불필요 — one-plugin-one-guardrail 유지
  - mv/cp/ln 류 임시파일-rename 잔여 bypass 는 false-positive 비용이 더 커서 이번 ship 에서 제외 — 필요해지면 후속 패치

### Decision 2 — 확장자 풀세트 — 스크립트(.py .sh) + 펌웨어(C .c .h .cpp .hpp .cc .hh / asm .s .S / RTL .v .sv .vhd .vhdl)
- **picked**: 확장자 풀세트 — 스크립트(.py .sh) + 펌웨어(C .c .h .cpp .hpp .cc .hh / asm .s .S / RTL .v .sv .vhd .vhdl)
- **rationale**:
  - 사용자가 컴파일 언어 광범위가 아니라 '펌웨어' 로 명시적으로 좁힘 — Rust/Go/Java/JS 등 일반 앱 언어는 제외
  - hexa-lang 의 정당한 흡수 대상이 firmware authoring (C + asm + RTL) 임에 정합 — 일반 app 언어는 hexa 흡수 1차 영역 아님
  - .s 와 .S 는 별개로 등재 (대문자=preprocessed asm 관례)

### Decision 3 — 메시지에 hexa upstream PR 경로 명시 — hexa atlas register file 다음 hexa atlas pr 가 합법 3번째 옵션임을 박아넣기
- **picked**: 메시지에 hexa upstream PR 경로 명시 — hexa atlas register file 다음 hexa atlas pr 가 합법 3번째 옵션임을 박아넣기
- **rationale**:
  - 현재 메시지는 '기존 hexa-native 사용' 만 강조해서 우회 압력을 키움 — upstream 확장이 합법임을 모르면 차단이 자의적으로 보임
  - CLAUDE.md hexa-first §2 원칙과 정합 — direct fold-to-live 금지
  - PR-only 라는 사실을 차단 메시지 자체에서 안내
  - warn 메시지
  - block 메시지 모두 같은 3-경로(use·extend·downgrade)로 통일 — 모드 간 일관성
