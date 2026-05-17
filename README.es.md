<h1 align="center">🏍️ sidecar</h1>

<p align="center"><strong>Barreras de seguridad probadas en producción para Claude Code — portadas desde un agente hexa-native.</strong></p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Status" src="https://img.shields.io/badge/status-v0.0.0_scaffold-orange">
  <img alt="Marketplace" src="https://img.shields.io/badge/claude--code-plugin_marketplace-informational">
  <img alt="Sibling" src="https://img.shields.io/badge/sibling-wilson-blueviolet">
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh.md">中文</a> · <strong>Español</strong>
</p>

---

> **Un sidecar que acopla barreras de seguridad a Claude Code sin tocar el host.**
> No son fragmentos de hooks hechos a mano, sino el conjunto de guardas probado
> en producción por el agente hexa-native
> [`wilson`](https://github.com/dancinlab/wilson), portado al marketplace de
> plugins de Claude Code.

`sidecar` es un **repo de marketplace de plugins** que monta lateralmente la
gobernanza sobre el harness host (Claude Code) sin modificarlo. Mapea el valor
de los plugins `governance` / `guard-*` / `agents-md` de wilson a las
primitivas de hooks de Claude Code de forma 1:1.

## Why sidecar?

- **Guardas portadas y probadas** — no un montón de hooks de dotfiles ad-hoc,
  sino reglas de denegación probadas en producción en el bundle de wilson
  (ruta peligrosa, SSOT solo-anexado, lint de dominio).
- **No invasivo para el host** — sin editar la configuración ni el núcleo de
  Claude Code. Solo instalar / activar / desactivar desde el marketplace.
- **Una rampa hacia wilson** — prueba la gobernanza de wilson dentro de Claude
  Code y luego gradúate al `wilson` completo (hexa-native, plugin-everything).

## Plugins

| Plugin | Hook de CC | Comportamiento |
|---|---|---|
| `wilson-guards` | `PreToolUse` (`Bash`·`Write`·`Edit`) | Denegar violaciones de ruta-peligrosa / SSOT-solo-anexado / lint-de-dominio |
| `wilson-ssot` | `SessionStart` · `UserPromptSubmit` | Inyectar como contexto el SSOT de `AGENTS.md` recorriendo hacia arriba (equivalente a `agents-md` de wilson) |

Candidatos del roadmap: `wilson-memory` (memoria de archivo
SessionStart/SessionEnd), `wilson-recap` (resumen PreCompact/SessionEnd).

## Install

```bash
/plugin marketplace add dancinlab/sidecar
/plugin install wilson-guards@sidecar
/plugin install wilson-ssot@sidecar
```

## Status

**v0.0.0 — scaffold (andamiaje).** Los manifiestos del marketplace/plugins y el
cableado de hooks están listos, pero los wrappers de `bin/` son **stubs**
(actualmente passthrough, con TODOs documentados). Como wilson es un único
binario estático (el dispatch de plugins es una ABI interna), la ruta real de
portado será una de dos, por decidir:

1. **vía harness-rpc** — un wrapper delgado que llama al `harness-rpc` de
   wilson (JSONL stdin/stdout) para una acción de plugin guard específica.
2. **port standalone** — reimplementar aquí directamente los predicados de las
   guardas (ruta peligrosa, SSOT solo-anexado, lint de dominio), sin
   dependencia del binario wilson (el marketplace funciona por sí solo).

Hasta que se decida, el hook pasa sin denegar — **no fabrica bloqueos falsos**
(honesto por diseño).

## Repo layout

```
sidecar/
├── .claude-plugin/marketplace.json   # manifiesto del marketplace
├── plugins/
│   ├── wilson-guards/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # cableado PreToolUse
│   │   └── bin/guard.sh              # stub (TODO: port de wilson)
│   └── wilson-ssot/
│       ├── .claude-plugin/plugin.json
│       ├── hooks/hooks.json          # cableado SessionStart/UserPromptSubmit
│       └── bin/_ssot.py              # walk-up de AGENTS.md (funcional)
└── LICENSE
```

## Sibling

- 🐦 [`dancinlab/wilson`](https://github.com/dancinlab/wilson) — el agente de codificación IA hexa-native. El original de las guardas que sidecar porta.

## License

MIT. Véase [LICENSE](LICENSE).
