# 予算・支払・月報承認 Workflow Design

## 1. Overview

第一期 PoC は「予算承認」と「支払実行確認」を分離する。

```text
source sheets
  -> Apps Script import
  -> db_requests / db_payments / db_budgets / db_budget_categories
  -> AppSheet queues and actions
  -> db_approval_events / db_notifications / db_error_log
  -> existing monthly CSV flow
```

`db_requests` は予算申請 master である。`db_payments` は承認済み予算に紐づく支払実行 object である。支払側で category を選ばない。

## 2. Source Tabs

| tab | use |
| --- | --- |
| `HD取得予算管理リスト` | HD budget master |
| `事業部個別予算申請管理リスト` | individual budget request source |
| `事業部定常予算申請管理リスト` | recurring budget request source |
| `imp_支払い管理リスト` | payment request source |
| `Sum_予算管理状況` | budget/category balance source |
| `Up_支払月報` | existing monthly report connection |

## 3. Database Tabs

| sheet | purpose | direct manual edit |
| --- | --- | --- |
| `db_requests` | budget request master | admin only |
| `db_payments` | payment execution object | AppSheet actions only |
| `db_budgets` | budget balance summary | Apps Script only |
| `db_budget_categories` | category-level budget balance | Apps Script only |
| `db_approval_events` | append-only audit events | no |
| `db_users` | role mapping | admin only |
| `db_approval_rules` | allowed state transitions | admin only |
| `db_evidence_files` | evidence links | Apps Script/AppSheet |
| `db_notifications` | Slack jobs | Apps Script only |
| `db_error_log` | backend errors | Apps Script only |

## 4. Keys

Do not use row numbers as keys.

| key | format | example |
| --- | --- | --- |
| `request_id` | `req_` + type + source no | `req_individual_489` |
| `payment_id` | `pay_` + payment no | `pay_PAY-234` |
| `budget_id` | `bud_` + normalized budget no | `bud_hd_50` |
| `budget_category_id` | `budget_id` + category code | `bud_hd_50_development` |
| `approval_event_id` | `ape_` + timestamp + random suffix | `ape_20260710_153000_ab12` |

## 5. db_requests

`db_requests` stores budget applications.

| field | type | required | notes |
| --- | --- | --- | --- |
| `request_id` | Text | yes | key |
| `source_sheet_name` | Text | yes | import source |
| `source_no` | Text | yes | source request number |
| `request_type` | Enum | yes | `individual_budget`, `recurring_budget` |
| `request_title` | Text | yes | budget title |
| `requester_email` | Email | no | lookup/import |
| `requester_name` | Text | no | source applicant |
| `department` | Text | no | optional |
| `product_name` | Text | no | optional |
| `source_category_label` | Text | yes | original `費目` / `コスト項目` |
| `budget_category_code` | Enum | yes | standard 5-category code |
| `approved_amount_tax_excluded` | Price | yes | approved budget amount |
| `currency` | Enum | yes | `JPY` |
| `valid_from` | Date | recurring only | required for `recurring_budget` |
| `valid_to` | Date | recurring only | required for `recurring_budget` |
| `budget_request_status` | Enum | yes | budget state machine |
| `current_role` | Enum | no | next actor role |
| `hd_budget_ref` | Text | no | source HD budget ref |
| `budget_id` | Ref -> `db_budgets` | no | linked HD budget |
| `source_url` | URL | no | source row/sheet link |
| `created_at` | DateTime | yes | import/create time |
| `submitted_at` | DateTime | no | submit time |
| `approved_at` | DateTime | no | final approval time |
| `updated_at` | DateTime | yes | last update |
| `payment_activity_status` | Enum | no | `not_started`, `payment_active`, `fully_paid`, `payment_cancelled` |
| `payment_intent` | Enum | no | `will_pay`, `no_longer_needed` |
| `last_payment_alert_at` | DateTime | no | last payment follow-up alert |
| `next_payment_alert_at` | DateTime | no | next allowed payment follow-up alert |

