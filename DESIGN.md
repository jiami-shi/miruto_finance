# 予算・支払・月報承認 Workflow Design

## 1. Overview

第一期 PoC は、既存の予算管理 Google Spreadsheet を import source とし、別途 `db_*` sheets を workflow database として作成する。

AppSheet は `db_*` sheets を参照し、承認 UI を提供する。Apps Script は import、状態遷移、承認履歴、予算再計算、Slack notification job、月報 CSV 連携を担当する。

```text
source sheets
  -> Apps Script import
  -> db_requests / db_payments / db_budgets
  -> AppSheet approval UI
  -> db_approval_events / db_notifications / db_error_log
  -> existing monthly CSV flow
```

## 2. Source Spreadsheet Snapshot

Source spreadsheet:

- title: `EC_FY2026_予算管理シート`
- id: `1Wan-sIlRIgqO98wVnNj0L_KBRpwwakGFSpYr_w5OFqk`
- timezone: `Asia/Tokyo`

Relevant source tabs:

| tab | use |
| --- | --- |
| `HD取得予算管理リスト` | HD budget master import |
| `事業部個別予算申請管理リスト` | individual budget request import |
| `事業部定常予算申請管理リスト` | recurring budget request import |
| `imp_支払い管理リスト` | payment request import |
| `Up_支払月報` | existing monthly report connection |
| `agg_暫定DB` | current temporary budget aggregation reference |
| `Sum_予算管理状況` | current budget summary and balance reference |

## 3. Database Tabs

Create these controlled sheets in the PoC database spreadsheet.

| sheet | purpose | direct manual edit |
| --- | --- | --- |
| `db_requests` | budget/request master | admin only |
| `db_payments` | payment approval object | AppSheet actions only |
| `db_budgets` | budget balance ledger | Apps Script only |
| `db_approval_events` | append-only audit events | no |
| `db_users` | role mapping | admin only |
| `db_approval_rules` | allowed status transitions | admin only |
| `db_evidence_files` | evidence links | Apps Script/AppSheet |
| `db_notifications` | Slack jobs | Apps Script only |
| `db_error_log` | backend errors | Apps Script only |

## 4. Keys

Do not use row numbers as keys.

| key | format | example |
| --- | --- | --- |
| `request_id` | `req_` + source + source no | `req_individual_489` |
| `payment_id` | `pay_` + payment no | `pay_PAY-37` |
| `budget_id` | `bud_` + normalized budget no | `bud_hd_50` |
| `approval_event_id` | `ape_` + timestamp + random suffix | `ape_20260710_153000_ab12` |
| `notification_id` | `ntf_` + timestamp + random suffix | `ntf_20260710_153000_ab12` |

`支払いNo` is stored as `payment_no`, but workflow logic uses `payment_id`.

## 5. db_requests

| field | type | required | source example |
| --- | --- | --- | --- |
| `request_id` | Text | yes | generated |
| `source_sheet_name` | Text | yes | `事業部個別予算申請管理リスト` |
| `source_no` | Text | yes | `489` |
| `request_type` | Enum | yes | `individual`, `recurring`, `hd_budget` |
| `request_title` | Text | yes | `タイトル` |
| `requester_name` | Text | no | `記入者` |
| `requester_email` | Email | no | lookup later |
| `department` | Text | no | first phase blank if unavailable |
| `product_name` | Text | no | `プロダクト名`, `プロダクト` |
| `cost_category` | Text | no | `コスト項目`, `費目` |
| `budget_id` | Text | no | generated from HD budget ref |
| `requested_amount` | Number | no | `コスト見込み（税込み）` |
| `currency` | Enum | yes | `JPY` |
| `request_status` | Enum | yes | `active` |
| `source_url` | URL | no | source spreadsheet URL |
| `created_at` | DateTime | yes | import timestamp |
| `updated_at` | DateTime | yes | import timestamp |

## 6. db_payments

| field | type | required | source example |
| --- | --- | --- | --- |
| `payment_id` | Text | yes | `pay_PAY-37` |
| `request_id` | Text | yes | from `事業部予算申請No` |
| `payment_no` | Text | yes | `支払いNo` |
| `payment_title` | Text | yes | `タイトル` |
| `requester_name` | Text | no | `申請者` |
| `payment_method` | Text | yes | `支払い方法` |
| `vendor_name` | Text | no | `支払先` |
| `source_payment_status` | Text | no | `支払いステータス` |
| `scheduled_payment_date` | Date | no | `支払日` |
| `approved_amount_tax_excluded` | Number | no | `予算承認額(税抜）` |
| `payment_amount_tax_excluded` | Number | yes | `支払額(税抜）` |
| `currency` | Enum | yes | `JPY` |
| `evidence_url` | URL | no | `証憑（バクラクリンク）` |
| `memo` | LongText | no | `備考` |
| `business_request_no` | Text | no | `事業部予算申請No` |
| `hd_budget_ref` | Text | no | `HD予算申請No` |
| `budget_id` | Text | no | generated |
| `cost_category` | Text | no | `費目` |
| `status_code` | Enum | yes | `payment_candidate` |
| `current_role` | Enum | yes | `finance_reviewer` |
| `last_action_at` | DateTime | no | action timestamp |
| `created_at` | DateTime | yes | import timestamp |
| `updated_at` | DateTime | yes | import/action timestamp |

## 7. db_budgets

