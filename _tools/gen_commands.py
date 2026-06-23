#!/usr/bin/env python3
"""Generate sidecar plugin slash-command .md files (sidecar pattern).

Each command is a thin delegator to the global `sidecar` CLI, with a rich
frontmatter description carrying **Triggers** so Claude Code recognizes when to
invoke it — exactly like sidecar's commands/*.md. Living in plugin/commands/
makes this a SHARED/GLOBAL set: installed once via the sidecar plugin, available
in every project, updated centrally (sidecar self-update) — never per-project.
"""
import os

OUT = os.path.expanduser("~/.sidecar/cli/plugin/commands")
os.makedirs(OUT, exist_ok=True)

# (name, argument-hint, description-tail, triggers)
# description = "/<name> <hint> — <desc-tail> Triggers — <triggers>."
CMDS = [
    # ── tools ──
    ("paper", "<new|build|cover|list> [slug] [flags]",
     "demiurge-house scientific paper — `new` scaffolds PAPERS/<slug>/ (emoji title · g5 tier badges · TikZ+pgfplots · fal.ai cover) → `cover` (imagine) → `build` (xelatex+bibtex×3 · g51 ≥10-page gate). `list`.",
     '"논문 만들어", "paper scaffold", "new paper", "compile paper", "논문 빌드", "논문 표지", "/paper new", "/paper build", "arxiv 논문"'),
    ("imagine", "<prompt-file> <out.png> [-s size] [-b fal|openai] [-m model] | list | help | history",
     "generic AI image generator (fal default / openai). Keys via `secret get`; prompt read from a FILE (no argv leak); canonical sizes square_hd/landscape_16_9/portrait_16_9/square.",
     '"이미지 생성", "이미지 만들어", "그림 그려줘", "표지 만들어", "generate an image", "draw a cover", "make a teaser", "fal.ai image"'),
    ("research", "arxiv <query|id> [--n N] | yt <url|id> [lang]",
     "fetch arXiv papers (search/by-id) or a YouTube transcript — no API key. Returns text the agent can read.",
     '"arxiv 검색", "논문 찾아줘", "유튜브 자막", "research arxiv", "youtube transcript", "fetch paper", "/research arxiv", "/research yt"'),
    ("watch", "<url|path> [question] [flags]",
     "download (yt-dlp) → frames (ffmpeg) + transcript (captions/Whisper) so the agent can 'watch' a video/stream.",
     '"영상 봐줘", "비디오 분석", "watch this video", "analyze this clip", "유튜브 영상 분석", "/watch"'),
    ("secret", "<get|set|rotate|list|init|backup|sync> [args]",
     "passthrough to the `secret` CLI (Keychain creds). ⚠ `get` exposes the value in context — prefer inline `$(secret get <k>)` for tool args.",
     '"시크릿", "secret get", "secret set", "api key 저장", "키 가져와", "/secret"'),
    ("lsp", "{wire|status|rebuild <file>}",
     "editor LSP wiring (.lsp.json) + background rebuild of prebuilt hexa LSP binaries when grammar source changes.",
     '"lsp 배선", "lsp 상태", "rebuild lsp", "/lsp wire", "/lsp status"'),
    # ── runbooks ──
    ("sbs", "[auto[:<axis>]|manual] [<task>]",
     "step-by-step plan-first runbook — decompose a task into a verified plan before acting (mode via recommend resolve-mode).",
     '"단계별로", "step by step", "계획 먼저", "plan first", "sbs", "차근차근", "/sbs"'),
    ("abg", "[labels]",
     "all-bg-go — fan out the prior turn’s proposed branches as PARALLEL background Agents.",
     '"전부 백그라운드", "병렬 실행", "all background", "fan out parallel", "abg", "/abg", "/all-bg-go"'),
    ("afg", "[labels]",
     "all-fg-go — run the prior turn’s proposed branches SEQUENTIALLY in-session (foreground).",
     '"전부 포그라운드", "순차 실행", "all foreground", "afg", "하나씩 진행", "/afg", "/all-fg-go"'),
    ("fleet", "[name:goal,… | go | stop | status]",
     "perpetual multi-lane orchestrator — run several research/build lanes continuously (runbook + roster).",
     '"플릿", "fleet", "여러 레인", "멀티 레인 오케스트레이션", "/fleet", "함대"'),
    ("pod", "",
     "GPU cloud pod dispatch runbook — preflight → fire → poll → harvest → down (cost-gated).",
     '"GPU 포드", "클라우드 GPU", "pod 발사", "rent gpu", "/pod", "포드 띄워"'),
    ("dojo", "[<slug>] [--lang]",
     "cloud training-job scaffolder (runbook + exports/dojo/<slug>/ emit).",
     '"학습잡", "training job", "dojo", "모델 학습 스캐폴드", "/dojo"'),
    ("micro-exp", "[<scope>]",
     "context-driven micro-experiment sweep — infra-gate → budget → dispatch → monitor → absorb → ledger.",
     '"마이크로 실험", "micro experiment", "작은 실험 스윕", "/micro-exp"'),
    ("bypass", "",
     "anti-punt self-check runbook — proceed on local+reversible work; ask only when outward-facing or a real decision.",
     '"우회하지마", "punt 금지", "anti-punt", "그냥 진행", "/bypass"'),
    ("go", "",
     "continue the most-recently proposed action without re-confirming.",
     '"고", "계속", "진행해", "go ahead", "continue", "/go"'),
    ("brainstorm", "",
     "iterative ideation rounds until depletion — breadth over selection.",
     '"브레인스토밍", "아이디어 내줘", "brainstorm", "ideate", "발상", "/brainstorm"'),
    ("gap", "[full|list|<scope>]",
     "multi-axis gap exploration — 40 breakthrough lenses (8 families), triage → deepen runbook.",
     '"갭 분석", "돌파구 찾아", "gap analysis", "breakthrough lenses", "막힌데 뚫어", "/gap", "/kick"'),
    ("demi", "",
     "design-architecture program runbook — the 7-verb spine (spec→structure→design→analyze→synthesize→verify→handoff).",
     '"설계 파이프라인", "demi", "7-verb", "아키텍처 설계 런북", "/demi"'),
    # ── gates & ledgers ──
    ("pr-cycle", "[gh flags]",
     "push branch → open PR → self-merge (squash · admin · delete-branch) → local base ff-sync. Doc-gate enforced.",
     '"PR 돌려", "pr cycle", "머지해줘", "push and merge", "셀프머지", "/pr-cycle"'),
    ("lint", "[all|fast|verbose]",
     "staged-L0 + freshness + CHANGELOG-missing + convergence checks (commit-time gate).",
     '"린트", "lint", "검사", "/lint"'),
    ("ci", "[all|fast|list]",
     "run configured verification commands in parallel (any failure → exit 1).",
     '"CI 돌려", "테스트 실행", "run ci", "검증 명령", "/ci"'),
    ("verify", "[rubric | fence \"<claim>\"]",
     "tier-rubric claim verification — colored g5 badges, no LLM self-judge (sidecar parity).",
     '"검증", "claim 검증", "verify claim", "tier 판정", "/verify", "팩트체크"'),
    ("audit", "[full|summary|json]",
     "6-axis sidecar self-scorecard (/60).",
     '"감사", "스코어카드", "audit", "self-score", "/audit"'),
    ("gc", "[scan|drift]",
     "broken-markdown-link detection across guide docs.",
     '"링크 검사", "broken links", "gc scan", "/gc"'),
    ("docs", "[status|check|scratch [name]]",
     "single-doc discipline — architecture SSOT + log + scratch + quickref counts.",
     '"문서 상태", "docs check", "단일문서 규율", "/docs"'),
    ("folders", "[scan|scaffold <dir>]",
     "per-subfolder CLAUDE.md coverage check + template scaffolding.",
     '"폴더 CLAUDE 점검", "folders scan", "서브폴더 문서", "/folders"'),
    ("end", "",
     "session-closure safety check — uncommitted · unpushed · stash · open PRs · branches · worktrees.",
     '"세션 마무리", "끝내기 전 점검", "end session", "closure check", "/end"'),
    ("worktree", "{scan|gc|guard <cmd>}",
     "worktree hygiene — flag stranded worktrees · auto-sweep merged (no-pileup/no-stranded).",
     '"워크트리 정리", "worktree gc", "stranded worktree", "/worktree"'),
    ("ing", "[show|add [--to <repo>]|done|next|pod ...|inject]",
     "in-progress board → ING.jsonl (작업·POD·next; done=scrub; cross-repo handoff via --to).",
     '"진행보드", "ING 등록", "작업 남겨놔", "ing add", "인계", "/ing", "ING 에 남겨"'),
    ("verdict", "{record <id> <cmd>|list|show <id>}",
     "verification-evidence ledger → .verdicts/ (PASS/FAIL, captured command output as proof).",
     '"판정 기록", "verdict record", "증거 박제", "/verdict"'),
    ("atlas", "{add <id> <claim>|link <id> <vid>|list}",
     "claim registry → ATLAS.md (a claim is verified only via a PASS verdict).",
     '"클레임 등록", "atlas add", "주장 레지스트리", "/atlas"'),
    ("upstream", "{list|fix <name|repo>}",
     "in-session upstream (hexa-lang…) fix runbook — fix now, no inbox-only defer.",
     '"업스트림 수정", "upstream fix", "상위 repo 고쳐", "/upstream"'),
    ("convergence", "{status|recompute|by-category}",
     "optional incident-convergence tracker (recurring-defect learning).",
     '"수렴 추적", "convergence", "재발 추적", "/convergence"'),
    ("sync", "{run|diff}",
     "run the configured shared-file sync script.",
     '"파일 동기화", "sync run", "shared sync", "/sync"'),
    ("errors", "{route|list|drain_check|mark_fixed}",
     "error severity classification + queue.",
     '"에러 큐", "errors list", "오류 분류", "/errors"'),
    ("ledger", "{register|complete|list|gc|dup_check}",
     "background-agent task ledger (dedupe register).",
     '"작업 원장", "ledger register", "agent 등록", "/ledger"'),
    ("bitter-gate", "audit [window]",
     "rule-hit frequency → retire dormant enforcement rules.",
     '"규칙 빈도 감사", "bitter-gate", "dormant rule", "/bitter-gate"'),
    ("lockdown", "{status|add <path...>|rm <path...>|check <path>}",
     "manage the L0 lockdown set (opt-in core-file edit guard).",
     '"잠금 파일", "lockdown add", "L0 보호", "/lockdown"'),
    ("pool", "{list|add|rm|on <h> <cmd>|status|specs [h]}",
     "host roster + remote exec + cores/mem/GPU probe (~/.sidecar/pool.json, global).",
     '"풀 호스트", "pool status", "원격 실행", "호스트 목록", "/pool"'),
    # ── config / inject (user-facing verbs) ──
    ("recommend", "{inject|show|get-default|set-default <m> [--global]|clear-default [--global]|resolve-mode <a>}",
     "4-axis recommendation rubric + default mode (present/auto/complete/simple/safe/std).",
     '"추천 모드", "recommend set-default", "4축 추천", "기본 축 설정", "/recommend"'),
    ("prefs", "{show|code <lang>|docs <lang>|response <lang>|inject}",
     "language preferences across 3 axes (code · docs · response).",
     '"언어 설정", "prefs", "응답 언어", "한국어로", "/prefs"'),
    ("easy", "{show|inject}",
     "the friendly 'easy' response style (icon·alias·analogy·ASCII·compare).",
     '"이지 모드", "쉽게 설명", "easy style", "친근하게", "/easy"'),
    ("commons", "{inject|show}",
     "always-on cross-project governance SSOT (config/commons.md; repo override .harness/commons.md).",
     '"공용 거버넌스", "commons show", "/commons"'),
    ("architecture", "{inject|show}",
     "surface repo-root ARCHITECTURE.json/.md (design SSOT) like CLAUDE.md.",
     '"아키텍처 주입", "architecture show", "설계 SSOT", "/architecture"'),
    ("claudemd", "{inject|show}",
     "re-inject repo-root CLAUDE.md (project rules) so they stay enforced.",
     '"CLAUDE.md 주입", "claudemd show", "/claudemd"'),
    # ── setup ──
    ("init", "[--force] [--hooks] [--dry-run]",
     "scaffold sidecar into a repo — config + .harness rules + gitignore + wrapper + hooks (strict by default).",
     '"사이드카 설치", "sidecar init", "repo 에 사이드카", "scaffold sidecar", "/init"'),
    ("install-hooks", "[--global|--repo]",
     "merge sidecar hooks into ~/.claude/settings.json (global) or repo .claude.",
     '"훅 설치", "install hooks", "/install-hooks"'),
    ("update", "[--hooks]",
     "bump the .harness-engine submodule to latest + optional hook refresh.",
     '"사이드카 업데이트", "sidecar update", "/update"'),
    ("self-update", "",
     "git-pull the sidecar CLI clone this binary runs from (~/.sidecar/cli) to latest main.",
     '"사이드카 자체 업데이트", "self-update", "sidecar 최신화", "/self-update"'),
    ("uninstall", "[--dry-run] [--keep-logs]",
     "remove sidecar-injected files (config/.harness/hooks/wrapper); keeps user content.",
     '"사이드카 제거", "uninstall sidecar", "/uninstall"'),
]

BODY = ('!`command -v sidecar >/dev/null 2>&1 && sidecar {name} $ARGUMENTS '
        '|| echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`')

def desc_line(name, hint, tail, triggers):
    head = f"/{name}" + (f" {hint}" if hint else "")
    return f"{head} — {tail} Triggers — {triggers}."

count = 0
for name, hint, tail, triggers in CMDS:
    fm = []
    fm.append("---")
    fm.append("description: " + desc_line(name, hint, tail, triggers).replace("\n", " "))
    if hint:
        fm.append(f'argument-hint: "{hint}"')
    fm.append("allowed-tools: Bash")
    fm.append("---")
    fm.append("")
    fm.append(BODY.format(name=name))
    fm.append("")
    path = os.path.join(OUT, f"{name}.md")
    with open(path, "w") as f:
        f.write("\n".join(fm))
    count += 1

print(f"wrote {count} command files to {OUT}")
print("files:", ", ".join(sorted(os.listdir(OUT))))
