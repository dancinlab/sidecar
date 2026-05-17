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
│   └── wilson-readme-format/
│       ├── .claude-plugin/plugin.json
│       ├── hooks/hooks.json          # проводка PreToolUse (Write|Edit)
│       └── bin/_readme_format.py     # README-guard из 4 линтов (работает)
└── LICENSE
```

## Sibling

- 🐦 [`dancinlab/wilson`](https://github.com/dancinlab/wilson) — hexa-native ИИ-агент для кодирования. Оригинал guard-ов, которые портирует sidecar.

## License

MIT. См. [LICENSE](LICENSE).
