# ステップバイステップ決定ゲート — canonical リファレンス

> sidecar プラグイン **`wilson-decision-gate`**（wilson `step-by-step-decision-gate` ガバナンス原則の standalone 移植）の long-form サンプル。
> デフォルト = プラグイン導入時 **ON**。切るには `/wilson-decision-gate off`、`/sidecar off decision-gate`、または `SIDECAR_NO_DECISION_GATE=1`。
> このファイルは canonical な *適用方法* リファレンス — 一度読み、多決定タスク開始時のテンプレートとして使う。`/wilson-decision-gate sample [en|ko|ja|zh|ru]` で出力。

## この原則が効く場面

この原則は **多決定作業** — ユーザーが選ぶ分岐点が N 個ある作業 — で発火する。例:

- 新しい spec のランディング（決定 = 名称、falsifier セット、強制レイヤ、監査形式、…）
- スコープ選択のある非自明なリファクタ（どのファイルを in/out、抽象の形、移行順序、deprecation 期間、…）
- API 設計（動詞名、パラメータ形、エラーモデル、バージョニング方針、…）
- 移行計画（ステップ順序、ロールバックゲート、中間状態の形、…）
- 実行可能なアプローチが 2 つ以上出る Plan-mode 作業すべて

ワンショット作業（単一バグ修正、短い Q&A、機械的編集）では **発火しない** — 無効化すべきバッチが無い。

## 「1 決定 = 1 ユーザーゲート」の意味

各分岐点でエージェントは **必ず**:

1. **分岐点を個別に提示** — 2 つの決定を 1 つの yes/no にまとめない。
2. **選択肢を列挙**（2 つ以上）各 1 行説明。
3. **1 つ推奨**（`### 🎯 추천:` または同等ヘッダ）+ **3 個以上の箇条書き根拠**を「**근거**:」/「**Why**:」の下に。
4. 次の決定へ進む前に **ユーザーの選択を待つ**。可能なら `AskUserQuestion`、無ければ停止して平文で質問。
5. 進めながら `design.md`（またはセッションログ）に **選択 + 根拠を記録** — `/wilson-decision-gate decide "<選択>" "<根拠>"` が下記形式で append。

監査証跡（`design.md` 決定セクション + 該当時は spec / PR 相互リンク）は **成果物の一部**であり後付けではない。

## バッチ禁止の理由

バッチは N 個の選択を 1 つの yes/no に潰す。具体的に:

- ほとんどの選択が未熟考で通る — ユーザーは見出しだけ読み「全部 yes」、重い選択がゴム印化。
- 後知恵の責任転嫁が不可避 — 束ねた選択の一つが外れたとき「yes と言ったろ」は脆い監査アンカー。
- ゲートがゲートでなくなる — 確認の演劇になる。step-by-step の核心は各分岐点を自身の決定まで遅くすること。

ゆえにこの原則が一般化するプロトコルはハードルールを定義する: **ゲート毎に選択 1 個超 → ブロック**。

## 決定レコード形式

design.md / セッションログ内で、各決定はこう着地する:

```markdown
### 決定 N — <1 行説明>
- **picked**: ⭐ <選択肢ラベル>（複数ランキング時 🥇 / ✅ / ❌）
- **根拠**:
  - <箇条 1 — なぜ代替より優れるか>
  - <箇条 2 — どのトレードオフを受け入れるか>
  - <箇条 3 — 後で何がこの選択を falsify するか>
```

3 箇条が最小。重要な決定はもっと書いてよい。それ未満 = 根拠が薄く、3 週間後の読者（＝あなた）がトレードオフを再構成できない。

## 相互リンク

- 決定が属する spec / PR に `decision_audit_ref: <design.md パス>` を 1 行付ける（双方向 — spec → design.md、design.md 冒頭 → spec/PR）。
- セッションログを持つなら、上記決定レコード形式がその中の 1 セクションとして入る。

## Worked example

実際の多決定 spec/設計セッションを worked example とする: 各分岐点が自分のゲート、`picked` 行、3 箇条根拠を持ち、単一の `decision_audit_ref` で spec/PR に相互リンク。そうした design.md を一度読みパターンを体得し、このテンプレートを再利用。

## 反例（適用しない時）

- 根本原因が明確なワンショットバグ修正 — ゲートする決定が無い。
- 機械的リファクタ（rename、整形、lint 修正）— 分岐点が無い。
- Q&A / 説明 / 状況報告 — 成果物が無い。
- 速度 > 熟考の緊急ホットフィックス（セッション中は `/wilson-decision-gate off` / `SIDECAR_NO_DECISION_GATE=1` kill-switch を使い、理由を記録）。

## 「friendly preset」からの独立性

この原則が一般化するプロトコルは 2 つを束ねる:

1. **Friendly preset**（7-element パターン、推奨形式、絵文字 enum 等）— それは *どう書くか* で、sidecar `wilson-prefs` プラグインに応答スタイルとして別途存在。
2. **Step-by-step ユーザー確認ゲート** — *この* 原則、*どう決めるか*。

自然な軸で分かれる: friendly preset はどう書くか、step-by-step はどう決めるか。一方が ON でも他方は OFF にできる。

## 有効化チートシート

```sh
# デフォルト: 導入されたら ON（SessionStart が原則注入; UserPromptSubmit は
# branch-point に見えるプロンプトのみ短いリマインダ — 毎プロンプトではない）。

/wilson-decision-gate off          # 原則注入を切る
/wilson-decision-gate on           # 再び ON
/sidecar off decision-gate         # コントロールプラグインでランタイム切替
SIDECAR_NO_DECISION_GATE=1         # セッション kill switch（env、常に優先）

/wilson-decision-gate decide "<選択>" "<根拠>"   # Decision を 1 件 append
/wilson-decision-gate log          # design.md 決定セクションを出力
/wilson-decision-gate path <file>  # 別の design.md を指定
```
