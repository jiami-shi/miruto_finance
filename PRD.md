# 予算・支払・月報承認 Workflow PRD

## 1. 背景

現行運用は Google Sheets、Google Apps Script、GAS Web App、Slack、CSV を組み合わせた内部 workflow である。データソース、承認状態、承認履歴、通知、月報 CSV 出力が分散しており、長期運用に必要な安定性、監査性、保守性が不足している。

第一期では Google Workspace の中に留まり、AppSheet、Google Sheets、Apps Script、Slack を使って、予算承認と支払確認を分離した最小 PoC を作る。

## 2. Product Goal

予算申請を「支払の根拠となる承認済み authorization」として管理し、支払申請はその予算に紐づく実行確認として扱う。

目的:

- 予算申請、支払、承認履歴、通知を統一 DB で管理する。
- 承認状態を code で管理し、日本語表示名と分離する。
- 支払時に費目を選ばせず、予算申請の費目を継承する。
- 通常支払は経理確認で完了し、異常時のみ事業承認者と役員承認者に escalation する。
- 予算カテゴリ別の消化率を表示し、超過リスクを承認前に見えるようにする。

## 3. Core Decisions

- `category` は予算申請で決定する。支払申請では選択・編集しない。
- 予算申請は authorization object、支払申請は execution object とする。
- `individual_budget` は `business_approver` の承認だけで有効になる。
- `recurring_budget` は `business_approver -> executive_approver` の承認で有効になる。
- 予算申請は経理初審を通さない。
- 支払は原則 `finance_reviewer` が invoice、金額、支払情報を確認して完了する。
- 支払が異常条件に該当する場合のみ `business_approver -> executive_approver` に escalation する。

## 4. Scope

第一期 PoC の対象:

- 20-30 件程度のテストデータ。
- Google Sheets を PoC database として利用。
- AppSheet で予算承認 queue と支払確認 queue を作る。
- approve / reject / cancel を AppSheet action で実行する。
- 全操作を `db_approval_events` に append-only で保存する。
- Slack 通知 job を作成・送信する。
- 予算カテゴリ別の消化率 warning を表示する。
- 月報 CSV は既存処理との接続確認に留める。

## 5. Non-goals

- Cloud SQL への移行。
- 独自 Web App の再構築。
- 既存月報 CSV 生成処理の全面刷新。
- BigQuery / Looker Studio 連携。
- 複雑な兼務ロール、代理承認、組織階層管理。
- 定常予算の月次上限制御。
- 個別予算の支払回数制限。

## 6. Users / Roles

| role code | 表示名 | 主な責務 |
| --- | --- | --- |
| `requester` | 申請者 | 予算申請・支払申請を提出する |
| `finance_reviewer` | 経理確認者 | 支払金額、invoice、支払情報を確認する |
| `business_approver` | 事業承認者 | 予算と異常支払の事業判断を行う |
| `executive_approver` | 役員承認者 | 定常予算と異常支払の最終承認を行う |
| `admin` | 管理者 | DB、設定、エラーを管理する |
| `system` | システム | import、通知、再計算を実行する |

## 7. Budget Request Types

### `individual_budget`

表示名: `個別予算`

- 一回または少数回の支払を想定する。
- 承認経路は `business_approver` のみ。
- 支払回数は第一期では制限しない。
- 累計支払金額が承認額を超える場合は異常支払として扱う。

### `recurring_budget`

表示名: `定常予算`

- 特定期間内で継続的に支払う予算。
- 承認経路は `business_approver -> executive_approver`。
- `valid_from` と `valid_to` を必須にする。
- 第一期では有効期間内の承認総額で管理し、月次上限は作らない。
- 支払日が有効期間外の場合は異常支払として扱う。

## 8. Payment Rules

- 支払申請は必ず承認済みの `db_requests` に紐づく。
- 支払申請は `budget_category_code` と `source_category_label` を予算申請から継承する。
- 支払申請画面では category を表示専用にする。
- 通常支払は `finance_reviewer` の確認で `payment_approved` になる。
- 異常支払は `business_approver -> executive_approver` に escalation する。

異常条件:

- 支払後に該当予算申請の累計支払額が承認額を超える。
- 支払後に該当予算カテゴリまたは総額の消化率が 100% を超える。
- `recurring_budget` の支払日が `valid_from` から `valid_to` の範囲外である。
- 支払金額が該当予算申請の残額を超える。

## 9. Data Objects

第一期の主要 object:

