# `.hexa`-migrated skill 들이 `command -v _*.hexa` 로 bin 못 찾음 (PATH 미등록)

## TL;DR
research:arxiv · research:yt · domain 등 0.2.x 에서 `.sh`→`.hexa` 마이그레이션한 스킬이
실행 시 `command -v _arxiv.hexa` 가 빈 값 반환 → `hexa run "" $ARGS` 가 첫 인자를 파일로 오인 → compile error.

## 재현
```
/research:arxiv machine learning ...
→ error: `hexa build machine` failed (compile error).
  error: source file not found: machine
```
(첫 인자 `machine` 을 .hexa 소스로 빌드 시도)

```
$ command -v _arxiv.hexa _domain.hexa
$ echo $?
1            # ← PATH 에 없음
```

## 원인
- SKILL 커맨드 템플릿: `H="$(command -v _arxiv.hexa)"; hexa run "$H" $ARGUMENTS`
- `_arxiv.hexa` 는 `~/.claude/plugins/cache/sidecar/research/0.2.x/bin/` 에 존재하나 **PATH 에 미등록**
- → `$H` 빈 값 → `hexa run "" machine learning ...` → "machine" 을 소스 파일로 해석

## 영향 스킬 (0.2.x .hexa 마이그레이션 전부 추정)
- research:arxiv · research:yt
- domain (`command -v _domain.hexa` 도 exit 1 — 이번 세션 2회 실패)
- 기타 `.sh`→`.hexa` 전환 스킬 점검 필요

## 대조 (0.1.x 는 정상)
- 0.1.0/0.1.1 은 `arxiv.sh` + `_arxiv.py` (shell wrapper 가 `$CLAUDE_PLUGIN_ROOT` 로 경로 해석)
- 0.2.x 가 `.hexa` 직접 + `command -v` 의존으로 바뀌며 회귀

## 수정 후보
1. SKILL 템플릿이 `$CLAUDE_PLUGIN_ROOT/bin/_arxiv.hexa` 절대경로 사용 (PATH 비의존, g13 portable-paths 정합)
2. 또는 install 단계에서 plugin bin 을 PATH 에 등록
3. `hexa run "$H"` 앞에 `[ -n "$H" ] || H="$CLAUDE_PLUGIN_ROOT/bin/_arxiv.hexa"` fallback

## 우선순위
높음 — research / domain 등 다수 user-facing 스킬이 현재 깨짐 (WebFetch / 직접 Edit 로 우회 중).

## 발견 맥락
RTSC BEE-NET blocker 해소용 arxiv 검색 (`/research:arxiv`) 시도 중 실패 → WebFetch fallback 으로 우회. domain 스킬도 이번 세션 cycle 로깅 2회 같은 패턴 실패.
