---
name: matrix
description: Axis cross-product coverage tracker — `/matrix` manages a combinatorial coverage matrix (axis × axis hypothesis/experiment grid) via a cwd-local `MATRIX.tape` SSOT. Two modes — SQUARE (one axis set; cells = upper-triangle + diagonal pairs) and RECTANGULAR (separate `rows` × `cols`, e.g. BIO mechanisms × anima axes). Verbs — bare/`show` = render grid (small) or per-row coverage bars (large) + coverage % + next unfilled cells · `axes <a…>` = square mode · `rows <a…>` / `cols <a…>` = rectangular mode · `done <i> <j>` = mark a cell filled (explicit toggle like /domain milestones — square pairs auto-sorted for a canonical key) · `undone <i> <j>` · `next [N]` = list next N unfilled cells · `help`. Use to drive a systematic combinatorial sweep (fill row-by-row) and never lose track of which cross-pairs remain. Triggers — "/matrix", "매트릭스", "matrix 만들어", "교차곱 매트릭스", "cross-product matrix", "coverage 추적", "다음 셀 뭐야", "어디 채울 차례".
allowed-tools: Bash
---

@D matrix := "axis cross-product coverage tracker — MATRIX.tape SSOT · square or rectangular" :: skill
  do   = "`/matrix axes <a…>` (square) or `rows`/`cols` (rectangular) · `done <i> <j>` toggles a cell · bare renders grid + bars + next unfilled"
  dont = "track combinatorial coverage in prose each round when /matrix renders the grid + next-cell from a declarative SSOT"