`budget_request_status` is approval state only. Payment follow-up must not change it.

## 6. db_payments

`db_payments` stores payment execution. It references a budget request and inherits category.

| field | type | required | notes |
| --- | --- | --- | --- |
| `payment_id` | Text | yes | key |
| `request_id` | Ref -> `db_requests` | yes | approved budget request |
| `payment_no` | Text | yes | external payment no |
| `payment_title` | Text | yes | payment title |
| `requester_name` | Text | no | source applicant |
| `payment_method` | Text | yes | source method |
| `vendor_name` | Text | no | payee |
| `source_payment_status` | Text | no | source status |
| `scheduled_payment_date` | Date | no | payment date |
| `payment_amount_tax_excluded` | Price | yes | payment amount |
| `currency` | Enum | yes | `JPY` |
| `evidence_url` | URL | no | Google Drive or external evidence |
| `memo` | LongText | no | source memo |
| `business_request_no` | Text | no | source ref |
| `hd_budget_ref` | Text | no | source ref |
| `budget_id` | Ref -> `db_budgets` | no | inherited/imported |
| `status_code` | Enum | yes | payment state machine |
| `current_role` | Enum | yes | next actor role |
| `action_comment` | LongText | no | AppSheet action comment |
| `last_action_at` | DateTime | no | last action time |
| `created_at` | DateTime | yes | import/create time |
| `updated_at` | DateTime | yes | last update |

Deprecated:

- `cost_category` on `db_payments` must not be editable or used as source of truth.

Recommended AppSheet virtual/display fields:

- `inherited_budget_category_code = [request_id].[budget_category_code]`
- `inherited_source_category_label = [request_id].[source_category_label]`
- `request_remaining_amount`
- `category_burn_rate_after_payment`
- `has_payment_exception`
- `exception_reason`

## 7. db_budgets

| field | type | required |
| --- | --- | --- |
| `budget_id` | Text | yes |
| `budget_ref` | Text | yes |
| `budget_name` | Text | yes |
| `owner_name` | Text | no |
| `period` | Text | no |
| `allocated_amount` | Price | yes |
| `used_amount` | Price | yes |
| `pending_amount` | Price | yes |
| `remaining_amount` | Price | yes |
| `currency` | Enum | yes |
| `updated_at` | DateTime | yes |

## 8. db_budget_categories

| field | type | required | notes |
| --- | --- | --- | --- |
| `budget_category_id` | Text | yes | key |
| `budget_id` | Ref -> `db_budgets` | yes | parent budget |
| `budget_category_code` | Enum | yes | standard category |
| `allocated_amount` | Price | yes | approved category budget |
| `planned_amount` | Price | yes | approved/planned use |
| `actual_amount` | Price | yes | executed use |
| `burn_rate` | Percent | no | `planned_amount / allocated_amount` |
| `updated_at` | DateTime | yes | recalc/import time |

Standard categories:

| code | display | source column |
| --- | --- | --- |
| `development` | 開発費用 | 開発費用 |
| `cogs` | 原価費用 | 原価費用 |
| `advertising` | 広告費用 | 広告費用 |
| `management` | 管理費用 | 管理費用 |
| `expense` | 経費 | 経費 |

## 9. Approval Events

Append only.

| field | type | required |
| --- | --- | --- |
| `approval_event_id` | Text | yes |
| `target_type` | Enum | yes |
| `request_id` | Ref -> `db_requests` | no |
| `payment_id` | Ref -> `db_payments` | no |
| `actor_email` | Email | yes |
| `actor_role` | Enum | yes |
| `action` | Enum | yes |
| `from_status` | Enum | yes |
| `to_status` | Enum | yes |
| `comment` | LongText | no |
| `created_at` | DateTime | yes |

`target_type` values:

```text
budget_request
payment
```

## 10. Approval Rules

Budget request rules:

