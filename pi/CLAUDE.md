# pi — Pi coding-agent bridge

> 이 폴더에서 작업하는 AI/사람을 위한 로컬 가이드. 상위 설계는 repo-root [ARCHITECTURE.json](../ARCHITECTURE.json).

## 목적
sidecar 거버넌스를 **Pi (earendil-works/pi-coding-agent)** 에 배선한다. Claude Code 는
`hooks/hooks.json` + `run.sh` 로, Pi 는 이 폴더의 TS 확장 한 장으로 — **둘 다 동일한
`sidecar` CLI(modules/*.ts)** 를 호출한다. 엔진(모듈 60개)은 한 줄도 안 건드리고, 이
파일이 Pi 이벤트 ↔ CC형 훅 JSON 을 번역하는 어댑터다.

## 핵심 파일
| 파일 | 역할 |
|------|------|
| `sidecar.ts` | Pi 확장 — `pi.on()` 라이프사이클 핸들러가 `sidecar <verb>` 를 spawn, CC형 출력(`hookSpecificOutput.additionalContext` / `permissionDecision:"deny"`)을 Pi 반환형(`{message}` / `{block}`)으로 번역 |

## 표면 매핑 (CC hooks.json ↔ Pi events)
| Claude Code | Pi event | sidecar verb |
|------|------|------|
| UserPromptSubmit (매턴 inject + prompt-scan) | `before_agent_start` | commons·claudemd·recommend·prefs·easy·load·ing inject + prompt |
| SessionStart (1회 inject + gc) | `session_start` + 첫 `before_agent_start` | architecture·git-context·toolkit·companions inject · worktree gc |
| PreToolUse (guards) | `tool_call` (block 가능) | pre bash/write/touch/tool |
| PostToolUse (Write\|Edit) | `tool_result` (advisory) | post edit |
| Stop (hard 재턴 게이트) | — | **미배선** (Pi 에 blocking stop 훅 없음 → CC 전용) |

## 규칙 / gotcha
- **엔진 무수정** — 이 어댑터만 Pi 쪽 번역을 담당. 새 CC 훅 표면이 생기면 여기 매핑도 lockstep.
- inject 동사는 stdin 의 `{"hook_event_name": "..."}` 를 읽어야 emit 한다 (CC 는 run.sh 가 stdin 상속) — `before_agent_start` 가 `UserPromptSubmit`/`SessionStart` 캐리어를 합성해 파이프.
- inject 텍스트 캐리어는 **둘** — 대부분 stdout JSON(`additionalContext`), 일부(toolkit·companions)는 **stderr 평문** → `extractContext(.., true)` 가 양쪽 흡수.
- `git-context` 는 clean + default 브랜치면 의도적으로 침묵(빈 출력은 정상).
- block 은 현행 CC 스키마 `hookSpecificOutput.permissionDecision:"deny"`(레거시 `decision:"block"` 도 파싱).
- 설치: `sidecar pi install` 이 이 파일을 `~/.pi/agent/extensions/sidecar.ts` 로 심링크(전역 클론 → self-update 가 함께 갱신) + `~/.claude/skills` 를 Pi settings.skills[] 에 추가. `sidecar install` 도 Pi 감지 시 자동 배선.

## 관련
- CC 배선: [hooks/](../hooks/) · 설치 모듈: [modules/pi.ts](../modules/pi.ts) · 설계 SSOT: [ARCHITECTURE.json](../ARCHITECTURE.json)
