# 확장 — 규칙 추가 · 도메인 모듈 끼우기

> 📍 SSOT: 설계 [ARCHITECTURE.json](../ARCHITECTURE.json) · 이력 [CHANGELOG.md](../CHANGELOG.md). 본 문서는 보조 확장 가이드.

## 1. enforcement 규칙 추가 (가장 흔한 확장)

엔진 코드는 건드리지 않는다. `.harness/enforcement.json` 에 규칙만 append.

### pre_bash (명령 차단/경고)

```jsonc
{
  "id": "P-NO-PROD-DB",                       // 고유 ID — 로그·차단 메시지에 표기
  "desc": "운영 DB 직접 접속 금지",
  "match": "psql .*prod|mysql .*--host=prod", // 명령에 대한 정규식 (i 플래그)
  "exceptions": ["# db-ok", "readonly"],      // 이 패턴 있으면 통과
  "action": "block",                           // block | warn | log_only
  "reason": "운영 DB 직접 접속 금지 — 읽기 전용 래퍼 사용. 정당하면 `# db-ok <사유>`."
}
```

### pre_write (파일 경로/내용 규칙)

```jsonc
{
  "id": "P-MIGRATION-REVIEW",
  "path_match": "db/migrations/.*\\.sql$",     // 파일 경로 정규식
  "action": "warn",
  "reason": "마이그레이션 추가 — 롤백 스크립트 + 리뷰 필수."
}
```

내용 기반 우회 탐지(빈 catch, @ts-ignore 등)는 `bypass_patterns` + `exemption_markers` 조합을 쓴다(번들 `G-ROOT-CAUSE` 규칙 참고).

### prompt_hints (위험어 → 행동 가이드)

```jsonc
{
  "id": "P-DEPLOY-HINT",
  "match_patterns": ["배포", "deploy", "릴리즈"],
  "hint": "배포 전 체크: ① verify 통과 ② CHANGELOG 갱신 ③ 대상 환경 확인."
}
```

규칙 추가 전 **`sidecar bitter-gate audit`** 으로 안 쓰이는 규칙부터 점검(H3).

## 2. keywords 트리거 추가

`.harness/keywords.json` 에 프로젝트 플레이북 트리거를 미러링한다:

```jsonc
{
  "id": "incident-runbook",
  "patterns": ["장애", "outage", "incident"],
  "playbook": "docs/runbooks/incident.md",
  "steps": ["영향 범위 파악", "롤백 여부 결정", "CHANGELOG + 이슈 기록"],
  "required_inputs": ["서비스명", "발생 시각"]
}
```

## 3. verify 체크 정의

`harness.config.json` 의 `verify.checks[]` 에 repo 빌드/테스트 명령을 선언한다. `slow:true` 는 `verify fast` 에서 제외된다.

```jsonc
"verify": {
  "checks": [
    { "id": "typecheck", "cmd": "npx tsc --noEmit", "timeoutMs": 240000 },
    { "id": "test",      "cmd": "pnpm test",        "timeoutMs": 240000 },
    { "id": "build",     "cmd": "pnpm build",       "timeoutMs": 600000, "slow": true }
  ]
}
```

## 4. L0 (잠금) 파일 지정

두 가지 방법(병행 가능):

```jsonc
// (a) config 에 직접
"lockdown": { "files": ["src/core/auth.ts", "src/core/billing.ts"] }
```

```markdown
<!-- (b) CLAUDE.md 안에 🔴 L0 블록 — lockdown.fromMarkdown 으로 자동 파싱 -->
🔴 L0 (수정 전 승인 필수)
  src/core/auth.ts        — 인증 코어
  src/core/billing.ts     — 정산 불변식
