---
status: resolved
---
# `.hexa`-migrated skill 들이 `command -v _*.hexa` 로 bin 못 찾음 (PATH 미등록)

## 상태 — ✅ 전부 해결
- ✅ research:arxiv · research:yt (0.2.2)
- ✅ domain (0.5.0 — 별도 작업에서 wiring 동시 수정)
- ✅ inbox (0.2.3) · imagine (0.2.2) · paper (0.5.2) · ship (0.2.3)

## TL;DR
`.sh`→`.hexa` 마이그레이션 스킬의 커맨드 템플릿이
`H="$(command -v _foo.hexa)"; hexa run "$H" $ARGS` 형태인데,
plugin bin 은 PATH 에 미등록 → `$H` 빈 값 → `hexa run "" <첫인자>` 가 첫 인자를 .hexa 소스로 오인 → compile error.

## 원인
- `_foo.hexa` 는 `~/.claude/plugins/cache/sidecar/<plugin>/<ver>/bin/` 에 있으나 **PATH 에 미등록**
- `command -v _foo.hexa` → exit 1, 빈 문자열
- → `hexa run "" machine learning ...` → "machine" 을 소스 파일로 해석

## 수정 (research 에 적용한 canonical 패턴)
커맨드 템플릿을 `$CLAUDE_PLUGIN_ROOT` 절대경로로 전환 (PATH 비의존, s3/g13 portable-paths 정합 · `prefs.md` 와 동일):
```
!`hexa run "$CLAUDE_PLUGIN_ROOT/bin/_foo.hexa" $ARGUMENTS`
```
`--root` 가 필요한 imagine/paper 는 `--root "$CLAUDE_PLUGIN_ROOT"` 로.

## 적용된 파일 (전부 완료)
- skills/research/commands/{arxiv,yt}.md  (+ 두 bin 의 dead `stdlib/regex.hexa` import 제거)
- skills/domain/commands/domain.md
- skills/inbox/commands/inbox.md
- skills/imagine/commands/imagine.md  (`--root "$CLAUDE_PLUGIN_ROOT"`)
- skills/paper/commands/paper.md      (`--root "$CLAUDE_PLUGIN_ROOT"`)
- skills/ship/commands/ship.md

## 발견 맥락
RTSC BEE-NET blocker 해소용 arxiv 검색 시도 중 실패 → WebFetch fallback 으로 우회. research 수정 중 `import "stdlib/regex.hexa"` (존재하지 않는 경로 · `regex_match` 는 builtin) 라는 별개 bin 버그도 같이 발견·제거함.
