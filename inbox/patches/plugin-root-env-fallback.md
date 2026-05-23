# patch: `$CLAUDE_PLUGIN_ROOT` 환경변수 미설정 환경 폴백

## 증상

`Skill` tool 경유로 `/domain` (및 동일 패턴의 다른 slash command) 호출 시 다음 에러:

```
Shell command failed for pattern "!`hexa run "$CLAUDE_PLUGIN_ROOT/bin/_domain.hexa" ...`"
error: source file not found: /bin/_domain.hexa
```

원인 — `$CLAUDE_PLUGIN_ROOT` 가 빈 문자열로 평가됨 → `"/bin/_domain.hexa"` 절대경로로 치환 → 파일 없음.

## 영향

| skill | 파일 | 패턴 |
|---|---|---|
| domain | `commands/domain.md` | `hexa run "$CLAUDE_PLUGIN_ROOT/bin/_domain.hexa" $ARGUMENTS` |
| imagine | `commands/imagine.md` | `hexa run "$CLAUDE_PLUGIN_ROOT/bin/_imagine.hexa" --root "$CLAUDE_PLUGIN_ROOT" $ARGUMENTS` |
| inbox | `commands/inbox.md` | `hexa run "$CLAUDE_PLUGIN_ROOT/bin/_inbox.hexa" $ARGUMENTS` |
| paper | `commands/paper.md` | `hexa run "$CLAUDE_PLUGIN_ROOT/bin/_paper.hexa" --root "$CLAUDE_PLUGIN_ROOT" $ARGUMENTS` |
| research | `commands/yt.md` · `commands/arxiv.md` | `hexa run "$CLAUDE_PLUGIN_ROOT/bin/_yt.hexa" $ARGUMENTS` 등 |
| ship | `commands/ship.md` | `hexa run "$CLAUDE_PLUGIN_ROOT/bin/_ship.hexa" $ARGUMENTS` |

## 근본 원인

- 슬래시 명령 직접 입력(`/domain`) 시엔 Claude Code 가 `$CLAUDE_PLUGIN_ROOT` 를 치환 후 실행 → 동작
- `Skill` tool 경유 호출 시엔 환경변수가 export 되지 않음 → `$CLAUDE_PLUGIN_ROOT=""` → 실패

`Bash` tool environment 에서 직접 확인:

```
$ echo "[$CLAUDE_PLUGIN_ROOT]"
[]
$ env | grep CLAUDE_PLUGIN_ROOT
(none)
```

반면 plugin `bin/` 디렉토리들은 `$PATH` 에 항상 등록되어 있음.

## 수정 — PATH 폴백

`_NAME.hexa` 가 PATH 에 있다는 사실을 활용 → `command -v` 로 절대경로 해석.

**Before**:
```bash
!`hexa run "$CLAUDE_PLUGIN_ROOT/bin/_NAME.hexa" $ARGUMENTS`
```

**After**:
```bash
!`H="$(command -v _NAME.hexa)"; hexa run "$H" $ARGUMENTS`
```

`--root` 인자가 필요한 경우 (paper · imagine):
```bash
!`H="$(command -v _NAME.hexa)"; hexa run "$H" --root "$(dirname "$H")/.." $ARGUMENTS`
```

## 검증

| 호출 경로 | Before | After |
|---|---|---|
| `/domain ...` 직접 타이핑 | ✅ (env 치환됨) | ✅ |
| `Skill(skill="domain:domain", args=...)` | ❌ `/bin/_domain.hexa` not found | ✅ PATH 해석 |
| Bash tool 직접 | ❌ env empty | ✅ |

## 적용 범위

- `commands/*.md` 7 파일 패치
- 6 plugins (domain · imagine · inbox · paper · research · ship) patch version bump
- `.claude-plugin/marketplace.json` 버전 동기화

## 환경

- macOS 26.5 · Claude Code 2.1.150
- sidecar plugins 현재 cache 버전: domain 0.4.1 / imagine 0.2.0 / inbox 0.2.1 / paper 0.4.0 / research 0.2.0 / ship 0.2.1

## 향후 개선 후보

- `easy.md` 의 `${CLAUDE_PLUGIN_ROOT}/styles/easy.<lang>.md` (markdown 본문, Bash 훅 아님) — 별도 처리 필요. 본 패치 범위 밖.
- 모든 hexa-backed slash command 의 invocation 을 hexa CLI 의 빌트인 verb 로 흡수 (`hexa skill run <name>`) — 장기 리팩토링 후보.