- `Requests`: 予算申請 master。
- `Payments`: 支払申請。
- `Budgets`: HD 予算 master / balance。
- `BudgetCategories`: 予算カテゴリ別 balance。
- `ApprovalEvents`: 承認・却下・取消の audit log。
- `Users`: role mapping。
- `ApprovalRules`: state transition rule。
- `EvidenceFiles`: 証憑 metadata。
- `Notifications`: Slack job。
- `ErrorLog`: backend error log。

## 10. State Machines

### Budget request statuses

```text
draft
submitted
business_approval_pending
business_approved
executive_approval_pending
executive_approved
approved
rejected
cancelled
error
```

個別予算:

```text
submitted
  -> business_approval_pending
  -> approved
```

定常予算:

```text
submitted
  -> business_approval_pending
  -> executive_approval_pending
  -> approved
```

### Payment statuses

```text
payment_draft
payment_submitted
finance_check_pending
finance_checked
exception_business_approval_pending
exception_executive_approval_pending
payment_approved
payment_rejected
payment_cancelled
payment_error
```

通常支払:

```text
payment_submitted
  -> finance_check_pending
  -> payment_approved
```

異常支払:

```text
finance_check_pending
  -> exception_business_approval_pending
  -> exception_executive_approval_pending
  -> payment_approved
```

状態判定は code を使う。日本語表示名は UI 表示専用とする。

## 11. AppSheet Requirements

Budget queues:

- `個別予算 事業承認キュー`
- `定常予算 事業承認キュー`
- `定常予算 役員承認キュー`

Payment queues:

- `経理確認キュー`
- `異常支払 事業承認キュー`
- `異常支払 役員承認キュー`

Payment detail で表示するもの:

- 継承された標準カテゴリ。
- 元シートの費目名。
- 予算申請承認額。
- 既支払累計額。
- 本支払後の予測累計額。
- カテゴリ別消化率。
- 異常判定と理由。
- Google Drive 証憑 preview / open link。

## 12. Apps Script Requirements

Apps Script は UI ではなく backend job として利用する。

- source sheets から `db_*` へ import する。
- 予算申請と支払申請の state transition を検証する。
- `db_approval_events` を append する。
- budget / category balance を再計算する。
- Slack notification job を作成・送信する。
- 月報 CSV 連携に必要な approved payment を抽出する。
- error を `db_error_log` に保存する。

## 13. Budget Calculation

標準カテゴリ:

| code | 表示名 | `Sum_予算管理状況` 対応列 |
| --- | --- | --- |
| `development` | 開発費用 | 開発費用 |
| `cogs` | 原価費用 | 原価費用 |
| `advertising` | 広告費用 | 広告費用 |
| `management` | 管理費用 | 管理費用 |
| `expense` | 経費 | 経費 |

第一期の消化率:

```text
burn_rate = planned_amount / allocated_amount
```

支払画面では本支払を加えた予測値も表示する。

```text
projected_burn_rate = (planned_amount + current_payment_amount) / allocated_amount
```

`allocated_amount` が 0 または空の場合は消化率を空欄にし、warning を出す。

## 14. Audit Log

approve / reject / cancel / return / resubmit は必ず `db_approval_events` に記録する。

最低限の項目:

- `approval_event_id`
- `request_id`
- `payment_id`
- `target_type`
- `actor_email`
- `actor_role`
- `action`
- `from_status`
- `to_status`
- `comment`
- `created_at`

## 15. Success Criteria

- 個別予算が事業承認者 queue にだけ表示される。
- 定常予算が事業承認者、役員承認者の順に表示される。
- 支払申請が予算申請の category を継承し、支払画面で編集できない。
- 正常支払が経理確認で完了する。
- 超過、期間外、残額不足の支払が異常 queue に入る。
- 予算カテゴリ消化率が表示され、100% 超過時に warning が出る。
- 全操作が `db_approval_events` に保存される。
- Slack 通知が job として記録され、送信結果を追跡できる。

## 16. Risks

- Google Sheets を DB として使うため、直接編集と列変更の統制が必要。
- AppSheet の手動設定ミスで権限漏れが起きる可能性がある。
- 元シートの費目名と標準 5 カテゴリの mapping が曖昧な場合、消化率がずれる。
- 月次上限を持たない定常予算は、期間前半に使い切るリスクを warning できない。

## 17. Open Questions

- 元シートの費目名から 5 標準カテゴリへの最終 mapping。
- return / resubmit を AppSheet 内だけで閉じるか、元シート再 import と同期するか。
- 月報 CSV に渡す最終 field set。

## 18. ADR Links

- `docs/adr/ADR-001-appsheet.md`
- `docs/adr/ADR-002-spreadsheet-db.md`
- `docs/adr/ADR-003-appscript-backend.md`