🟡 L1 ...
```

L0 파일이 staged 되면 `lint` 가, 편집되면 `post edit` 가 경고한다(차단 아님 — 신중히 다루라는 신호).

## 5. 도메인 전용 모듈 끼우기 (③ 등급)

배포·DB·SSH 처럼 **특정 인프라에 묶인** 기능은 범용 엔진에 넣지 않는다. 두 가지 패턴:

### 패턴 A — repo 자체 스크립트 + enforcement 로 강제

도메인 로직은 repo 의 `scripts/deploy.sh` 에 두고, 사이드카는 "직접 docker restart 금지, deploy.sh 만 허용" 같은 **가드만** enforcement 로 건다. 엔진은 도메인을 모른 채 규칙만 집행한다.

### 패턴 B — 엔진 fork 에 모듈 추가

repo 군이 공통 도메인(예: 같은 배포 인프라)을 쓰면, 엔진을 fork 해 `modules/deploy.ts` 를 추가하고 `cli/index.ts` 에 case 를 하나 더 단다. 이때도 도메인 파라미터(서버 목록 등)는 config 로 빼서 fork 안에서 하드코딩하지 않는다.

```
판단: 그 모듈이 dancinlab 의 "여러" repo 에서 쓰이나?
  YES + 도메인 무관 → upstream(이 repo)에 PR
  YES + 도메인 공통 → 도메인 fork 엔진
  NO (한 repo 전용)  → 패턴 A (repo 스크립트 + 가드)
```

## 6. 서브폴더별 CLAUDE.md 유도 (folder-guides)

각 소스 폴더에 로컬 `CLAUDE.md` 를 두면 에이전트가 그 폴더만 읽어도 맥락(목적·핵심파일·컨벤션·주의점)을 잡는다. 사이드카가 이를 두 갈래로 유도한다:

```
능동: sidecar folders scan            누락 폴더 목록
      sidecar folders scaffold <dir>  템플릿 생성
수동(자동): post edit hook            CLAUDE.md 없는 폴더의 파일을 편집하면
                                      그 폴더당 1회 "가이드 만드세요" 넛지 (dedupe)
```

`harness.config.json` 으로 조정:

```jsonc
"folderGuides": {
  "enabled": true,
  "roots": ["src", "packages"],   // 스캔할 최상위 폴더
  "depth": 2,                       // root 포함 깊이 (root=1)
  "minFiles": 3,                    // 소스파일 N개 이상인 폴더만 대상
  "filename": "CLAUDE.md",
  "ignore": ["node_modules", "dist"],
  "ext": [".ts", ".tsx", ".py"]     // "소스파일"로 셀 확장자
}
```

`enabled:false` 로 끄거나, `minFiles` 를 올려 노이즈를 줄인다. 스캐폴드된 템플릿은 목적/핵심파일/컨벤션/주의/관련 5칸을 비워두니 채우면 된다.

## 7. 커밋 전 CHANGELOG 갱신 강제

소스 코드를 staged 했는데 `CHANGELOG.md` 를 함께 staged 하지 않으면 `lint` 가 `CHANGELOG-MISSING`(severity=block)으로 막는다. 실제 "강제"는 `sidecar init` 이 깔아준 **git pre-commit hook**(`sidecar lint` 호출)이 한다.

```
git add src/foo.ts          (CHANGELOG 안 건드림)
git commit -m "fix: ..."  ──▶ pre-commit → sidecar lint → CHANGELOG-MISSING → 커밋 차단
git add CHANGELOG.md
git commit -m "fix: ..."  ──▶ 통과
```

`harness.config.json` 으로 조정:

```jsonc
"lint": {
  "changelog": {
    "file": "CHANGELOG.md",
    "triggerPattern": "\\.(ts|tsx|js|jsx|py|go|rs)$",  // 이 확장자가 staged 면 CHANGELOG 요구
    "ignore": ["(^|/)(tests?|spec)/", "(^|/)\\.harness(-engine)?/"]  // 트리거 제외
  }
}
```

- docs/JSON-only 변경은 `triggerPattern` 에 안 걸리므로 CHANGELOG 불필요.
- 긴급 우회는 `git commit --no-verify` (의도된 탈출구 — 남용 금지).
- pre-commit hook 은 `.git/hooks/` 에 있어 커밋되지 않으므로 **clone 마다 `sidecar init` 1회** 필요(또는 `core.hooksPath` 사용).

## 8. 로그 활용

모든 모듈은 `.harness/logs/*.jsonl` 에 append 한다. 직접 질의해 대시보드를 만들 수 있다:

```bash
# 가장 많이 차단된 규칙
jq -r 'select(.kind=="pre_block").rule_id' .harness/logs/mistakes.jsonl | sort | uniq -c | sort -rn

# 최근 verify 실패
jq 'select(.kind=="ci" and .failed>0)' .harness/logs/observations.jsonl | tail
```
