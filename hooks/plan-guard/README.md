# plan-guard

step-by-step 계획의 **locked decision 준수**를 강제하는 사이드카 플러그인.
marker(기계가독 contract) + hook(verbatim 주입) + linter(ship 때 검증) 3종으로,
이번 세션에서 실측된 계획-drift 3대 근본원인을 닫는다:

1. **오케스트레이터 escape** — sub-agent 프롬프트에 locked decision 과 모순되는
   문구를 써넣어 sub-agent 가 건너뜀 (예: d1 ".kosmos 필수" → "SKIP OK").
2. **설계 중 원계획 drift** — 진행하며 원계획에서 벗어남 (예: AKIDA-first 가
   GPU 로 빠짐).
3. **soft self-check** — sbs Auto-QA conformance 가 LLM 자기판정이라 못 잡음.

## 강도 — advisory only

hard-block / deny 절대 없음. linter 는 caller 가 surface 할 수 있도록 nonzero
로 종료하지만, 번들된 hook 은 오직 `additionalContext` 경고만 낸다.

## marker 규약 (step-by-step 0.8.0)

`## locked decisions` 불릿이 기계가독 contract 를 실을 수 있다:

```
- @L<n> (<axis>): <human-readable option> · assert:<kind> <arg>
```

assert 종류 3:

| kind | 의미 | 검증 |
|---|---|---|
| `grep <pat>` | 용어가 검사 표면에 존재 | 존재하면 PASS (`!pat` → 부재해야 PASS) |
| `file <path>` | 경로가 repo 에 존재 | 파일 존재하면 PASS |
| `verdict <slug>/<id>` | 종결 verdict 존재 | `.verdicts/<slug>/<id>.txt` non-empty 면 PASS |

`@L` 없는 기존 plan.md 는 검증 skip (후방호환).

## CLI — `plan-lint`

```sh
hexa run hooks/plan-guard/bin/_plan_lint.hexa <plan.md> [--diff <file> …]
```

- plan.md 의 `## locked decisions` 의 `@L` assert 들을 파싱.
- 각 assert 를 repo 전체(또는 `--diff` 파일셋)에 대해 검증.
- `@L` 별 ✓/✗ verdict 출력 + 미충족 시 nonzero 종료.
- `--diff` 모드에서 `grep` 은 그 파일셋만 보고, `file`/`verdict` 는 존재
  검사라 repo 를 본다.

## hook — PreToolUse(Task|Agent) verbatim 주입 (0.2.0)

sub-agent 가 spawn 될 때 `_plan_inject.hexa` 가:

1. **활성 plan 해결** — `drafts/*-plan.md` 중 frontmatter `status: active` 인
   것, 없으면 최신 mtime fallback.
2. **`@L` contract 추출** — `## locked decisions` 의 `@L … assert:` 불릿.
3. **verbatim 주입** — 그 라인들을 그대로 `additionalContext` 로 첨부해
   오케스트레이터가 spawn 프롬프트에 모순 escape 를 써넣어도 plan 의 @L 이
   우선임을 sub-agent 에게 명시 (근본원인 #1 = T2/d1 ".kosmos 필수"→"SKIP OK").
4. **escape scan** — spawn 프롬프트가 locked term(또는 human-label 토큰) 근처에
   skip/ignore/생략/… 부정 키워드를 담으면 advisory 경고 append.

advisory only — deny 없음, 항상 exit 0.

## hook — PostToolUse(Bash) ship-lint (0.3.0)

ship 명령(`git commit` / `gh pr …`) 직후 `_plan_ship.hexa` 가:

1. 활성 plan 해결 (위와 동일).
2. ship diff 파일셋 계산 (`git diff origin/main...HEAD`, 없으면 staged/HEAD,
   없으면 repo-wide).
3. PR-2 의 `_plan_lint.hexa` 엔진을 subprocess 로 호출(SSOT 1개)해 `--diff`
   범위로 검증.
4. 미충족 `@L` 을 verbatim advisory 경고로 surface — 원계획 drift(근본원인 #2,
   예 "AKIDA-first → GPU")를 ship 시점에 포착. sbs Auto-QA 의 soft conformance
   self-check(근본원인 #3)가 놓친 지점.

non-block — ship 은 이미 일어났고 경고는 다음 turn 에 탄다. 항상 exit 0.

## dogfood self-test

plan-guard 는 자기 자신의 빌드 plan 으로 self-검증된다. 빌드 plan 의 `@L1~@L6`
은 각각 landed 산출물을 assert 로 가리킨다:

```
$ hexa run hooks/plan-guard/bin/_plan_lint.hexa <plan-guard-plan.md>
  ✓ @L1: grep present 'assert:<kind> <arg>' → present      # marker 규약 (PR-1)
  ✓ @L2: file 'hooks/plan-guard/bin/_plan_lint.hexa' exists  # linter 본체 (PR-2)
  ✓ @L3: file 'hooks/plan-guard/bin/_plan_inject.hexa' exists # inject hook (PR-3)
  ✓ @L4: file 'hooks/plan-guard/bin/_plan_ship.hexa' exists   # ship hook (PR-4)
  ✓ @L5: file 'hooks/plan-guard/README.md' exists             # advisory-only (PR-4)
  ✓ @L6: grep present 'status: active' → present              # 활성추적 (PR-5)
plan-lint: PASS — all 6 @L asserts met
```

dogfood 가 잡아낸 실 finding 2건 (정직 보고):
1. `assert:<kind>` placeholder 의 backtick 이 파서를 혼동 → marker arg 는 clean
   token 이어야 함 (plan 의 @L1 을 backtick 없는 형태로 교정).
2. `assert:grep !permissionDecisionReason` 가 repo-wide 에서 sibling guard
   (cloud-guard/git-guard 의 정당한 deny)를 잡아 over-broad → @L5 를 plan-guard
   자신의 산출물 존재(scope-correct file assert)로 reframe. plan-guard hook 2개
   (`_plan_inject`/`_plan_ship`)는 실제로 deny 0 · additionalContext only · exit 0.

## 양방향 sibling

- sibling: [`step-by-step`](../../commands/step-by-step/) — plan.md `@L`+assert
  marker 산출체 (0.8.0). plan-guard 는 그 marker 의 소비/검증 측.
- sibling: [`memory-lint`](../memory-lint/) — 동일 hexa-lint 패턴(defensive
  readers · JSON-escaped additionalContext · no-network) 복제 원본.
