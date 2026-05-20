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

### Decision 4 — bypassPermissions 우회 폐쇄 — managed-settings.json (OS root-protected) + /enforce 명령 + SessionStart advisor (hexa-native)
- **picked**: managed-settings.json (root-owned, claude-code deny floor가 bypassPermissions 도 override) 를 1회 sudo install 로 떨굼; `/wilson-hexa-first-warn:enforce` 가 install 레시피를 emit; SessionStart 훅이 managed 파일 부재 + bypass 모드 조합을 감지해 nudge
- **rationale**:
  - 실증: 0.4.0 PreToolUse `permissionDecision:"deny"` 가 `defaultMode:bypassPermissions` 에서 Claude Code 가 silently drop 함 (사용자 trust toggle 의도된 동작 — 가드 버그 아님)
  - 플러그인 manifest 의 `settings.json` 은 `agent`/`subagentStatusLine` 만 받음 — `permissions` 키 거절. 따라서 플러그인 단독으로 bypass 를 막을 수 없음
  - claude-code 문서: managed-settings 의 `permissions.deny` 는 "cannot be overridden by any other level" — 진짜 floor. macOS `/Library/Application Support/ClaudeCode/managed-settings.json` (Linux `/etc/claude-code/managed-settings.json`) 은 root 소유 → claude 자신이 못 지움 → OS-level enforce
  - 플러그인이 자동 install 못함 (root 권한 필요) → 사용자 1회 `sudo` 동의가 게이트. `/enforce` 슬래시 커맨드가 `hexa run bin/enforce.hexa` 를 호출해 copy-paste 가능한 `sudo install -m 644 /dev/stdin <path> <<EOF ... EOF` 한 블록을 출력만 함 — 실제 sudo 는 사용자가 직접
  - emit 로직 hexa-native (`bin/enforce.hexa`) — sys_platform 으로 Darwin/Linux 분기, 보호 ext 리스트 단일 정의(SSOT)
  - SessionStart 훅도 hexa-native (`bin/session_start.hexa`) — managed 파일 부재 시 1회 `additionalContext` nudge, 이미 deny entry 가 있으면 silent. 다중 opt-out 환경변수(SIDECAR_NO_HEXA_FIRST_WARN_SESSION_HINT / WILSON_ variants / 마스터 SIDECAR_NO_HEXA_FIRST_WARN)
  - 0.4.0 PreToolUse 훅은 그대로 유지 — bypass 아닌 사용자에게는 여전히 더 빠른 floor (managed 까지 가지 않아도 됨); bypass 사용자에게는 nudge → /enforce → managed 의 2단 가드
  - Bash 우회 (redirect/tee/cp/mv/ln 류) 의 managed-deny 글로빙은 이번 ship 에서 제외 — `Bash(...)` 매처가 명령문자열 패턴이라 ext-별 글로빙이 부정확. 기존 PreToolUse Bash 훅 이 이 영역 커버 (bypass user 에게는 미커버 → 명시적 잔여)
  - 다른 sidecar 사용자 호환: hexa-native 스크립트 + `${CLAUDE_PLUGIN_ROOT}` 경로 + uname 분기 = ghost-specific 하드코딩 없음. 단 hexa-lang 설치는 prereq
