---
name: cloud
description: Wrap `hexa cloud` for runpod GPU dispatch — structured argv, never raw ssh/scp (commons g8). Subverbs preflight · run · nohup · poll · copy-to · copy-from. Triggers — "runpod dispatch", "GPU pod에 돌려", "학습 cloud에 던져", "pod 결과 가져와", "OOM 사전체크", "preflight".
allowed-tools: Bash
---

@D cloud := "wrap `hexa cloud` for runpod dispatch" :: skill
  do   = "`hexa cloud {preflight|run|nohup|poll|copy-to|copy-from}` — structured argv (commons g8)"
  dont = "raw ssh/scp for runpod · skip the preflight mem-budget check before pod spinup"