| field | type | required | source example |
| --- | --- | --- | --- |
| `budget_id` | Text | yes | `bud_hd_50` |
| `budget_ref` | Text | yes | `No:50:2025/5~7の運用予算` |
| `budget_name` | Text | yes | HD budget name |
| `owner_name` | Text | no | `オーナー` |
| `period` | Text | no | `2026-07` |
| `allocated_amount` | Number | yes | `取得額合計` |
| `used_amount` | Number | yes | computed |
| `pending_amount` | Number | yes | computed |
| `remaining_amount` | Number | yes | computed |
| `currency` | Enum | yes | `JPY` |
| `updated_at` | DateTime | yes | recalc timestamp |

Formula:

```text
remaining_amount = allocated_amount - used_amount - pending_amount
```

`pending_amount` includes payments with status:

- `finance_checked`
- `business_approved`
- `executive_approved`
- `monthly_report_exported`
- `returned_to_finance`

For the PoC seed data, `db_budgets` is sourced from `Sum_予算管理状況`:

| `db_budgets` field | `Sum_予算管理状況` source |
| --- | --- |
| `allocated_amount` | `取得額合計` |
| `used_amount` | `執行額合計` |
| `pending_amount` | `承認額合計 - 執行額合計` |
| `remaining_amount` | `取得額合計 - 承認額合計` |

This matches the current budget management sheet more closely than deriving balances only from the 11 PoC payment rows.

## 8. db_approval_events

Append only.

| field | type | required |
| --- | --- | --- |
| `approval_event_id` | Text | yes |
| `payment_id` | Text | yes |
| `request_id` | Text | yes |
| `actor_email` | Email | yes |
| `actor_role` | Enum | yes |
| `action` | Enum | yes |
| `from_status` | Enum | yes |
| `to_status` | Enum | yes |
| `comment` | LongText | no |
| `created_at` | DateTime | yes |

## 9. db_users

| field | type | required |
| --- | --- | --- |
| `user_email` | Email | yes |
| `display_name` | Text | yes |
| `role_code` | Enum | yes |
| `role_label_ja` | Text | yes |
| `is_active` | Yes/No | yes |

First phase: one active role per user.

## 10. db_approval_rules

| from_status | action | required_role | to_status | next_role |
| --- | --- | --- | --- | --- |
| `payment_candidate` | `approve` | `finance_reviewer` | `finance_checked` | `business_approver` |
| `payment_candidate` | `return` | `finance_reviewer` | `returned_to_requester` | `requester` |
| `payment_candidate` | `reject` | `finance_reviewer` | `rejected` | none |
| `finance_checked` | `approve` | `business_approver` | `business_approved` | `executive_approver` |
| `finance_checked` | `return` | `business_approver` | `returned_to_finance` | `finance_reviewer` |
| `finance_checked` | `reject` | `business_approver` | `rejected` | none |
| `business_approved` | `approve` | `executive_approver` | `executive_approved` | none |
| `business_approved` | `return` | `executive_approver` | `returned_to_finance` | `finance_reviewer` |
| `business_approved` | `reject` | `executive_approver` | `rejected` | none |
| `returned_to_finance` | `approve` | `finance_reviewer` | `finance_checked` | `business_approver` |
| `returned_to_finance` | `return` | `finance_reviewer` | `returned_to_requester` | `requester` |
| `returned_to_requester` | `resubmit` | `finance_reviewer` | `payment_candidate` | `finance_reviewer` |

## 11. State Machine

```text
payment_candidate
  -> finance_checked
  -> business_approved
  -> executive_approved
  -> monthly_report_exported
  -> completed
```

Return path:

```text
business_approved or finance_checked
  -> returned_to_finance
  -> returned_to_requester
  -> payment_candidate
```

Reject and cancel are terminal for the PoC.

## 12. Source Mapping

### `imp_支払い管理リスト` to `db_payments`

| source column | target field |
| --- | --- |
| `支払いNo` | `payment_no` |
| `タイトル` | `payment_title` |
| `予算承認額(税抜）` | `approved_amount_tax_excluded` |
| `申請者` | `requester_name` |
| `支払い方法` | `payment_method` |
| `支払先` | `vendor_name` |
| `支払いステータス` | `source_payment_status` |
| `支払日` | `scheduled_payment_date` |
| `支払額(税抜）` | `payment_amount_tax_excluded` |
| `証憑（バクラクリンク）` | `evidence_url` |
| `備考` | `memo` |
| `事業部予算申請No` | `business_request_no` |
| `HD予算申請No` | `hd_budget_ref` |
| `費目` | `cost_category` |

### Budget request tabs to `db_requests`

| source tab | key columns |
| --- | --- |
| `事業部個別予算申請管理リスト` | `No.`, `タイトル`, `記入者`, `コスト見込み（税込み）`, `執行予算No`, `プロダクト名`, `コスト項目`, `証憑資料` |
| `事業部定常予算申請管理リスト` | `No`, `タイトル`, `記入者`, `月次コスト見込み（税込み）`, `紐づけ予算No`, `プロダクト`, `費目`, `契約書、利用規約リンク` |
| `HD取得予算管理リスト` | `No`, `執行予算名`, `オーナー`, `取得額合計`, `開発費用`, `原価費用`, `広告費用`, `管理費用`, `経費` |

## 13. Error Handling

Apps Script must write `db_error_log` for:

- missing required payment number
- duplicate generated key
- missing amount
- invalid status transition
- Slack send failure
- budget recalculation failure

## 14. PoC Simplifications

- One role per user.
- Google Sheets remains the database.
- Monthly report export is not rewritten.
- AppSheet does approval UI only.
- Apps Script owns state transition integrity.