| from_status | action | required_role | to_status | next_role |
| --- | --- | --- | --- | --- |
| `submitted` | `submit` | `requester` | `business_approval_pending` | `business_approver` |
| `business_approval_pending` | `approve` | `business_approver` | `approved` | none |
| `business_approval_pending` | `approve_recurring` | `business_approver` | `executive_approval_pending` | `executive_approver` |
| `executive_approval_pending` | `approve` | `executive_approver` | `approved` | none |
| `business_approval_pending` | `reject` | `business_approver` | `rejected` | none |
| `executive_approval_pending` | `reject` | `executive_approver` | `rejected` | none |
| any non-terminal | `cancel` | `requester` | `cancelled` | none |

Payment rules:

| from_status | action | required_role | to_status | next_role |
| --- | --- | --- | --- | --- |
| `payment_draft` | `submit` | requester / finance / admin | `finance_check_pending` | `finance_reviewer` |
| `payment_submitted` | `submit` | `requester` | `finance_check_pending` | `finance_reviewer` |
| `finance_check_pending` | `approve` | `finance_reviewer` | `payment_approved` | none |
| `finance_check_pending` | `escalate` | `finance_reviewer` | `exception_business_approval_pending` | `business_approver` |
| `exception_business_approval_pending` | `approve` | `business_approver` | `exception_executive_approval_pending` | `executive_approver` |
| `exception_executive_approval_pending` | `approve` | `executive_approver` | `payment_approved` | none |
| any non-terminal | `reject` | current role | `payment_rejected` | none |
| any non-terminal | `cancel` | requester/admin | `payment_cancelled` | none |

### Recurring monthly payment drafts

- `generateRecurringPaymentDrafts()` creates one `payment_draft` for the current Tokyo
  month from each approved `recurring_budget`.
- Both `valid_from` and `valid_to` must exist, and the target month must overlap that range.
- Only requests with `requester_email` are eligible, so imported ownerless history is not
  turned into new drafts.
- The payment amount stays blank until the requester or finance fills it.
- `payment_id = pay_recurring_<request_id>_<YYYYMM>` is the monthly idempotency key.
- AppSheet submits a completed draft directly to `finance_check_pending`; the existing audit
  bot records that status change.

### Budget payment follow-up alerts

- AppSheet owns requester-facing payment follow-up alerts.
- Approved budget requests older than 30 days with no linked payment send a Slack channel alert.
- Active `recurring_budget` rows with `翌月末払い` and no current-month linked payment send a
  Slack channel alert on day 15.
- Requesters can set `payment_intent = no_longer_needed` to stop alerts; this sets payment
  activity to `payment_cancelled` without changing approval state.
- Physical columns must be added by the sheet owner, then AppSheet schema regenerated.

## 11. Exception Detection

Apps Script should calculate persistent values when importing or recalculating. AppSheet may also display virtual warnings.

Payment is exceptional when:

```text
payment_amount_tax_excluded > request_remaining_amount
OR projected_category_burn_rate > 1
OR projected_total_burn_rate > 1
OR recurring budget payment date is outside valid_from/valid_to
```

First phase behavior:

- Warning is shown in AppSheet.
- `finance_reviewer` escalates exceptional payment.
- No automatic hard block unless the transition rule would create invalid state.

## 12. Source Mapping Notes

Budget category source:

- individual budget: source `コスト項目`
- recurring budget: source `費目`
- standard category: mapped to one of `development`, `cogs`, `advertising`, `management`, `expense`

Payment category:

- never sourced from payment form as authoritative data
- display uses `[request_id].[budget_category_code]` and `[request_id].[source_category_label]`

## 13. PoC Simplifications

- One active role per user.
- Google Sheets remains the database.
- Monthly report export is not rewritten.
- AppSheet owns UI actions.
- AppSheet owns budget payment follow-up alerts.
- Apps Script owns import, reusable backend jobs, audit append, and state integrity.
- Recurring budgets use total amount across validity period, not monthly limits.
