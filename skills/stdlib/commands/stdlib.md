---
description: /stdlib — hexa-lang stdlib SSOT helper (commons @D g61). `check` scans the cwd repo for g61 violations (abs-path cross-repo .hexa imports · local fn names duplicating hexa-lang stdlib pub fns). `promote <file>` prints the move-to-stdlib + thin-shim runbook. Bare = check.
allowed-tools: Bash
---

!`
sub="$(printf '%s' "$ARGUMENTS" | awk '{print $1}')"
arg2="$(printf '%s' "$ARGUMENTS" | awk '{print $2}')"
STD="$HOME/core/hexa-lang/stdlib"

case "${sub:-check}" in
  check)
    echo "═══ /stdlib check — commons @D g61 SSOT 위반 스캔 (cwd) ═══"
    echo
    echo "── (a) abs-path cross-repo .hexa import (anima-locked → stdlib 후보) ──"
    A=$(grep -rn 'import "/' --include='*.hexa' . 2>/dev/null | grep -v '/stdlib/' | grep -v '/.git/')
    if [ -n "$A" ]; then printf '%s\n' "$A" | head -30; else echo "  (none — clean)"; fi
    echo
    echo "── (b) 로컬 fn 名 ∩ hexa-lang stdlib pub fn 名 (중복 의심) ──"
    if [ -d "$STD" ]; then
      L="$(mktemp)"; S="$(mktemp)"
      grep -rhoE '^(pub )?fn [a-z_][A-Za-z0-9_]*' --include='*.hexa' . 2>/dev/null | sed -E 's/^(pub )?fn //' | sort -u > "$L"
      grep -rhoE '^pub fn [a-z_][A-Za-z0-9_]*' "$STD" 2>/dev/null | sed -E 's/^pub fn //' | sort -u > "$S"
      DUP=$(comm -12 "$L" "$S")
      if [ -n "$DUP" ]; then printf '%s\n' "$DUP" | sed 's/^/  dup: /' | head -40; else echo "  (none — no overlap with stdlib)"; fi
      rm -f "$L" "$S"
    else echo "  (hexa-lang stdlib not found at $STD)"; fi
    echo
    echo "→ 위반 발견 시: 재사용 코드는 \`/stdlib promote <file>\` 로 stdlib 이전 + thin-shim (g61)."
    ;;
  promote)
    f="${arg2:-<file.hexa>}"
    base="$(basename "$f" .hexa 2>/dev/null)"
    echo "═══ /stdlib promote $f — hexa-lang stdlib 승격 런북 (g61) ═══"
    echo
    echo "engine(공용) ⊥ adapter(repo별) 분리 — substrate-agnostic 만 승격."
    echo
    echo "1. 도메인 선택: stdlib/<domain>/  (math·info·signal·stats·dsp·consciousness …)"
    echo "2. hexa-lang worktree:  git -C ~/core/hexa-lang worktree add -b feat/stdlib-<name> /tmp/hx-<name> origin/main"
    echo "3. 이전 + 변환:  $f → ~/core/hexa-lang/<worktree>/stdlib/<domain>/${base}.hexa"
    echo "     · 내부 import 를 \"stdlib/<domain>/…\" 상대경로로"
    echo "     · 공개 API fn → \`pub fn\` (export 규약)"
    echo "     · stdlib 의존(math/bitops 등)은 \"stdlib/…\" import"
    echo "4. test 추가:  stdlib/<domain>/${base}_test.hexa (fn main + PASS/FAIL, import-based)"
    echo "5. 검증:  POOL_DISABLE=1 \$HOME/.hx/bin/hexa run --no-sentinel <test> → ALL PASS"
    echo "6. land:  commit + gh pr create --base main  (hexa-lang)"
    echo "7. caller thin-shim:  원본 $f →  import \"stdlib/<domain>/${base}.hexa\"  (1줄 re-export, non-breaking)"
    echo "8. byte-equivalence:  기존 smoke 재실행 동일 결과 확인"
    echo
    echo "선례: anima IIT4 → stdlib/consciousness/iit4_* (hexa-lang #1051) + anima shim (#542)."
    ;;
  *)
    echo "/stdlib — hexa-lang stdlib SSOT helper (g61)"
    echo "  /stdlib check            cwd repo 의 g61 위반 스캔 (bare = check)"
    echo "  /stdlib promote <file>   stdlib 승격 + thin-shim 런북"
    ;;
esac
`
