---
description: /cloud <args> — passthrough to `hexa cloud` (structured-argv remote GPU dispatch — rent · run · poll · harvest · down across providers). Subverbs rent · run · poll · tail · copy · pods · down. Triggers — "클라우드 GPU", "hexa cloud", "GPU 빌려", "원격 디스패치", "pod 띄워", "rent gpu", "cloud dispatch", "/cloud".
argument-hint: "<rent|run|poll|tail|pods|down|...> [args]"
allowed-tools: Bash
---

!`command -v hexa >/dev/null 2>&1 && hexa cloud $ARGUMENTS || echo "hexa CLI not found — install dancinlab/hexa-lang (~/.hx/bin/hexa on PATH)"`
