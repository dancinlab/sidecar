#!/usr/bin/env python3
# wilson-prefs core — SessionStart / UserPromptSubmit hook. Reads the
# persisted prefs and injects a "## Prefs" block as additionalContext,
# faithful to wilson's prefs_build_block wording.
#
# Honest public-plugin deviation from wilson: wilson always injects its
# defaults (ko/en/friendly). sidecar injects NOTHING until the user sets a
# preference via /wilson-prefs:prefs — a marketplace plugin must not
# silently impose a reply language on every host. No prefs.json => exit 0.
import json, os, re, sys

# sidecar control — no-op when /sidecar disabled this plugin
try:
    if "prefs" in json.load(open(os.path.join(
            os.path.expanduser("~"), ".claude", "sidecar",
            "disabled.json"), encoding="utf-8")):
        sys.exit(0)
except SystemExit:
    raise
except Exception:
    pass

try:
    payload = json.load(sys.stdin)
except Exception:
    payload = {}
event = payload.get("hook_event_name") or payload.get("hookEventName") \
    or "SessionStart"

# SessionStart fires with source ∈ {startup, resume, clear, compact};
# the compact path overlaps PostCompact for the same compaction event.
# Skip it here so PostCompact (strictly cleaner post-summary moment) owns
# the full-body reload alone. Decision 21, design.md.
if event == "SessionStart" and payload.get("source") == "compact":
    sys.exit(0)


def data_dir():
    d = os.environ.get("CLAUDE_PLUGIN_DATA") \
        or os.path.join(os.path.expanduser("~"), ".claude",
                        "plugin-data", "wilson-prefs")
    return d


def plugin_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


dd = data_dir()
state = os.path.join(dd, "prefs.json")
try:
    with open(state, "r", encoding="utf-8") as f:
        prefs = json.load(f)
    if not isinstance(prefs, dict) or not prefs:
        sys.exit(0)
except Exception:
    sys.exit(0)  # unset → impose nothing

resp = prefs.get("response_lang")
code = prefs.get("code_lang")
style = prefs.get("response_style")

# The injected `## Prefs` directive lines, localized to the active
# reply language. A directive written in its own target language steers
# harder than an English one ("한국어로 응답하라" pulls toward Korean
# more strongly than "Reply in ko"). Keyed by reply-language code; the
# locale is the active `response_lang` when it is an explicit,
# translated code, else `en` (covers `auto` and any untranslated
# language). The small fixed structural strings live here in code
# alongside their English originals — single source — while the large
# style bodies stay externalized in styles/. The `## Prefs` heading
# itself stays a literal English anchor (other plugins reference it).
# Decision 43.
DIRECTIVES = {
    "en": {
        "reply": "- Reply to the user in **%s**.",
        "reply_auto": "- Reply in the same language the user writes "
                      "their message in.",
        "code": "- When writing or editing code, comments, "
                "documentation: use **%s**.",
        "code_auto": "- When writing or editing code, comments, "
                     "documentation: match the language already used in "
                     "the surrounding file / project.",
        "terms": "- Technical terms and code identifiers may stay "
                 "as-is regardless of reply language.",
        "style": "- Active response style: **%s**.",
    },
    "ko": {
        "reply": "- 사용자에게 **%s** 언어로 응답하라.",
        "reply_auto": "- 사용자가 메시지를 작성한 언어와 동일한 언어로 "
                      "응답하라.",
        "code": "- 코드 · 주석 · 문서를 작성하거나 편집할 때는 **%s** 를 "
                "사용하라.",
        "code_auto": "- 코드 · 주석 · 문서를 작성하거나 편집할 때는 해당 "
                     "파일 / 프로젝트에서 이미 쓰이는 언어에 맞춰라.",
        "terms": "- 기술 용어와 코드 식별자는 응답 언어와 무관하게 원문 "
                 "그대로 둬도 된다.",
        "style": "- 활성 응답 스타일: **%s**.",
    },
    "ja": {
        "reply": "- ユーザーには **%s** で応答すること。",
        "reply_auto": "- ユーザーがメッセージを書いた言語と同じ言語で"
                      "応答すること。",
        "code": "- コード・コメント・ドキュメントを書く / 編集するときは "
                "**%s** を使うこと。",
        "code_auto": "- コード・コメント・ドキュメントを書く / 編集する"
                     "ときは、対象ファイル / プロジェクトで既に使われて"
                     "いる言語に合わせること。",
        "terms": "- 技術用語とコード識別子は、応答言語に関わらず原文の"
                 "ままでよい。",
        "style": "- アクティブな応答スタイル: **%s**。",
    },
    "zh": {
        "reply": "- 用 **%s** 回复用户。",
        "reply_auto": "- 用用户撰写消息所使用的语言回复。",
        "code": "- 编写或编辑代码、注释、文档时使用 **%s**。",
        "code_auto": "- 编写或编辑代码、注释、文档时,与所在文件 / 项目"
                     "已使用的语言保持一致。",
        "terms": "- 技术术语和代码标识符可保持原样,与回复语言无关。",
        "style": "- 当前响应风格: **%s**。",
    },
    "ru": {
        "reply": "- Отвечай пользователю на **%s**.",
        "reply_auto": "- Отвечай на том же языке, на котором "
                      "пользователь пишет своё сообщение.",
        "code": "- При написании или редактировании кода, комментариев, "
                "документации используй **%s**.",
        "code_auto": "- При написании или редактировании кода, "
                     "комментариев, документации придерживайся языка, "
                     "уже используемого в данном файле / проекте.",
        "terms": "- Технические термины и идентификаторы кода могут "
                 "оставаться как есть, независимо от языка ответа.",
        "style": "- Активный стиль ответа: **%s**.",
    },
}


