<h1 align="center">🏍️ sidecar</h1>

<p align="center"><strong>Проверенные в бою ограждения для Claude Code — портированы из hexa-native агента.</strong></p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Status" src="https://img.shields.io/badge/status-v0.1.0-orange">
  <img alt="Marketplace" src="https://img.shields.io/badge/claude--code-plugin_marketplace-informational">
  <img alt="Sibling" src="https://img.shields.io/badge/sibling-wilson-blueviolet">
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">中文</a> · <strong>Русский</strong> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

---

> **Сайдкар, который пристёгивает ограждения к Claude Code, не трогая хост.**
> Не самописные сниппеты хуков, а набор guard-ов, проверенный в продакшене
> hexa-native агентом [`wilson`](https://github.com/dancinlab/wilson),
> портированный в маркетплейс плагинов Claude Code.

`sidecar` — это **репозиторий-маркетплейс плагинов**, который сбоку
подключает governance к хост-харнессу (Claude Code), не модифицируя его. Он
отображает ценность плагинов `governance` / `guard-*` / `agents-md` из wilson
на примитивы хуков Claude Code один-к-одному.

## Why sidecar?

- **Портированные, проверенные guard-ы** — не случайная куча хуков из
  dotfiles, а правила запрета, проверенные в продакшене в бандле wilson
  (опасный путь, SSOT только-добавление, доменный lint).
- **Не вторгается в хост** — без правок конфигурации или ядра Claude Code.
  Только установка / включение / отключение из маркетплейса.
- **Вход в wilson** — попробуйте governance из wilson внутри Claude Code,
  затем перейдите к полному `wilson` (hexa-native, plugin-everything).

## Plugins

| Плагин | Хук CC | Поведение |
|---|---|---|
| `wilson-guards` | `PreToolUse` (`Write`·`Edit`·`MultiEdit`) | Бандл из 3 guard-ов рабочего процесса dancinlab — `ssot-lock` (запрет правки файла, совпавшего с пунктом `ssot-lock:` в ближайшем `AGENTS.md ## Governance`), `tape-append-only` (трасса `.tape` только-добавление — запрет переписывающего Edit / перезаписывающего Write), `domain-lint` (корневой `UPPERCASE.md`-роадмап темы должен быть `Head + --- + ## Log`) — standalone-порт, **работает**; каждый guard INERT, если его соглашения нет (opt out: `SIDECAR_NO_GUARDS=1`) |
| `wilson-ssot` | `SessionStart` · `UserPromptSubmit` | Внедрение в контекст SSOT обходом вверх по `AGENTS.md` (эквивалент `agents-md` из wilson) — **работает** |
| `wilson-readme-format` | `PreToolUse` (`Write`·`Edit`) | Запрет корневого `README.md`, нарушающего readme-format (эмодзи в прозе / много-глифный H1 / неанглийский At-a-glance / `####`) — standalone-порт wilson `guard-readme-format`, **работает** |
| `wilson-hexa-verify` | `PreToolUse` + `PostToolUse` (`Bash`) | PreToolUse: запрет Bash-вызовов не-hexa верификаторов (sympy/PyPhi/wolframscript/mathematica) → перенаправление на hexa CLI. PostToolUse: когда `hexa verify` сообщает о новом SUPPORTED-уравнении (🔵/🟢), **автоматически открывает PR** в `dancinlab/hexa-lang`, впекая уравнение во встроенный atlas бинарника (заполняет заглушку шага `pr` у `hexa atlas promote`; PR оставляется на ревью, не авто-merge) — при невозможности откатывается на подсказку workflow `worktree-pr`. Standalone-порт + расширение wilson `guard-hexa-verify`, **работает**. ⚠ INERT, если `hexa` нет в PATH |
| `wilson-dangerous-path` | `PreToolUse` (`Write`·`Edit`) | Запрет Write/Edit/MultiEdit по защищённым системным путям (`/etc` `/usr` `/bin` `/sbin` `/System` `/.git` `/.gnupg`) и путям учётных данных (`~/.ssh`·`~/.aws`·gh config·keychain·credentials) — standalone-порт wilson `guard-dangerous-path`, **работает** |
| `wilson-git-guard` | `PreToolUse` (`Bash`) | Запрет force-push — `git push` с `--force`/`-f`/`+refspec` (и `--force-with-lease`, если не задан `SIDECAR_ALLOW_FORCE_WITH_LEASE=1`) блокируется — standalone-порт wilson `git-guard`, **работает** |
| `wilson-secret-guard` | `PreToolUse` (`Write`·`Edit`·`MultiEdit`) + `UserPromptSubmit` | Запрет записи реального файла `.env` или контента с высоконадёжными учётными данными (токены AWS / GitHub / GitLab / Anthropic / OpenAI / Slack / Google / Stripe, приватные ключи PEM); блокирует промпт, в который вставлены такие данные — только высоконадёжные паттерны, почти ноль ложных срабатываний, **работает** (opt out: `SIDECAR_NO_SECRET_GUARD=1`) |
| `wilson-bash-guard` | `PreToolUse` (`Bash`) | Запрет катастрофических shell-команд — pipe-to-shell (`curl … \| sh`), `rm -rf` корневого/домашнего пути, fork bomb, разрушители диска (`dd of=/dev/disk`·`mkfs`·`>/dev/sd*`), рекурсивный `chmod`/`chown` по `/` `~` `.` — только высоконадёжные деструктивные паттерны, почти ноль ложных срабатываний, **работает** (opt out: `SIDECAR_NO_BASH_GUARD=1`) |
| `wilson-prefs` | команда `/wilson-prefs:prefs` + `SessionStart`·`UserPromptSubmit` | Задаёт язык ответа / язык кода / стиль ответа → сохраняется в данных плагина, внедряется в контекст. Standalone-порт wilson `prefs` — **работает** (ничего не внедряет, пока не задано) |
| `wilson-output-trim` | `PreToolUse` (`Bash`) | Переписывает Bash-команду (`updatedInput`), чтобы stdout прошёл фильтр TF-IDF значимости + MinHash дедупликации до попадания в модель — порт духа wilson `compaction-prefilter`, **работает** (малый вывод дословно · код выхода сохранён через `pipefail`) |
| `wilson-pool` | команда `/wilson-pool:pool` + `PreToolUse`(`Bash`) + `SessionStart`·`UserPromptSubmit` | Маршрутизирует тяжёлые Bash-команды на **ростер удалённых хостов** по ssh — у каждого хоста тег платформы, поэтому macOS-only / Linux-only команда идёт на хост этой платформы, остальное распределяется round-robin — порт духа ростера wilson `pool`, **работает**. ⚠ OFF, пока в ростере нет ≥1 хоста и не задан workdir · только Bash · синхронизация удалённого workdir на каждом хосте — **ответственность пользователя** (CC-хук не может смонтировать fs, как 9P/sshfs у wilson) |
| `wilson-lsp` | LSP-серверы `.lsp.json` (не hook) | `.hexa` → `hexa lsp` · `.tape`·`.n6`·`.hxc`·`.kosmos` → канонические серверы из repo каждого формата (`tape-lsp`/`n6-lsp`/`hxc-lsp`/`kosmos-lsp`, поставляются в `github.com/dancinlab/{tape,n6,hxc,kosmos}`). graceful — сервер не в PATH просто виден в `/plugin` Errors. Жизненный цикл LSP управляется CC (переключать через `/plugin`, не `/sidecar`) |
| `sidecar` | команда `/sidecar` (контроль) | Рантайм on/off остальных плагинов — `/sidecar status\|on\|off <name>` (имена: ssot readme-format hexa-verify dangerous-path git-guard secret-guard bash-guard prefs output-trim pool guards или `all`). Общий `~/.claude/sidecar/disabled.json` проверяется каждым hook · сохраняется между сессиями · дополняет нативный `/plugin` |
| `worktree-pr` | команда `/worktree-pr:wt` (workflow) | Безопасный процесс **worktree → PR → merge → очистка** — `start <name>` (изолированный worktree+ветка от ветки origin по умолчанию), `ship <name> "<title>"` (push + открыть PR), `finish <name>` (merge PR + удалить worktree + удалить ветку + обновить base), `status`, `abort`. Никогда не трогает основное рабочее дерево или ветку параллельной сессии |

Кандидаты дорожной карты: `wilson-memory` (файловая память
SessionStart/SessionEnd), `wilson-recap` (резюме PreCompact/SessionEnd).

## Install

```bash
# 1. зарегистрировать маркетплейс
/plugin marketplace add dancinlab/sidecar

# 2. установить нужные плагины — каждый независим
/plugin install wilson-secret-guard@sidecar    # блок живых секретов / записи .env
/plugin install wilson-bash-guard@sidecar      # блок катастрофических Bash-команд
/plugin install wilson-dangerous-path@sidecar  # защита системных / credential путей
/plugin install wilson-git-guard@sidecar       # блок force-push
/plugin install wilson-readme-format@sidecar   # lint-guard для repo-root README
/plugin install wilson-hexa-verify@sidecar     # не-hexa верификаторы → перенаправить на hexa
/plugin install wilson-guards@sidecar          # бандл ssot-lock / tape / domain-lint
/plugin install wilson-ssot@sidecar            # внедрение SSOT из AGENTS.md
/plugin install wilson-prefs@sidecar           # язык ответа / код / стиль
/plugin install wilson-output-trim@sidecar     # фильтр значимости Bash stdout
/plugin install wilson-pool@sidecar            # тяжёлый Bash → на удалённый хост
/plugin install wilson-lsp@sidecar             # LSP для .hexa / .tape / .n6 / .hxc / .kosmos
/plugin install worktree-pr@sidecar            # команда-workflow /worktree-pr:wt
/plugin install sidecar@sidecar                # /sidecar — рантайм on/off контроль
```

Просматривайте и переключайте плагины в любой момент через `/plugin`. После нового релиза обновляйтесь:

```bash
/plugin marketplace update sidecar
/plugin update
```

### Включить всё сразу

Вместо `/plugin install` для каждого плагина объявите маркетплейс и плагины в
`settings.json` (`~/.claude/settings.json` — для всех проектов, `.claude/settings.json` —
для одного) — Claude Code установит и включит все перечисленные плагины при следующем
запуске:

```json
{
  "extraKnownMarketplaces": {
    "sidecar": { "source": { "source": "github", "repo": "dancinlab/sidecar" } }
  },
  "enabledPlugins": {
    "wilson-secret-guard@sidecar": true,
    "wilson-bash-guard@sidecar": true,
    "wilson-dangerous-path@sidecar": true,
    "wilson-git-guard@sidecar": true,
    "wilson-readme-format@sidecar": true,
    "wilson-hexa-verify@sidecar": true,
    "wilson-guards@sidecar": true,
    "wilson-ssot@sidecar": true,
    "wilson-prefs@sidecar": true,
    "wilson-output-trim@sidecar": true,
    "wilson-pool@sidecar": true,
    "wilson-lsp@sidecar": true,
    "worktree-pr@sidecar": true,
    "sidecar@sidecar": true
  }
}
```

## Status

**v0.1.0 — первый guard портирован.** `wilson-ssot` (обход вверх по AGENTS.md) и
`wilson-readme-format` (README-guard из 4 линтов, точный standalone-порт
wilson `guard-readme-format`) **работают**. `wilson-guards` теперь
**standalone-порт** — три guard-а (`ssot-lock` / `tape-append-only` /
`domain-lint`) напрямую переписывают предикаты wilson без зависимости от
бинарника. Каждый guard **действует, только если его соглашение реально
присутствует** в проекте (нет пункта `ssot-lock:` / нет файла `.tape` / нет
корневого роадмапа темы → нулевое поведение), поэтому бандл безопасен для
обычной установки и осмыслен лишь внутри рабочего процесса в стиле dancinlab.

## Repo layout

```
sidecar/
├── .claude-plugin/marketplace.json   # манифест маркетплейса
├── plugins/
│   ├── wilson-guards/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # проводка PreToolUse (Write|Edit)
│   │   ├── bin/guard.sh              # обёртка hook
│   │   └── bin/_guards.py            # ssot-lock + tape-append-only + domain-lint (работает)
│   ├── wilson-ssot/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # проводка SessionStart/UserPromptSubmit
│   │   └── bin/_ssot.py              # обход вверх по AGENTS.md (работает)
│   ├── wilson-readme-format/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # проводка PreToolUse (Write|Edit)
│   │   └── bin/_readme_format.py     # README-guard из 4 линтов (работает)
│   ├── wilson-hexa-verify/
│   │   ├── hooks/hooks.json          # проводка PreToolUse + PostToolUse (Bash)
│   │   ├── bin/_hexa_verify.py       # guard не-hexa верификаторов (работает)
│   │   └── bin/_verify_watch.py      # новое уравнение → PR в hexa-lang (работает)
│   ├── wilson-dangerous-path/
│   │   ├── hooks/hooks.json          # проводка PreToolUse (Write|Edit)
│   │   └── bin/_dangerous_path.py    # guard защищённых путей (работает)
│   ├── wilson-git-guard/
│   │   ├── hooks/hooks.json          # проводка PreToolUse (Bash)
│   │   └── bin/_git_guard.py         # guard force-push (работает)
│   ├── wilson-secret-guard/
│   │   ├── hooks/hooks.json          # PreToolUse(Write|Edit)+UserPromptSubmit
│   │   ├── bin/secret-guard.sh       # обёртка hook
│   │   └── bin/_secret_guard.py      # guard .env + токенов учётных данных (работает)
│   ├── wilson-bash-guard/
│   │   ├── hooks/hooks.json          # проводка PreToolUse (Bash)
│   │   ├── bin/bash-guard.sh         # обёртка hook
│   │   └── bin/_bash_guard.py        # guard катастрофических команд (работает)
│   ├── wilson-prefs/
│   │   ├── commands/prefs.md         # слэш-команда /wilson-prefs:prefs
│   │   ├── bin/_prefs.py             # set/show настроек (работает)
│   │   ├── bin/_inject.py            # внедрение настроек в контекст (работает)
│   │   └── styles/friendly.{md,*.md} # образцы стиля ответа (5 языков)
│   ├── wilson-output-trim/
│   │   ├── hooks/hooks.json          # проводка PreToolUse (Bash)
│   │   ├── bin/_trim.py              # переписывает команду через updatedInput (работает)
│   │   └── bin/_salience.py          # фильтр TF-IDF + MinHash (работает)
│   ├── wilson-pool/
│   │   ├── commands/pool.md          # слэш-команда /wilson-pool:pool
│   │   ├── hooks/hooks.json          # проводка PreToolUse(Bash)+SessionStart
│   │   ├── bin/_route.py             # тяжёлая команда → ssh-переписывание (работает)
│   │   └── bin/_inject.py            # блок ## Pool (работает)
│   ├── wilson-lsp/
│   │   ├── .claude-plugin/plugin.json
│   │   └── .lsp.json                 # hexa lsp + LSP repo tape/n6/hxc/kosmos
│   ├── sidecar/                      # контрольный плагин
│   │   ├── commands/sidecar.md       # /sidecar status|on|off <name>
│   │   └── bin/_sidecar.py           # пишет общий disabled.json (работает)
│   └── worktree-pr/
│       ├── commands/wt.md            # /worktree-pr:wt start|ship|finish|...
│       └── bin/worktree-pr.sh        # worktree → PR → merge → очистка (работает)
└── LICENSE
```

## Sibling

- 🐦 [`dancinlab/wilson`](https://github.com/dancinlab/wilson) — hexa-native ИИ-агент для кодирования. Оригинал guard-ов, которые портирует sidecar.

## License

MIT. См. [LICENSE](LICENSE).
