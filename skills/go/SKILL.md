---
name: go
description: /go — proceed with the most-recently proposed action / continue the paused flow without further confirmation. Bare "go" single-word message also catches as natural-language alias.
---

@D go := "proceed with last proposal · no re-question" :: skill [active]
  do   = "re-read last agent message · identify proposal/pause/next-step · execute verbatim · stateless continuation token"
  dont = "make a new plan · re-ask the same question · pivot to unrelated work · proceed when no proposal exists (ask one short line instead)"