def _directives_locale():
    """Locale for the `## Prefs` directive lines — the active reply
    language when it is an explicit, translated code, else `en`."""
    if resp and resp.strip().lower() != "auto":
        loc = resp.strip().lower()
        if loc in DIRECTIVES:
            return loc
    return "en"


D = DIRECTIVES[_directives_locale()]
lines = ["## Prefs", ""]
if resp:
    lines.append(D["reply_auto"] if resp.strip().lower() == "auto"
                 else D["reply"] % resp)
if code:
    lines.append(D["code_auto"] if code.strip().lower() == "auto"
                 else D["code"] % code)
lines.append(D["terms"])
if style:
    lines.append(D["style"] % style)
lines.append("")

# inline the style file body — gated so we don't bloat every prompt
# (friendly.md ≈ 5–8 KB) but also don't fade out as a long session and
# its compactions erode the original SessionStart inject:
#
#   SessionStart      — full body (the session's baseline; CC also fires
#                       this on resume / clear / post-compact reloads,
#                       distinguishable by `source` ∈ {startup, resume,
#                       clear, compact})
#   PostCompact       — full body AFTER compaction completes — lands in
#                       the clean post-summary context (the rules are
#                       guaranteed present, not buried inside a summary).
#                       We do NOT also inject on PreCompact: that body
#                       would land inside the about-to-be-summarised
#                       context, so PostCompact is strictly stronger and
#                       PreCompact is pure duplicate (Decision 20).
#   UserPromptSubmit  — every Nth turn (configurable via refresh-every;
#                       default 10) refreshes the FULL body; every other
#                       turn injects the compact always-on micro-spec
#                       (`<style>.micro.md`) — a distilled every-turn
#                       form of the body, so the style never decays to a
#                       bare label between full refreshes (Decision 42)
#
# Resolution order: a language-localized variant for the active reply
# language wins, then the canonical file; user-custom (DATA) overrides
# shipped (ROOT) at each step.
def _should_full(event, prefs, payload, dd):
    # SessionStart's source="compact" path is intentionally skipped:
    # PostCompact fires alongside it for the same compaction event and is
    # the strictly cleaner post-summary moment. Letting both inject would
    # double the full body on every compaction (Decision 21, design.md).
    if event == "SessionStart" and payload.get("source") == "compact":
        return False
    if event in ("SessionStart", "PostCompact"):
        return True
    if event != "UserPromptSubmit":
        return False
    # Default refresh cadence: every 10 user turns (was 25 before D22).
    # User-felt observation: at 25 the friendly 7-element pattern faded
    # visibly between refreshes — the 1-line "Active response style:
    # friendly" directive on off-turns is a label, not an instruction.
    # 10 keeps the average fade window to ~5 turns, short enough that
    # style drift is rare without doubling token cost. Decision 22.
    try:
        n_every = int(prefs.get("refresh_every", 10))
    except Exception:
        n_every = 10
    if n_every <= 0:
        return False
    sid = str(payload.get("session_id") or "")
    if not sid:
        return False
    turns_dir = os.path.join(dd, "turns")
    try:
        os.makedirs(turns_dir, exist_ok=True)
    except Exception:
        return False
    tp = os.path.join(turns_dir, sid + ".json")
    try:
        ts = json.load(open(tp, encoding="utf-8"))
    except Exception:
        ts = {"n": 0}
    ts["n"] = ts.get("n", 0) + 1
    try:
        with open(tp, "w", encoding="utf-8") as f:
            json.dump(ts, f)
    except Exception:
        pass
    return ts["n"] > 0 and ts["n"] % n_every == 0


