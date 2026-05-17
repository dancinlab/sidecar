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
| `wilson-guards` | `PreToolUse` (`Bash`·`Write`·`Edit`) | Запрет нарушений: опасный-путь / SSOT-только-добавление / доменный-lint |
| `wilson-ssot` | `SessionStart` · `UserPromptSubmit` | Внедрение в контекст SSOT обходом вверх по `AGENTS.md` (эквивалент `agents-md` из wilson) — **работает** |
| `wilson-readme-format` | `PreToolUse` (`Write`·`Edit`) | Запрет корневого `README.md`, нарушающего readme-format (эмодзи в прозе / много-глифный H1 / неанглийский At-a-glance / `####`) — standalone-порт wilson `guard-readme-format`, **работает** |
| `wilson-hexa-verify` | `PreToolUse` (`Bash`) | Запрет Bash-вызовов не-hexa верификаторов (sympy/PyPhi/wolframscript/mathematica) → перенаправление на hexa CLI — standalone-порт wilson `guard-hexa-verify`, **работает**. ⚠ INERT, если `hexa` нет в PATH |
| `wilson-dangerous-path` | `PreToolUse` (`Write`·`Edit`) | Запрет Write/Edit/MultiEdit по защищённым системным путям (`/etc` `/usr` `/bin` `/sbin` `/System` `/.git` `/.gnupg`) и путям учётных данных (`~/.ssh`·`~/.aws`·gh config·keychain·credentials) — standalone-порт wilson `guard-dangerous-path`, **работает** |
| `wilson-git-guard` | `PreToolUse` (`Bash`) | Запрет force-push — `git push` с `--force`/`-f`/`+refspec` (и `--force-with-lease`, если не задан `SIDECAR_ALLOW_FORCE_WITH_LEASE=1`) блокируется — standalone-порт wilson `git-guard`, **работает** |
| `wilson-prefs` | команда `/wilson-prefs:prefs` + `SessionStart`·`UserPromptSubmit` | Задаёт язык ответа / язык кода / стиль ответа → сохраняется в данных плагина, внедряется в контекст. Standalone-порт wilson `prefs` — **работает** (ничего не внедряет, пока не задано) |
| `wilson-output-trim` | `PreToolUse` (`Bash`) | Переписывает Bash-команду (`updatedInput`), чтобы stdout прошёл фильтр TF-IDF значимости + MinHash дедупликации до попадания в модель — порт духа wilson `compaction-prefilter`, **работает** (малый вывод дословно · код выхода сохранён через `pipefail`) |
| `wilson-pool` | команда `/wilson-pool:pool` + `PreToolUse`(`Bash`) + `SessionStart`·`UserPromptSubmit` | Маршрутизирует тяжёлые Bash-команды на удалённый хост по ssh — порт духа wilson `pool`, **работает**. ⚠ OFF, пока не заданы host+workdir · только Bash · синхронизация удалённого workdir — **ответственность пользователя** (CC-хук не может смонтировать fs, как 9P/sshfs у wilson) |
| `wilson-lsp` | LSP-серверы `.lsp.json` (не hook) | `.hexa` → `hexa lsp` · `.tape`·`.n6`·`.hxc`·`.kosmos` → канонические серверы из repo каждого формата (`tape-lsp`/`n6-lsp`/`hxc-lsp`/`kosmos-lsp`, поставляются в `github.com/dancinlab/{tape,n6,hxc,kosmos}`). graceful — сервер не в PATH просто виден в `/plugin` Errors. Жизненный цикл LSP управляется CC (переключать через `/plugin`, не `/sidecar`) |
| `sidecar` | команда `/sidecar` (контроль) | Рантайм on/off остальных плагинов — `/sidecar status\|on\|off <name>` (имена: ssot readme-format hexa-verify prefs output-trim pool guards или `all`). Общий `~/.claude/sidecar/disabled.json` проверяется каждым hook · сохраняется между сессиями · дополняет нативный `/plugin` |

Кандидаты дорожной карты: `wilson-memory` (файловая память
SessionStart/SessionEnd), `wilson-recap` (резюме PreCompact/SessionEnd).

## Install

```bash
/plugin marketplace add dancinlab/sidecar
/plugin install wilson-guards@sidecar
/plugin install wilson-ssot@sidecar
```

## Status

**v0.1.0 — первый guard портирован.** `wilson-ssot` (обход вверх по AGENTS.md) и
`wilson-readme-format` (README-guard из 4 линтов, точный standalone-порт
wilson `guard-readme-format`) **работают**. `wilson-guards` пока **заглушка**
(passthrough — не фабрикует ложные блокировки). Поскольку wilson — единый
статический бинарник (dispatch плагинов — внутренний ABI), оставшийся путь
портирования `wilson-guards` будет одним из двух, ещё не решено:

1. **через harness-rpc** — тонкая обёртка, вызывающая `harness-rpc` из wilson
   (JSONL stdin/stdout) для конкретного действия guard-плагина.
2. **standalone-порт** — переписать здесь напрямую предикаты guard-ов
   (опасный путь, SSOT только-добавление, доменный lint), без зависимости от
   бинарника wilson (маркетплейс работает сам по себе).

До принятия решения хук пропускает без запрета — он **не фабрикует ложные
блокировки** (честно по дизайну).

## Repo layout

```
sidecar/
├── .claude-plugin/marketplace.json   # манифест маркетплейса
├── plugins/
│   ├── wilson-guards/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # проводка PreToolUse
│   │   └── bin/guard.sh              # заглушка (TODO: порт wilson)
│   ├── wilson-ssot/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # проводка SessionStart/UserPromptSubmit
│   │   └── bin/_ssot.py              # обход вверх по AGENTS.md (работает)
│   ├── wilson-readme-format/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # проводка PreToolUse (Write|Edit)
│   │   └── bin/_readme_format.py     # README-guard из 4 линтов (работает)
│   ├── wilson-hexa-verify/
│   │   ├── hooks/hooks.json          # проводка PreToolUse (Bash)
│   │   └── bin/_hexa_verify.py       # guard не-hexa верификаторов (работает)
│   ├── wilson-dangerous-path/
│   │   ├── hooks/hooks.json          # проводка PreToolUse (Write|Edit)
│   │   └── bin/_dangerous_path.py    # guard защищённых путей (работает)
│   ├── wilson-git-guard/
│   │   ├── hooks/hooks.json          # проводка PreToolUse (Bash)
│   │   └── bin/_git_guard.py         # guard force-push (работает)
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
│   └── sidecar/                      # контрольный плагин
│       ├── commands/sidecar.md       # /sidecar status|on|off <name>
│       └── bin/_sidecar.py           # пишет общий disabled.json (работает)
└── LICENSE
```

## Sibling

- 🐦 [`dancinlab/wilson`](https://github.com/dancinlab/wilson) — hexa-native ИИ-агент для кодирования. Оригинал guard-ов, которые портирует sidecar.

## License

MIT. См. [LICENSE](LICENSE).