def _resolve_md(name):
    """Resolve a style body file. Resolution order, first hit wins:
      DATA/styles/<name>.<resp>.md (user-customised, language-localised)
      ROOT/styles/<name>.<resp>.md (shipped, language-localised)
      DATA/styles/<name>.md        (user-customised, canonical EN)
      ROOT/styles/<name>.md        (shipped, canonical EN)
    Returns "" if no file resolves. Used for both the style itself and
    the shared `_common` body (Decision 23)."""
    root = plugin_root()
    cands = []
    if resp:
        cands += [os.path.join(dd, "styles", "%s.%s.md" % (name, resp)),
                  os.path.join(root, "styles", "%s.%s.md" % (name, resp))]
    cands += [os.path.join(dd, "styles", "%s.md" % name),
              os.path.join(root, "styles", "%s.md" % name)]
    for cand in cands:
        if os.path.isfile(cand):
            try:
                return open(cand, "r", encoding="utf-8",
                            errors="replace").read().strip()
            except OSError:
                return ""
    return ""


# Level-2 header of the `_common` language-tracking section, in each of
# the 5 shipped locales. No other `## ` header in `_common.*.md` carries
# a language word, so matching one uniquely locates the section. If a
# header is ever reworded the strip degrades safely — the section simply
# stays (the pre-A1 behaviour), it never mis-strips. Decision 41.
_LANG_TRACK_HDR = re.compile(
    r"(?im)^##\s+.*(?:language|언어|言語|语言|язык)")


def _strip_lang_tracking(body):
    """Drop the `## Language-tracking` section from a `_common` body.

    That section tells the model to follow the user's *input* language —
    correct only when `response_lang` is `auto`. With an explicit
    `response_lang` it directly contradicts the `Reply to the user in
    **<lang>**` directive injected above, and the model can drift to the
    input language on the contradiction. So we remove it before the body
    is injected whenever an explicit reply language is set. The section
    is sliced from its level-2 header to the next level-2 header / `---`
    rule / end-of-body. Decision 41."""
    m = _LANG_TRACK_HDR.search(body)
    if not m:
        return body
    rest = body[m.end():]
    nxt = re.search(r"(?m)^(?:##\s|---\s*$)", rest)
    end = m.end() + nxt.start() if nxt else len(body)
    return (body[:m.start()] + body[end:]).rstrip()


if style and _should_full(event, prefs, payload, dd):
    # Compose the full body from two layers:
    #   _common.md  — universal rules (emoji tier enum, acronym first-use,
    #                 language-tracking) shared across all styles
    #   <style>.md  — style-specific body (e.g. friendly's 7-element
    #                 pattern, Tier-A scope, measurement axes)
    # The common block is prepended so per-style content can override or
    # extend it. Decision 23.
    common_body = _resolve_md("_common")
    # An explicit reply language makes the `_common` language-tracking
    # section a context contradiction — strip it. `auto` keeps it.
    if common_body and resp and resp.strip().lower() != "auto":
        common_body = _strip_lang_tracking(common_body)
    style_body = _resolve_md(style)
    body = "\n\n".join(b for b in (common_body, style_body) if b)
    if body:
        lines.append("### Response style — %s" % style)
        lines.append("")
        lines.append(body)
        lines.append("")
elif style:
    # Non-refresh UserPromptSubmit turn. Instead of leaving the style as
    # the bare 4-word "Active response style" label above (a name, not an
    # instruction — the model drifts off it within a few turns), inject
    # the compact always-on micro-spec: a distilled, every-turn form of
    # the style body. Resolves `<style>.micro[.<lang>].md`; absent → the
    # label-only pre-B1 behaviour, no breakage. Decision 42.
    micro = _resolve_md("%s.micro" % style)
    if micro:
        lines.append(micro)
        lines.append("")

ctx = "\n".join(lines).rstrip() + "\n"
print(json.dumps({
    "hookSpecificOutput": {"hookEventName": event, "additionalContext": ctx}
}))
